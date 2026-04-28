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

  var modalState = { front: null, back: null, showing: 'front' };

  function norm(s) {
    if (s === null || s === undefined) return '';
    return String(s).trim().toLowerCase();
  }

  function contains(hay, needle) {
    var n = norm(needle);
    if (!n) return true;
    return norm(hay).indexOf(n) !== -1;
  }

  function matches(r, f) {
    if (!contains(r.cDedNumber, f.cd)) return false;
    if (!contains(r.title, f.title)) return false;
    if (!contains(r.artists, f.artist)) return false;
    if (!contains(r.year, f.year)) return false;
    if (!contains(r.label, f.label)) return false;
    if (!contains(r.catNo, f.cat)) return false;

    if (f.all) {
      var links = r.links || {};
      var blob = [
        r.cDedNumber,
        r.title,
        r.artists,
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
      if (!contains(blob, f.all)) return false;
    }

    return true;
  }

  function getFilters() {
    return {
      all: norm(qAll && qAll.value),
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

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (locationModal && !locationModal.classList.contains('hidden')) closeLocationModal();
    else if (modal && !modal.classList.contains('hidden')) closeModal();
  });

  if (btnFront) btnFront.addEventListener('click', function () { setModalImage('front'); });
  if (btnBack) btnBack.addEventListener('click', function () { setModalImage('back'); });

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

  function render() {
    var f = getFilters();
    var filtered = records.filter(function (r) { return matches(r, f); });
    var total = filtered.length;

    if (statsEl) statsEl.textContent = total + ' result(s)';
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

      var sticker = document.createElement('div');
      sticker.className = 'sticker';
      var n = (r.cDedNumber === null || r.cDedNumber === undefined) ? '' : String(r.cDedNumber).trim();
      sticker.textContent = n ? (' ' + n) : ' -';
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

      meta.appendChild(sticker);

      var title = document.createElement('div');
      title.className = 'title';
      title.textContent = r.title || '(untitled)';
      meta.appendChild(title);

      meta.appendChild(makeLine('Artists', r.artists || ''));

      if (r.year !== null && r.year !== undefined && String(r.year).trim() !== '') meta.appendChild(makeLine('Year', String(r.year)));
      if (r.label) meta.appendChild(makeLine('Label', r.label));
      if (r.catNo) meta.appendChild(makeLine('Catalog number', r.catNo));
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

  applyCompactState();
  render();
})();
