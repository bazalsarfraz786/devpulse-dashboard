import { AuthUI } from './auth/AuthUI.js';

/**
 * DevPulse Auth Page - Main Entry Point
 *
 * Responsibilities:
 * 1. Instantiates the AuthUI controller once DOM content is ready.
 * 2. Runs initial GSAP entrance animations for the authentication card.
 * 3. Initializes Locomotive Scroll on the primary wrapper container.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize AuthUI instance
  const authUI = new AuthUI();

  // 2. GSAP Entrance Animation for Card (Opacity 0 -> 1, y: 20 -> 0)
  const authCard = document.getElementById('authCard');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (authCard && !prefersReducedMotion && typeof gsap !== 'undefined') {
    gsap.fromTo(authCard,
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'power2.out',
        delay: 0.1
      }
    );
  } else if (authCard) {
    authCard.style.opacity = '1';
  }

  // 3. Locomotive Scroll Initialization
  const scrollContainer = document.querySelector('[data-scroll-container]') || document.querySelector('.scroll-container');
  if (scrollContainer && typeof LocomotiveScroll !== 'undefined') {
    try {
      const scroll = new LocomotiveScroll({
        el: scrollContainer,
        smooth: true,
        tablet: { smooth: true },
        smartphone: { smooth: false }
      });
      console.log('[DevPulse] Locomotive Scroll initialized successfully.');
    } catch (err) {
      console.warn('[DevPulse] Locomotive Scroll initialization note:', err);
    }
  }
});
