/**
 * Strategic Materials Ledger — Regulatory Timeline Filters
 * Adds element and event-type filtering to the server-rendered MOFCOM timeline.
 * Progressive enhancement: timeline is fully readable without JS.
 */
var SML_RegTimeline = (function () {
  'use strict';

  var timeline, items;
  var allElements = [];
  var allTypes = [];
  var activeElement = null;
  var activeType = null;

  function init() {
    timeline = document.querySelector('.policy-timeline');
    if (!timeline) return;

    items = Array.prototype.slice.call(timeline.querySelectorAll('.timeline-item'));
    if (items.length === 0) return;

    // Extract unique elements and event types from the DOM
    var elemSet = {};
    var typeSet = {};
    for (var i = 0; i < items.length; i++) {
      // Element tags
      var tags = items[i].querySelectorAll('.timeline-element-tag');
      for (var t = 0; t < tags.length; t++) {
        var sym = tags[t].textContent.trim();
        if (sym) elemSet[sym] = true;
      }
      // Event type badge
      var typeBadge = items[i].querySelector('[class*="timeline-type"]');
      if (typeBadge) {
        typeSet[typeBadge.textContent.trim()] = true;
      }
    }

    allElements = Object.keys(elemSet).sort();
    allTypes = Object.keys(typeSet).sort();
    if (allElements.length === 0 && allTypes.length === 0) return;

    buildControls();
  }

  function buildControls() {
    var controls = document.createElement('div');
    controls.className = 'reg-timeline-controls';

    // Event type filter
    if (allTypes.length > 0) {
      var typeRow = document.createElement('div');
      typeRow.className = 'reg-tl-filter-row';

      var typeLabel = document.createElement('span');
      typeLabel.className = 'reg-tl-label';
      typeLabel.textContent = 'Type:';
      typeRow.appendChild(typeLabel);

      appendBtn(typeRow, 'All', null, 'reg-tl-btn active', function () {
        activeType = null;
        refreshBtns(typeRow, 'reg-tl-btn', 'data-type', activeType);
        applyFilters();
      });

      for (var s = 0; s < allTypes.length; s++) {
        (function (type) {
          appendBtn(typeRow, type, type, 'reg-tl-btn', function () {
            activeType = activeType === type ? null : type;
            refreshBtns(typeRow, 'reg-tl-btn', 'data-type', activeType);
            applyFilters();
          });
        })(allTypes[s]);
      }
      controls.appendChild(typeRow);
    }

    // Element filter
    if (allElements.length > 0) {
      var elemRow = document.createElement('div');
      elemRow.className = 'reg-tl-filter-row';

      var elemLabel = document.createElement('span');
      elemLabel.className = 'reg-tl-label';
      elemLabel.textContent = 'Element:';
      elemRow.appendChild(elemLabel);

      appendBtn(elemRow, 'All', null, 'reg-tl-chip active', function () {
        activeElement = null;
        refreshBtns(elemRow, 'reg-tl-chip', 'data-element', activeElement);
        applyFilters();
      });

      for (var e = 0; e < allElements.length; e++) {
        (function (sym) {
          appendBtn(elemRow, sym, sym, 'reg-tl-chip', function () {
            activeElement = activeElement === sym ? null : sym;
            refreshBtns(elemRow, 'reg-tl-chip', 'data-element', activeElement);
            applyFilters();
          });
        })(allElements[e]);
      }
      controls.appendChild(elemRow);
    }

    timeline.parentNode.insertBefore(controls, timeline);
  }

  function appendBtn(parent, text, dataVal, cls, handler) {
    var btn = document.createElement('button');
    btn.className = cls;
    btn.textContent = text;
    if (dataVal != null) {
      var attr = cls.indexOf('chip') !== -1 ? 'data-element' : 'data-type';
      btn.setAttribute(attr, dataVal);
    }
    btn.addEventListener('click', handler);
    parent.appendChild(btn);
  }

  function refreshBtns(row, baseCls, dataAttr, activeVal) {
    var btns = row.querySelectorAll('.' + baseCls.split(' ')[0]);
    for (var i = 0; i < btns.length; i++) {
      var val = btns[i].getAttribute(dataAttr);
      var isAll = val === null;
      btns[i].classList.toggle('active', isAll ? !activeVal : val === activeVal);
    }
  }

  function applyFilters() {
    for (var i = 0; i < items.length; i++) {
      var show = true;

      // Type filter
      if (activeType) {
        var typeBadge = items[i].querySelector('[class*="timeline-type"]');
        if (!typeBadge || typeBadge.textContent.trim() !== activeType) show = false;
      }

      // Element filter
      if (show && activeElement) {
        var tags = items[i].querySelectorAll('.timeline-element-tag');
        var found = false;
        for (var t = 0; t < tags.length; t++) {
          if (tags[t].textContent.trim() === activeElement) { found = true; break; }
        }
        if (!found) show = false;
      }

      items[i].style.display = show ? '' : 'none';
    }
  }

  return { init: init };
})();
