/**
 * Strategic Materials Ledger — Main JS
 * Orchestrates initialization of all client-side features.
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    // Mobile nav toggle
    initMobileNav();

    // Initialize search
    if (document.getElementById('element-search')) {
      if (typeof SML_Search !== 'undefined') {
        SML_Search.init();
      }
    }

    // Initialize table sorting
    if (typeof SML_Sort !== 'undefined') {
      SML_Sort.init();
    }

    // Initialize sparkline charts
    if (typeof SML_Charts !== 'undefined') {
      SML_Charts.init();
    }

    // Initialize heatmap
    if (typeof SML_Heatmap !== 'undefined') {
      SML_Heatmap.init();
    }

    // Initialize element grid filtering
    initGridFiltering();

    // Sort movers by absolute change
    sortMovers();
  });

  /**
   * Mobile hamburger menu toggle
   */
  function initMobileNav() {
    var toggle = document.getElementById('nav-toggle');
    var nav = document.getElementById('site-nav');

    if (!toggle || !nav) return;

    toggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Close on click outside
    document.addEventListener('click', function (e) {
      if (!toggle.contains(e.target) && !nav.contains(e.target)) {
        nav.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });

    // Close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        nav.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /**
   * Sort movers panel by absolute percentage change (largest first).
   */
  function sortMovers() {
    var list = document.getElementById('movers-list');
    if (!list) return;

    var items = Array.prototype.slice.call(list.querySelectorAll('.mover-item'));
    if (items.length === 0) return;

    items.sort(function (a, b) {
      var aChange = Math.abs(parseFloat(a.getAttribute('data-change')) || 0);
      var bChange = Math.abs(parseFloat(b.getAttribute('data-change')) || 0);
      return bChange - aChange;
    });

    items.forEach(function (item) {
      list.appendChild(item);
    });
  }

  /**
   * Element grid filtering via filter chips and search.
   */
  function initGridFiltering() {
    var grid = document.getElementById('element-grid');
    var noResults = document.getElementById('no-results');
    var filterBar = document.getElementById('filter-bar');
    var sortSelect = document.getElementById('sort-select');

    if (!grid || !filterBar) return;

    var cards = Array.prototype.slice.call(grid.querySelectorAll('.element-card'));
    var activeFilters = { category: 'all', export: null };

    // Filter chip clicks
    filterBar.addEventListener('click', function (e) {
      var chip = e.target.closest('.filter-chip');
      if (!chip) return;

      var filterType = chip.getAttribute('data-filter');
      var filterValue = chip.getAttribute('data-value');

      if (filterType === 'category') {
        var catChips = filterBar.querySelectorAll('[data-filter="category"]');
        for (var i = 0; i < catChips.length; i++) {
          catChips[i].classList.remove('active');
        }
        chip.classList.add('active');
        activeFilters.category = filterValue;
      } else if (filterType === 'export') {
        if (chip.classList.contains('active')) {
          chip.classList.remove('active');
          activeFilters.export = null;
        } else {
          var expChips = filterBar.querySelectorAll('[data-filter="export"]');
          for (var j = 0; j < expChips.length; j++) {
            expChips[j].classList.remove('active');
          }
          chip.classList.add('active');
          activeFilters.export = filterValue;
        }
      }

      applyFilters();
    });

    // Sort select
    if (sortSelect) {
      sortSelect.addEventListener('change', function () {
        sortCards(sortSelect.value);
      });
    }

    function applyFilters() {
      var visibleCount = 0;

      cards.forEach(function (card) {
        var show = true;

        if (activeFilters.category !== 'all') {
          if (card.getAttribute('data-category') !== activeFilters.category) {
            show = false;
          }
        }

        if (activeFilters.export) {
          if (card.getAttribute('data-export') !== activeFilters.export) {
            show = false;
          }
        }

        // Check search filter
        var searchInput = document.getElementById('element-search');
        if (searchInput && searchInput.value.trim()) {
          var query = searchInput.value.trim().toLowerCase();
          var sym = (card.getAttribute('data-symbol') || '').toLowerCase();
          var name = (card.getAttribute('data-name') || '').toLowerCase();
          if (sym.indexOf(query) === -1 && name.indexOf(query) === -1) {
            show = false;
          }
        }

        card.style.display = show ? '' : 'none';
        if (show) visibleCount++;
      });

      if (noResults) {
        noResults.style.display = visibleCount === 0 ? '' : 'none';
      }
    }

    function sortCards(key) {
      cards.sort(function (a, b) {
        var aVal, bVal;
        switch (key) {
          case 'symbol':
            aVal = a.getAttribute('data-symbol') || '';
            bVal = b.getAttribute('data-symbol') || '';
            return aVal.localeCompare(bVal);
          case 'name':
            aVal = a.getAttribute('data-name') || '';
            bVal = b.getAttribute('data-name') || '';
            return aVal.localeCompare(bVal);
          case 'category':
            aVal = a.getAttribute('data-category') || '';
            bVal = b.getAttribute('data-category') || '';
            return aVal.localeCompare(bVal);
          case 'updated':
            aVal = a.getAttribute('data-updated') || '';
            bVal = b.getAttribute('data-updated') || '';
            return bVal.localeCompare(aVal);
          case 'price':
            aVal = parseFloat(a.getAttribute('data-bulk') || a.getAttribute('data-retail') || '0');
            bVal = parseFloat(b.getAttribute('data-bulk') || b.getAttribute('data-retail') || '0');
            return bVal - aVal;
          default:
            return 0;
        }
      });

      cards.forEach(function (card) {
        grid.appendChild(card);
      });
    }

    // Wire up search input for grid filtering
    var searchInput = document.getElementById('element-search');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        applyFilters();
      });
    }
  }
})();
