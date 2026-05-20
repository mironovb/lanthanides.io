/**
 * Strategic Materials Ledger — Lightweight inline SVG price charts.
 *
 * Renders progressive-enhancement charts inside any element marked with
 * data-chart="price-history". The container is expected to hold a single
 * <script type="application/json"> child whose body is an array of
 * observations: [{d:"YYYY-MM-DD", t:"retail"|"bulk", p:<number>}, ...].
 *
 * Per the project's no-fabrication rule: per-day medians within a tier
 * become the plotted points (matching the fluctuation engine's daily
 * aggregation); a tier with only 1 or 2 observations gets dots without
 * a connecting line so the visual never implies a trend the data can't
 * support.
 */
(function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  var SERIES = [
    { key: 'retail', label: 'Retail' },
    { key: 'bulk',   label: 'Bulk' }
  ];

  // SVG viewBox; CSS scales the chart to its container width.
  var VIEW_W = 760;
  var VIEW_H = 280;
  var M = { top: 16, right: 16, bottom: 36, left: 56 };
  var PLOT_W = VIEW_W - M.left - M.right;
  var PLOT_H = VIEW_H - M.top - M.bottom;

  function init() {
    var nodes = document.querySelectorAll('[data-chart="price-history"]');
    for (var i = 0; i < nodes.length; i++) {
      renderChart(nodes[i]);
    }
  }

  function renderChart(container) {
    var dataEl = container.querySelector('script[type="application/json"]');
    if (!dataEl) return;
    var raw = (dataEl.textContent || '').trim();
    if (!raw) return;
    var obs;
    try {
      obs = JSON.parse(raw);
    } catch (e) {
      return;
    }
    if (!Array.isArray(obs) || obs.length === 0) return;

    var seriesData = SERIES.map(function (s) {
      return {
        key: s.key,
        label: s.label,
        points: aggregateByDay(obs.filter(function (o) { return o.t === s.key; }))
      };
    });

    var allPoints = seriesData.reduce(function (acc, s) {
      return acc.concat(s.points);
    }, []);

    if (allPoints.length === 0) {
      replaceWithMessage(container, 'No retail or bulk observations recorded yet.');
      return;
    }

    var xs = allPoints.map(function (p) { return p.x; });
    var ys = allPoints.map(function (p) { return p.y; });
    var xMin = Math.min.apply(null, xs);
    var xMax = Math.max.apply(null, xs);
    var yMaxRaw = Math.max.apply(null, ys);
    var yMin = 0;
    var yMax = yMaxRaw <= 0 ? 1 : niceCeil(yMaxRaw);

    var xRange = xMax - xMin;
    var yRange = yMax - yMin || 1;

    function xScale(x) {
      if (xRange === 0) return M.left + PLOT_W / 2;
      return M.left + ((x - xMin) / xRange) * PLOT_W;
    }
    function yScale(y) {
      return M.top + PLOT_H - ((y - yMin) / yRange) * PLOT_H;
    }

    var svg = el('svg', {
      'class': 'pc-svg',
      viewBox: '0 0 ' + VIEW_W + ' ' + VIEW_H,
      preserveAspectRatio: 'xMidYMid meet',
      role: 'img',
      'aria-label': 'Price history chart for ' + (container.getAttribute('data-symbol') || 'element')
    });

    drawAxes(svg, xMin, xMax, yMin, yMax, xScale, yScale);

    seriesData.forEach(function (s) {
      if (s.points.length === 0) return;
      var pts = s.points.slice().sort(function (a, b) { return a.x - b.x; });

      // 1 or 2 points: render only the markers, never a trend line.
      if (pts.length >= 3) {
        var poly = el('polyline', {
          'class': 'pc-line pc-line-' + s.key,
          points: pts.map(function (p) { return xScale(p.x) + ',' + yScale(p.y); }).join(' ')
        });
        svg.appendChild(poly);
      }

      pts.forEach(function (p) {
        var c = el('circle', {
          'class': 'pc-dot pc-dot-' + s.key,
          cx: xScale(p.x),
          cy: yScale(p.y),
          r: 4
        });
        var t = document.createElementNS(SVG_NS, 'title');
        t.textContent = s.label + ': $' + formatPrice(p.y) + '/kg on ' + p.dateStr +
          (p.n > 1 ? ' (median of ' + p.n + ' offers)' : '');
        c.appendChild(t);
        svg.appendChild(c);
      });
    });

    var placeholder = container.querySelector('.pc-placeholder');
    if (placeholder) placeholder.parentNode.removeChild(placeholder);
    container.appendChild(svg);
  }

  function aggregateByDay(rows) {
    var byDate = {};
    rows.forEach(function (o) {
      if (typeof o.p !== 'number' || !isFinite(o.p) || o.p <= 0) return;
      var key = String(o.d);
      (byDate[key] = byDate[key] || []).push(o.p);
    });
    var out = [];
    Object.keys(byDate).forEach(function (dateStr) {
      var prices = byDate[dateStr].slice().sort(function (a, b) { return a - b; });
      var mid = Math.floor(prices.length / 2);
      var med = prices.length % 2 === 1
        ? prices[mid]
        : (prices[mid - 1] + prices[mid]) / 2;
      var ts = Date.parse(dateStr);
      if (isFinite(ts)) {
        out.push({ x: ts, y: med, dateStr: dateStr, n: prices.length });
      }
    });
    return out;
  }

  function drawAxes(svg, xMin, xMax, yMin, yMax, xScale, yScale) {
    svg.appendChild(el('line', {
      'class': 'pc-axis',
      x1: M.left, y1: M.top + PLOT_H,
      x2: M.left + PLOT_W, y2: M.top + PLOT_H
    }));
    svg.appendChild(el('line', {
      'class': 'pc-axis',
      x1: M.left, y1: M.top,
      x2: M.left, y2: M.top + PLOT_H
    }));

    var yTicks = [yMin, (yMin + yMax) / 2, yMax];
    yTicks.forEach(function (v) {
      svg.appendChild(el('line', {
        'class': 'pc-grid',
        x1: M.left, y1: yScale(v),
        x2: M.left + PLOT_W, y2: yScale(v)
      }));
      var label = el('text', {
        'class': 'pc-label pc-label-y',
        x: M.left - 6,
        y: yScale(v) + 4,
        'text-anchor': 'end'
      });
      label.textContent = '$' + formatPrice(v);
      svg.appendChild(label);
    });

    var xTicks = xMin === xMax ? [xMin] : [xMin, (xMin + xMax) / 2, xMax];
    xTicks.forEach(function (x, i) {
      var anchor = xTicks.length === 1
        ? 'middle'
        : (i === 0 ? 'start' : (i === xTicks.length - 1 ? 'end' : 'middle'));
      var label = el('text', {
        'class': 'pc-label pc-label-x',
        x: xScale(x),
        y: M.top + PLOT_H + 18,
        'text-anchor': anchor
      });
      label.textContent = isoDate(x);
      svg.appendChild(label);
    });
  }

  function niceCeil(v) {
    if (v <= 1) return Math.ceil(v * 10) / 10;
    var exp = Math.floor(Math.log10(v));
    var f = v / Math.pow(10, exp);
    var nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
    return nf * Math.pow(10, exp);
  }

  function formatPrice(v) {
    if (v >= 10000) return (v / 1000).toFixed(0) + 'k';
    if (v >= 1000)  return (v / 1000).toFixed(1) + 'k';
    if (v >= 100)   return v.toFixed(0);
    if (v >= 10)    return v.toFixed(1);
    return v.toFixed(2);
  }

  function isoDate(ts) {
    return new Date(ts).toISOString().slice(0, 10);
  }

  function el(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        node.setAttribute(k, String(attrs[k]));
      });
    }
    return node;
  }

  function replaceWithMessage(container, message) {
    var placeholder = container.querySelector('.pc-placeholder');
    if (placeholder) placeholder.parentNode.removeChild(placeholder);
    var p = document.createElement('p');
    p.className = 'pc-empty';
    p.textContent = message;
    container.appendChild(p);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
