/* compare-engine.js — deterministic competitor comparison.
 * Runs the 36-pattern ad engine (assets/engine.js) on your copy and each
 * competitor paste, then derives a side-by-side comparison. Zero AI.
 * Everything here is arithmetic on engine output — nothing is invented.
 * Verdicts: HIGH RISK / NEEDS REVIEW / CLEAR — never blessing language. */

(function (global) {
  'use strict';

  var FAMILY_IDS = ['superlatives', 'absolute_guarantees', 'financial_claims', 'personal_attributes', 'safety_claims'];
  var FAMILY_LABELS = {
    superlatives: 'Superlatives',
    absolute_guarantees: 'Guarantees',
    financial_claims: 'Financial',
    personal_attributes: 'Personal attr.',
    safety_claims: 'Safety'
  };

  function deps() {
    var RE = global.RuleEngine || null;
    var LIB = (typeof POLICY_LIBRARY !== 'undefined') ? POLICY_LIBRARY : null;
    if (typeof module !== 'undefined' && module.exports && !RE) {
      try { RE = require('./engine.js'); } catch (e) { RE = null; }
    }
    if (!RE) throw new Error('compare-engine requires RuleEngine (assets/engine.js) loaded first.');
    return { RE: RE, LIB: LIB };
  }

  function familyCounts(result) {
    var m = {};
    result.findings.forEach(function (f) { m[f.category_id] = (m[f.category_id] || 0) + 1; });
    return m;
  }

  // Trust-signal count, derived from engine diagnostics only: license + strengths.
  function trustCount(result) {
    return (result.license.found ? 1 : 0) + result.strengths.length;
  }

  function compare(yourText, competitorTexts) {
    var d = deps();
    var RE = d.RE, LIB = d.LIB;

    var you = RE.audit(yourText, LIB);
    var comps = (competitorTexts || [])
      .filter(function (t) { return t && String(t).trim().length > 0; })
      .map(function (t) { return RE.audit(t, LIB); });

    var n = comps.length;
    var avgScore = n > 0
      ? comps.reduce(function (s, r) { return s + r.score; }, 0) / n
      : null;

    var yourFam = familyCounts(you);
    var famAvg = {};
    FAMILY_IDS.forEach(function (f) {
      famAvg[f] = n > 0
        ? comps.reduce(function (s, r) { return s + (familyCounts(r)[f] || 0); }, 0) / n
        : null;
    });

    // Where you win/lose vs the competitor mean, per family (fewer violations = win).
    var wins = [], losses = [];
    FAMILY_IDS.forEach(function (f) {
      if (famAvg[f] === null) return;
      var y = yourFam[f] || 0;
      if (y < famAvg[f]) wins.push({ family: f, label: FAMILY_LABELS[f], yours: y, avg: famAvg[f] });
      else if (y > famAvg[f]) losses.push({ family: f, label: FAMILY_LABELS[f], yours: y, avg: famAvg[f] });
    });

    // Top gaps to fix: YOUR findings grouped by category, HIGH first, then count. Top 3.
    var byCat = {};
    you.findings.forEach(function (f) {
      (byCat[f.category_id] = byCat[f.category_id] || []).push(f);
    });
    var gaps = Object.keys(byCat).map(function (c) {
      return {
        category: c,
        label: FAMILY_LABELS[c] || c,
        count: byCat[c].length,
        high: byCat[c].some(function (f) { return f.severity === 'HIGH'; }),
        fix: RE.CATEGORY_FIXES[c] || ''
      };
    }).sort(function (a, b) {
      if (a.high !== b.high) return a.high ? -1 : 1;
      return b.count - a.count;
    }).slice(0, 3);

    return {
      policy_version: you.policy_version,
      you: you,
      yourFamily: yourFam,
      trustYou: trustCount(you),
      competitors: comps,
      competitorCount: n,
      avgScore: avgScore,
      familyAvg: famAvg,
      trustCompetitors: comps.map(trustCount),
      wins: wins,
      losses: losses,
      gaps: gaps,
      audited_at: new Date().toISOString()
    };
  }

  var api = {
    FAMILY_IDS: FAMILY_IDS,
    FAMILY_LABELS: FAMILY_LABELS,
    compare: compare
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.CompareEngine = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
