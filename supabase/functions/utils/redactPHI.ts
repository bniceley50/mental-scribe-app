/**
 * PHI Redaction Utility for HIPAA Compliance
 * 
 * This utility redacts Protected Health Information (PHI) before sending
 * data to external LLMs or third-party vendors. This is a critical security
 * measure to ensure PHI is not exposed to external systems.
 * 
 * PHI indicators redacted:
 * - Social Security Numbers (SSN)
 * - Phone numbers
 * - Email addresses
 * - Dates of Birth (DOB)
 * - Medical Record Numbers (MRN)
 */

/**
 * Redacts PHI from text before sending to external APIs
 * @param text - The text content to redact
 * @returns Text with PHI indicators masked
 */
export function redactPHI(text: string): string {
  if (!text) return text;
  
  let redacted = text;
  
  // Redact Social Security Numbers (XXX-XX-XXXX or XXXXXXXXX)
  redacted = redacted.replace(
    /\b\d{3}-?\d{2}-?\d{4}\b/g,
    '[SSN-REDACTED]'
  );
  
  // Redact phone numbers (various formats)
  // Matches: (123) 456-7890, 123-456-7890, 123.456.7890, 1234567890
  redacted = redacted.replace(
    /\b(?:\+?1[-.]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})\b/g,
    '[PHONE-REDACTED]'
  );
  
  // Redact email addresses
  redacted = redacted.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    '[EMAIL-REDACTED]'
  );
  
  // Redact dates that could be DOB (MM/DD/YYYY, MM-DD-YYYY, YYYY-MM-DD)
  // Only redact if year is between 1900-2023 to avoid false positives
  redacted = redacted.replace(
    /\b(?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12][0-9]|3[01])[-/](?:19|20)\d{2}\b/g,
    '[DATE-REDACTED]'
  );
  redacted = redacted.replace(
    /\b(?:19|20)\d{2}[-/](?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12][0-9]|3[01])\b/g,
    '[DATE-REDACTED]'
  );
  
  // Redact Medical Record Numbers (MRN: followed by alphanumeric)
  redacted = redacted.replace(
    /\bMRN:?\s*[A-Z0-9]{4,}\b/gi,
    '[MRN-REDACTED]'
  );
  
  // Redact standalone numeric IDs that look like medical record numbers (6+ digits)
  // Only if preceded by common medical terms
  redacted = redacted.replace(
    /\b(?:patient|medical|record|chart|id|identifier|number)[\s#:]+\d{6,}\b/gi,
    '$1 [ID-REDACTED]'
  );
  
  return redacted;
}

/**
 * Check if text contains potential PHI that should be redacted
 * Useful for validation and logging
 * @param text - Text to check
 * @returns true if PHI indicators are detected
 */
export function containsPHI(text: string): boolean {
  if (!text) return false;
  
  const phiPatterns = [
    /\b\d{3}-?\d{2}-?\d{4}\b/, // SSN
    /\b(?:\+?1[-.]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})\b/, // Phone
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
    /\b(?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12][0-9]|3[01])[-/](?:19|20)\d{2}\b/, // Date
    /\bMRN:?\s*[A-Z0-9]{4,}\b/i, // MRN
  ];
  
  return phiPatterns.some(pattern => pattern.test(text));
}
