import { OnboardingController } from './OnboardingController.js';

/**
 * OnboardingUI - Onboarding Interface Controller
 *
 * Responsibilities:
 * 1. Manages step state (1, 2, 3) and slide animations between setup sections using GSAP.
 * 2. Binds card option selection events, scale-pulse micro-animations, and button enabling logic.
 * 3. Enforces session verification policy via OnboardingController before rendering.
 * 4. Updates progress segment indicators synchronously with step navigation.
 */
export class OnboardingUI {
  #controller;
  #currentStep;
  #isAnimating;

  constructor() {
    this.#controller = new OnboardingController();
    this.#currentStep = 1;
    this.#isAnimating = false;

    this.init();
  }

  /**
   * Initializes onboarding view state & event listeners.
   */
  init() {
    // 1. Policy check: Ensure user is logged in and has not completed onboarding
    const access = this.#controller.checkAccess();
    if (!access.allowed) {
      console.log(`[OnboardingUI] Redirecting to ${access.redirect}...`);
      window.location.href = access.redirect;
      return;
    }

    // 2. Attach UI event bindings
    this.#bindStep1Events();
    this.#bindStep2Events();
    this.#bindStep3Events();
    this.#bindNavigationControls();
  }

  /**
   * Step 1: GitHub Username Field & Skip Link.
   */
  #bindStep1Events() {
    const githubInput = document.getElementById('githubUsername');
    const step1ContinueBtn = document.getElementById('step1ContinueBtn');

    if (githubInput) {
      githubInput.addEventListener('input', () => {
        const val = githubInput.value.trim();
        this.#controller.saveStepData('githubUsername', val);
      });
    }

    const skipBtn = document.getElementById('step1SkipBtn');
    if (skipBtn) {
      skipBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.#controller.saveStepData('githubUsername', '');
        this.goToStep(2);
      });
    }
  }

  /**
   * Step 2: Primary Focus Option Cards ("Frontend", "Backend", "Design").
   */
  #bindStep2Events() {
    const focusCards = document.querySelectorAll('.focus-card-btn');
    const step2ContinueBtn = document.getElementById('step2ContinueBtn');

    focusCards.forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        const selectedValue = card.getAttribute('data-value');

        // Update single-selection visual state
        focusCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        // Scale pulse feedback
        this.#animateCardPulse(card);

        // Save selected focus data & enable Continue button
        this.#controller.saveStepData('primaryFocus', selectedValue);
        if (step2ContinueBtn) {
          step2ContinueBtn.disabled = false;
        }
      });
    });
  }

  /**
   * Step 3: Theme Preference Cards ("Dark Mode", "Light Mode").
   */
  #bindStep3Events() {
    const themeCards = document.querySelectorAll('.theme-card-btn');
    const finishBtn = document.getElementById('finishSetupBtn');

    themeCards.forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        const selectedTheme = card.getAttribute('data-value');

        // Update single-selection visual state
        themeCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        // Scale pulse feedback
        this.#animateCardPulse(card);

        // Save selected theme data & enable Finish Setup button
        this.#controller.saveStepData('themePreference', selectedTheme);
        if (finishBtn) {
          finishBtn.disabled = false;
        }
      });
    });
  }

  /**
   * Binds Continue, Back, and Finish Setup button listeners.
   */
  #bindNavigationControls() {
    const step1ContinueBtn = document.getElementById('step1ContinueBtn');
    const step2ContinueBtn = document.getElementById('step2ContinueBtn');
    const step2BackBtn = document.getElementById('step2BackBtn');
    const step3BackBtn = document.getElementById('step3BackBtn');
    const finishBtn = document.getElementById('finishSetupBtn');

    if (step1ContinueBtn) {
      step1ContinueBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.goToStep(2);
      });
    }

    if (step2ContinueBtn) {
      step2ContinueBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.goToStep(3);
      });
    }

    if (step2BackBtn) {
      step2BackBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.goToStep(1);
      });
    }

    if (step3BackBtn) {
      step3BackBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.goToStep(2);
      });
    }

    if (finishBtn) {
      finishBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.#handleFinishSetup(finishBtn);
      });
    }
  }

  /**
   * GSAP Slide Transition between wizard steps.
   * @param {number} targetStep - Target step index (1, 2, 3).
   */
  goToStep(targetStep) {
    if (targetStep === this.#currentStep || this.#isAnimating) return;
    this.#isAnimating = true;

    const direction = targetStep > this.#currentStep ? 1 : -1;
    const currentView = document.getElementById(`stepView${this.#currentStep}`);
    const targetView = document.getElementById(`stepView${targetStep}`);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || typeof gsap === 'undefined') {
      if (currentView) currentView.classList.add('hidden');
      if (targetView) targetView.classList.remove('hidden');
      this.#currentStep = targetStep;
      this.#updateProgressBar(targetStep);
      this.#isAnimating = false;
      return;
    }

    // GSAP Slide Timeline
    const tl = gsap.timeline({
      onComplete: () => {
        this.#currentStep = targetStep;
        this.#isAnimating = false;
      }
    });

    // Animate current view out
    tl.to(currentView, {
      x: direction * -40,
      opacity: 0,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        if (currentView) currentView.classList.add('hidden');
        if (targetView) targetView.classList.remove('hidden');
        this.#updateProgressBar(targetStep);
      }
    });

    // Animate target view in
    tl.fromTo(targetView,
      { x: direction * 40, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.25, ease: 'power2.out' }
    );
  }

  /**
   * Updates progress indicator segments and accessibility text.
   */
  #updateProgressBar(stepIndex) {
    const segments = document.querySelectorAll('.progress-bar-segment');
    const label = document.getElementById('progressStepLabel');
    const header = document.querySelector('.onboarding-progress-header');

    segments.forEach((seg, idx) => {
      const segNum = idx + 1;
      seg.classList.remove('completed', 'active');

      if (segNum < stepIndex) {
        seg.classList.add('completed');
      } else if (segNum === stepIndex) {
        seg.classList.add('active');
      }
    });

    if (label) {
      label.textContent = `Step ${stepIndex} of 3`;
    }

    if (header) {
      header.setAttribute('aria-label', `Step ${stepIndex} of 3`);
    }
  }

  /**
   * Scale pulse micro-animation when selecting an option card (1 -> 1.03 -> 1).
   */
  #animateCardPulse(element) {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || typeof gsap === 'undefined') return;

    gsap.fromTo(element,
      { scale: 0.98 },
      { scale: 1.03, duration: 0.12, yoyo: true, repeat: 1, ease: 'power1.inOut' }
    );
  }

  /**
   * Handles final submission & redirection to dashboard.html.
   */
  #handleFinishSetup(button) {
    button.disabled = true;
    button.textContent = 'Saving setup...';

    const result = this.#controller.completeOnboarding();

    if (result.success) {
      button.textContent = 'Redirecting to Dashboard...';
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 500);
    } else {
      button.disabled = false;
      button.textContent = 'Finish Setup';
      alert(result.message || 'Error saving onboarding choices.');
    }
  }
}
