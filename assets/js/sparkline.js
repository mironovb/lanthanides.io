/**
 * Strategic Materials Ledger — Sparkline Generator
 * Creates tiny inline SVG sparklines from numeric data arrays.
 * Usage: var svg = SML_Sparkline.create([10, 20, 15, 30]);
 */
var SML_Sparkline = (function () {
  'use strict';

  var DEFAULTS = {
    width: 120,
    height: 30,
    color: '#1A5C6B',
    dotRadius: 2.5,
    strokeWidth: 1.5,
    padding: 3
  };

  /**
   * Create an SVG sparkline element.
   * @param {number[]} data — array of numeric values (nulls filtered out)
   * @param {object} [opts] — optional overrides: width, height, color, dotRadius, strokeWidth
   * @returns {SVGElement|null} — null if fewer than 2 real values
   */
  function create(data, opts) {
    if (!data || !data.length) return null;

    // Filter to real numbers
    var values = [];
    for (var i = 0; i < data.length; i++) {
      if (data[i] != null && isFinite(data[i])) {
        values.push(parseFloat(data[i]));
      }
    }
    if (values.length < 2) return null;

    // Merge options
    var o = {};
    var k;
    for (k in DEFAULTS) o[k] = DEFAULTS[k];
    if (opts) { for (k in opts) o[k] = opts[k]; }

    var w = o.width;
    var h = o.height;
    var pad = o.padding;
    var min = Infinity;
    var max = -Infinity;
    for (var m = 0; m < values.length; m++) {
      if (values[m] < min) min = values[m];
      if (values[m] > max) max = values[m];
    }
    var range = max - min || 1;

    var plotW = w - pad * 2;
    var plotH = h - pad * 2;

    // Build point string
    var points = [];
    for (var p = 0; p < values.length; p++) {
      var x = pad + (p / (values.length - 1)) * plotW;
      var y = pad + plotH - ((values[p] - min) / range) * plotH;
      points.push(x.toFixed(1) + ',' + y.toFixed(1));
    }

    // Last point coordinates for the dot
    var lastX = pad + plotW;
    var lastY = pad + plotH - ((values[values.length - 1] - min) / range) * plotH;

    // Build SVG
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.display = 'inline-block';
    svg.style.verticalAlign = 'middle';

    // Line
    var line = document.createElementNS(ns, 'polyline');
    line.setAttribute('points', points.join(' '));
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', o.color);
    line.setAttribute('stroke-width', o.strokeWidth);
    line.setAttribute('stroke-linejoin', 'round');
    line.setAttribute('stroke-linecap', 'round');
    svg.appendChild(line);

    // End dot
    var dot = document.createElementNS(ns, 'circle');
    dot.setAttribute('cx', lastX.toFixed(1));
    dot.setAttribute('cy', lastY.toFixed(1));
    dot.setAttribute('r', o.dotRadius);
    dot.setAttribute('fill', o.color);
    svg.appendChild(dot);

    return svg;
  }

  return { create: create };
})();
