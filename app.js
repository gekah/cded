(() => {
  const records = Array.isArray(window.CDED_RECORDS) ? window.CDED_RECORDS : [];

  const el = (id) => document.getElementById(id);
  const listEl = el('list');
  const statsEl = el('stats');
  const pageInfoEl = el('pageInfo');
  const prevBtn = el('prev');
  const nextBtn = el('next');
  const pageSizeSel = el('pageSize');

  const qAll = el('qAll');
  const qCd = el('qCd');
  const qTitle = el('qTitle');
  const qArtist = el('qArtist');
  const qYear = el('qYear');
  const qLabel = el('qLabel');
  const qCat = el('qCat');

  // Modal elements
  const modal = el('imgModal');
  const modalBackdrop = el('modalBackdrop');
  const modalImg = el('modalImg');
  const modalTitle = el('modalTitle');
  const btnFront = el('btnFront');
  const btnBack = el('btnBack');
  const btnClose = el('btnClose');

  // WebView2 exposes window.chrome.webview. A normal browser won't.
  const isHosted = !!(window.chrome && window.chrome.webview);

  let page = 1;
  let modalState = { front: null, back: null, showing: 'front' };

  const norm = (s) => (s ?? '').toString().trim().toLowerCase();
  const contains = (hay, needle) => {
    const n = norm(needle);
    if (!n) return true;
    return norm(hay).includes(n);
  };

  const matches = (r, f) => {
    if (!contains(r.cDedNumber, f.cd)) return false;
    if (!contains(r.title, f.title)) return false;
    if (!contains(r.artists, f.artist)) return false;
    if (!contains(r.year, f.year)) return false;
    if (!contains(r.label, f.label)) return false;
    if (!contains(r.catNo, f.cat)) return false;

    if (f.all) {
      const blob = [
        r.cDedNumber,
        r.title,
        r.artists,
        r.year,
        r.label,
        r.catNo,
        r.notes,
        r.coverOriginal,
        r.backCoverOriginal,
        r.links?.musicBrainz,
        r.links?.listenBrainz,
        r.links?.discogs,
        r.links?.qobuz,
        r.links?.naxos
      ].join(' | ');
      if (!contains(blob, f.all)) return false;
    }

    return true;
  };

  const getFilters = () => ({
    all: norm(qAll.value),
    cd: norm(qCd.value),
    title: norm(qTitle.value),
    artist: norm(qArtist.value),
    year: norm(qYear.value),
    label: norm(qLabel.value),
    cat: norm(qCat.value)
  });

  const link = (href, text, disabled = false, target = '_blank') => {
     const a = document.createElement('a');
     a.textContent = text;
     a.href = href || '#';
     a.target = target;

     // Only needed for _blank
     if (target === '_blank') a.rel = 'noopener';

     if (disabled) a.classList.add('disabled');
     return a;
   };


  const closeModal = () => {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    modalImg.src = '';
  };

  const setModalImage = (which) => {
    modalState.showing = which;
    const src = which === 'back' ? modalState.back : modalState.front;
    modalImg.src = src || '';
    btnFront.disabled = (which === 'front');
    btnBack.disabled = (which === 'back');
  };

  const openModal = (front, back, title) => {
    modalState = { front, back, showing: 'front' };
    modalTitle.textContent = title || 'Cover';

    const hasFront = !!front;
    const hasBack = !!back;

    btnFront.style.display = hasFront ? '' : 'none';
    btnBack.style.display = hasBack ? '' : 'none';

    // Clicking the image toggles front/back if a back cover is present.
    modalImg.style.cursor = hasBack ? 'pointer' : '';

    // If there's no front but there is a back, start with back.
    if (!hasFront && hasBack) {
      setModalImage('back');
    } else {
      setModalImage('front');
    }

    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
  };

  btnClose.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });
  btnFront.addEventListener('click', () => setModalImage('front'));
  btnBack.addEventListener('click', () => setModalImage('back'));

  modalImg.addEventListener('click', () => {
    if (!modalState.back) return;
    setModalImage(modalState.showing === 'front' ? 'back' : 'front');
  });

  const render = () => {
    const f = getFilters();
    const filtered = records.filter(r => matches(r, f));

    const pageSize = parseInt(pageSizeSel.value, 10) || 0;
    const usePaging = pageSize > 0;
    const total = filtered.length;
    const totalPages = usePaging ? Math.max(1, Math.ceil(total / pageSize)) : 1;

    if (page > totalPages) page = totalPages;
    if (page < 1) page = 1;

    const slice = usePaging
      ? filtered.slice((page - 1) * pageSize, page * pageSize)
      : filtered;

    prevBtn.disabled = !(usePaging && page > 1);
    nextBtn.disabled = !(usePaging && page < totalPages);
    pageInfoEl.textContent = usePaging ? `Page ${page} / ${totalPages}` : 'All results';
    statsEl.textContent = `${total} result(s)`;

    listEl.innerHTML = '';

    const makeLine = (k, v) => {
      const d = document.createElement('div');
      d.className = 'line';
      const kk = document.createElement('div');
      kk.className = 'k';
      kk.textContent = k;
      const vv = document.createElement('div');
      vv.className = 'v';
      vv.textContent = v ?? '';
      d.appendChild(kk);
      d.appendChild(vv);
      return d;
    };

    for (const r of slice) {
      const row = document.createElement('div');
      row.className = 'row';

      const cover = document.createElement('div');
      cover.className = 'cover';

      const coverClickUrl = r.coverOriginal || r.coverThumb || null;

      if (r.coverThumb) {
        const img = document.createElement('img');
        img.loading = 'lazy';
        img.alt = 'Cover';
        img.src = r.coverThumb;
        cover.appendChild(img);
      } else {
        const ph = document.createElement('div');
        ph.className = 'placeholder';
        ph.textContent = 'No cover';
        cover.appendChild(ph);
      }

      if (coverClickUrl) {
        cover.addEventListener('click', () => {
          openModal(r.coverOriginal || r.coverThumb, r.backCoverOriginal, r.title);
        });
      } else {
        cover.classList.add('no-click');
      }

      const meta = document.createElement('div');
      meta.className = 'meta';

      const sticker = document.createElement('div');
      sticker.className = 'sticker';
      const n = (r.cDedNumber ?? '').toString().trim();
      sticker.textContent = n ? ` ${n}` : ' —';
      meta.appendChild(sticker);

      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = r.title || '(untitled)';
      meta.appendChild(title);

      meta.appendChild(makeLine('Artists', r.artists ?? ''));
      if (r.year !== null && r.year !== undefined && `${r.year}`.trim() !== '') meta.appendChild(makeLine('Year', `${r.year}`));
      if (r.label) meta.appendChild(makeLine('Label', r.label));
      if (r.catNo) meta.appendChild(makeLine('Catalog number', r.catNo));
      if (r.notes) meta.appendChild(makeLine('Notes', r.notes));

      const links = document.createElement('div');
      links.className = 'links';

      // Always present, but only truly useful when hosted in the app.
      const localA = link(r.localUrl, 'Edit', false, '_self');
      if (!isHosted) {
        localA.classList.add('disabled');
        localA.title = 'Open this site inside the CdArchive app to use Edit links.';
      }
      links.appendChild(localA);

      if (r.links?.musicBrainz) links.appendChild(link(r.links.musicBrainz, 'MusicBrainz'));
      if (r.links?.listenBrainz) links.appendChild(link(r.links.listenBrainz, 'ListenBrainz'));
      if (r.links?.discogs) links.appendChild(link(r.links.discogs, 'Discogs'));
      if (r.links?.qobuz) links.appendChild(link(r.links.qobuz, 'Qobuz'));
      if (r.links?.naxos) links.appendChild(link(r.links.naxos, 'Naxos'));

      meta.appendChild(links);

      row.appendChild(cover);
      row.appendChild(meta);
      listEl.appendChild(row);
    }
  };

  const resetAndRender = () => { page = 1; render(); };
  [qAll, qCd, qTitle, qArtist, qYear, qLabel, qCat].forEach(i => i.addEventListener('input', resetAndRender));
  pageSizeSel.addEventListener('change', resetAndRender);

  prevBtn.addEventListener('click', () => { page--; render(); });
  nextBtn.addEventListener('click', () => { page++; render(); });

  render();
})();