/**
 * Strategic Materials Ledger — Search
 * Client-side element search with keyboard navigation.
 */
var SML_Search = (function () {
  'use strict';

  var searchInput, resultsContainer;
  var searchData = [];
  var focusedIndex = -1;

  function init() {
    searchInput = document.getElementById('element-search');
    resultsContainer = document.getElementById('search-results');

    if (!searchInput || !resultsContainer) return;

    // Load search index
    loadSearchIndex();

    // Event listeners
    searchInput.addEventListener('input', onInput);
    searchInput.addEventListener('keydown', onKeydown);
    searchInput.addEventListener('focus', function () {
      if (searchInput.value.trim().length > 0) {
        showResults();
      }
    });

    document.addEventListener('click', function (e) {
      if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
        hideResults();
      }
    });
  }

  function loadSearchIndex() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', (window.baseurl || '') + '/search.json', true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        try {
          searchData = JSON.parse(xhr.responseText);
        } catch (e) {
          console.warn('Failed to parse search index');
        }
      }
    };
    xhr.send();
  }

  function onInput() {
    var query = searchInput.value.trim().toLowerCase();

    if (query.length === 0) {
      hideResults();
      return;
    }

    var matches = searchData.filter(function (item) {
      return (
        item.symbol.toLowerCase().indexOf(query) !== -1 ||
        item.name.toLowerCase().indexOf(query) !== -1 ||
        (item.family || '').toLowerCase().indexOf(query) !== -1
      );
    }).slice(0, 10);

    renderResults(matches);
    focusedIndex = -1;
  }

  function onKeydown(e) {
    var items = resultsContainer.querySelectorAll('.search-result-item');
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusedIndex = Math.min(focusedIndex + 1, items.length - 1);
      updateFocus(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusedIndex = Math.max(focusedIndex - 1, 0);
      updateFocus(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < items.length) {
        var url = items[focusedIndex].getAttribute('data-url');
        if (url) window.location.href = url;
      }
    } else if (e.key === 'Escape') {
      hideResults();
      searchInput.blur();
    }
  }

  function updateFocus(items) {
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle('focused', i === focusedIndex);
    }
  }

  function renderResults(matches) {
    if (matches.length === 0) {
      resultsContainer.innerHTML = '<div class="search-result-item"><span class="result-name">No results found</span></div>';
      showResults();
      return;
    }

    var categoryLabels = {
      rare_earth_light: 'Light REE',
      rare_earth_heavy: 'Heavy REE',
      strategic_metal: 'Strategic',
      semiconductor_metal: 'Semiconductor'
    };

    var html = matches.map(function (item) {
      var catLabel = categoryLabels[item.category] || item.category || '';
      return (
        '<div class="search-result-item" data-url="' + item.url + '" role="option" tabindex="-1">' +
        '<span class="result-symbol">' + escapeHtml(item.symbol) + '</span>' +
        '<span class="result-name">' + escapeHtml(item.name) + '</span>' +
        '<span class="result-category">' + escapeHtml(catLabel) + '</span>' +
        '</div>'
      );
    }).join('');

    resultsContainer.innerHTML = html;
    showResults();

    // Click handlers
    var items = resultsContainer.querySelectorAll('.search-result-item');
    for (var i = 0; i < items.length; i++) {
      items[i].addEventListener('click', function () {
        var url = this.getAttribute('data-url');
        if (url) window.location.href = url;
      });
    }
  }

  function showResults() {
    resultsContainer.classList.add('active');
  }

  function hideResults() {
    resultsContainer.classList.remove('active');
    focusedIndex = -1;
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  return { init: init };
})();
