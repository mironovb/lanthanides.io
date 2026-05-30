/**
 * Strategic Materials Ledger — Interactive Price Ledger
 * Fetches element JSON and renders a sortable, filterable, searchable table.
 * Progressive enhancement: server-rendered price tables are the no-JS fallback.
 */
var SML_Ledger = (function () {
  'use strict';

  var container, tbody;
  var elements = [];
  var sort = { col: 'atomic_number', dir: 'asc' };
  var filterCat = 'all';
  var searchQuery = '';

  var CAT_LABELS = {
    rare_earth_light: 'Light REE',
    rare_earth_heavy: 'Heavy REE',
    strategic_metal: 'Strategic',
    semiconductor_metal: 'Semiconductor'
  };

  var CAT_BADGE = {
    rare_earth_light: 'ree-light',
    rare_earth_heavy: 'ree-heavy',
    strategic_metal: 'strategic',
    semiconductor_metal: 'semiconductor'
  };

  var REG = {
    none: { label: 'None', cls: 'reg-none' },
    active: { label: 'Export Licence', cls: 'reg-export' },
    suspended: { label: 'Suspended', cls: 'reg-suspended' }
  };

  function init() {
    container = document.querySelector('.prices-page');
    if (!container) return;
    load();
  }

  function load() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', (window.baseurl || '') + '/assets/data/elements.json', true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        try {
          elements = JSON.parse(xhr.responseText);
          build();
        } catch (e) {
          // Keep server-rendered table as fallback
        }
      }
    };
    xhr.send();
  }

  function build() {
    // Hide server-rendered sections
    var sections = container.querySelectorAll('.price-table-section');
    for (var i = 0; i < sections.length; i++) sections[i].style.display = 'none';

    var wrap = document.createElement('div');
    wrap.className = 'ledger-interactive';

    // — Controls —
    var controls = document.createElement('div');
    controls.className = 'ledger-controls';

    // Filter buttons
    var filters = document.createElement('div');
    filters.className = 'ledger-filters';
    var cats = [
      ['all', 'All'],
      ['lanthanides', 'Lanthanides'],
      ['strategic', 'Strategic Metals'],
      ['technology', 'Technology Metals']
    ];
    for (var c = 0; c < cats.length; c++) {
      var btn = document.createElement('button');
      btn.className = 'ledger-filter-btn' + (cats[c][0] === 'all' ? ' active' : '');
      btn.setAttribute('data-filter', cats[c][0]);
      btn.textContent = cats[c][1];
      btn.addEventListener('click', onFilter);
      filters.appendChild(btn);
    }
    controls.appendChild(filters);

    // Search
    var searchWrap = document.createElement('div');
    searchWrap.className = 'ledger-search-wrap';
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'ledger-search';
    input.placeholder = 'Search by name or symbol\u2026';
    input.setAttribute('aria-label', 'Filter elements');
    input.addEventListener('input', function () {
      searchQuery = this.value.trim();
      update();
    });
    searchWrap.appendChild(input);
    controls.appendChild(searchWrap);
    wrap.appendChild(controls);

    // — Table —
    var tableWrap = document.createElement('div');
    tableWrap.className = 'ledger-table-wrap';

    var table = document.createElement('table');
    table.className = 'data-table ledger-table';

    var thead = document.createElement('thead');
    var hRow = document.createElement('tr');
    var cols = [
      ['Element', 'name', 'text', 'ledger-col-el'],
      ['Category', 'category', 'text', ''],
      ['Retail Ref ($/kg)', 'retail', 'price', 'col-price'],
      ['Bulk Bench ($/kg)', 'bulk', 'price', 'col-price'],
      ['Premium', 'premium', 'numeric', 'col-price'],
      ['Status', '', '', ''],
      ['Updated', 'updated', 'date', 'col-date']
    ];
    for (var h = 0; h < cols.length; h++) {
      var th = document.createElement('th');
      th.textContent = cols[h][0];
      if (cols[h][3]) th.className = cols[h][3];
      if (cols[h][1]) {
        th.setAttribute('data-sortable', '');
        th.setAttribute('data-sort-col', cols[h][1]);
        th.addEventListener('click', onSort);
      }
      hRow.appendChild(th);
    }
    thead.appendChild(hRow);
    table.appendChild(thead);

    tbody = document.createElement('tbody');
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    wrap.appendChild(tableWrap);

    // Insert before price-legend
    var legend = container.querySelector('.price-legend');
    if (legend) {
      container.insertBefore(wrap, legend);
    } else {
      container.appendChild(wrap);
    }

    update();
  }

  // — Event handlers —

  function onFilter() {
    filterCat = this.getAttribute('data-filter');
    var btns = container.querySelectorAll('.ledger-filter-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('active', btns[i] === this);
    }
    update();
  }

  function onSort() {
    var col = this.getAttribute('data-sort-col');
    if (sort.col === col) {
      sort.dir = sort.dir === 'asc' ? 'desc' : 'asc';
    } else {
      sort.col = col;
      sort.dir = 'asc';
    }
    var ths = container.querySelectorAll('.ledger-table th[data-sortable]');
    for (var i = 0; i < ths.length; i++) {
      ths[i].classList.remove('sort-asc', 'sort-desc');
    }
    this.classList.add('sort-' + sort.dir);
    update();
  }

  // — Filtering & sorting —

  function update() {
    var filtered = elements.filter(function (el) {
      if (filterCat === 'lanthanides' && el.category !== 'rare_earth_light' && el.category !== 'rare_earth_heavy') return false;
      if (filterCat === 'strategic' && el.category !== 'strategic_metal') return false;
      if (filterCat === 'technology' && el.category !== 'semiconductor_metal') return false;
      if (searchQuery) {
        var q = searchQuery.toLowerCase();
        if (el.symbol.toLowerCase().indexOf(q) === -1 && el.name.toLowerCase().indexOf(q) === -1) return false;
      }
      return true;
    });

    filtered.sort(function (a, b) {
      var av, bv;
      switch (sort.col) {
        case 'name': av = a.name; bv = b.name; break;
        case 'category': av = CAT_LABELS[a.category] || ''; bv = CAT_LABELS[b.category] || ''; break;
        case 'retail': av = priceNum(a.retail_reference); bv = priceNum(b.retail_reference); break;
        case 'bulk': av = priceNum(a.bulk_benchmark); bv = priceNum(b.bulk_benchmark); break;
        case 'premium': av = a.retail_premium_ratio || -1; bv = b.retail_premium_ratio || -1; break;
        case 'updated': av = dateStr(a); bv = dateStr(b); break;
        default: av = a.atomic_number; bv = b.atomic_number;
      }
      var cmp = (typeof av === 'number' && typeof bv === 'number') ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === 'asc' ? cmp : -cmp;
    });

    renderRows(filtered);
  }

  function priceNum(ref) {
    return (ref && ref.price_per_kg != null) ? parseFloat(ref.price_per_kg) : -1;
  }

  function dateStr(el) {
    return (el.retail_reference && el.retail_reference.date) ||
           (el.bulk_benchmark && el.bulk_benchmark.date) || '';
  }

  function fmtPrice(val) {
    if (val == null) return '\u2014';
    var n = parseFloat(val);
    if (isNaN(n)) return '\u2014';
    return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  // — Render —

  function renderRows(list) {
    if (list.length === 0) {
      tbody.innerHTML = '<tr class="table-empty"><td colspan="7">No elements match.</td></tr>';
      return;
    }

    var html = '';
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      var url = '/elements/' + esc(el.symbol) + '/';
      var reg = REG[(el.regulatory_status && el.regulatory_status.status_code) || 'none'] || REG.none;
      var badge = CAT_BADGE[el.category] || '';
      var retail = el.retail_reference ? fmtPrice(el.retail_reference.price_per_kg) : '\u2014';
      var bulk = el.bulk_benchmark ? fmtPrice(el.bulk_benchmark.price_per_kg) : '\u2014';
      var premium = el.retail_premium_ratio != null
        ? parseFloat(el.retail_premium_ratio).toFixed(1) + '\u00d7'
        : '\u2014';
      var date = dateStr(el) || '\u2014';

      html += '<tr class="ledger-row" data-url="' + url + '">'
        + '<td class="ledger-col-el"><span class="ledger-sym">' + esc(el.symbol) + '</span> ' + esc(el.name) + '</td>'
        + '<td><span class="badge-cat badge-' + badge + '">' + esc(CAT_LABELS[el.category] || el.category) + '</span></td>'
        + '<td class="col-price">' + retail + '</td>'
        + '<td class="col-price">' + bulk + '</td>'
        + '<td class="col-price">' + premium + '</td>'
        + '<td><span class="reg-badge ' + reg.cls + '">' + reg.label + '</span></td>'
        + '<td class="col-date">' + esc(date) + '</td>'
        + '</tr>';
    }
    tbody.innerHTML = html;

    var rows = tbody.querySelectorAll('.ledger-row');
    for (var j = 0; j < rows.length; j++) {
      rows[j].addEventListener('click', function () {
        window.location.href = this.getAttribute('data-url');
      });
    }
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return { init: init };
})();
