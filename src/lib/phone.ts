// Shared between server and client code — keep free of server-only imports.

/**
 * The ten digits of an Indian mobile number, or null when it isn't one.
 * Accepts what people actually type or paste: "98765 43210",
 * "+91 98765-43210", "919876543210", "09876543210".
 */
export function indianMobileDigits(input: string): string | null {
  const compact = input.replace(/[\s\-().]/g, "");
  if (!/^\+?\d+$/.test(compact)) return null;
  let digits = compact.replace(/^\+/, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  // Indian mobile numbers are ten digits and start with 6, 7, 8 or 9.
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

/** How every customer's number is stored and shown: "+91 98765 43210". */
export function formatIndianMobile(digits: string) {
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export const PHONE_ERROR =
  "Enter a 10-digit Indian mobile number (it starts with 6, 7, 8 or 9)";
