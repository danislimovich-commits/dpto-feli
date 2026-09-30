(() => {
  const UF = window.UF_VALUE;
  const LIST = window.PROPERTIES.map(p => ({ ...p, clp: p.price.clp ?? Math.round(p.price.uf * UF) }));
  const byId = Object.fromEntries(LIST.map(p => [p.id, p]));
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const money = n => '$' + Math.round(n).toLocaleString('es-CL');
  const short = n => '$' + (n / 1e6).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'M';
  const ufTxt = u => 'UF ' + u.toLocaleString('es-CL', { maximumFractionDigits: 2 });
  const m2 = n => n.toLocaleString('es-CL', { maximumFractionDigits: 1 }) + ' m²';
  // Mercado Libre serves several sizes of the same photo; use the lighter one for thumbnails.
  const thumb = u => u.includes('mlstatic.com') ? u.replace('D_NQ_NP_2X_', 'D_NQ_NP_').replace('-F.webp', '-O.webp')
    : u.includes('i0.wp.com') ? u + '?w=720' : u;
  const big = u => u.includes('i0.wp.com') ? u + '?w=1600' : u;

  // ── Favorites (localStorage; falls back to memory if blocked) ──
  const KEY = 'dptofeli:favs';
  let favs;
  try { favs = new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { favs = new Set(); }
  const saveFavs = () => { try { localStorage.setItem(KEY, JSON.stringify([...favs])); } catch {} };

  let sort = 'asc', onlyFavs = false;

  // ── Header copy ──
  const HEADLINE = `${LIST.length} departamentos elegidos para <em>Feli</em>`;
  $('#ufDate').textContent = window.UF_DATE;
  $('#ufVal').textContent = money(UF);

  const factsLine = p => [`${p.beds}D`, `${p.baths}B`, p.m2 && m2(p.m2) + ' útiles'].filter(Boolean).join('<span class="dot">·</span>');
  const priceLine = p => `${p.priceFrom ? '<span class="from">desde</span>' : ''}<strong>${money(p.clp)}</strong>${p.price.uf ? `<span class="uf">${ufTxt(p.price.uf)}</span>` : ''}`;

  // Fade images in once loaded; hide broken ones gracefully.
  const onImg = img => {
    const ok = () => img.classList.add('ok');
    img.complete && img.naturalWidth ? ok() : img.addEventListener('load', ok, { once: true });
    img.addEventListener('error', () => { img.style.visibility = 'hidden'; }, { once: true });
  };

  // ── Grid ──
  function visible() {
    const l = LIST.filter(p => !onlyFavs || favs.has(p.id));
    return l.sort((a, b) => sort === 'asc' ? a.clp - b.clp : b.clp - a.clp);
  }

  function render() {
    const l = visible();
    $('#grid').innerHTML = l.map((p, i) => `
      <article class="card" tabindex="0" data-id="${p.id}" style="animation-delay:${Math.min(i, 8) * 40}ms">
        <div class="photo">
          <img src="${esc(thumb(p.photos[0]))}" alt="${esc(p.name)}" loading="${i < 4 ? 'eager' : 'lazy'}">
          <div class="shade"></div>
          <span class="kind">${esc(p.kind.split(' · ')[0])}</span>
          <span class="badge">${p.photos.length} fotos</span>
          <button type="button" class="star-btn ${favs.has(p.id) ? 'on' : ''}" data-fav="${p.id}" aria-label="Marcar favorito" aria-pressed="${favs.has(p.id)}">${favs.has(p.id) ? '★' : '☆'}</button>
        </div>
        <div class="card-body">
          <div class="card-sector">${esc(p.sector)}</div>
          <h3 class="card-name">${esc(p.name)}</h3>
          <div class="card-price">${priceLine(p)}</div>
          <div class="facts">${factsLine(p)}</div>
          ${p.gc ? `<div class="gc">+ ${money(p.gc)} gastos comunes</div>` : ''}
        </div>
      </article>`).join('');
    $('#grid').querySelectorAll('img').forEach(onImg);
    $('#empty').hidden = l.length > 0;
    $('#favCount').textContent = favs.size;
    $('#headline').innerHTML = onlyFavs ? `Tus <em>favoritos</em>` : HEADLINE;
    const ft = $('#favToggle');
    ft.setAttribute('aria-pressed', onlyFavs);
    ft.querySelector('.star').textContent = onlyFavs || favs.size ? '★' : '☆';
    syncMarkers(l);
  }

  function toggleFav(id) {
    favs.has(id) ? favs.delete(id) : favs.add(id);
    saveFavs();
    if (onlyFavs) render();
    else {
      // Update in place so the grid doesn't re-animate.
      const on = favs.has(id);
      document.querySelectorAll(`.star-btn[data-fav="${id}"]`).forEach(b => { b.classList.toggle('on', on); b.textContent = on ? '★' : '☆'; b.setAttribute('aria-pressed', on); });
      $('#favCount').textContent = favs.size;
      $('#favToggle .star').textContent = favs.size ? '★' : '☆';
      markers[id].refresh();
    }
    if (!$('#detail').hidden) renderInfo(byId[id]);
  }

  // ── Map ──
  const map = L.map('map', { zoomControl: false, scrollWheelZoom: true, attributionControl: true, maxZoom: 16, zoomSnap: 0.5 });
  L.control.zoom({ position: 'topright' }).addTo(map);
  // Esri light-gray basemap + labels: free, no API key.
  const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/';
  L.tileLayer(ESRI + 'World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', { maxZoom: 16, attribution: 'Tiles &copy; Esri — Esri, HERE, Garmin, &copy; OpenStreetMap' }).addTo(map);
  L.tileLayer(ESRI + 'World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}', { maxZoom: 16, pane: 'shadowPane' }).addTo(map);
  L.polygon(window.SEARCH_ZONE, { color: '#b8872b', weight: 1.5, dashArray: '5 6', fillColor: '#b8872b', fillOpacity: 0.08, interactive: false, smoothFactor: 2 }).addTo(map);

  // Nearby buildings collapse into one pill ("3 deptos · desde $1,16M") until zoomed in.
  const cluster = L.markerClusterGroup({
    maxClusterRadius: 64, disableClusteringAtZoom: 16, showCoverageOnHover: false, spiderfyOnMaxZoom: true, zoomToBoundsOnClick: true,
    iconCreateFunction: c => {
      const kids = c.getAllChildMarkers();
      const lo = Math.min(...kids.map(k => k.options.clp));
      return L.divIcon({ className: '', iconSize: null, html: `<div class="pin cl" title="${kids.length} departamentos · desde ${short(lo)}">${kids.length}</div>` });
    },
  }).addTo(map);

  const markers = {};
  for (const p of LIST) {
    const icon = () => L.divIcon({
      className: '', iconSize: null,
      html: `<div class="pin ${p.approx ? 'approx' : ''}">${favs.has(p.id) ? '<span class="s">★</span>' : ''}${short(p.clp)}</div>`,
    });
    const m = L.marker([p.lat, p.lng], { icon: icon(), riseOnHover: true, title: p.name, clp: p.clp });
    m.refresh = () => m.setIcon(icon());
    m.bindPopup(() => `
      <div class="pop">
        <img src="${esc(thumb(p.photos[0]))}" alt="">
        <div class="pop-b">
          <div class="pop-n">${esc(p.name)}</div>
          <div class="pop-p">${p.priceFrom ? 'desde ' : ''}${money(p.clp)}</div>
          <div class="pop-f">${p.beds}D · ${p.baths}B${p.m2 ? ' · ' + m2(p.m2) : ''}${p.approx ? ' · ubicación aprox.' : ''}</div>
          <button type="button" data-open="${p.id}">Ver ficha</button>
        </div>
      </div>`, { closeButton: true, offset: [0, -30], autoPanPadding: [30, 30] });
    m.on('mouseover', () => highlightCard(p.id, true));
    m.on('mouseout', () => highlightCard(p.id, false));
    markers[p.id] = m;
  }
  map.fitBounds(L.latLngBounds(LIST.map(p => [p.lat, p.lng])), { padding: [50, 50] });

  function syncMarkers(l) {
    cluster.clearLayers();
    for (const p of l) { markers[p.id].refresh(); cluster.addLayer(markers[p.id]); }
  }

  // Pin for a card: the marker itself if visible, else the cluster containing it.
  const pinEl = id => { const m = markers[id]; const v = m && cluster.getVisibleParent(m); return v?.getElement(); };

  function highlightCard(id, on) {
    document.querySelector(`.card[data-id="${id}"]`)?.classList.toggle('hl', on);
  }
  function highlightPin(id, on) {
    const el = pinEl(id);
    if (!el) return;
    el.classList.toggle('lift', on);
    el.querySelector('.pin')?.classList.toggle('hl', on);
  }

  // ── Detail ──
  let cur = null, idx = 0;

  function open(id, push = true) {
    const p = byId[id];
    if (!p) return;
    cur = p; idx = 0;
    map.closePopup();
    $('#dThumbs').innerHTML = p.photos.map((u, i) => `<button type="button" data-i="${i}" aria-label="Foto ${i + 1}"><img src="${esc(thumb(u))}" alt="" loading="lazy"></button>`).join('');
    renderInfo(p);
    show(0);
    $('#detail').hidden = false;
    document.body.classList.add('lock');
    if (push) history.pushState(null, '', '#' + id);
    $('#detail .close').focus({ preventScroll: true });
  }

  function close(push = true) {
    if ($('#detail').hidden) return;
    $('#detail').hidden = true;
    document.body.classList.remove('lock');
    if (push) history.pushState(null, '', location.pathname + location.search);
    if (cur) document.querySelector(`.card[data-id="${cur.id}"]`)?.focus({ preventScroll: true });
    cur = null;
  }

  function show(i) {
    const n = cur.photos.length;
    idx = (i + n) % n;
    const img = $('#dImg');
    img.classList.remove('ok');
    img.style.visibility = '';
    // Show the (usually cached) thumbnail blurred underneath while the large photo loads.
    $('.stage').style.backgroundImage = `url("${thumb(cur.photos[idx])}")`;
    img.src = big(cur.photos[idx]);
    onImg(img);
    $('#dCounter').textContent = `${idx + 1} / ${n}`;
    $('#dThumbs').querySelectorAll('button').forEach((b, k) => b.classList.toggle('on', k === idx));
    $('#dThumbs').children[idx]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    // Preload the next photo so arrows feel instant.
    new Image().src = big(cur.photos[(idx + 1) % n]);
  }

  function renderInfo(p) {
    const spec = (k, v) => v ? `<div>${k}<b>${esc(v)}</b></div>` : '';
    const fav = favs.has(p.id);
    $('#dInfo').innerHTML = `
      <div class="card-sector">${esc(p.sector)} · ${esc(p.kind)}</div>
      <h2 id="dName">${esc(p.name)}</h2>
      <p class="addr">${esc(p.address)}</p>
      ${p.approx ? '<div class="approx-note">Ubicación aproximada en el mapa</div>' : ''}
      <div class="price-block">
        <div class="price-big">${p.priceFrom ? '<span class="from">desde </span>' : ''}${money(p.clp)} <span class="from">/ mes</span></div>
        <div class="price-sub">${p.price.uf ? `Publicado en ${ufTxt(p.price.uf)} · convertido a UF ${esc(window.UF_DATE)}` : 'Publicado en pesos'}${p.gc ? ` · Gastos comunes ${money(p.gc)}` : ''}</div>
      </div>
      <div class="specs">
        ${spec('Dormitorios', p.beds)}
        ${spec('Baños', p.baths)}
        ${spec('Sup. útil', p.m2 && m2(p.m2))}
        ${spec('Sup. total', p.m2Total && m2(p.m2Total))}
        ${spec('Terraza', p.terrace && m2(p.terrace))}
        ${spec('Piso', p.floor)}
        ${spec('Estacionamiento', p.parking || 'No informado')}
        ${spec('Bodega', p.storage || 'No informado')}
      </div>
      <p class="note">${esc(p.note)}</p>
      <ul class="hl-list">${(p.highlights || []).map(h => `<li>${esc(h)}</li>`).join('')}</ul>
      <div class="actions">
        <a class="cta" href="${esc(p.source.url)}" target="_blank" rel="noopener">Ver aviso original ↗</a>
        <button type="button" class="star-lg ${fav ? 'on' : ''}" data-fav="${p.id}" aria-label="Marcar favorito" aria-pressed="${fav}">${fav ? '★' : '☆'}</button>
      </div>
      <div class="src">Fuente: ${esc(p.source.label)}</div>
      ${p.otherSources?.length ? `<div class="others"><p>También publicado en</p>${p.otherSources.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a>`).join('')}</div>` : ''}`;
  }

  // ── Events ──
  document.addEventListener('click', e => {
    const fav = e.target.closest('[data-fav]');
    if (fav) { e.stopPropagation(); return toggleFav(fav.dataset.fav); }
    const opener = e.target.closest('[data-open]');
    if (opener) return open(opener.dataset.open);
    if (e.target.closest('[data-close]')) return close();
    const card = e.target.closest('.card');
    if (card) return open(card.dataset.id);
    const th = e.target.closest('#dThumbs button');
    if (th) return show(+th.dataset.i);
    if (e.target.closest('.nav.prev')) return show(idx - 1);
    if (e.target.closest('.nav.next')) return show(idx + 1);
    const s = e.target.closest('[data-sort]');
    if (s) {
      sort = s.dataset.sort;
      document.querySelectorAll('[data-sort]').forEach(b => b.classList.toggle('on', b === s));
      return render();
    }
  });
  $('#favToggle').addEventListener('click', () => { onlyFavs = !onlyFavs; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  $('#showAll').addEventListener('click', () => { onlyFavs = false; render(); });

  const grid = $('#grid');
  grid.addEventListener('mouseover', e => { const c = e.target.closest('.card'); if (c) highlightPin(c.dataset.id, true); });
  grid.addEventListener('mouseout', e => { const c = e.target.closest('.card'); if (c) highlightPin(c.dataset.id, false); });

  document.addEventListener('keydown', e => {
    if (!$('#detail').hidden) {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    } else if (e.key === 'Enter' && e.target.classList?.contains('card')) open(e.target.dataset.id);
  });

  // Swipe on the photo stage (touch devices).
  let x0 = null;
  $('.stage').addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  $('.stage').addEventListener('touchend', e => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1));
    x0 = null;
  });

  // Deep links: #ml-123 opens that property; back button closes.
  const fromHash = () => { const id = location.hash.slice(1); byId[id] ? open(id, false) : close(false); };
  window.addEventListener('popstate', fromHash);

  render();
  fromHash();
})();
