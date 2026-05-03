(function () {
  var records = Array.isArray(window.CDED_RECORDS) ? window.CDED_RECORDS : [];
  var shelfBreakpoints = [
    48, 91, 125, 169, 195, 233, 269, 311, 360, 408,
    450, 494, 533, 578, 630, 687, 733, 777,
    825, 875, 928, 975, 1023, 1069, 1116, 1160, 1210, 1226
  ];

  function el(id) { return document.getElementById(id); }
  function pad2(n) { return String(n).padStart(2, '0'); }

  var listEl = el('list');
  var statsEl = el('stats');

  var qAll = el('qAll');
  var qCd = el('qCd');
  var qTitle = el('qTitle');
  var qArtist = el('qArtist');
  var qYear = el('qYear');
  var qLabel = el('qLabel');
  var qCat = el('qCat');
  var selectionMenuButton = el('selectionMenuButton');
  var selectionMenu = el('selectionMenu');
  var selectionModeButtons = document.querySelectorAll('[data-selection-mode]');
  var selectionFilterMobile = document.querySelectorAll('input[name="selectionFilterMobile"]');
  var copySelectedDesktop = el('copySelectedDesktop');
  var copySelectedMobile = el('copySelectedMobile');
  var clearSelectedDesktop = el('clearSelectedDesktop');
  var clearSelectedMobile = el('clearSelectedMobile');

  var header = document.querySelector('header.top');
  var toggleAdvancedBtn = el('toggleAdvanced');

  function isNarrow() {
    return window.matchMedia && window.matchMedia('(max-width: 720px)').matches;
  }

  var mobileDefaultCollapsed = true;

  function setAdvancedExpanded(expanded) {
    if (!header) return;
    if (expanded) header.classList.add('show-advanced');
    else header.classList.remove('show-advanced');

    if (toggleAdvancedBtn) toggleAdvancedBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  }

  function applyCompactState() {
    if (!header) return;

    var narrow = isNarrow();
    var compact = narrow ? (mobileDefaultCollapsed || window.scrollY > 80) : false;

    if (compact) header.classList.add('compact');
    else header.classList.remove('compact');

    if (!narrow) setAdvancedExpanded(true);
  }

  if (toggleAdvancedBtn) {
    toggleAdvancedBtn.addEventListener('click', function () {
      if (!header) return;
      var expanded = header.classList.contains('show-advanced');
      setAdvancedExpanded(!expanded);
    });
  }

  window.addEventListener('scroll', applyCompactState);
  window.addEventListener('resize', applyCompactState);

  applyCompactState();
  if (isNarrow()) setAdvancedExpanded(false);

  var modal = el('imgModal');
  var modalBackdrop = el('modalBackdrop');
  var modalImg = el('modalImg');
  var modalTitle = el('modalTitle');
  var btnFront = el('btnFront');
  var btnBack = el('btnBack');
  var btnClose = el('btnClose');
  var locationModal = el('locationModal');
  var locationBackdrop = el('locationBackdrop');
  var locationTitle = el('locationTitle');
  var locationRecordTitle = el('locationRecordTitle');
  var locationSubtitle = el('locationSubtitle');
  var locationRange = el('locationRange');
  var locationApprox = el('locationApprox');
  var locationThumbWrap = el('locationThumbWrap');
  var locationThumb = el('locationThumb');
  var locationClose = el('locationClose');
  var cabinetMap = el('cabinetMap');

  var isHosted = !!(window.chrome && window.chrome.webview);
  var selectedStorageKey = 'cded-selected-record-ids-v1';
  var selectedIds = loadSelectedIds();
  var selectionMode = 'all';

  var modalState = { front: null, back: null, showing: 'front' };

  function loadSelectedIds() {
    try {
      var raw = window.localStorage ? window.localStorage.getItem(selectedStorageKey) : null;
      if (!raw) return {};

      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return {};

      var map = {};
      for (var i = 0; i < parsed.length; i++) {
        if (parsed[i]) map[parsed[i]] = true;
      }
      return map;
    } catch (_err) {
      return {};
    }
  }

  function saveSelectedIds() {
    try {
      if (!window.localStorage) return;
      window.localStorage.setItem(selectedStorageKey, JSON.stringify(Object.keys(selectedIds)));
    } catch (_err) {
      // Ignore storage failures and keep the UI usable.
    }
  }

  function getSelectedCount() {
    return Object.keys(selectedIds).length;
  }

  function norm(s) {
    if (s === null || s === undefined) return '';
    return String(s).trim().toLowerCase();
  }

  function contains(hay, needle) {
    var n = norm(needle);
    if (!n) return true;
    return norm(hay).indexOf(n) !== -1;
  }

  function hasText(value) {
    return value !== null && value !== undefined && String(value).trim() !== '';
  }

  function getFulltextBlob(r) {
    var links = r.links || {};
    return [
      r.cDedNumber,
      r.title,
      r.artists,
      r.cdCount,
      r.year,
      r.label,
      r.catNo,
      r.notes,
      r.coverOriginal,
      r.backCoverOriginal,
      links.musicBrainz,
      links.listenBrainz,
      links.discogs,
      links.qobuz,
      links.naxos
    ].join(' | ');
  }

  function isAdvancedQuery(value) {
    return /^\s*=/.test(String(value || ''));
  }

  function getAdvancedQueryText(value) {
    return String(value || '').replace(/^\s*=\s*/, '');
  }

  function normalizeIdentifier(value) {
    return norm(value).replace(/[\s_-]+/g, '');
  }

  function normalizeFieldName(value) {
    var key = normalizeIdentifier(value);

    if (key === 'artist' || key === 'artists') return 'artist';
    if (key === 'bay') return 'bay';
    if (key === 'shelf') return 'shelf';
    if (key === 'title') return 'title';
    if (key === 'label') return 'label';
    if (key === 'year') return 'year';
    if (key === 'cdcount' || key === 'cds' || key === 'cdcounts') return 'cdcount';
    if (key === 'cat' || key === 'catno' || key === 'catalog' || key === 'catalognumber') return 'catno';
    if (key === 'notes' || key === 'note') return 'notes';
    if (key === 'composer') return 'composer';
    if (key === 'cd' || key === 'cded' || key === 'cdednumber') return 'cd';

    return null;
  }

  function normalizePredicateName(value) {
    var key = normalizeIdentifier(value);

    if (key === 'has') return 'has';
    if (key === 'missing') return 'missing';

    return null;
  }

  function normalizePredicateTarget(value) {
    var key = normalizeIdentifier(value);

    if (key === 'musicbrainz' || key === 'mb') return 'musicbrainz';
    if (key === 'listenbrainz' || key === 'lb') return 'listenbrainz';
    if (key === 'discogs') return 'discogs';
    if (key === 'qobuz') return 'qobuz';
    if (key === 'naxos') return 'naxos';
    if (key === 'composer') return 'composer';
    if (key === 'ripped') return 'ripped';
    if (key === 'frontcover') return 'frontcover';
    if (key === 'backcover') return 'backcover';

    return null;
  }

  function splitCommaSeparatedList(value) {
    var raw = String(value || '');
    if (!raw.trim()) return [];

    var parts = raw.split(',');
    var items = [];

    for (var i = 0; i < parts.length; i++) {
      var item = parts[i].trim();
      if (!item) throw new Error('Empty item in comma-separated list.');
      items.push(item);
    }

    return items;
  }

  function compileYearMatcher(value) {
    var text = String(value || '').trim();
    var exactMatch = text.match(/^\d{1,4}$/);
    if (exactMatch) {
      var exactYear = parseInt(text, 10);
      return function (r) {
        if (!hasText(r.year)) return false;
        var year = Number(r.year);
        return isFinite(year) && year === exactYear;
      };
    }

    var rangeMatch = text.match(/^(\d{1,4})\s*-\s*(\d{1,4})$/);
    if (!rangeMatch) {
      throw new Error('Invalid year value. Use YYYY or YYYY-YYYY.');
    }

    var startYear = parseInt(rangeMatch[1], 10);
    var endYear = parseInt(rangeMatch[2], 10);
    if (endYear < startYear) {
      throw new Error('Invalid year range. The end year must not be smaller than the start year.');
    }

    return function (r) {
      if (!hasText(r.year)) return false;
      var year = Number(r.year);
      return isFinite(year) && year >= startYear && year <= endYear;
    };
  }

  function compileFieldExpression(fieldName, value) {
    if (fieldName === 'artist') {
      return function (r) { return contains(r.artists, value); };
    }
    if (fieldName === 'bay') {
      var bayValue = norm(value);
      if (bayValue !== 'left' && bayValue !== 'center' && bayValue !== 'right') {
        throw new Error('Invalid bay value. Use left, center, or right.');
      }

      return function (r) {
        var details = getShelfLocation(parseCdNumber(r.cDedNumber));
        return !!details && details.bayKey === bayValue;
      };
    }
    if (fieldName === 'shelf') {
      var shelfValue = String(value || '').trim();
      if (!/^\d+$/.test(shelfValue)) {
        throw new Error('Invalid shelf value. Use a number from 1 to 10.');
      }

      var shelfNumber = parseInt(shelfValue, 10);
      if (shelfNumber < 1 || shelfNumber > 10) {
        throw new Error('Invalid shelf value. Use a number from 1 to 10.');
      }

      return function (r) {
        var details = getShelfLocation(parseCdNumber(r.cDedNumber));
        return !!details && details.shelfNumber === shelfNumber;
      };
    }
    if (fieldName === 'title') {
      return function (r) { return contains(r.title, value); };
    }
    if (fieldName === 'label') {
      return function (r) { return contains(r.label, value); };
    }
    if (fieldName === 'year') {
      return compileYearMatcher(value);
    }
    if (fieldName === 'cdcount') {
      var text = String(value || '').trim();
      var exactMatch = text.match(/^\d+$/);
      var rangeMatch = text.match(/^(\d+)\s*-\s*(\d+)$/);

      if (exactMatch) {
        var exactCount = parseInt(text, 10);
        return function (r) {
          var count = Number(r.cdCount);
          return isFinite(count) && count === exactCount;
        };
      }

      if (rangeMatch) {
        var startCount = parseInt(rangeMatch[1], 10);
        var endCount = parseInt(rangeMatch[2], 10);
        if (endCount < startCount) {
          throw new Error('Invalid cdcount range. The end value must not be smaller than the start value.');
        }

        return function (r) {
          var count = Number(r.cdCount);
          return isFinite(count) && count >= startCount && count <= endCount;
        };
      }

      throw new Error('Invalid cdcount value. Use N or N-N.');
    }
    if (fieldName === 'catno') {
      return function (r) { return contains(r.catNo, value); };
    }
    if (fieldName === 'notes') {
      return function (r) { return contains(r.notes, value); };
    }
    if (fieldName === 'composer') {
      return function (r) { return contains(r.composer, value); };
    }
    if (fieldName === 'cd') {
      return function (r) { return contains(r.cDedNumber, value); };
    }

    throw new Error('Unknown field: ' + fieldName);
  }

  function compilePredicateTarget(targetName) {
    return function (r) {
      var links = r.links || {};

      if (targetName === 'musicbrainz') return hasText(links.musicBrainz);
      if (targetName === 'listenbrainz') return hasText(links.listenBrainz);
      if (targetName === 'discogs') return hasText(links.discogs);
      if (targetName === 'qobuz') return hasText(links.qobuz);
      if (targetName === 'naxos') return hasText(links.naxos);
      if (targetName === 'composer') return hasText(r.composer);
      if (targetName === 'ripped') return r.ripped !== null && r.ripped !== undefined;
      if (targetName === 'frontcover') return hasText(r.coverOriginal) || hasText(r.coverThumb);
      if (targetName === 'backcover') return hasText(r.backCoverOriginal);

      return false;
    };
  }

  function compilePredicateExpression(predicateName, value) {
    var items = splitCommaSeparatedList(value);
    if (!items.length) throw new Error('Predicate expressions require at least one target.');

    var targetMatchers = [];
    for (var i = 0; i < items.length; i++) {
      var targetName = normalizePredicateTarget(items[i]);
      if (!targetName) {
        throw new Error('Unknown predicate target: ' + items[i]);
      }
      targetMatchers.push(compilePredicateTarget(targetName));
    }

    if (predicateName === 'has') {
      return function (r) {
        for (var j = 0; j < targetMatchers.length; j++) {
          if (!targetMatchers[j](r)) return false;
        }
        return true;
      };
    }

    if (predicateName === 'missing') {
      return function (r) {
        for (var j = 0; j < targetMatchers.length; j++) {
          if (targetMatchers[j](r)) return false;
        }
        return true;
      };
    }

    throw new Error('Unknown predicate: ' + predicateName);
  }

  function compileAdvancedQuery(queryText) {
    var input = String(queryText || '');
    var index = 0;

    function syntaxError(message) {
      return new Error(message);
    }

    function skipWhitespace() {
      while (index < input.length && /\s/.test(input.charAt(index))) index++;
    }

    function peekWordOperator(startIndex) {
      var slice = input.slice(startIndex);
      var match = /^(AND|OR)\b/i.exec(slice);
      if (!match) return null;
      return { op: match[1].toUpperCase(), length: match[0].length };
    }

    function tryReadLogicalOperator() {
      skipWhitespace();
      if (index >= input.length) return null;

      var ch = input.charAt(index);
      if (ch === '&') {
        index++;
        return 'AND';
      }
      if (ch === '|') {
        index++;
        return 'OR';
      }

      var wordOperator = peekWordOperator(index);
      if (!wordOperator) return null;

      index += wordOperator.length;
      return wordOperator.op;
    }

    function parseIdentifier() {
      skipWhitespace();
      var start = index;
      while (index < input.length && /[A-Za-z0-9_]/.test(input.charAt(index))) index++;
      if (start === index) throw syntaxError('Expected a field or predicate name.');
      return input.slice(start, index);
    }

    function parseQuotedValue() {
      if (input.charAt(index) !== '"') throw syntaxError('Expected a quoted value.');

      index++;
      var value = '';

      while (index < input.length) {
        var ch = input.charAt(index);
        if (ch === '"') {
          if (input.charAt(index + 1) === '"') {
            value += '"';
            index += 2;
            continue;
          }

          index++;
          return value;
        }

        value += ch;
        index++;
      }

      throw syntaxError('Unterminated quoted value.');
    }

    function parseUnquotedValue() {
      var value = '';

      while (index < input.length) {
        var ch = input.charAt(index);
        if (ch === '&' || ch === '|') break;

        if (/\s/.test(ch)) {
          var whitespaceStart = index;
          while (index < input.length && /\s/.test(input.charAt(index))) index++;

          var symbol = input.charAt(index);
          if (symbol === '&' || symbol === '|') {
            index = whitespaceStart;
            break;
          }

          var wordOperator = peekWordOperator(index);
          if (wordOperator) {
            index = whitespaceStart;
            break;
          }

          value += ' ';
          continue;
        }

        value += ch;
        index++;
      }

      return value.trim();
    }

    function parseValue() {
      skipWhitespace();
      if (index >= input.length) throw syntaxError('Expected a value after ":".');

      if (input.charAt(index) === '"') {
        return parseQuotedValue();
      }

      var value = parseUnquotedValue();
      if (!value) throw syntaxError('Expected a value after ":".');
      return value;
    }

    function parseExpressionMatcher() {
      var identifier = parseIdentifier();
      skipWhitespace();
      if (input.charAt(index) !== ':') {
        throw syntaxError('Expected ":" after "' + identifier + '".');
      }

      index++;
      var value = parseValue();
      var fieldName = normalizeFieldName(identifier);
      if (fieldName) return compileFieldExpression(fieldName, value);

      var predicateName = normalizePredicateName(identifier);
      if (predicateName) return compilePredicateExpression(predicateName, value);

      throw syntaxError('Unknown field or predicate: ' + identifier);
    }

    function parseAndGroup() {
      var matchers = [parseExpressionMatcher()];

      while (true) {
        var savedIndex = index;
        var op = tryReadLogicalOperator();

        if (op === 'AND') {
          matchers.push(parseExpressionMatcher());
          continue;
        }

        index = savedIndex;
        break;
      }

      return function (r) {
        for (var i = 0; i < matchers.length; i++) {
          if (!matchers[i](r)) return false;
        }
        return true;
      };
    }

    skipWhitespace();
    if (index >= input.length) {
      return function () { return true; };
    }

    var orGroups = [parseAndGroup()];

    while (true) {
      skipWhitespace();
      if (index >= input.length) break;

      var op = tryReadLogicalOperator();
      if (op !== 'OR') {
        throw syntaxError('Expected AND or OR between expressions.');
      }

      orGroups.push(parseAndGroup());
    }

    return function (r) {
      for (var i = 0; i < orGroups.length; i++) {
        if (orGroups[i](r)) return true;
      }
      return false;
    };
  }

  function matches(r, f) {
    if (!contains(r.cDedNumber, f.cd)) return false;
    if (!contains(r.title, f.title)) return false;
    if (!contains(r.artists, f.artist)) return false;
    if (!contains(r.year, f.year)) return false;
    if (!contains(r.label, f.label)) return false;
    if (!contains(r.catNo, f.cat)) return false;

    if (f.advancedMatcher && !f.advancedMatcher(r)) return false;

    if (f.all) {
      if (!contains(getFulltextBlob(r), f.all)) return false;
    }

    return true;
  }

  function matchesSelection(r) {
    var isSelected = !!selectedIds[r.id];
    if (selectionMode === 'selected') return isSelected;
    if (selectionMode === 'unselected') return !isSelected;
    return true;
  }

  function getFilters() {
    var rawAll = qAll ? String(qAll.value || '') : '';
    var advancedMatcher = null;
    var advancedError = '';
    var plainAll = norm(rawAll);

    if (isAdvancedQuery(rawAll)) {
      plainAll = '';
      try {
        advancedMatcher = compileAdvancedQuery(getAdvancedQueryText(rawAll));
      } catch (err) {
        advancedError = err && err.message ? err.message : String(err);
      }
    }

    return {
      all: plainAll,
      advancedMatcher: advancedMatcher,
      advancedError: advancedError,
      cd: norm(qCd && qCd.value),
      title: norm(qTitle && qTitle.value),
      artist: norm(qArtist && qArtist.value),
      year: norm(qYear && qYear.value),
      label: norm(qLabel && qLabel.value),
      cat: norm(qCat && qCat.value)
    };
  }

  function link(href, text, disabled, target) {
    if (disabled === undefined) disabled = false;
    if (target === undefined) target = '_blank';

    var a = document.createElement('a');
    a.textContent = text;
    a.href = href || '#';
    a.target = target;

    if (target === '_blank') a.rel = 'noopener';
    if (disabled) a.classList.add('disabled');
    return a;
  }

  function parseCdNumber(value) {
    var s = (value === null || value === undefined) ? '' : String(value).trim();
    var match = s.match(/^\d+/);
    return match ? parseInt(match[0], 10) : null;
  }

  function getShelfLocation(cdNumber) {
    if (typeof cdNumber !== 'number' || !isFinite(cdNumber) || cdNumber < 1) return null;

    for (var i = 0; i < shelfBreakpoints.length; i++) {
      if (cdNumber > shelfBreakpoints[i]) continue;

      var rangeStart = i === 0 ? 1 : shelfBreakpoints[i - 1] + 1;
      var rangeEnd = shelfBreakpoints[i];

      if (i < 10) {
        return {
          code: 'L' + pad2(i + 1),
          bayKey: 'left',
          bayLabel: 'Left bay',
          shelfNumber: i + 1,
          rangeStart: rangeStart,
          rangeEnd: rangeEnd,
          cdNumber: cdNumber
        };
      }

      if (i < 18) {
        return {
          code: 'C' + pad2(i - 9),
          bayKey: 'center',
          bayLabel: 'Center bay',
          shelfNumber: i - 9,
          rangeStart: rangeStart,
          rangeEnd: rangeEnd,
          cdNumber: cdNumber
        };
      }

      return {
        code: 'R' + pad2(i - 17),
        bayKey: 'right',
        bayLabel: 'Right bay',
        shelfNumber: i - 17,
        rangeStart: rangeStart,
        rangeEnd: rangeEnd,
        cdNumber: cdNumber
      };
    }

    return null;
  }

  function getApproximateShelfPosition(details) {
    var count = details.rangeEnd - details.rangeStart + 1;
    var index = details.cdNumber - details.rangeStart + 1;
    var ratio = count <= 0 ? 0.5 : (index - 0.5) / count;

    if (ratio < 0.03) ratio = 0.03;
    if (ratio > 0.97) ratio = 0.97;

    return {
      count: count,
      index: index,
      ratio: ratio,
      percent: Math.round(ratio * 100)
    };
  }

  function buildApproximatePositionText(details) {
    var pos = details.approximate;
    if (pos.index <= 1) {
      return 'Position on shelf: first CD on the left.';
    }
    if (pos.index >= pos.count) {
      return 'Position on shelf: last CD on the right.';
    }
    return 'Approximate position on that shelf: about ' +
      pos.index + ' of ' + pos.count +
      ', roughly ' + pos.percent + '% from the left.';
  }

  function buildLocationSubtitle(details) {
    return details.code + ' - ' + details.bayLabel + ' - shelf ' + details.shelfNumber;
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    if (modalImg) modalImg.src = '';
  }

  function closeLocationModal() {
    if (!locationModal) return;
    locationModal.classList.add('hidden');
    locationModal.setAttribute('aria-hidden', 'true');
  }

  function closeSelectionMenu() {
    if (!selectionMenu || !selectionMenuButton) return;
    selectionMenu.classList.add('hidden');
    selectionMenuButton.setAttribute('aria-expanded', 'false');
  }

  function updateSelectionUi() {
    var count = getSelectedCount();

    if (selectionMenuButton) {
      selectionMenuButton.textContent = count > 0 ? ('Selection (' + count + ')') : 'Selection';
    }

    for (var i = 0; i < selectionModeButtons.length; i++) {
      var btn = selectionModeButtons[i];
      var active = btn.getAttribute('data-selection-mode') === selectionMode;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    }

    for (var j = 0; j < selectionFilterMobile.length; j++) {
      selectionFilterMobile[j].checked = selectionFilterMobile[j].value === selectionMode;
    }
  }

  function setSelectionMode(mode) {
    selectionMode = mode;
    updateSelectionUi();
    render();
  }

  function toggleSelected(id, checked) {
    if (!id) return;
    if (checked) selectedIds[id] = true;
    else delete selectedIds[id];

    saveSelectedIds();
    updateSelectionUi();
    render();
  }

  function buildSelectedListText() {
    var lines = [];

    for (var i = 0; i < records.length; i++) {
      var record = records[i];
      if (!selectedIds[record.id]) continue;

      var cd = record.cDedNumber ? ('CD ' + String(record.cDedNumber).trim()) : 'CD ?';
      var title = record.title || '(untitled)';
      var artist = record.artists || '';

      lines.push(cd + ' | ' + title + ' | ' + artist);
    }

    return lines.join('\n');
  }

  function copyText(text) {
    if (!text) return Promise.resolve(false);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }).catch(function () { return false; });
    }

    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', 'readonly');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return Promise.resolve(ok);
    } catch (_err) {
      return Promise.resolve(false);
    }
  }

  function flashButton(button, label) {
    if (!button) return;
    var original = button.textContent;
    button.textContent = label;
    window.setTimeout(function () {
      button.textContent = original;
    }, 1200);
  }

  function copySelectedList(button) {
    var text = buildSelectedListText();
    if (!text) {
      flashButton(button, 'Nothing selected');
      return;
    }

    copyText(text).then(function (ok) {
      flashButton(button, ok ? 'Copied' : 'Copy failed');
    });
  }

  function clearSelected(button) {
    var count = getSelectedCount();
    if (count === 0) {
      flashButton(button, 'Nothing selected');
      return;
    }

    if (!window.confirm('Clear ' + count + ' selected CD(s)?')) return;

    selectedIds = {};
    saveSelectedIds();
    updateSelectionUi();
    render();
    flashButton(button, 'Cleared');
  }

  function setModalImage(which) {
    modalState.showing = which;
    var src = (which === 'back') ? modalState.back : modalState.front;
    if (modalImg) modalImg.src = src || '';
    if (btnFront) btnFront.disabled = (which === 'front');
    if (btnBack) btnBack.disabled = (which === 'back');
  }

  function openModal(front, back, title) {
    modalState = { front: front, back: back, showing: 'front' };
    if (modalTitle) modalTitle.textContent = title || 'Cover';

    var hasFront = !!front;
    var hasBack = !!back;

    if (btnFront) btnFront.style.display = hasFront ? '' : 'none';
    if (btnBack) btnBack.style.display = hasBack ? '' : 'none';

    if (modalImg) modalImg.style.cursor = hasBack ? 'pointer' : '';

    if (!hasFront && hasBack) setModalImage('back');
    else setModalImage('front');

    if (modal) {
      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden', 'false');
    }
  }

  function renderCabinetMap(details) {
    if (!cabinetMap) return;

    var baySpecs = [
      { key: 'left', label: 'Left', rows: 10, topEmptyRows: 0, bottomEmptyRows: 0 },
      { key: 'center', label: 'Center', rows: 8, topEmptyRows: 1, bottomEmptyRows: 1 },
      { key: 'right', label: 'Right', rows: 10, topEmptyRows: 0, bottomEmptyRows: 0 }
    ];

    cabinetMap.innerHTML = '';

    for (var i = 0; i < baySpecs.length; i++) {
      var spec = baySpecs[i];
      var bay = document.createElement('div');
      bay.className = 'cabinet-bay ' + spec.key;

      for (var topEmpty = 0; topEmpty < spec.topEmptyRows; topEmpty++) {
        var topEmptySlot = document.createElement('div');
        topEmptySlot.className = 'cabinet-slot empty';
        bay.appendChild(topEmptySlot);
      }

      for (var row = 1; row <= spec.rows; row++) {
        var slot = document.createElement('div');
        slot.className = 'cabinet-slot';

        var shelf = document.createElement('div');
        shelf.className = 'cabinet-shelf';
        if (details && details.bayKey === spec.key && details.shelfNumber === row) {
          shelf.classList.add('active');
          shelf.setAttribute('data-label', details.code);
          shelf.style.setProperty('--marker-left', details.approximate.percent + '%');

          var marker = document.createElement('div');
          marker.className = 'cabinet-marker';
          shelf.appendChild(marker);
        }

        slot.appendChild(shelf);
        bay.appendChild(slot);
      }

      for (var bottomEmpty = 0; bottomEmpty < spec.bottomEmptyRows; bottomEmpty++) {
        var bottomEmptySlot = document.createElement('div');
        bottomEmptySlot.className = 'cabinet-slot empty';
        bay.appendChild(bottomEmptySlot);
      }

      var bayLabel = document.createElement('div');
      bayLabel.className = 'cabinet-bay-label';
      bayLabel.textContent = spec.label;
      bay.appendChild(bayLabel);

      cabinetMap.appendChild(bay);
    }
  }

  function openLocationModal(cdText, details, record) {
    if (!locationModal || !details) return;
    details.approximate = getApproximateShelfPosition(details);

    if (locationTitle) locationTitle.textContent = 'CD ' + cdText;
    if (locationRecordTitle) locationRecordTitle.textContent = (record && record.title) ? record.title : '';
    if (locationSubtitle) locationSubtitle.textContent = buildLocationSubtitle(details);
    if (locationRange) {
      locationRange.textContent =
        'This shelf holds CD numbers ' + details.rangeStart + ' to ' + details.rangeEnd + '.';
    }
    if (locationApprox) {
      locationApprox.textContent = buildApproximatePositionText(details);
    }
    if (locationThumbWrap && locationThumb) {
      var thumbSrc = record && (record.coverThumb || record.coverOriginal || record.backCoverOriginal);
      if (thumbSrc) {
        locationThumb.src = thumbSrc;
        locationThumbWrap.classList.remove('hidden');
      } else {
        locationThumb.src = '';
        locationThumbWrap.classList.add('hidden');
      }
    }

    renderCabinetMap(details);
    locationModal.classList.remove('hidden');
    locationModal.setAttribute('aria-hidden', 'false');
  }

  if (btnClose) btnClose.addEventListener('click', closeModal);
  if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);
  if (locationClose) locationClose.addEventListener('click', closeLocationModal);
  if (locationBackdrop) locationBackdrop.addEventListener('click', closeLocationModal);
  if (selectionMenuButton) {
    selectionMenuButton.addEventListener('click', function () {
      if (!selectionMenu) return;
      var open = selectionMenu.classList.contains('hidden');
      if (open) {
        selectionMenu.classList.remove('hidden');
        selectionMenuButton.setAttribute('aria-expanded', 'true');
      } else {
        closeSelectionMenu();
      }
    });
  }

  document.addEventListener('click', function (e) {
    if (!selectionMenu || selectionMenu.classList.contains('hidden')) return;
    if (selectionMenu.contains(e.target)) return;
    if (selectionMenuButton && selectionMenuButton.contains(e.target)) return;
    closeSelectionMenu();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (selectionMenu && !selectionMenu.classList.contains('hidden')) closeSelectionMenu();
    else if (locationModal && !locationModal.classList.contains('hidden')) closeLocationModal();
    else if (modal && !modal.classList.contains('hidden')) closeModal();
  });

  if (btnFront) btnFront.addEventListener('click', function () { setModalImage('front'); });
  if (btnBack) btnBack.addEventListener('click', function () { setModalImage('back'); });
  if (copySelectedDesktop) copySelectedDesktop.addEventListener('click', function () { copySelectedList(copySelectedDesktop); });
  if (copySelectedMobile) copySelectedMobile.addEventListener('click', function () { copySelectedList(copySelectedMobile); });
  if (clearSelectedDesktop) clearSelectedDesktop.addEventListener('click', function () { clearSelected(clearSelectedDesktop); });
  if (clearSelectedMobile) clearSelectedMobile.addEventListener('click', function () { clearSelected(clearSelectedMobile); });

  for (var modeIndex = 0; modeIndex < selectionModeButtons.length; modeIndex++) {
    selectionModeButtons[modeIndex].addEventListener('click', function () {
      setSelectionMode(this.getAttribute('data-selection-mode') || 'all');
      closeSelectionMenu();
    });
  }

  for (var filterIndex = 0; filterIndex < selectionFilterMobile.length; filterIndex++) {
    selectionFilterMobile[filterIndex].addEventListener('change', function () {
      if (this.checked) setSelectionMode(this.value || 'all');
    });
  }

  if (modalImg) {
    modalImg.addEventListener('click', function () {
      if (!modalState.back) return;
      setModalImage(modalState.showing === 'front' ? 'back' : 'front');
    });
  }

  function makeLine(k, v) {
    var d = document.createElement('div');
    d.className = 'line';
    var kk = document.createElement('div');
    kk.className = 'k';
    kk.textContent = k;
    var vv = document.createElement('div');
    vv.className = 'v';
    vv.textContent = (v === null || v === undefined) ? '' : String(v);
    d.appendChild(kk);
    d.appendChild(vv);
    return d;
  }

  function formatCdCountText(count) {
    if (count === null || count === undefined) return '';
    var n = Number(count);
    if (!isFinite(n) || n <= 1) return '';
    return n + ' CD';
  }

  function appendLabelAndCatNo(meta, label, catNo) {
    var hasLabel = !!label;
    var hasCatNo = !!catNo;

    if (hasLabel && hasCatNo) {
      meta.appendChild(makeLine('Label', label + ', ' + catNo));
      return;
    }

    if (hasLabel) {
      meta.appendChild(makeLine('Label', label));
      return;
    }

    if (hasCatNo) {
      meta.appendChild(makeLine('Catalog number', catNo));
    }
  }

  function render() {
    var f = getFilters();
    var filtered = f.advancedError
      ? []
      : records.filter(function (r) { return matches(r, f) && matchesSelection(r); });
    var total = filtered.length;

    if (statsEl) {
      statsEl.textContent = f.advancedError
        ? ('Query error: ' + f.advancedError)
        : (total + ' result(s)');
    }
    if (!listEl) return;

    listEl.innerHTML = '';

    for (var i = 0; i < filtered.length; i++) {
      var r = filtered[i];

      var row = document.createElement('div');
      row.className = 'row';

      var cover = document.createElement('div');
      cover.className = 'cover';

      var coverClickUrl = r.coverOriginal || r.backCoverOriginal || r.coverThumb || null;

      if (r.coverThumb) {
        var img = document.createElement('img');
        img.loading = 'lazy';
        img.alt = 'Cover';
        img.src = r.coverThumb;
        cover.appendChild(img);
      } else {
        var ph = document.createElement('div');
        ph.className = 'placeholder';
        ph.textContent = 'No cover';
        cover.appendChild(ph);
      }

      if (coverClickUrl) {
        cover.addEventListener('click', (function (rec) {
          return function () {
            openModal(rec.coverOriginal || rec.coverThumb || null, rec.backCoverOriginal || null, rec.title);
          };
        })(r));
      } else {
        cover.classList.add('no-click');
      }

      var meta = document.createElement('div');
      meta.className = 'meta';

      var cardHead = document.createElement('div');
      cardHead.className = 'card-head';

      var selector = document.createElement('input');
      selector.type = 'checkbox';
      selector.className = 'select-toggle';
      selector.checked = !!selectedIds[r.id];
      selector.setAttribute('aria-label', 'Select ' + (r.title || 'CD'));
      selector.addEventListener('change', (function (id) {
        return function () {
          toggleSelected(id, this.checked);
        };
      })(r.id));
      selector.addEventListener('click', function (e) {
        e.stopPropagation();
      });

      var sticker = document.createElement('div');
      sticker.className = 'sticker';
      var n = (r.cDedNumber === null || r.cDedNumber === undefined) ? '' : String(r.cDedNumber).trim();
      sticker.textContent = n ? (' ' + n) : ' -';
      var cdCountText = formatCdCountText(r.cdCount);
      var cdNumber = parseCdNumber(r.cDedNumber);
      var locationDetails = getShelfLocation(cdNumber);

      if (locationDetails) {
        sticker.classList.add('clickable');
        sticker.tabIndex = 0;
        sticker.setAttribute('role', 'button');
        sticker.title = 'Click to show shelf location';
        sticker.addEventListener('click', (function (cdLabel, details, record) {
          return function () {
            openLocationModal(cdLabel, details, record);
          };
        })(n, locationDetails, r));
        sticker.addEventListener('keydown', (function (cdLabel, details, record) {
          return function (e) {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            openLocationModal(cdLabel, details, record);
          };
        })(n, locationDetails, r));
      }

      cardHead.appendChild(selector);
      cardHead.appendChild(sticker);
      if (cdCountText) {
        var cdCount = document.createElement('div');
        cdCount.className = 'sticker-tail';
        cdCount.textContent = cdCountText;
        cardHead.appendChild(cdCount);
      }
      meta.appendChild(cardHead);

      if (selector.checked) row.classList.add('selected');

      var title = document.createElement('div');
      title.className = 'title';
      title.textContent = r.title || '(untitled)';
      meta.appendChild(title);

      meta.appendChild(makeLine('Artists', r.artists || ''));

      if (r.year !== null && r.year !== undefined && String(r.year).trim() !== '') meta.appendChild(makeLine('Year', String(r.year)));
      appendLabelAndCatNo(meta, r.label, r.catNo);
      if (r.notes) meta.appendChild(makeLine('Notes', r.notes));

      var linksEl = document.createElement('div');
      linksEl.className = 'links';

      if (isHosted) {
        linksEl.appendChild(link(r.localUrl, 'Edit', false, '_self'));
      }

      var links = r.links || {};
      if (links.musicBrainz) linksEl.appendChild(link(links.musicBrainz, 'MusicBrainz'));
      if (links.listenBrainz) linksEl.appendChild(link(links.listenBrainz, 'ListenBrainz'));
      if (links.discogs) linksEl.appendChild(link(links.discogs, 'Discogs'));
      if (links.qobuz) linksEl.appendChild(link(links.qobuz, 'Qobuz'));
      if (links.naxos) linksEl.appendChild(link(links.naxos, 'Naxos'));

      meta.appendChild(linksEl);

      row.appendChild(cover);
      row.appendChild(meta);
      listEl.appendChild(row);
    }
  }

  function onFilterChange() { render(); }

  var inputs = [qAll, qCd, qTitle, qArtist, qYear, qLabel, qCat];
  for (var j = 0; j < inputs.length; j++) {
    if (!inputs[j]) continue;
    inputs[j].addEventListener('input', onFilterChange);
  }

  updateSelectionUi();
  applyCompactState();
  render();
})();
