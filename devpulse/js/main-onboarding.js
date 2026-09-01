import { OnboardingUI } from './onboarding/OnboardingUI.js';

/**
 * DevPulse Onboarding Page - Main Entry Point
 *
 * Responsibilities:
 * 1. Instantiates the OnboardingUI controller when DOM Content is loaded.
 * 2. Executes card entrance animation using GSAP (opacity 0 -> 1, y: 20 -> 0).
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Instantiate OnboardingUI
  const onboardingUI = new OnboardingUI();

  // 2. Card entrance animation
  const onboardingCard = document.getElementById('onboardingCard');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (onboardingCard && !prefersReducedMotion && typeof gsap !== 'undefined') {
    gsap.fromTo(onboardingCard,
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: 'power2.out',
        delay: 0.1
      }
    );
  } else if (onboardingCard) {
    onboardingCard.style.opacity = '1';
  }
});
