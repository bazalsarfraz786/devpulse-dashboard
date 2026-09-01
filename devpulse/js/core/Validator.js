/**
 * Validator - Pure Validation & Regex Helper Class
 *
 * Responsibilities:
 * 1. Provides static regex and criteria validators for email, password rules, and names.
 * 2. Calculates real-time 3-tier password strength (Weak, Medium, Strong).
 * 3. Keeps validation logic pure, deterministic, and decoupled from DOM or storage code.
 */
export class Validator {
  // Regex definitions
  static EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  static HAS_LETTER_REGEX = /[A-Za-z]/;
  static HAS_NUMBER_REGEX = /\d/;
  static HAS_SPECIAL_REGEX = /[!@#$%^&*(),.?":{}|<>]/;

  /**
   * Validates if email string conforms to standard RFC format.
   * @param {string} email
   * @returns {boolean}
   */
  static validateEmail(email) {
    if (!email || typeof email !== 'string') return false;
    return this.EMAIL_REGEX.test(email.trim());
  }

  /**
   * Validates full name input (must contain at least 2 non-whitespace characters).
   * @param {string} name
   * @returns {boolean}
   */
  static validateFullName(name) {
    if (!name || typeof name !== 'string') return false;
    return name.trim().length >= 2;
  }

  /**
   * Checks baseline password compliance for form submission.
   * Required: Minimum 8 characters, at least 1 letter, and at least 1 number.
   * @param {string} password
   * @returns {boolean}
   */
  static validatePassword(password) {
    if (!password || typeof password !== 'string') return false;
    if (password.length < 8) return false;
    if (!this.HAS_LETTER_REGEX.test(password)) return false;
    if (!this.HAS_NUMBER_REGEX.test(password)) return false;
    return true;
  }

  /**
   * Compares password and confirmation strings.
   * @param {string} password
   * @param {string} confirmPassword
   * @returns {boolean}
   */
  static passwordsMatch(password, confirmPassword) {
    return password !== '' && password === confirmPassword;
  }

  /**
   * Evaluates password strength for the real-time 3-segment meter.
   *
   * Scoring Tiers:
   * - Weak (1): length < 8 OR missing letter/number mix. Color: var(--error)
   * - Medium (2): length >= 8 AND has letter + number. Color: var(--accent)
   * - Strong (3): length >= 10 AND has letter + number + special char. Color: var(--success)
   *
   * @param {string} password
   * @returns {{ score: number, label: string, color: string }}
   */
  static checkPasswordStrength(password) {
    if (!password || typeof password !== 'string') {
      return { score: 0, label: '', color: 'var(--border)' };
    }

    const length = password.length;
    const hasLetter = this.HAS_LETTER_REGEX.test(password);
    const hasNumber = this.HAS_NUMBER_REGEX.test(password);
    const hasSpecial = this.HAS_SPECIAL_REGEX.test(password);

    // Strong criteria: length >= 10, letter + number + special character
    if (length >= 10 && hasLetter && hasNumber && hasSpecial) {
      return {
        score: 3,
        label: 'Strong',
        color: 'var(--success)'
      };
    }

    // Medium criteria: length >= 8, letter + number
    if (length >= 8 && hasLetter && hasNumber) {
      return {
        score: 2,
        label: 'Medium',
        color: 'var(--accent)'
      };
    }

    // Weak criteria: fails baseline requirements or short
    return {
      score: 1,
      label: 'Weak',
      color: 'var(--error)'
    };
  }
}
