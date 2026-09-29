/* watchlist.js — Client Watchlist (retention loop), phase 1.
 * ------------------------------------------------------------------
 * Agencies add client sites, re-audit them over time with the same
 * deterministic landing-page engine, and watch scores move on a
 * per-site history graph with a plain-English changelog
 * ("2 issues fixed since last audit").
 *
 * STORAGE: localStorage, per browser (demo mode). A real backend
 * replaces loadStore/saveStore — every read/write goes through them.
 * Re-audits use the server-side fetch-page function + LandingEngine,
 * exactly like the Landing Page Audit, including its thin-content
 * guard (JavaScript-rendered pages are never scored on a shell).
 *
 * UMD like the other engines: pure functions are exported for node
 * tests via module.exports; the browser UI boots on DOMContentLoaded.
 * ------------------------------------------------------------------ */
(function (global) {
  'use strict';

  var STORE_KEY = 'tradesad_watchlist_v1';
  var BRAND_KEY = 'tradesad_watchlist_brand';
  var MAX_SITES_DEMO = 10;       // Pro: 10 sites · Scale: 50 (enforced when accounts launch)
  var REAUDIT_DUE_DAYS = 30;     // "re-audit due" badge after this many days
  var MIN_VISIBLE_TEXT = 400;    // thin-content guard, same bar as landing-ui.js
  var FETCH_ENDPOINT = '/.netlify/functions/fetch-page?url=';
  var DEFAULT_BRAND = 'Vanguard Trades Media';

  /* ============================== store ============================== */

  function blankStore() { return { sites: [] }; }

  function mem() {
    return (typeof localStorage !== 'undefined') ? localStorage : null;
  }

  function loadStore(storage) {
    storage = storage || mem();
    if (!storage) return blankStore();
    try {
      var raw = storage.getItem(STORE_KEY);
      if (!raw) return blankStore();
      var s = JSON.parse(raw);
      if (!s || !Array.isArray(s.sites)) return blankStore();
      return s;
    } catch (e) { return blankStore(); }
  }

  function saveStore(store, storage) {
    storage = storage || mem();
    if (!storage) return false;
    try {
      storage.setItem(STORE_KEY, JSON.stringify(store));
      return true;
    } catch (e) { return false; }
  }

  function newId() {
    return 'ws_' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  }

  function normalizeUrl(u) {
    u = String(u || '').trim();
    if (!u) return '';
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(u)) u = 'https://' + u;
    return u;
  }

  function urlOK(u) {
    return /^(https?:\/\/)[^\s/$.?#].[^\s]*$/i.test(u) && u.length <= 2048;
  }

  /* ============================ mutations ============================ */

  // Returns {ok:true, site} or {ok:false, error} with a plain-English error.
  function addSite(store, name, url) {
    name = String(name || '').trim();
    url = normalizeUrl(url);
    if (!name) return { ok: false, error: 'Give the client a name — e.g. "Acme Plumbing".' };
    if (!urlOK(url)) return { ok: false, error: 'That doesn\u2019t look like a valid web address.' };
    var dupe = store.sites.some(function (s) { return s.url.toLowerCase() === url.toLowerCase(); });
    if (dupe) return { ok: false, error: 'That site is already on your watchlist.' };
    if (store.sites.length >= MAX_SITES_DEMO) {
      return { ok: false, error: 'Demo mode holds ' + MAX_SITES_DEMO + ' sites. Pro includes 10, Scale 50 — see Pricing.' };
    }
    var site = { id: newId(), name: name, url: url, addedAt: new Date().toISOString(), audits: [] };
    store.sites.push(site);
    return { ok: true, site: site };
  }

  function removeSite(store, id) {
    store.sites = store.sites.filter(function (s) { return s.id !== id; });
  }

  function getSite(store, id) {
    for (var i = 0; i < store.sites.length; i++) {
      if (store.sites[i].id === id) return store.sites[i];
    }
    return null;
  }

  // Compact snapshot: everything the history/graph/changelog needs, nothing more.
  function snapshotOf(audit) {
    return {
      at: audit.audited_at || new Date().toISOString(),
      score: audit.score,
      verdict: audit.verdict,
      version: audit.version,
      findings: (audit.findings || []).map(function (f) {
        return { check_id: f.check_id, check_name: f.check_name, severity: f.severity };
      }),
      strengthCount: (audit.strengths || []).length,
      phone: audit.phone && audit.phone.canonical ? audit.phone.canonical : null,
      license: audit.license && audit.license.found ? audit.license.match : null
    };
  }

  function recordAudit(store, id, audit) {
    var site = getSite(store, id);
    if (!site) return null;
    var snap = snapshotOf(audit);
    site.audits.push(snap);
    return snap;
  }

  /* ============================ derived ============================ */

  function latestAudit(site) {
    return site.audits.length ? site.audits[site.audits.length - 1] : null;
  }

  function daysSince(iso, nowMs) {
    var then = Date.parse(iso);
    if (isNaN(then)) return Infinity;
    var now = (typeof nowMs === 'number') ? nowMs : Date.now();
    return Math.floor((now - then) / 86400000);
  }

  // "Due" state for the retention nudge. Returns 'never' | 'due' | 'ok'.
  function dueState(site, nowMs) {
    var last = latestAudit(site);
    if (!last) return 'never';
    return daysSince(last.at, nowMs) >= REAUDIT_DUE_DAYS ? 'due' : 'ok';
  }

  // Changelog between two snapshots, keyed by check_id (stable across runs).
  // Returns { fixed: [{check_id, check_name}], added: [{check_id, check_name, severity}], scoreDelta }
  function diffFindings(prev, curr) {
    prev = prev || { findings: [], score: null };
    curr = curr || { findings: [], score: null };
    var prevIds = {}, currIds = {};
    (prev.findings || []).forEach(function (f) { prevIds[f.check_id] = f; });
    (curr.findings || []).forEach(function (f) { currIds[f.check_id] = f; });
    var fixed = [], added = [];
    Object.keys(prevIds).forEach(function (id) {
      if (!currIds[id]) fixed.push({ check_id: id, check_name: prevIds[id].check_name });
    });
    Object.keys(currIds).forEach(function (id) {
      if (!prevIds[id]) added.push({
        check_id: id,
        check_name: currIds[id].check_name,
        severity: currIds[id].severity
      });
    });
    var scoreDelta = (typeof prev.score === 'number' && typeof curr.score === 'number')
      ? curr.score - prev.score : null;
    return { fixed: fixed, added: added, scoreDelta: scoreDelta };
  }

  function scoreSeries(site) {
    return site.audits.map(function (a) { return { at: a.at, score: a.score }; });
  }

  // Pure SVG line graph of scores over time. Returns an SVG string.
  function svgGraph(series, opts) {
    opts = opts || {};
    var W = 560, H = 180, PAD_L = 34, PAD_R = 12, PAD_T = 14, PAD_B = 26;
    var iw = W - PAD_L - PAD_R, ih = H - PAD_T - PAD_B;
    if (!series || series.length === 0) return '';
    var pts = series.map(function (p, i) {
      var x = series.length === 1 ? PAD_L + iw / 2 : PAD_L + (i / (series.length - 1)) * iw;
      var y = PAD_T + ih - (Math.max(0, Math.min(100, p.score)) / 100) * ih;
      return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, score: p.score, at: p.at };
    });
    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p.x + ' ' + p.y; }).join(' ');
    var dots = pts.map(function (p) {
      return '<circle cx="' + p.x + '" cy="' + p.y + '" r="4.5" fill="#0ea5e9" stroke="#fff" stroke-width="2"/>';
    }).join('');
    var first = pts[0], last = pts[pts.length - 1];
    function dateLabel(iso) {
      var d = new Date(iso);
      return isNaN(d) ? '' : (d.getMonth() + 1) + '/' + d.getDate();
    }
    var labels =
      '<text x="' + first.x + '" y="' + (H - 8) + '" font-size="11" fill="#64748b" text-anchor="middle">' + esc(dateLabel(first.at)) + '</text>' +
      '<text x="' + last.x + '" y="' + (H - 8) + '" font-size="11" fill="#64748b" text-anchor="middle">' + esc(dateLabel(last.at)) + '</text>' +
      '<text x="' + last.x + '" y="' + (last.y - 10) + '" font-size="13" font-weight="700" fill="#0f172a" text-anchor="middle">' + last.score + '</text>';
    var grid = [0, 25, 50, 75, 100].map(function (v) {
      var y = PAD_T + ih - (v / 100) * ih;
      return '<line x1="' + PAD_L + '" y1="' + y + '" x2="' + (W - PAD_R) + '" y2="' + y +
        '" stroke="#e2e8f0" stroke-width="1"/>' +
        '<text x="' + (PAD_L - 6) + '" y="' + (y + 4) + '" font-size="10" fill="#94a3b8" text-anchor="end">' + v + '</text>';
    }).join('');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Score history graph" ' +
      'style="width:100%;height:auto;display:block">' + grid +
      '<path d="' + line + '" fill="none" stroke="#0ea5e9" stroke-width="2.5" stroke-linejoin="round"/>' +
      dots + labels + '</svg>';
  }

  function visibleTextLength(html) {
    var t = String(html || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return t.length;
  }

  /* ============================ UI helpers ============================ */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function verdictClass(v) {
    return v === 'HIGH RISK' ? 'v-high' : v === 'NEEDS REVIEW' ? 'v-review' : 'v-clear';
  }

  function fmtDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  var api = {
    STORE_KEY: STORE_KEY,
    MAX_SITES_DEMO: MAX_SITES_DEMO,
    REAUDIT_DUE_DAYS: REAUDIT_DUE_DAYS,
    DEFAULT_BRAND: DEFAULT_BRAND,
    blankStore: blankStore,
    loadStore: loadStore,
    saveStore: saveStore,
    normalizeUrl: normalizeUrl,
    urlOK: urlOK,
    addSite: addSite,
    removeSite: removeSite,
    getSite: getSite,
    snapshotOf: snapshotOf,
    recordAudit: recordAudit,
    latestAudit: latestAudit,
    daysSince: daysSince,
    dueState: dueState,
    diffFindings: diffFindings,
    scoreSeries: scoreSeries,
    svgGraph: svgGraph,
    visibleTextLength: visibleTextLength,
    MIN_VISIBLE_TEXT: MIN_VISIBLE_TEXT,
    FETCH_ENDPOINT: FETCH_ENDPOINT
  };

  /* ============================ browser UI ============================ */

  function boot() {
    if (!global.document) return;
    var $ = function (id) { return document.getElementById(id); };

    var store = loadStore();
    var brandInput = $('wlBrand');
    var savedBrand = mem() ? mem().getItem(BRAND_KEY) : null;
    if (brandInput) {
      brandInput.value = savedBrand || DEFAULT_BRAND;
      brandInput.addEventListener('change', function () {
        if (mem()) mem().setItem(BRAND_KEY, brandInput.value.trim() || DEFAULT_BRAND);
        renderBrand();
      });
    }

    function persist() { saveStore(store); }

    function renderBrand() {
      var els = document.querySelectorAll('.wl-brand-name');
      var b = (brandInput && brandInput.value.trim()) || DEFAULT_BRAND;
      for (var i = 0; i < els.length; i++) els[i].textContent = b;
    }

    /* ---------- add-site form ---------- */
    var form = $('wlAddForm');
    if (form) {
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var err = $('wlAddError');
        err.hidden = true;
        var res = addSite(store, $('wlName').value, $('wlUrl').value);
        if (!res.ok) {
          err.textContent = res.error;
          err.hidden = false;
          return;
        }
        persist();
        $('wlName').value = '';
        $('wlUrl').value = '';
        renderList();
      });
    }

    /* ---------- site list ---------- */
    function renderList() {
      var list = $('wlList');
      var empty = $('wlEmpty');
      if (!list) return;
      renderBrand();
      if (!store.sites.length) {
        list.innerHTML = '';
        if (empty) empty.hidden = false;
        return;
      }
      if (empty) empty.hidden = true;
      list.innerHTML = store.sites.map(siteCard).join('');
      bindCards();
    }

    function dueBadge(site) {
      var st = dueState(site);
      if (st === 'never') return '<span class="wl-due wl-due-new">Not audited yet</span>';
      if (st === 'due') return '<span class="wl-due wl-due-due">Re-audit due</span>';
      return '';
    }

    function siteCard(site) {
      var last = latestAudit(site);
      var scoreHtml = last
        ? '<div class="wl-score"><span class="wl-score-num">' + last.score + '</span>' +
          '<span class="wl-verdict ' + verdictClass(last.verdict) + '">' + esc(last.verdict) + '</span></div>' +
          '<div class="wl-meta">Last audit ' + esc(fmtDate(last.at)) +
          (last.phone ? ' · ' + esc(last.phone) : '') +
          (last.license ? ' · ' + esc(last.license) : '') + '</div>'
        : '<div class="wl-meta">No audits yet — run the first one below.</div>';
      return '<article class="card wl-site" data-site="' + site.id + '">' +
        '<div class="wl-site-head">' +
          '<div><h3>' + esc(site.name) + '</h3>' +
          '<a class="wl-url" href="' + esc(site.url) + '" target="_blank" rel="noopener">' + esc(site.url) + '</a></div>' +
          dueBadge(site) +
        '</div>' +
        scoreHtml +
        '<div class="wl-actions">' +
          '<button class="btn primary wl-reaudit" type="button">Re-audit now</button>' +
          '<button class="btn ghost wl-progress" type="button"' + (site.audits.length ? '' : ' disabled') + '>Progress</button>' +
          '<button class="link-btn wl-remove" type="button">Remove</button>' +
        '</div>' +
        '<p class="wl-status" hidden></p>' +
        '<div class="wl-progress-panel" hidden></div>' +
      '</article>';
    }

    function bindCards() {
      var cards = document.querySelectorAll('.wl-site');
      for (var i = 0; i < cards.length; i++) {
        (function (card) {
          var id = card.getAttribute('data-site');
          card.querySelector('.wl-reaudit').addEventListener('click', function () { reAudit(id, card); });
          card.querySelector('.wl-remove').addEventListener('click', function () {
            var site = getSite(store, id);
            if (site && confirm('Remove "' + site.name + '" and its full audit history?')) {
              removeSite(store, id);
              persist();
              renderList();
            }
          });
          var prog = card.querySelector('.wl-progress');
          if (prog && !prog.disabled) {
            prog.addEventListener('click', function () { toggleProgress(id, card); });
          }
        })(cards[i]);
      }
    }

    /* ---------- re-audit ---------- */
    function setStatus(card, msg, isErr) {
      var el = card.querySelector('.wl-status');
      el.hidden = !msg;
      el.textContent = msg || '';
      el.className = 'wl-status' + (isErr ? ' wl-err' : '');
    }

    function reAudit(id, card) {
      var site = getSite(store, id);
      if (!site || typeof LandingEngine === 'undefined') return;
      var btn = card.querySelector('.wl-reaudit');
      btn.disabled = true;
      setStatus(card, 'Opening the page…');
      fetch(FETCH_ENDPOINT + encodeURIComponent(site.url))
        .then(function (resp) { return resp.json(); })
        .then(function (data) {
          if (!(data && data.ok && data.html)) {
            setStatus(card, 'Couldn\u2019t open that link (' + plainReason(data && data.reason) + '). The page may block readers — open the Landing Page Audit and paste the content, then re-audit here.', true);
            return;
          }
          if (visibleTextLength(data.html) < MIN_VISIBLE_TEXT) {
            setStatus(card, 'We could only see part of that page — it probably loads its content with JavaScript, so we won\u2019t guess a score. Open the Landing Page Audit, paste the page content, then re-audit here.', true);
            return;
          }
          var audit = LandingEngine.auditLandingHtml(data.html);
          var snap = recordAudit(store, id, audit);
          persist();
          setStatus(card, 'Audited just now — score ' + snap.score + ' (' + snap.verdict + ').');
          renderList();
        })
        .catch(function () {
          setStatus(card, 'Couldn\u2019t reach the audit service right now. Try again in a moment.', true);
        })
        .then(function () { btn.disabled = false; });
    }

    function plainReason(reason) {
      var map = {
        invalid_url: 'bad address', blocked: 'site blocked our reader',
        not_found: 'page not found', timeout: 'site took too long',
        too_large: 'page too large', fetch_failed: 'could not open'
      };
      return map[reason] || 'could not open';
    }

    /* ---------- progress: graph + changelog ---------- */
    function toggleProgress(id, card) {
      var panel = card.querySelector('.wl-progress-panel');
      if (!panel.hidden) { panel.hidden = true; return; }
      var site = getSite(store, id);
      if (!site) return;
      panel.innerHTML = progressHtml(site);
      panel.hidden = false;
    }

    function progressHtml(site) {
      var series = scoreSeries(site);
      var graph = svgGraph(series);
      var rows = '';
      for (var i = site.audits.length - 1; i >= 0; i--) {
        var curr = site.audits[i];
        var prev = i > 0 ? site.audits[i - 1] : null;
        var diff = diffFindings(prev, curr);
        rows += auditRow(curr, prev, diff);
      }
      return '<div class="wl-progress-inner">' +
        '<div class="wl-brandline">Prepared by <strong class="wl-brand-name">' + esc(DEFAULT_BRAND) + '</strong> · Client progress report</div>' +
        '<h4>Score history</h4>' + graph +
        '<h4>What changed</h4>' + rows +
        '<div class="wl-actions no-print"><button class="btn ghost" type="button" onclick="window.print()">Print / Save PDF</button></div>' +
      '</div>';
    }

    function auditRow(curr, prev, diff) {
      var delta = diff.scoreDelta;
      var deltaHtml = (delta === null) ? '<span class="wl-muted">first audit</span>'
        : (delta > 0 ? '<span class="wl-up">▲ +' + delta + ' pts</span>'
        : delta < 0 ? '<span class="wl-down">▼ ' + delta + ' pts</span>'
        : '<span class="wl-muted">no change</span>');
      var fixedHtml = diff.fixed.length
        ? '<ul class="wl-fixed">' + diff.fixed.map(function (f) {
            return '<li>Fixed: ' + esc(f.check_name) + '</li>';
          }).join('') + '</ul>' : '';
      var addedHtml = diff.added.length
        ? '<ul class="wl-added">' + diff.added.map(function (f) {
            return '<li>New flag (' + esc(f.severity) + '): ' + esc(f.check_name) + '</li>';
          }).join('') + '</ul>' : '';
      var noneHtml = (!diff.fixed.length && !diff.added.length && prev)
        ? '<p class="wl-muted">No new issues, none resolved — steady.</p>' : '';
      return '<div class="wl-audit-row">' +
        '<div class="wl-audit-head"><strong>' + esc(fmtDate(curr.at)) + '</strong>' +
        '<span class="wl-verdict ' + verdictClass(curr.verdict) + '">' + curr.score + ' · ' + esc(curr.verdict) + '</span>' +
        deltaHtml + '</div>' +
        fixedHtml + addedHtml + noneHtml +
      '</div>';
    }

    renderList();
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.Watchlist = api;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
