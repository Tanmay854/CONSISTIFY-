export const normalizeSummaryText = (value: string) =>
  value
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Dedupe key for quotes: ignores leading numbering ("12." / "3)" / "-"),
 * punctuation, quote marks, casing and spacing, so the same quote imported
 * with a different number is rejected as a duplicate.
 */
export const quoteKey = (value: string) =>
  normalizeSummaryText(value)
    .replace(/^[\s\-–—*•]*\d+\s*[.)\]:-]?\s*/, "")
    .replace(/[“”"'’‘`]/g, "")
    .replace(/[.,;:!?—–-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
