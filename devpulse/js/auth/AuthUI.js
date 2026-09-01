import { AuthController } from './AuthController.js';
import { Validator } from '../core/Validator.js';

/**
 * AuthUI - Interface Controller & DOM Manager
 *
 * Responsibilities:
 * 1. Coordinates all UI states (Login vs Signup form modes).
 * 2. Manages GSAP 3D card-flip transitions, entrance animations, and field shake feedback.
 * 3. Binds event listeners dynamically using standard addEventListener (no inline HTML handlers).
 * 4. Implements real-time password strength meter updates and field-level inline validation.
 * 5. Handles password show/hide eye icon toggling and accessibility feedback.
 */
export class AuthUI {
  // Private state variables
  #authController;
  #currentForm; // 'login' | 'signup'
  #isAnimating;

  // Eye icon SVG templates for password visibility toggle
  static EYE_OPEN_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  static EYE_CLOSED_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

  constructor() {
    this.#authController = new AuthController();
    this.#currentForm = 'login';
    this.#isAnimating = false;

    this.init();
  }

  /**
   * Initializes DOM element queries and attaches all event handlers.
   */
  init() {
    this.#bindFormSwitching();
    this.#bindPasswordToggles();
    this.#bindRealtimeValidation();
    this.#bindPasswordStrengthMeter();
    this.#bindFormSubmissions();

    // Check if user is already authenticated and pre-fill or redirect if needed
    if (this.#authController.isAuthenticated()) {
      console.log('[AuthUI] Active session detected in sessionStorage.');
    }
  }

  /**
   * Binds GSAP 3D Card Flip event listeners for switching between Login and Signup forms.
   */
  #bindFormSwitching() {
    const switchToSignupBtn = document.getElementById('switchToSignup');
    const switchToLoginBtn = document.getElementById('switchToLogin');

