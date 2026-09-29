/* compare-ui.js — UI wiring for the competitor scanner.
 * Paste-only inputs (automatic competitor discovery is not included — the page says so).
 * Runs CompareEngine (assets/compare-engine.js) locally. No AI, no network calls. */

/* UI for the competitor scanner. No AI, no network calls. */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var VERDICT_SHORT = { 'HIGH RISK': 'high', 'NEEDS REVIEW': 'review', 'CLEAR': 'clear' };

  function init() {
    $('cmpVersionBadge').textContent = 'Policy Engine v' + POLICY_LIBRARY.policy_version;
    $('cmpRunBtn').addEventListener('click', runCompare);
    $('cmpAgainBtn').addEventListener('click', function () {
      $('cmpReportCard').hidden = true;
      $('cmpInputCard').hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    $('cmpPrintBtn').addEventListener('click', function () { window.print(); });
  }

  function runCompare() {
    var yours = $('cmpYour').value.trim();
    if (!yours) { $('cmpInputError').hidden = false; $('cmpYour').focus(); return; }
    $('cmpInputError').hidden = true;

    var comps = [];
    for (var i = 1; i <= 5; i++) {
      var el = $('cmp' + i);
      if (el && el.value.trim()) comps.push(el.value.trim());
    }
    if (comps.length === 0) {
      $('cmpInputError').textContent = 'Paste at least one competitor ad or page to compare against.';
      $('cmpInputError').hidden = false;
      $('cmp1').focus();
      return;
    }
    $('cmpInputError').textContent = 'Please paste your ad copy first.';
    var r = CompareEngine.compare(yours, comps);
    renderReport(r, $('cmpAgency').value.trim());

    $('cmpInputCard').hidden = true;
    $('cmpReportCard').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function famCell(counts, f) {
    var n = counts[f] || 0;
    return n > 0 ? '<span class="sev high">' + n + '</span>' : '<span style="color:#94a3b8">0</span>';
  }

  function rowHTML(name, result, counts, trust, isYou) {
    var cells = CompareEngine.FAMILY_IDS.map(function (f) {
      return '<td style="text-align:center">' + famCell(counts, f) + '</td>';
    }).join('');
    return '<tr' + (isYou ? ' style="background:#f0fdf4;font-weight:700"' : '') + '>' +
      '<td>' + esc(name) + (isYou ? ' (you)' : '') + '</td>' +
      '<td style="text-align:center"><strong>' + result.score + '</strong></td>' +
      '<td><span class="verdict ' + VERDICT_SHORT[result.verdict] + '" style="font-size:12px;padding:3px 10px">' +
      result.verdict + '</span></td>' +
      cells +
      '<td style="text-align:center">' + (result.license.found ? '✓' : '—') + '</td>' +
      '<td style="text-align:center">' + trust + '</td>' +
      '</tr>';
  }

  function renderReport(r, agency) {
    $('cmpReportAgency').textContent = agency || 'TradesAd Suite™';
    $('cmpReportVersion').textContent = r.policy_version;
    $('cmpReportTime').textContent = new Date(r.audited_at).toLocaleString();
    $('cmpCompCount').textContent = r.competitorCount;

    // side-by-side table
    var head = '<tr><th></th><th>Score</th><th>Verdict</th>' +
      CompareEngine.FAMILY_IDS.map(function (f) {
        return '<th>' + esc(CompareEngine.FAMILY_LABELS[f]) + '</th>';
      }).join('') +
      '<th>License</th><th>Trust</th></tr>';
    var rows = rowHTML('Your copy', r.you, r.yourFamily, r.trustYou, true);
    r.competitors.forEach(function (c, i) {
      var counts = {};
      c.findings.forEach(function (f) { counts[f.category_id] = (counts[f.category_id] || 0) + 1; });
      rows += rowHTML('Competitor ' + (i + 1), c, counts, r.trustCompetitors[i], false);
    });
    // average row
    var avgCells = CompareEngine.FAMILY_IDS.map(function (f) {
      var a = r.familyAvg[f];
      return '<td style="text-align:center;color:#64748b">' + (a === null ? '—' : a.toFixed(1)) + '</td>';
    }).join('');
    rows += '<tr style="background:#f8fafc;color:#64748b"><td><em>Competitor average</em></td>' +
      '<td style="text-align:center"><em>' + r.avgScore.toFixed(1) + '</em></td><td></td>' +
      avgCells + '<td></td><td></td></tr>';
    $('cmpTable').innerHTML = '<table class="compare">' + head + rows + '</table>';

    // you vs average summary
    var s = $('cmpSummary');
    var diff = r.you.score - r.avgScore;
    var html = '<p><strong>Your score: ' + r.you.score + '</strong> vs competitor average <strong>' +
      r.avgScore.toFixed(1) + '</strong> — you are ' +
      (diff > 0 ? '<strong>' + diff.toFixed(1) + ' points ahead</strong>' :
       diff < 0 ? '<strong>' + Math.abs(diff).toFixed(1) + ' points behind</strong>' :
       '<strong>level</strong>') + '.</p>';
    if (r.wins.length) {
      html += '<p><strong>Where you win</strong> (fewer violations than the competitor average): ' +
        esc(r.wins.map(function (w) { return w.label + ' (' + w.yours + ' vs ' + w.avg.toFixed(1) + ')'; }).join('; ')) + '.</p>';
    }
    if (r.losses.length) {
      html += '<p><strong>Where you lose</strong> (more violations than the competitor average): ' +
        esc(r.losses.map(function (w) { return w.label + ' (' + w.yours + ' vs ' + w.avg.toFixed(1) + ')'; }).join('; ')) + '.</p>';
    }
    if (!r.wins.length && !r.losses.length) {
      html += '<p>You match the competitor average on every violation family.</p>';
    }
    s.innerHTML = html;

    // top 3 gaps — derived from YOUR findings only, never invented
    var g = $('cmpGaps');
    if (r.gaps.length === 0) {
      g.innerHTML = '<div class="no-find">No policy violations in your copy — nothing to fix before you worry about competitors.</div>';
    } else {
      g.innerHTML = '<ol>' + r.gaps.map(function (gap) {
        return '<li><strong>' + esc(gap.label) + '</strong> — ' + gap.count +
          ' finding' + (gap.count === 1 ? '' : 's') + ' in your copy. ' + esc(gap.fix) + '</li>';
      }).join('') + '</ol>';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
