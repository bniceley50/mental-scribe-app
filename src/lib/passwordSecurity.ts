import { logger } from "./logger";

/**
 * Password security utilities using Have I Been Pwned (HIBP) API
 * Implements k-Anonymity model for privacy-safe password breach checking
 */

/**
 * Check if a password has been exposed in known data breaches
 * Uses HIBP's k-Anonymity model - only sends first 5 chars of SHA-1 hash
 * @param password - The password to check
 * @returns Promise<boolean> - true if password found in breach, false if safe
 */
export async function isPasswordLeaked(password: string): Promise<boolean> {
  try {
    // Generate SHA-1 hash of the password
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    
    // Split hash: first 5 chars sent to API, rest used for local comparison
    const prefix = hashHex.slice(0, 5);
    const suffix = hashHex.slice(5);
    
    // Query HIBP API with hash prefix (k-Anonymity - privacy safe)
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      method: 'GET',
      headers: {
        'Add-Padding': 'true' // Additional privacy protection
      }
    });
    
    if (!response.ok) {
      // SECURITY FIX: Fail closed - if API is down, require different password
      logger.error('HIBP API unavailable, failing closed for security', undefined, {
        status: response.status,
      });
      return true; // Treat as leaked to prevent potentially compromised passwords
    }
    
    const text = await response.text();
    const hashes = text.split('\n');
    
    // Check if our password's suffix appears in the returned list
    return hashes.some(line => {
      const [hashSuffix] = line.split(':');
      return hashSuffix === suffix;
    });
  } catch (error) {
    // SECURITY FIX: Fail closed on errors - better to block signup than allow leaked password
    logger.error('Password leak check failed', error);
    return true; // Treat as leaked to force user to try different password
  }
}
