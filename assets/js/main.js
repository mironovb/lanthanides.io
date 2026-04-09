/**
 * Strategic Materials Ledger — Main JS
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    // Initialize table sorting
    if (typeof SML_Sort !== 'undefined') {
      SML_Sort.init();
    }

    // Mobile nav toggle
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.querySelector('.site-nav');
    if (toggle && nav) {
      toggle.addEventListener('click', function () {
        var expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', !expanded);
        nav.classList.toggle('nav-open');
      });
    }
  });
})();
