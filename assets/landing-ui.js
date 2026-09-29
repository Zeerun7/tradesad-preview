/* landing-ui.js — UI wiring for the landing-page audit.
 * Link-first: user enters a page link → the Netlify fetch-page function
 * opens it server-side (browsers can't fetch arbitrary URLs) → the HTML
 * is fed into extractFromHtml and the rule engine runs in the browser.
 * Fallback: if the link can't be opened, a paste panel appears instead.
 * No AI — everything after the fetch runs locally. */

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  // Same-origin serverless endpoint (see netlify/functions/fetch-page.js).
  var FETCH_ENDPOINT = '/.netlify/functions/fetch-page?url=';

  // Plain-English explanations for fetch failures. Never jargon, never "HTML".
  var REASON_COPY = {
    invalid_url: "that doesn't look like a valid web address.",
    blocked: 'the site blocked our reader.',
    not_found: "we couldn't find a page at that address.",
    timeout: 'the site took too long to respond.',
    too_large: 'that page is too large to audit.',
    fetch_failed: "we couldn't open that page.",
    service: "we couldn't reach the audit service right now.",
    thin_content: 'we could only see a small part of that page — it may load its content with JavaScript after opening.'
  };

  // Minimum visible text (chars) for a fetched page to be worth scoring.
  // Below this, the page is probably JavaScript-rendered and the fetch
  // only saw its empty shell — score nothing, ask for a paste instead.
  var MIN_VISIBLE_TEXT = 400;

  function visibleTextLength(html) {
    var t = String(html || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    // Title/meta text isn't in the body; don't let head content pass the bar.
    return t.length;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var SAMPLES = {
    risky: {
      label: 'risky page',
      content: '<html><head><title>Bob\'s Roofing | Best Roofers</title></head><body>' +
        '<h1>Bob\'s Roofing</h1>' +
        '<p>Call <a href="tel:7047668118">(704) 397-4887</a> today! We are the best roofers in town.</p>' +
        '<p>We are licensed and insured. Nobody beats our prices!</p></body></html>'
    },
    clean: {
      label: 'clean page',
      content: '<html><head><title>Acme Plumbing Co. | Portland Plumbers</title></head><body>' +
        '<h1>Acme Plumbing Co.</h1>' +
        '<p>Acme Plumbing Co. has served Portland for 20 years. Call us today at (503) 555-0147.</p>' +
        '<p>Licensed, bonded and insured — OR CCB# 204518. Get a free quote online.</p>' +
        '<p>Rated 4.9 stars from 1,200 Google reviews. Family-owned since 1998. ' +
        'Serving the Portland metro area, OR 97205.</p>' +
        '<p><a href="tel:+15035550147">Tap to call now</a> or schedule your appointment today.</p>' +
        '</body></html>'
    }
  };

  var VERDICT_COPY = {
    'HIGH RISK': { cls: 'high', sub: 'Fix the flagged issues before spending on traffic — these cost you calls and trust.', color: '#dc2626' },
    'NEEDS REVIEW': { cls: 'review', sub: 'Have a human review the flagged items before launching the page.', color: '#b45309' },
    'CLEAR': { cls: 'clear', sub: 'No issues detected by the rule checks. Pre-screen only — the checks can\'t see design, load speed, or how the page actually converts.', color: '#15803d' }
  };

  function init() {
    $('lpVersionBadge').textContent = 'Page Engine v' + LandingEngine.LANDING_VERSION;

    document.querySelectorAll('[data-lpsample]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $('lpContent').value = SAMPLES[btn.getAttribute('data-lpsample')].content;
        $('lpPastePanel').hidden = false;
        $('lpFallbackNote').hidden = true;
        $('lpInputError').hidden = true;
        $('lpContent').focus();
      });
    });

    $('lpFetchBtn').addEventListener('click', fetchFlow);
    $('lpPasteToggle').addEventListener('click', function () {
      showPastePanel(null); // user chose the paste path directly
      $('lpContent').focus();
    });
    $('lpRunBtn').addEventListener('click', runAudit);
    $('lpAgainBtn').addEventListener('click', function () {
      $('lpReportCard').hidden = true;
      $('lpInputCard').hidden = false;
      $('lpPastePanel').hidden = true;
      $('lpFetchStatus').hidden = true;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    $('lpPrintBtn').addEventListener('click', function () { window.print(); });
  }

  // Show the paste panel; with a reason it becomes the fetch-failure fallback.
  function showPastePanel(reason) {
    var note = $('lpFallbackNote');
    if (reason) {
      note.hidden = false;
      var lead = reason === 'thin_content'
        ? '<strong>We could only see part of that page</strong> — '
        : '<strong>We couldn\'t open that link</strong> — ';
      note.innerHTML = lead +
        esc(REASON_COPY[reason] || REASON_COPY.fetch_failed) +
        ' No problem — paste your page content instead:';
    } else {
      note.hidden = true;
    }
    $('lpPastePanel').hidden = false;
    $('lpFetchStatus').hidden = true;
  }

  // Primary flow: fetch the link server-side, then audit the HTML locally.
  function fetchFlow() {
    var url = $('lpUrl').value.trim();
    if (!url) { $('lpUrlError').hidden = false; $('lpUrl').focus(); return; }
    $('lpUrlError').hidden = true;
    $('lpPastePanel').hidden = true;

    var st = $('lpFetchStatus');
    st.hidden = false;
    st.textContent = 'Opening your page…';
    $('lpFetchBtn').disabled = true;

    fetch(FETCH_ENDPOINT + encodeURIComponent(url))
      .then(function (resp) { return resp.json(); })
      .then(function (data) {
        if (data && data.ok && data.html) {
          if (visibleTextLength(data.html) < MIN_VISIBLE_TEXT) {
            // Fetched fine, but the page is a JS shell — scoring it would be
            // a confident guess on almost nothing. Ask for a paste instead.
            showPastePanel('thin_content');
          } else {
            var page = LandingEngine.extractFromHtml(data.html);
            var result = LandingEngine.auditLanding(page);
            renderReport(result, $('lpBizName').value.trim());
            $('lpInputCard').hidden = true;
            $('lpReportCard').hidden = false;
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        } else {
          showPastePanel(data && data.reason);
        }
      })
      .catch(function () {
        // Function unreachable (e.g. local preview without Netlify) — fall back.
        showPastePanel('service');
      })
      .then(function () {
        st.hidden = true;
        $('lpFetchBtn').disabled = false;
      });
  }

  // Fallback flow: user pasted the page content (auto-detected text vs markup).
  function runAudit() {
    var raw = $('lpContent').value.trim();
    if (!raw) { $('lpInputError').hidden = false; $('lpContent').focus(); return; }
    $('lpInputError').hidden = true;

    var page = LandingEngine.looksLikeHtml(raw)
      ? LandingEngine.extractFromHtml(raw)
      : LandingEngine.extractFromText(raw);

    var result = LandingEngine.auditLanding(page);
    renderReport(result, $('lpBizName').value.trim());

    $('lpInputCard').hidden = true;
    $('lpReportCard').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderReport(r, bizName) {
    var v = VERDICT_COPY[r.verdict];
    var C = 2 * Math.PI * 52;
    var fg = $('lpRingFg');
    fg.style.strokeDasharray = C.toFixed(1);
    fg.style.strokeDashoffset = (C * (1 - r.score / 100)).toFixed(1);
    fg.style.stroke = v.color;
    $('lpScoreNum').textContent = r.score;

    var badge = $('lpVerdictBadge');
    badge.textContent = r.verdict;
    badge.className = 'verdict ' + v.cls;
    $('lpVerdictSub').textContent = v.sub;

    $('lpReportBiz').textContent = bizName || '—';
    $('lpReportVersion').textContent = r.version;
    $('lpReportTime').textContent = new Date(r.audited_at).toLocaleString();

    // Phone card — derived ONLY from extraction, href wins on conflict
    var pc = $('lpPhoneCard');
    if (!r.phone.canonical) {
      pc.className = 'license warn';
      pc.innerHTML = '<strong>⚠ No phone number found</strong> — not in the page text and not in any tel: link.';
    } else if (!r.phone.consistent) {
      pc.className = 'license warn';
      pc.innerHTML = '<strong>⚠ Phone mismatch.</strong> Using the tel: link number <strong>' + esc(r.phone.canonical) +
        '</strong> — but the page also shows: ' + esc(r.phone.allNumbers.filter(function (n) { return n !== r.phone.canonical; }).join(', ')) + '.';
    } else {
      pc.className = 'license ok';
      pc.innerHTML = '<strong>✓ Phone consistent:</strong> ' + esc(r.phone.canonical) +
        (r.phone.hrefNumbers.length ? ' (matches the tel: link)' : ' (page text only — consider adding a tap-to-call tel: link)');
    }

    // Findings — HIGH first, each exactly once
    var box = $('lpFindings');
    $('lpFindingCount').textContent = r.findings.length + (r.findings.length === 1 ? ' flag' : ' flags');
    if (r.findings.length === 0) {
      box.innerHTML = '<div class="no-find">No issues detected by the rule checks.</div>';
    } else {
      box.innerHTML = r.findings.map(function (f) {
        return '<div class="finding' + (f.severity === 'MEDIUM' ? ' med' : '') + '">' +
          '<div class="f-top"><span class="sev ' + (f.severity === 'HIGH' ? 'high' : 'med') + '">' +
          f.severity + '</span><span class="policy">' + esc(f.check_name) + '</span></div>' +
          (f.quote ? '<p class="quote">"' + esc(f.quote) + '"</p>' : '') +
          '<p class="why">' + esc(f.explanation) + '</p>' +
          (f.fix ? '<p class="fix"><strong>How to fix:</strong> ' + esc(f.fix) + '</p>' : '') +
          '</div>';
      }).join('');
    }

    // Strengths — derived from actual diagnostics only, never invented
    var s = $('lpStrengths');
    s.innerHTML = r.strengths.length
      ? r.strengths.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('')
      : '<li>See findings above.</li>';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
