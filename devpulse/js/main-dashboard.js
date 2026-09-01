import { DashboardController } from './DashboardController.js';

/**
 * DevPulse Main Dashboard - Main Entry Point
 *
 * Responsibilities:
 * 1. Instantiates DashboardController when DOM Content is fully loaded.
 * 2. Runs GSAP staggered entrance animations across all dashboard widget cards.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Instantiate Top-Level Dashboard Controller
  const dashboardController = new DashboardController();

  // 2. GSAP Staggered Entrance Animation for Widget Cards
  const widgetCards = document.querySelectorAll('.widget-card');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (widgetCards.length > 0 && !prefersReducedMotion && typeof gsap !== 'undefined') {
    gsap.fromTo(widgetCards,
      { opacity: 0, y: 16 },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.08,
        ease: 'power2.out',
        delay: 0.1
      }
    );
  } else {
    widgetCards.forEach(card => card.style.opacity = '1');
  }
});
