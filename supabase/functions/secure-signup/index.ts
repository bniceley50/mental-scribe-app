// Server-side secure signup with HIBP leaked password protection
import { makeCors } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; object-src 'none';",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

const cors = makeCors("POST,OPTIONS");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/**
 * Check if password has been leaked using HIBP k-Anonymity API
 * Only sends first 5 chars of SHA-1 hash for privacy
 */
async function isPasswordLeaked(password: string): Promise<boolean> {
  try {
    // Generate SHA-1 hash
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    
    const prefix = hashHex.slice(0, 5);
    const suffix = hashHex.slice(5);
    
    // Query HIBP API
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      method: 'GET',
      headers: { 'Add-Padding': 'true' }
    });
    
    if (!response.ok) {
      // SECURITY FIX: Fail closed - if API is down, require different password
      console.error('HIBP API unavailable, failing closed for security');
      return true; // Treat as leaked to prevent potentially compromised passwords
    }
    
    const text = await response.text();
    const hashes = text.split('\n');
    
    return hashes.some(line => {
      const [hashSuffix] = line.split(':');
      return hashSuffix === suffix;
    });
  } catch (error) {
    // SECURITY FIX: Fail closed on errors - better to block signup than allow leaked password
    console.error('Password leak check failed:', error);
    return true; // Treat as leaked to force user to try different password
  }
}

Deno.serve(cors.wrap(async (req) => {
  const preflight = cors.preflight(req);
  if (preflight) return preflight;

  try {
    if (req.method !== 'POST') {
      return cors.json({ error: 'Method not allowed' }, {
        status: 405,
        headers: securityHeaders
      });
    }

    // Robust IP detection with multiple header fallbacks
    const forwarded = req.headers.get('x-forwarded-for') || '';
    const ipCandidates = [
      forwarded.split(',')[0]?.trim(),
      req.headers.get('cf-connecting-ip') || '',
      req.headers.get('x-real-ip') || '',
      req.headers.get('fly-client-ip') || '',
      req.headers.get('true-client-ip') || '',
      req.headers.get('x-client-ip') || ''
    ].filter(Boolean);

    let ipAddress = ipCandidates.find(ip => ip && ip !== 'unknown') || '';

    // Normalize IPv6/IPv4-mapped addresses (e.g., ::ffff:1.2.3.4)
    if (ipAddress.startsWith('::ffff:')) {
      ipAddress = ipAddress.replace('::ffff:', '');
    }

    // If still not available, fallback to a shared placeholder but DO NOT block
    if (!ipAddress) {
      console.warn('Could not determine IP address precisely; using placeholder for rate limiting');
      ipAddress = '0.0.0.0';
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: rateLimitOk, error: rateLimitError } = await supabaseAdmin.rpc('check_signup_rate_limit', {
      _ip_address: ipAddress,
      _max_requests: 10,
      _window_minutes: 15
    });
    
    if (rateLimitError || !rateLimitOk) {
      const origin = req.headers.get('origin') || '';
      const hostname = origin.replace(/^https?:\/\//, '').split('/')[0];
      const isTrustedOrigin = /(?:\.lovableproject\.com|^lovableproject\.com$|mental-scribe-app\.com)$/i.test(hostname || '');

      if (!isTrustedOrigin) {
        console.log(`Rate limit exceeded for IP: ${ipAddress} (untrusted origin: ${origin})`);
        return cors.json({ 
          error: 'Too many signup attempts. Please try again later.' 
        }, {
          status: 429,
          headers: securityHeaders
        });
      }

      // Soft-bypass for trusted preview/production origins to unblock real users
      console.warn(`Soft-bypassing signup rate limit for trusted origin (${origin}), IP: ${ipAddress}`);
    }

    const { email, password } = await req.json();

    // SECURITY ENHANCEMENT: Check account lockout before processing
    const { data: isLocked, error: lockoutError } = await supabaseAdmin.rpc(
      'is_account_locked',
      { _identifier: email, _lockout_minutes: 15 }
    );

    if (lockoutError) {
      console.error('Lockout check error:', lockoutError);
    }

    if (isLocked) {
      return cors.json({ 
          error: 'Account temporarily locked due to multiple failed login attempts. Please try again in 15 minutes.',
          code: 'ACCOUNT_LOCKED'
        },
        { 
          status: 429, 
          headers: securityHeaders 
        }
      );
    }

    // Validate inputs
    if (!email || !password) {
      return cors.json({ error: 'Email and password required' }, {
        status: 400,
        headers: securityHeaders
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return cors.json({ error: 'Invalid email address' }, {
        status: 400,
        headers: securityHeaders
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return cors.json({ error: 'Password must be at least 8 characters' }, {
        status: 400,
        headers: securityHeaders
      });
    }

    if (!/[A-Z]/.test(password)) {
      return cors.json({ error: 'Password must contain at least one uppercase letter' }, {
        status: 400,
        headers: securityHeaders
      });
    }

    if (!/[a-z]/.test(password)) {
      return cors.json({ error: 'Password must contain at least one lowercase letter' }, {
        status: 400,
        headers: securityHeaders
      });
    }

    if (!/[0-9]/.test(password)) {
      return cors.json({ error: 'Password must contain at least one number' }, {
        status: 400,
        headers: securityHeaders
      });
    }

    // SERVER-SIDE HIBP CHECK (critical security enforcement)
    const leaked = await isPasswordLeaked(password);
    if (leaked) {
      console.log('Blocked signup attempt with leaked password');
      return cors.json({ 
        error: 'This password has appeared in a data breach. For your safety, please choose a different password.' 
      }, {
        status: 400,
        headers: securityHeaders
      });
    }

    // Create user with service role (bypasses disabled signup)
    // Note: supabaseAdmin already created above for rate limiting

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true, // Auto-confirm email
    });

    if (error) {
      console.error('Signup error:', error);
      
      // Return user-friendly errors
      if (error.message.includes('already registered')) {
        return cors.json({ error: 'An account with this email already exists' }, {
          status: 400,
          headers: securityHeaders
        });
      }
      
      return cors.json({ error: 'Failed to create account' }, {
        status: 500,
        headers: securityHeaders
      });
    }

    console.log('User created successfully:', data.user.id);

    return cors.json({ 
      success: true,
      message: 'Account created successfully! You can now sign in.' 
    }, {
      headers: securityHeaders
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return cors.json({ error: 'An unexpected error occurred' }, {
      status: 500,
      headers: securityHeaders
    });
  }
}));
