// Server-side secure signup with HIBP leaked password protection
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

import { makeCors } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const { json, wrap } = makeCors("POST,OPTIONS");

/**
 * Check if password has been leaked using HIBP k-Anonymity API
 * Only sends first 5 chars of SHA-1 hash for privacy
 */
async function isPasswordLeaked(password: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();

    const prefix = hashHex.slice(0, 5);
    const suffix = hashHex.slice(5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      method: "GET",
      headers: { "Add-Padding": "true" },
    });

    if (!response.ok) {
      console.error("HIBP API unavailable, failing closed for security");
      return true;
    }

    const text = await response.text();
    const hashes = text.split("\n");

    return hashes.some((line) => {
      const [hashSuffix] = line.split(":");
      return hashSuffix === suffix;
    });
  } catch (error) {
    console.error("Password leak check failed:", error);
    return true;
  }
}

serve(
  wrap(async (req) => {
    try {
      if (req.method !== "POST") {
        return json(
          { error: "Method not allowed" },
          { status: 405 }
        );
      }

      const forwarded = req.headers.get("x-forwarded-for") || "";
      const ipCandidates = [
        forwarded.split(",")[0]?.trim(),
        req.headers.get("cf-connecting-ip") || "",
        req.headers.get("x-real-ip") || "",
        req.headers.get("fly-client-ip") || "",
        req.headers.get("true-client-ip") || "",
        req.headers.get("x-client-ip") || "",
      ].filter(Boolean);

      let ipAddress = ipCandidates.find((ip) => ip && ip !== "unknown") || "";

      if (ipAddress.startsWith("::ffff:")) {
        ipAddress = ipAddress.replace("::ffff:", "");
      }

      if (!ipAddress) {
        console.warn("Could not determine IP address precisely; using placeholder for rate limiting");
        ipAddress = "0.0.0.0";
      }

      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const { data: rateLimitOk, error: rateLimitError } = await supabaseAdmin.rpc(
        "check_signup_rate_limit",
        {
          _ip_address: ipAddress,
          _max_requests: 10,
          _window_minutes: 15,
        }
      );

      if (rateLimitError || !rateLimitOk) {
        const origin = req.headers.get("origin") || "";
        const hostname = origin.replace(/^https?:\/\//, "").split("/")[0];
        const isTrustedOrigin = /(?:\.lovableproject\.com|^lovableproject\.com$|mental-scribe-app\.com)$/i.test(
          hostname || ""
        );

        if (!isTrustedOrigin) {
          console.log(`Rate limit exceeded for IP: ${ipAddress} (untrusted origin: ${origin})`);
          return json(
            { error: "Too many signup attempts. Please try again later." },
            { status: 429 }
          );
        }

        console.warn(`Soft-bypassing signup rate limit for trusted origin (${origin}), IP: ${ipAddress}`);
      }

      const { email, password } = await req.json();

      const { data: isLocked, error: lockoutError } = await supabaseAdmin.rpc(
        "is_account_locked",
        { _identifier: email, _lockout_minutes: 15 }
      );

      if (lockoutError) {
        console.error("Lockout check error:", lockoutError);
      }

      if (isLocked) {
        return json(
          {
            error:
              "Account temporarily locked due to multiple failed login attempts. Please try again in 15 minutes.",
            code: "ACCOUNT_LOCKED",
          },
          { status: 429 }
        );
      }

      if (!email || !password) {
        return json(
          { error: "Email and password required" },
          { status: 400 }
        );
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return json(
          { error: "Invalid email address" },
          { status: 400 }
        );
      }

      if (password.length < 8) {
        return json(
          { error: "Password must be at least 8 characters" },
          { status: 400 }
        );
      }

      if (!/[A-Z]/.test(password)) {
        return json(
          { error: "Password must contain at least one uppercase letter" },
          { status: 400 }
        );
      }

      if (!/[a-z]/.test(password)) {
        return json(
          { error: "Password must contain at least one lowercase letter" },
          { status: 400 }
        );
      }

      if (!/[0-9]/.test(password)) {
        return json(
          { error: "Password must contain at least one number" },
          { status: 400 }
        );
      }

      const leaked = await isPasswordLeaked(password);
      if (leaked) {
        console.log("Blocked signup attempt with leaked password");
        return json(
          {
            error:
              "This password has appeared in a data breach. For your safety, please choose a different password.",
          },
          { status: 400 }
        );
      }

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase().trim(),
        password,
        email_confirm: true,
      });

      if (error) {
        console.error("Signup error:", error);

        if (error.message.includes("already registered")) {
          return json(
            { error: "An account with this email already exists" },
            { status: 400 }
          );
        }

        return json(
          { error: "Failed to create account" },
          { status: 500 }
        );
      }

      console.log("User created successfully:", data.user.id);

      return json({
        success: true,
        message: "Account created successfully! You can now sign in.",
      });
    } catch (error) {
      console.error("Unexpected error:", error);
      return json(
        { error: "An unexpected error occurred" },
        { status: 500 }
      );
    }
  })
);
