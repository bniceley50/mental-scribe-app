export function redactPHI(text: string): { redacted: string; hadPHI: boolean } {
  const rules = [
    { r: /\b\d{3}-\d{2}-\d{4}\b/g },                                                // SSN
    { r: /\b(0[1-9]|1[0-2])[\/-](0[1-9]|[12]\d|3[01])[\/-](19|20)\d{2}\b/g },          // DOB
    { r: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g },                                         // Phone
    { r: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },                    // Email
    { r: /\b(MRN|Medical Record)[ :#-]*[A-Z0-9]{6,}\b/gi },                          // MRN
    { r: /\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g },                                         // Naive names
  ];
  let red = text, hit = false;
  for (const { r } of rules) { if (r.test(red)) { hit = true; red = red.replace(r, "[REDACTED]"); } }
  return { redacted: red, hadPHI: hit };
}
