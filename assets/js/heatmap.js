/**
 * Strategic Materials Ledger — Heatmap
 * Colors heatmap cells based on price dislocation scores.
 */
var SML_Heatmap = (function () {
  'use strict';

  function init() {
    var grid = document.getElementById('heatmap-grid');
    if (!grid) return;

    // Baseline button handlers
    var buttons = document.querySelectorAll('.heatmap-baseline-btn');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function () {
        for (var j = 0; j < buttons.length; j++) {
          buttons[j].classList.remove('active');
        }
        this.classList.add('active');
        computeHeatmap(this.getAttribute('data-baseline'));
      });
    }

    computeHeatmap('all');
  }

  function computeHeatmap(baseline) {
    var cells = document.querySelectorAll('.heatmap-cell');

    cells.forEach(function (cell) {
      var pricesStr = cell.getAttribute('data-prices');

      if (!pricesStr) {
        cell.className = 'heatmap-cell heat-no-data';
        cell.querySelector('.heatmap-score').textContent = '—';
        cell.querySelector('.heatmap-premium').textContent = 'No data';
        return;
      }

      var prices = pricesStr.split(',').map(function (v) { return parseFloat(v.trim()); }).filter(function (v) { return !isNaN(v); });

      if (prices.length === 0) {
        cell.className = 'heatmap-cell heat-no-data';
        cell.querySelector('.heatmap-score').textContent = '—';
        cell.querySelector('.heatmap-premium').textContent = 'No data';
        return;
      }

      var current = prices[prices.length - 1]; // latest
      var baselineVal;

      switch (baseline) {
        case 'recent':
          // Use first ~30% of data as recent baseline
          var recentSlice = prices.slice(0, Math.max(1, Math.floor(prices.length * 0.3)));
          baselineVal = median(recentSlice);
          break;
        case '6month':
          // Use first ~50% as older baseline
          var halfSlice = prices.slice(0, Math.max(1, Math.floor(prices.length * 0.5)));
          baselineVal = median(halfSlice);
          break;
        default:
          baselineVal = median(prices);
      }

      if (baselineVal === 0) baselineVal = 1;

      var score = current / baselineVal;
      var premium = ((score - 1) * 100).toFixed(1);

      cell.querySelector('.heatmap-score').textContent = score.toFixed(2) + 'x';
      cell.querySelector('.heatmap-premium').textContent =
        (premium >= 0 ? '+' : '') + premium + '%';

      // Apply color class
      cell.className = 'heatmap-cell';
      if (score < 0.95) {
        cell.classList.add('heat-cool');
      } else if (score <= 1.05) {
        cell.classList.add('heat-neutral');
      } else if (score <= 1.25) {
        cell.classList.add('heat-warm');
      } else {
        cell.classList.add('heat-hot');
      }
    });
  }

  function median(arr) {
    if (arr.length === 0) return 0;
    var sorted = arr.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return { init: init };
})();
