/**
 * Enhanced PHI Redactor (Sprint B)
 * 
 * Redacts multiple types of PHI/PII using regex patterns:
 * - SSN (Social Security Numbers)
 * - DOB (Dates of Birth)
 * - Phone numbers
 * - Email addresses
 * - Medical Record Numbers (MRN)
 * - Names (basic pattern)
 * - IP addresses
 * - Credit card numbers
 * - Addresses (basic pattern)
 * 
 * FUTURE: Integrate scrubadub + spaCy for more sophisticated NER-based redaction
 */

export interface RedactionResult {
  redacted: string;
  hadPHI: boolean;
  redactionCount: number;
  types: string[];
}

export function redactPHI(text: string): RedactionResult {
  const rules = [
    { name: 'SSN', r: /\b\d{3}-\d{2}-\d{4}\b/g },
    { name: 'DOB', r: /\b(0[1-9]|1[0-2])[\/-](0[1-9]|[12]\d|3[01])[\/-](19|20)\d{2}\b/g },
    { name: 'Phone', r: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g },
    { name: 'Email', r: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
    { name: 'MRN', r: /\b(MRN|Medical Record)[ :#-]*[A-Z0-9]{6,}\b/gi },
    { name: 'Name', r: /\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g },
    { name: 'IP', r: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g },
    { name: 'CreditCard', r: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g },
    { name: 'Address', r: /\b\d{1,5}\s+[A-Z][a-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)\b/gi },
  ];

  let redacted = text;
  let totalRedactions = 0;
  const typesFound: Set<string> = new Set();

  for (const { name, r } of rules) {
    const matches = redacted.match(r);
    if (matches && matches.length > 0) {
      totalRedactions += matches.length;
      typesFound.add(name);
      redacted = redacted.replace(r, '[REDACTED]');
    }
  }

  return {
    redacted,
    hadPHI: totalRedactions > 0,
    redactionCount: totalRedactions,
    types: Array.from(typesFound)
  };
}

// Simple backward compatibility
export function redactPHISimple(text: string): { redacted: string; hadPHI: boolean } {
  const result = redactPHI(text);
  return { redacted: result.redacted, hadPHI: result.hadPHI };
}
