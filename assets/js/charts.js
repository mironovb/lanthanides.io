/**
 * Strategic Materials Ledger — Sparkline Charts
 * Canvas-based price trend visualization with tooltip hover.
 */
var SML_Charts = (function () {
  'use strict';

  var LINE_COLOR = '#4a90c4';
  var FILL_COLOR = 'rgba(74, 144, 196, 0.06)';
  var GRID_COLOR = 'rgba(37, 37, 53, 0.6)';
  var TEXT_COLOR = '#6a6c82';
  var DOT_COLOR = '#4a90c4';
  var HOVER_COLOR = '#e4e6ec';

  function init() {
    var canvases = document.querySelectorAll('.sparkline-canvas');
    for (var i = 0; i < canvases.length; i++) {
      renderChart(canvases[i]);
    }
  }

  function renderChart(canvas) {
    var valuesStr = canvas.getAttribute('data-values');
    var datesStr = canvas.getAttribute('data-dates');

    if (!valuesStr) return;

    var values = valuesStr.split(',').map(function (v) { return parseFloat(v.trim()); });
    var dates = datesStr ? datesStr.split(',').map(function (d) { return d.trim(); }) : [];

    if (values.length === 0) return;

    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.parentElement.getBoundingClientRect();
    var w = rect.width;
    var h = rect.height;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);

    var padLeft = 65;
    var padRight = 20;
    var padTop = 20;
    var padBottom = 30;
    var chartW = w - padLeft - padRight;
    var chartH = h - padTop - padBottom;

    var minVal = Math.min.apply(null, values);
    var maxVal = Math.max.apply(null, values);
    var range = maxVal - minVal || 1;

    // Add 10% padding to range
    minVal -= range * 0.1;
    maxVal += range * 0.1;
    range = maxVal - minVal;

    // Draw grid lines
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 0.5;
    var gridLines = 4;
    for (var g = 0; g <= gridLines; g++) {
      var gy = padTop + (chartH / gridLines) * g;
      ctx.beginPath();
      ctx.setLineDash([2, 3]);
      ctx.moveTo(padLeft, gy);
      ctx.lineTo(w - padRight, gy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Y-axis labels
      var yVal = maxVal - (range / gridLines) * g;
      ctx.fillStyle = TEXT_COLOR;
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText('$' + yVal.toFixed(0), padLeft - 8, gy + 3);
    }

    // Compute points
    var points = [];
    for (var i = 0; i < values.length; i++) {
      var x = padLeft + (i / Math.max(values.length - 1, 1)) * chartW;
      var y = padTop + (1 - (values[i] - minVal) / range) * chartH;
      points.push({ x: x, y: y, value: values[i], date: dates[i] || '' });
    }

    // Fill area under line
    ctx.fillStyle = FILL_COLOR;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (var j = 1; j < points.length; j++) {
      ctx.lineTo(points[j].x, points[j].y);
    }
    ctx.lineTo(points[points.length - 1].x, padTop + chartH);
    ctx.lineTo(points[0].x, padTop + chartH);
    ctx.closePath();
    ctx.fill();

    // Plot line
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (var k = 0; k < points.length; k++) {
      if (k === 0) {
        ctx.moveTo(points[k].x, points[k].y);
      } else {
        ctx.lineTo(points[k].x, points[k].y);
      }
    }
    ctx.stroke();

    // Draw dots
    for (var m = 0; m < points.length; m++) {
      // Outer ring
      ctx.fillStyle = 'rgba(74, 144, 196, 0.2)';
      ctx.beginPath();
      ctx.arc(points[m].x, points[m].y, 5, 0, Math.PI * 2);
      ctx.fill();
      // Inner dot
      ctx.fillStyle = DOT_COLOR;
      ctx.beginPath();
      ctx.arc(points[m].x, points[m].y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // X-axis date labels
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    if (dates.length > 0) {
      ctx.fillText(dates[0], points[0].x, h - 5);
      if (dates.length > 1) {
        ctx.fillText(dates[dates.length - 1], points[points.length - 1].x, h - 5);
      }
      // Show middle date if enough points
      if (dates.length >= 5) {
        var midIdx = Math.floor(dates.length / 2);
        ctx.fillText(dates[midIdx], points[midIdx].x, h - 5);
      }
    }

    // Price change annotation
    if (values.length >= 2) {
      var first = values[0];
      var last = values[values.length - 1];
      var change = ((last - first) / first * 100).toFixed(1);
      var changeText = (change >= 0 ? '+' : '') + change + '%';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillStyle = change >= 0 ? '#c0392b' : '#3d9970';
      ctx.fillText(changeText, w - padRight, padTop - 5);
    }

    // Hover tooltip
    canvas.addEventListener('mousemove', function (e) {
      var canvasRect = canvas.getBoundingClientRect();
      var mx = e.clientX - canvasRect.left;

      // Find nearest point
      var nearest = null;
      var nearestDist = Infinity;
      for (var p = 0; p < points.length; p++) {
        var dist = Math.abs(points[p].x - mx);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = points[p];
        }
      }

      if (nearest && nearestDist < 30) {
        canvas.style.cursor = 'crosshair';
        canvas.title = nearest.date + ': $' + nearest.value + '/kg';
      } else {
        canvas.style.cursor = 'default';
        canvas.title = '';
      }
    });
  }

  return { init: init };
})();
