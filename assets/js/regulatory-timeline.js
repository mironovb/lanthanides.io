/**
 * Strategic Materials Ledger — Regulatory Page Filters
 * Element-based filtering for notice cards and timeline entries.
 * Progressive enhancement: page is fully readable without JS.
 */
var SML_RegTimeline = (function () {
  'use strict';

  var chips, cards, entries, timeline;

  function init() {
    var strip = document.getElementById('reg-filter-strip');
    if (!strip) return;

    chips = toArray(strip.querySelectorAll('.reg-filter-chip'));
    cards = toArray(document.querySelectorAll('.reg-notice-card'));
    entries = toArray(document.querySelectorAll('.reg-tl-entry'));
    timeline = document.getElementById('reg-timeline');

    for (var i = 0; i < chips.length; i++) {
      chips[i].addEventListener('click', handleClick);
    }
  }

  function handleClick(e) {
    var selected = e.currentTarget.getAttribute('data-element');
    var isAll = selected === 'all';

    // Determine new active element
    var activeElement = null;
    if (!isAll) {
      // Toggle: clicking active chip deselects it
      var wasActive = e.currentTarget.classList.contains('active');
      activeElement = wasActive ? null : selected;
    }

    // Update chip states
    for (var i = 0; i < chips.length; i++) {
      var val = chips[i].getAttribute('data-element');
      if (activeElement === null) {
        chips[i].classList.toggle('active', val === 'all');
      } else {
        chips[i].classList.toggle('active', val === activeElement);
      }
    }

    // Filter notice cards
    for (var c = 0; c < cards.length; c++) {
      var cardElems = (cards[c].getAttribute('data-elements') || '').split(',');
      var show = !activeElement || cardElems.indexOf(activeElement) !== -1;
      cards[c].classList.toggle('reg-notice-hidden', !show);
    }

    // Filter timeline entries
    for (var t = 0; t < entries.length; t++) {
      var entryElems = (entries[t].getAttribute('data-elements') || '').split(',');
      var showEntry = !activeElement || entryElems.indexOf(activeElement) !== -1;
      entries[t].classList.toggle('reg-tl-hidden', !showEntry);
    }

    // Update timeline line clipping for first/last visible entries
    updateTimelineClipping(activeElement !== null);
  }

  function updateTimelineClipping(isFiltered) {
    if (!timeline) return;

    // Remove old markers
    for (var i = 0; i < entries.length; i++) {
      entries[i].classList.remove('reg-tl-first', 'reg-tl-last');
    }

    if (isFiltered) {
      timeline.classList.add('reg-timeline--filtered');
      var visible = entries.filter(function (e) {
        return !e.classList.contains('reg-tl-hidden');
      });
      if (visible.length > 0) {
        visible[0].classList.add('reg-tl-first');
        visible[visible.length - 1].classList.add('reg-tl-last');
      }
    } else {
      timeline.classList.remove('reg-timeline--filtered');
    }
  }

  function toArray(nodeList) {
    return Array.prototype.slice.call(nodeList);
  }

  return { init: init };
})();
