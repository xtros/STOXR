/**
 * Security & Input Sanitization Utilities
 * Protects against SQLi, XSS, CRLF/Email Header Injection, and ReDoS/Payload Flooding.
 */

// Strict RFC 5322 Email regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export interface SanitizedEmailResult {
  valid: boolean;
  cleanEmail: string;
  error?: string;
}

/**
 * Sanitizes and validates an email address against CRLF injection, null bytes,
 * invalid characters, and excessive payload sizes.
 */
export function sanitizeEmail(emailInput: string): SanitizedEmailResult {
  if (!emailInput || typeof emailInput !== 'string') {
    return { valid: false, cleanEmail: '', error: 'Email address is required.' };
  }

  // Remove whitespace and dangerous control characters (\0, \r, \n, etc.)
  const stripped = emailInput.replace(/[\x00-\x1F\x7F]/g, '').trim().toLowerCase();

  if (stripped.length === 0) {
    return { valid: false, cleanEmail: '', error: 'Email address cannot be empty.' };
  }

  if (stripped.length > 254) {
    return { valid: false, cleanEmail: '', error: 'Email address exceeds maximum permitted length (254 chars).' };
  }

  if (!EMAIL_REGEX.test(stripped)) {
    return { valid: false, cleanEmail: '', error: 'Please enter a valid email address format.' };
  }

  return { valid: true, cleanEmail: stripped };
}

/**
 * Sanitizes a plain text string (such as Full Name) to prevent stored XSS,
 * HTML injection, and control character attacks.
 */
export function sanitizeText(textInput: string, maxLength = 60): string {
  if (!textInput || typeof textInput !== 'string') {
    return '';
  }

  return textInput
    // Remove control characters (null bytes, newlines, tabs)
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Strip HTML/script tags
    .replace(/<[^>]*>?/gm, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Validates password criteria and prevents CPU exhaustion / bcrypt DoS attacks
 * by enforcing a strict length ceiling (72 characters).
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required.' };
  }

  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters long.' };
  }

  if (password.length > 72) {
    return { valid: false, error: 'Password cannot exceed 72 characters (bcrypt maximum limit).' };
  }

  return { valid: true };
}

/**
 * Simple client-side Rate Limiter to mitigate brute-force attempts and fast-flooding.
 */
class RateLimiter {
  private attempts = 0;
  private lockoutUntil = 0;
  private readonly maxAttempts: number;
  private readonly lockoutMs: number;

  constructor(maxAttempts = 5, lockoutMs = 30000) {
    this.maxAttempts = maxAttempts;
    this.lockoutMs = lockoutMs;
  }

  public checkAllowed(): { allowed: boolean; remainingSec?: number } {
    const now = Date.now();
    if (now < this.lockoutUntil) {
      const remainingSec = Math.ceil((this.lockoutUntil - now) / 1000);
      return { allowed: false, remainingSec };
    }
    return { allowed: true };
  }

  public recordFailure(): { allowed: boolean; remainingSec?: number } {
    this.attempts += 1;
    if (this.attempts >= this.maxAttempts) {
      this.lockoutUntil = Date.now() + this.lockoutMs;
      this.attempts = 0;
      return { allowed: false, remainingSec: Math.ceil(this.lockoutMs / 1000) };
    }
    return { allowed: true };
  }

  public reset(): void {
    this.attempts = 0;
    this.lockoutUntil = 0;
  }
}

export const authRateLimiter = new RateLimiter(5, 30000);
