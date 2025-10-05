// Server-side secure signup with HIBP leaked password protection
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      console.warn('HIBP API unavailable, failing open');
      return false;
    }
    
    const text = await response.text();
    const hashes = text.split('\n');
    
    return hashes.some(line => {
      const [hashSuffix] = line.split(':');
      return hashSuffix === suffix;
    });
  } catch (error) {
    console.error('Password leak check failed:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { email, password } = await req.json();

    // Validate inputs
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return new Response(JSON.stringify({ error: 'Password must be at least 8 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!/[A-Z]/.test(password)) {
      return new Response(JSON.stringify({ error: 'Password must contain at least one uppercase letter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!/[a-z]/.test(password)) {
      return new Response(JSON.stringify({ error: 'Password must contain at least one lowercase letter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!/[0-9]/.test(password)) {
      return new Response(JSON.stringify({ error: 'Password must contain at least one number' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // SERVER-SIDE HIBP CHECK (critical security enforcement)
    const leaked = await isPasswordLeaked(password);
    if (leaked) {
      console.log('Blocked signup attempt with leaked password');
      return new Response(JSON.stringify({ 
        error: 'This password has appeared in a data breach. For your safety, please choose a different password.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create user with service role (bypasses disabled signup)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data, error } = await supabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true, // Auto-confirm email
    });

    if (error) {
      console.error('Signup error:', error);
      
      // Return user-friendly errors
      if (error.message.includes('already registered')) {
        return new Response(JSON.stringify({ error: 'An account with this email already exists' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({ error: 'Failed to create account' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('User created successfully:', data.user.id);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Account created successfully! You can now sign in.' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
