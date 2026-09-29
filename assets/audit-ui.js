/* audit-ui.js — VERBATIM COPY of script 3 from dist/index.html (tool UI wiring).
 * Requires the element IDs used by the tool (versionBadge, patternCount, inputCard, reportCard, ...)
 * which audit.html provides inside the site chrome. */

/* UI for the rule-based ad audit. No AI, no network calls — everything runs locally. */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var SAMPLES = {
    risky: {
      headline: '$89 Summer AC Safety Tune-Up',
      body: 'Voted the top-rated plumbing crew three years running! Nobody beats our prices — that\'s a promise. Mention this ad and your first service call is completely on the house!',
      cta: 'Call now'
    },
    clean: {
      headline: 'Drain Cleaning Specialists',
      body: 'Rated 4.8 stars from more than 2,300 verified Google reviews. Our NATE-certified technicians service all major brands. Upfront pricing before any work begins.',
      cta: 'Book online in under a minute'
    },
    license: {
      headline: 'Tucson HVAC Experts',
      body: 'Licensed, bonded & insured — ROC #276078. Family-owned HVAC company serving Tucson since 1998. Free second opinions on all major repairs.',
      cta: 'Call for a free second opinion'
    }
  };

  var VERDICT_COPY = {
    'HIGH RISK': { cls: 'high', sub: 'Fix the flagged claims before launching — these risk ad disapproval.', color: '#dc2626' },
    'NEEDS REVIEW': { cls: 'review', sub: 'Have a human media buyer review the flagged items before launching.', color: '#b45309' },
    'CLEAR': { cls: 'clear', sub: 'No policy violations detected. Pre-screen only — the ad platforms make the final call.', color: '#15803d' }
  };

  function init() {
    var total = POLICY_LIBRARY.categories.reduce(function (n, c) { return n + c.patterns.length; }, 0);
    $('versionBadge').textContent = 'Policy Engine v' + POLICY_LIBRARY.policy_version;
    $('patternCount').textContent = total;

    document.querySelectorAll('[data-sample]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var s = SAMPLES[btn.getAttribute('data-sample')];
        $('headline').value = s.headline;
        $('bodyText').value = s.body;
        $('cta').value = s.cta;
        $('inputError').hidden = true;
        $('bodyText').focus();
      });
    });

    $('runBtn').addEventListener('click', runAudit);
    $('againBtn').addEventListener('click', function () {
      $('reportCard').hidden = true;
      $('inputCard').hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    $('printBtn').addEventListener('click', function () { window.print(); });
  }

  function runAudit() {
    var body = $('bodyText').value.trim();
    if (!body) { $('inputError').hidden = false; $('bodyText').focus(); return; }
    $('inputError').hidden = true;

    var parts = [$('headline').value.trim(), body, $('cta').value.trim()]
      .filter(function (p) { return p.length > 0; });
    var adText = parts.join('\n');

    var result = RuleEngine.audit(adText, POLICY_LIBRARY);
    renderReport(result, $('bizName').value.trim());

    $('inputCard').hidden = true;
    $('reportCard').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderReport(r, bizName) {
    var v = VERDICT_COPY[r.verdict];
    var C = 2 * Math.PI * 52;
    var fg = $('ringFg');
    fg.style.strokeDasharray = C.toFixed(1);
    fg.style.strokeDashoffset = (C * (1 - r.score / 100)).toFixed(1);
    fg.style.stroke = v.color;
    $('scoreNum').textContent = r.score;

    var badge = $('verdictBadge');
    badge.textContent = r.verdict;
    badge.className = 'verdict ' + v.cls;
    $('verdictSub').textContent = v.sub;

    $('reportBiz').textContent = bizName || '—';
    $('reportVersion').textContent = r.policy_version;
    var d = new Date(r.audited_at);
    $('reportTime').textContent = d.toLocaleString();

    // License diagnostic — derived ONLY from the regex, never inferred
    var lic = $('licenseCard');
    if (r.license.found) {
      lic.className = 'license ok';
      lic.innerHTML = '<strong>✓ ' + esc(r.license.text) + '</strong>';
    } else {
      lic.className = 'license warn';
      lic.innerHTML = '<strong>⚠ ' + esc(r.license.text) + '</strong>';
    }

    // Gray zone
    var gray = $('grayCard');
    if (r.gray_zone.triggered) {
      gray.hidden = false;
      gray.innerHTML = '<strong>Needs human review:</strong> ' + esc(r.gray_zone.note);
    } else { gray.hidden = true; }

    // Findings — HIGH first, each exactly once, full-sentence quotes
    var box = $('findings');
    $('findingCount').textContent = r.findings.length + (r.findings.length === 1 ? ' flag' : ' flags');
    if (r.findings.length === 0) {
      box.innerHTML = '<div class="no-find">No policy violations detected by the rule engine.</div>';
    } else {
      var sorted = r.findings.slice().sort(function (a, b) {
        if (a.severity !== b.severity) return a.severity === 'HIGH' ? -1 : 1;
        return 0;
      });
      box.innerHTML = sorted.map(function (f) {
        var fix = RuleEngine.CATEGORY_FIXES[f.category_id] || '';
        return '<div class="finding' + (f.severity === 'MEDIUM' ? ' med' : '') + '">' +
          '<div class="f-top"><span class="sev ' + (f.severity === 'HIGH' ? 'high' : 'med') + '">' +
          f.severity + '</span><span class="policy">' + esc(f.policy) + '</span></div>' +
          '<p class="quote">"' + esc(f.quote) + '"</p>' +
          '<p class="why">' + esc(f.explanation) + '</p>' +
          (fix ? '<p class="fix"><strong>How to fix:</strong>' + esc(fix) + '</p>' : '') +
          '</div>';
      }).join('');
    }

    // Strengths — derived from actual diagnostics only, never invented
    var s = $('strengths');
    s.innerHTML = r.strengths.length
      ? r.strengths.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('')
      : '<li>See findings above.</li>';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();

