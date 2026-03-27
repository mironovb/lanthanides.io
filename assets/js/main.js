/**
 * Strategic Materials Ledger — Main JS
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    if (typeof SML_Sort !== 'undefined') {
      SML_Sort.init();
    }
  });
})();