    if (switchToSignupBtn) {
      switchToSignupBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchForm('signup');
      });
    }

    if (switchToLoginBtn) {
      switchToLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchForm('login');
      });
    }
  }

  /**
   * Triggers GSAP 3D Card Flip Animation to switch view states.
   * @param {'login'|'signup'} targetForm - Form state to reveal.
   */
  switchForm(targetForm) {
    if (this.#currentForm === targetForm || this.#isAnimating) return;
    this.#isAnimating = true;

    const card = document.getElementById('authCard');
    const loginView = document.getElementById('loginView');
    const signupView = document.getElementById('signupView');
    const cardTitle = document.getElementById('cardTitle');
    const cardSubtitle = document.getElementById('cardSubtitle');

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || typeof gsap === 'undefined') {
      // Instant switch without 3D animation
      this.#toggleViewDOM(targetForm, loginView, signupView, cardTitle, cardSubtitle);
      this.#currentForm = targetForm;
      this.#isAnimating = false;
      return;
    }

    // GSAP 3D Flip Timeline
    const tl = gsap.timeline({
      onComplete: () => {
        this.#isAnimating = false;
      }
    });

    // Step 1: Rotate card 90 degrees and scale down slightly
    tl.to(card, {
      rotateY: 90,
      scale: 0.95,
      duration: 0.25,
      ease: 'power1.in',
      onComplete: () => {
        // Halfway point: swap DOM visibility and titles
        this.#toggleViewDOM(targetForm, loginView, signupView, cardTitle, cardSubtitle);
        this.#currentForm = targetForm;
      }
    });

    // Step 2: Rotate back from -90 to 0 degrees and restore scale
    tl.fromTo(card,
      { rotateY: -90, scale: 0.95 },
      { rotateY: 0, scale: 1, duration: 0.25, ease: 'power1.out' }
    );
  }

  /**
   * Internal helper to update DOM titles and form visibility during flip.
   */
  #toggleViewDOM(targetForm, loginView, signupView, cardTitle, cardSubtitle) {
    // Clear global alerts and errors on switch
    this.#clearAlerts();

    if (targetForm === 'signup') {
      loginView.classList.add('hidden');
      signupView.classList.remove('hidden');
      if (cardTitle) cardTitle.textContent = 'Create account';
      if (cardSubtitle) cardSubtitle.textContent = 'Get started with DevPulse dashboard';
    } else {
      signupView.classList.add('hidden');
      loginView.classList.remove('hidden');
      if (cardTitle) cardTitle.textContent = 'Welcome back';
      if (cardSubtitle) cardSubtitle.textContent = 'Log in to your productivity dashboard';
    }
  }

  /**
   * Password Show/Hide toggle button listener setup.
   */
  #bindPasswordToggles() {
    const toggleButtons = document.querySelectorAll('.toggle-password-btn');

    toggleButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);

        if (!input) return;

        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        btn.innerHTML = isPassword ? AuthUI.EYE_CLOSED_SVG : AuthUI.EYE_OPEN_SVG;
        btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      });
    });
  }

  /**
   * Real-time password strength meter listener (attached to signup password field).
   */
  #bindPasswordStrengthMeter() {
    const signupPasswordInput = document.getElementById('signupPassword');
    const strengthMeter = document.getElementById('strengthMeter');
    const strengthText = document.getElementById('strengthText');

    if (!signupPasswordInput || !strengthMeter) return;

    signupPasswordInput.addEventListener('input', () => {
      const val = signupPasswordInput.value;
      if (!val) {
        strengthMeter.setAttribute('data-score', '0');
        if (strengthText) strengthText.textContent = 'None';
        return;
      }

      const result = Validator.checkPasswordStrength(val);
      strengthMeter.setAttribute('data-score', result.score.toString());
      if (strengthText) {
        strengthText.textContent = result.label;
        strengthText.style.color = result.color;
      }
    });
  }

  /**
   * Attaches blur and input events for real-time visual field feedback.
   */
  #bindRealtimeValidation() {
    // Signup Confirm Password match validation on blur
    const signupPassword = document.getElementById('signupPassword');
    const confirmPassword = document.getElementById('signupConfirmPassword');

    if (confirmPassword) {
      confirmPassword.addEventListener('blur', () => {
        if (confirmPassword.value && signupPassword.value) {
          if (!Validator.passwordsMatch(signupPassword.value, confirmPassword.value)) {
            this.#showFieldError(confirmPassword, 'Passwords do not match.');
          } else {
            this.#clearFieldError(confirmPassword);
          }
        }
      });
    }

    // Attach input event cleanup on all form inputs to clear error on typing
    document.querySelectorAll('.form-input').forEach(input => {
      input.addEventListener('input', () => {
        this.#clearFieldError(input);
      });
    });
  }

  /**
   * Binds submit listeners to Login and Signup HTML forms.
   */
  #bindFormSubmissions() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.#handleLoginSubmit(e));
    }

    if (signupForm) {
      signupForm.addEventListener('submit', (e) => this.#handleSignupSubmit(e));
    }

    // Handle "Forgot password?" link (non-functional stub with preventDefault)
    const forgotLink = document.getElementById('forgotPasswordLink');
    if (forgotLink) {
      forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.#showGlobalAlert('Password reset is managed by your workspace administrator.', 'error');
      });
    }
  }

  /**
   * Handles Login form submission logic.
   */
  async #handleLoginSubmit(e) {
    e.preventDefault();
    this.#clearAlerts();

    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const submitBtn = document.getElementById('loginSubmitBtn');

    let isValid = true;

    if (!Validator.validateEmail(emailInput.value)) {
      this.#showFieldError(emailInput, 'Please enter a valid email address.');
      this.#animateFieldError(emailInput);
      isValid = false;
    }

    if (!passwordInput.value) {
      this.#showFieldError(passwordInput, 'Please enter your password.');
      this.#animateFieldError(passwordInput);
      isValid = false;
    }

    if (!isValid) return;

    // Tactile button click feedback
    this.#animateButtonClick(submitBtn);
    this.#setButtonLoading(submitBtn, true, 'Logging in...');

    const result = await this.#authController.login({
      email: emailInput.value,
      password: passwordInput.value
    });

    if (result.success) {
      this.#showGlobalAlert(result.message, 'success');
      // Forward to onboarding.html (which redirects to dashboard.html if onboarding is already complete)
      setTimeout(() => {
        window.location.href = 'onboarding.html';
      }, 800);
    } else {
      this.#setButtonLoading(submitBtn, false, 'Log In');
      this.#showGlobalAlert(result.message, 'error');
      this.#animateFieldError(emailInput);
      this.#animateFieldError(passwordInput);
    }
  }

  /**
   * Handles Signup form submission logic.
   */
  async #handleSignupSubmit(e) {
    e.preventDefault();
    this.#clearAlerts();

    const nameInput = document.getElementById('signupName');
    const emailInput = document.getElementById('signupEmail');
    const passwordInput = document.getElementById('signupPassword');
    const confirmInput = document.getElementById('signupConfirmPassword');
    const submitBtn = document.getElementById('signupSubmitBtn');

    let isValid = true;

    if (!Validator.validateFullName(nameInput.value)) {
      this.#showFieldError(nameInput, 'Full Name must be at least 2 characters.');
      this.#animateFieldError(nameInput);
      isValid = false;
    }

    if (!Validator.validateEmail(emailInput.value)) {
      this.#showFieldError(emailInput, 'Please enter a valid email address.');
      this.#animateFieldError(emailInput);
      isValid = false;
    }

    if (!Validator.validatePassword(passwordInput.value)) {
      this.#showFieldError(passwordInput, 'Password must be 8+ chars with letters & numbers.');
      this.#animateFieldError(passwordInput);
      isValid = false;
    }

    if (!Validator.passwordsMatch(passwordInput.value, confirmInput.value)) {
      this.#showFieldError(confirmInput, 'Passwords do not match.');
      this.#animateFieldError(confirmInput);
      isValid = false;
    }

    if (!isValid) return;

    // Tactile button click feedback
    this.#animateButtonClick(submitBtn);
    this.#setButtonLoading(submitBtn, true, 'Creating Account...');

    const result = await this.#authController.signup({
      fullName: nameInput.value,
      email: emailInput.value,
      password: passwordInput.value,
      confirmPassword: confirmInput.value
    });

    if (result.success) {
      const createdEmail = emailInput.value;

      // 1. Reset signup inputs
      nameInput.value = '';
      emailInput.value = '';
      passwordInput.value = '';
      confirmInput.value = '';

      // 2. Reset strength meter
      const strengthMeter = document.getElementById('strengthMeter');
      const strengthText = document.getElementById('strengthText');
      if (strengthMeter) strengthMeter.setAttribute('data-score', '0');
      if (strengthText) strengthText.textContent = 'None';

      // 3. Pre-fill login email field
      const loginEmailInput = document.getElementById('loginEmail');
      if (loginEmailInput) {
        loginEmailInput.value = createdEmail;
      }

      this.#setButtonLoading(submitBtn, false, 'Create Account');

      // 4. Flip 3D card back to Login view
      this.switchForm('login');
      this.#showGlobalAlert(result.message, 'success');

      // 5. Focus password input on login form
      const loginPasswordInput = document.getElementById('loginPassword');
      if (loginPasswordInput) {
        setTimeout(() => loginPasswordInput.focus(), 500);
      }
    } else {
      this.#setButtonLoading(submitBtn, false, 'Create Account');
      if (result.message.includes('already exists')) {
        this.#showFieldError(emailInput, result.message);
        this.#animateFieldError(emailInput);
      } else {
        this.#showGlobalAlert(result.message, 'error');
      }
    }
  }

  /* ==========================================
     UI Helpers, Alerts & Animations
     ========================================== */

  /**
   * Displays inline field error message and updates input border.
   */
  #showFieldError(input, message) {
    input.classList.add('is-invalid');
    input.classList.remove('is-valid');

    const group = input.closest('.form-group');
    if (group) {
      const errorDiv = group.querySelector('.field-error');
      if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.add('visible');
      }
    }
  }

  /**
   * Clears inline field error message and resets input border state.
   */
  #clearFieldError(input) {
    input.classList.remove('is-invalid');

    const group = input.closest('.form-group');
    if (group) {
      const errorDiv = group.querySelector('.field-error');
      if (errorDiv) {
        errorDiv.textContent = '';
        errorDiv.classList.remove('visible');
      }
    }
  }

  /**
   * Triggers GSAP shake animation on field container when validation fails.
   */
  #animateFieldError(input) {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || typeof gsap === 'undefined') return;

    const target = input.closest('.form-group') || input;
    gsap.fromTo(target,
      { x: -8 },
      {
        x: 0,
        duration: 0.4,
        ease: 'elastic.out(1, 0.3)',
        clearProps: 'x'
      }
    );
  }

  /**
   * Triggers scale down/up tactile button click animation.
   */
  #animateButtonClick(button) {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || typeof gsap === 'undefined') return;

    gsap.fromTo(button,
      { scale: 0.97 },
      { scale: 1, duration: 0.2, ease: 'power1.out' }
    );
  }

  /**
   * Displays global form alert message.
   */
  #showGlobalAlert(message, type = 'error') {
    const alertDiv = document.getElementById('globalAlert');
    if (!alertDiv) return;

    alertDiv.textContent = message;
    alertDiv.className = `global-alert ${type}`;
    alertDiv.style.display = 'flex';
  }

  /**
   * Clears global alert messages.
   */
  #clearAlerts() {
    const alertDiv = document.getElementById('globalAlert');
    if (alertDiv) {
      alertDiv.style.display = 'none';
      alertDiv.textContent = '';
    }

    document.querySelectorAll('.form-input').forEach(input => {
      this.#clearFieldError(input);
    });
  }

  /**
   * Manages button disabled & text state during async submission.
   */
  #setButtonLoading(button, isLoading, text) {
    if (!button) return;
    button.disabled = isLoading;
    button.textContent = text;
  }
}
