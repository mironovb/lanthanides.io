/**
 * Strategic Materials Ledger — Table Sorting
 * Click-to-sort for data tables with [data-sortable] headers.
 */
var SML_Sort = (function () {
  'use strict';

  function init() {
    var tables = document.querySelectorAll('.data-table');
    for (var i = 0; i < tables.length; i++) {
      initTable(tables[i]);
    }
  }

  function initTable(table) {
    var headers = table.querySelectorAll('th[data-sortable]');
    for (var i = 0; i < headers.length; i++) {
      headers[i].addEventListener('click', createSortHandler(table, headers[i], i));
    }
  }

  function createSortHandler(table, header, colIndex) {
    return function () {
      var tbody = table.querySelector('tbody');
      if (!tbody) return;

      var rows = Array.prototype.slice.call(tbody.querySelectorAll('tr:not(.table-empty)'));
      if (rows.length === 0) return;

      // Determine sort direction
      var isAsc = header.classList.contains('sort-asc');
      var allHeaders = table.querySelectorAll('th[data-sortable]');
      for (var i = 0; i < allHeaders.length; i++) {
        allHeaders[i].classList.remove('sort-asc', 'sort-desc');
      }

      var direction = isAsc ? 'desc' : 'asc';
      header.classList.add('sort-' + direction);

      var sortKey = header.getAttribute('data-sort-key') || 'text';

      rows.sort(function (a, b) {
        var aCell = a.cells[colIndex];
        var bCell = b.cells[colIndex];
        if (!aCell || !bCell) return 0;

        var aVal, bVal;

        if (sortKey === 'price' || sortKey === 'numeric') {
          aVal = parseFloat(aCell.textContent.replace(/[^0-9.\-]/g, '')) || 0;
          bVal = parseFloat(bCell.textContent.replace(/[^0-9.\-]/g, '')) || 0;
        } else if (sortKey === 'date') {
          aVal = aCell.textContent.trim();
          bVal = bCell.textContent.trim();
        } else {
          aVal = aCell.textContent.trim().toLowerCase();
          bVal = bCell.textContent.trim().toLowerCase();
        }

        var cmp;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          cmp = aVal - bVal;
        } else {
          cmp = String(aVal).localeCompare(String(bVal));
        }

        return direction === 'asc' ? cmp : -cmp;
      });

      rows.forEach(function (row) {
        tbody.appendChild(row);
      });
    };
  }

  return { init: init };
})();
