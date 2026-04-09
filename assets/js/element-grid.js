/**
 * Strategic Materials Ledger — Compact Element Grid
 * Renders a compact periodic-table-style element grid on the landing page.
 * Progressive enhancement: detailed server-rendered tile grid is the no-JS fallback.
 */
var SML_ElementGrid = (function () {
  'use strict';

  var gridContainer;

  var CAT_CLS = {
    rare_earth_light: 'cat-rare-earth-light',
    rare_earth_heavy: 'cat-rare-earth-heavy',
    strategic_metal: 'cat-strategic-metal',
    semiconductor_metal: 'cat-semiconductor-metal'
  };

  var CAT_ORDER = {
    rare_earth_light: 0,
    rare_earth_heavy: 1,
    strategic_metal: 2,
    semiconductor_metal: 3
  };

  function init() {
    gridContainer = document.querySelector('.elements-grid');
    if (!gridContainer) return;
    load();
  }

  function load() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', (window.baseurl || '') + '/assets/data/elements.json', true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        try {
          var elements = JSON.parse(xhr.responseText);
          build(elements);
        } catch (e) {
          // Keep server-rendered grid
        }
      }
    };
    xhr.send();
  }

  function build(elements) {
    // Sort by category order, then atomic number
    elements.sort(function (a, b) {
      var ca = CAT_ORDER[a.category] != null ? CAT_ORDER[a.category] : 99;
      var cb = CAT_ORDER[b.category] != null ? CAT_ORDER[b.category] : 99;
      if (ca !== cb) return ca - cb;
      return a.atomic_number - b.atomic_number;
    });

    var grid = document.createElement('div');
    grid.className = 'compact-grid';

    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      var price = bestPrice(el);
      var tooltip = el.name + (price ? ' \u2014 ' + price : ' \u2014 No price data');

      var cell = document.createElement('a');
      cell.href = '/elements/' + el.symbol + '/';
      cell.className = 'compact-cell ' + (CAT_CLS[el.category] || '');
      cell.title = tooltip;

      var sym = document.createElement('span');
      sym.className = 'compact-sym';
      sym.textContent = el.symbol;
      cell.appendChild(sym);

      var priceEl = document.createElement('span');
      priceEl.className = 'compact-price';
      priceEl.textContent = price || '\u2014';
      cell.appendChild(priceEl);

      grid.appendChild(cell);
    }

    gridContainer.parentNode.replaceChild(grid, gridContainer);
  }

  function bestPrice(el) {
    var p = null;
    if (el.retail_reference && el.retail_reference.price_per_kg != null) {
      p = el.retail_reference.price_per_kg;
    } else if (el.bulk_benchmark && el.bulk_benchmark.price_per_kg != null) {
      p = el.bulk_benchmark.price_per_kg;
    }
    if (p == null) return null;
    return abbreviate(parseFloat(p));
  }

  function abbreviate(n) {
    if (isNaN(n)) return null;
    if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
    if (n >= 10000) return '$' + Math.round(n / 1000) + 'k';
    if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'k';
    return '$' + Math.round(n);
  }

  return { init: init };
})();
