import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { makeCors } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; object-src 'none';",
};

const cors = makeCors("POST,OPTIONS");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/**
 * Check if password has been exposed in known data breaches
 * Uses Have I Been Pwned API with k-Anonymity model (only first 5 chars of hash sent)
 * SECURITY: Fail-closed - if API is unavailable, treat as leaked
 */
async function isPasswordLeaked(password: string): Promise<boolean> {
  try {
    // Generate SHA-1 hash
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    
    // k-Anonymity: Only send first 5 chars
    const prefix = hashHex.slice(0, 5);
    const suffix = hashHex.slice(5);
    
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      method: 'GET',
      headers: { 'Add-Padding': 'true' }
    });
    
    if (!response.ok) {
      console.error('HIBP API unavailable, failing closed for security');
      return true; // Fail closed - treat as leaked if API down
    }
    
    const text = await response.text();
    const hashes = text.split('\n');
    
    // Check if our suffix appears in returned list
    return hashes.some(line => {
      const [hashSuffix] = line.split(':');
      return hashSuffix === suffix;
    });
  } catch (error) {
    console.error('Password leak check failed:', error);
    return true; // Fail closed on error
  }
}

/**
 * Validate password strength
 * REQUIREMENTS:
 * - Minimum 12 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (password.length < 12) {
    return { valid: false, error: 'Password must be at least 12 characters long' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character' };
  }
  
  return { valid: true };
}

Deno.serve(cors.wrap(async (req) => {
  const preflight = cors.preflight(req);
  if (preflight) return preflight;

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return cors.json({ error: 'Method not allowed' }, {
        status: 405,
        headers: securityHeaders
      });
    }

    // Get client IP for rate limiting
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                     req.headers.get('x-real-ip') ||
                     'unknown';

    // Initialize Supabase client with service role
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // SECURITY: Check rate limit (10 password resets per hour per IP)
    const { data: rateLimitOk, error: rateLimitError } = await supabaseAdmin.rpc('check_signup_rate_limit', {
      _ip_address: ipAddress,
      _max_requests: 10,
      _window_minutes: 60
    });

    if (rateLimitError || !rateLimitOk) {
      console.warn('Rate limit exceeded for password reset:', ipAddress);
      return cors.json({ 
        error: 'Too many password reset attempts. Please try again later.' 
      }, {
        status: 429,
        headers: securityHeaders
      });
    }

    // Parse request body
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return cors.json({ 
        error: 'Missing required fields: token and newPassword' 
      }, {
        status: 400,
        headers: securityHeaders
      });
    }

    // SECURITY: Validate password strength
    const strengthCheck = validatePasswordStrength(newPassword);
    if (!strengthCheck.valid) {
      return cors.json({ error: strengthCheck.error }, {
        status: 400,
        headers: securityHeaders
      });
    }

    // SECURITY: Check if password has been leaked (HIBP)
    console.log('Checking password against HIBP database...');
    const leaked = await isPasswordLeaked(newPassword);
    if (leaked) {
      return cors.json({ 
        error: 'This password has appeared in a data breach and cannot be used. Please choose a different password.',
        code: 'PASSWORD_LEAKED'
      }, {
        status: 400,
        headers: securityHeaders
      });
    }

    // Verify reset token and update password
    // This uses Supabase's built-in password reset mechanism with our additional checks
    const { data: { user }, error: verifyError } = await supabaseAdmin.auth.verifyOtp({
      token_hash: token,
      type: 'recovery'
    });

    if (verifyError || !user) {
      console.error('Invalid or expired reset token:', verifyError);
      return cors.json({ error: 'Invalid or expired reset token' }, {
        status: 400,
        headers: securityHeaders
      });
    }

    // Update the user's password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Failed to update password:', updateError);
      return cors.json({ 
        error: 'Failed to update password. Please try again.' 
      }, {
        status: 500,
        headers: securityHeaders
      });
    }

    // SECURITY: Log successful password reset in audit log
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      action: 'password_reset',
      resource_type: 'user_account',
      resource_id: user.id,
      metadata: {
        ip_address: ipAddress,
        user_agent: req.headers.get('user-agent'),
        timestamp: new Date().toISOString()
      }
    });

    console.log('Password reset successful for user:', user.id);

    return cors.json({ 
      success: true,
      message: 'Password has been reset successfully. You can now sign in with your new password.' 
    }, {
      status: 200,
      headers: securityHeaders
    });

  } catch (error) {
    console.error('Unexpected error in secure-password-reset:', error);
    return cors.json({ 
      error: 'An unexpected error occurred. Please try again later.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500,
      headers: securityHeaders
    });
  }
}));
