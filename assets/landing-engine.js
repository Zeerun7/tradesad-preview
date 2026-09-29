/* landing-engine.js — deterministic landing-page audit. Zero AI, zero network.
 * Paste-mode only: extractFromHtml(html) / extractFromText(text).
 * A future server-side fetch function can feed raw HTML into extractFromHtml.
 * Verdicts: HIGH RISK / NEEDS REVIEW / CLEAR — never blessing language.
 * License rule (from the jacksonelectricalinc saga): a bare word like
 * "licensed" is NEVER quoted as a credential. With no credential-pattern
 * match the finding must say "couldn't confirm — verify manually". */

(function (global) {
  'use strict';

  var LANDING_VERSION = '2026-09-29';

  /* ---------------- text helpers ---------------- */

  function normalizeText(text) {
    return String(text)
      .replace(/[‘’‚‛′‵ʼ]/g, "'")
      .replace(/[“”„‟″‶]/g, '"')
      .replace(/[–—―−‐‑]/g, '-')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function splitSentences(text) {
    return text
      .split(/(?<=[.!?])\s+/)
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length > 0; });
  }

  function decodeEntities(s) {
    return String(s)
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ');
  }

  function looksLikeHtml(s) {
    return /<\s*(html|head|body|div|p|a|h1|title|span|section|header|footer)\b/i.test(s);
  }

  /* ---------------- extraction ---------------- */

  function extractTitle(html) {
    var m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    return m ? normalizeText(decodeEntities(m[1])) : null;
  }

  function extractH1(html) {
    var m = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
    return m ? normalizeText(decodeEntities(m[1].replace(/<[^>]+>/g, ' '))) : null;
  }

  function extractTelHrefs(html) {
    var out = [], m;
    var rx = /href\s*=\s*["']tel:([^"'<>]+)["']/gi;
    while ((m = rx.exec(html)) !== null) out.push(m[1]);
    return out;
  }

  function stripToText(html) {
    var t = String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ');
    return normalizeText(decodeEntities(t));
  }

  // Structured extraction from raw HTML. A fetch function can plug in here later.
  function extractFromHtml(html) {
    return {
      title: extractTitle(html),
      h1: extractH1(html),
      telHrefs: extractTelHrefs(html),
      text: stripToText(html),
      raw: html
    };
  }

  // Structured extraction from pasted plain text.
  function extractFromText(text) {
    return {
      title: null,
      h1: null,
      telHrefs: [],
      text: normalizeText(text),
      raw: text
    };
  }

  /* ---------------- phones ---------------- */

  var VISIBLE_PHONE_RX = /(?<!\d)(?:\+?1[\s.\-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}(?!\d)/g;

  function normalizePhone(p) {
    var d = String(p).replace(/\D/g, '');
    if (d.length === 11 && d.charAt(0) === '1') d = d.slice(1);
    return d;
  }

  function uniqueOrdered(arr) {
    var seen = {}, out = [];
    arr.forEach(function (x) { if (!seen[x]) { seen[x] = 1; out.push(x); } });
    return out;
  }

  function detectPhones(page) {
    var hrefNums = uniqueOrdered(page.telHrefs.map(normalizePhone).filter(function (d) { return d.length === 10; }));
    var vis = [], m;
    VISIBLE_PHONE_RX.lastIndex = 0;
    while ((m = VISIBLE_PHONE_RX.exec(page.text)) !== null) {
      var d = normalizePhone(m[0]);
      if (d.length === 10) vis.push(d);
    }
    var visNums = uniqueOrdered(vis);
    var all = uniqueOrdered(hrefNums.concat(visNums));
    // tel: href wins over any stray visible number.
    var canonical = hrefNums[0] || visNums[0] || null;
    return {
      canonical: canonical,
      hrefNumbers: hrefNums,
      visibleNumbers: visNums,
      consistent: canonical !== null && all.length === 1,
      allNumbers: all
    };
  }

  /* ---------------- licenses ---------------- */

  var LICENSE_PATTERNS = [
    { id: 'lic_or_ccb',   label: 'Oregon CCB license',          pattern: '\\bCCB\\s*#?\\s*\\d{4,}\\b' },
    { id: 'lic_ca_cslb',  label: 'California CSLB license',     pattern: '\\bCSLB\\s*#?\\s*\\d{4,}\\b' },
    { id: 'lic_az_roc',   label: 'Arizona ROC license',         pattern: '\\bROC\\s*#?\\s*\\d{4,}\\b' },
    { id: 'lic_lcb_tecl', label: 'Trade license credential',    pattern: '\\b(?:LCB|TECL)\\s*#\\s*\\d[\\d\\-]*\\b' },
    { id: 'lic_wa',       label: 'Washington contractor license', pattern: '\\bWA\\s*(?:GENERAL\\s+CONTRACTOR\\s+)?(?:LIC(?:ENSE)?\\.?|#)\\s*[A-Z0-9][A-Z0-9\\-]{3,}\\b' },
    { id: 'lic_state',    label: 'State license credential',    pattern: '\\b(?:TX|FL|GA|NC|SC|VA|TN|OH|PA|NY|NJ|CO|NV|UT|ID|MT|NM)\\s*(?:LIC(?:ENSE)?\\.?|#)\\s*[A-Z0-9][A-Z0-9\\-]{3,}\\b' },
    { id: 'lic_numbered', label: 'Numbered license/registration', pattern: '\\b(?:license|lic\\.?|certification|registration|reg\\.?)\\s*(?:#|no\\.?|number|num\\.?)\\s*:?\\s*[A-Z]{0,4}\\s*#?\\s*\\d[\\d\\-]{2,}\\b' }
  ];

  var BARE_LICENSE_WORD_RX = /\b(licensed?|insured|bonded)\b/i;

  function detectLicense(page) {
    for (var i = 0; i < LICENSE_PATTERNS.length; i++) {
      var p = LICENSE_PATTERNS[i];
      var m = new RegExp(p.pattern, 'i').exec(page.text);
      if (m) return { found: true, match: m[0], label: p.label, pattern_id: p.id };
    }
    var bare = BARE_LICENSE_WORD_RX.test(page.text);
    return { found: false, match: null, label: null, pattern_id: null, bareWord: bare };
  }

  function sentenceWith(page, rx) {
    var sents = splitSentences(page.text);
    for (var i = 0; i < sents.length; i++) {
      rx.lastIndex = 0;
      if (rx.test(sents[i])) return sents[i];
    }
    return null;
  }

  /* ---------------- business name ---------------- */

  function normalizeName(s) {
    return String(s).toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\b(llc|inc|co|corp|ltd|pllc|pa|company)\b/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  function nameFromTitle(title) {
    if (!title) return null;
    var part = title.split(/[|–—\-·:]/)[0];
    var n = normalizeName(part);
    return n.length >= 3 ? n : null;
  }

  function checkBusinessName(page) {
    var raw = page.title || page.h1;
    var name = nameFromTitle(raw);
    if (!name) return { assessed: false, consistent: null, name: null };
    var words = name.split(' ').filter(function (w) { return w.length > 2; });
    if (words.length < 1) return { assessed: false, consistent: null, name: name };
    var body = ' ' + normalizeName(page.text) + ' ';
    if (body.indexOf(' ' + name + ' ') > -1) return { assessed: true, consistent: true, name: name };
    var hits = words.filter(function (w) { return body.indexOf(' ' + w + ' ') > -1; }).length;
    var need = words.length === 1 ? 1 : Math.ceil(words.length / 2);
    return { assessed: true, consistent: hits >= need, name: name };
  }

  /* ---------------- CTAs, trust, service area ---------------- */

  var CTA_PATTERNS = [
    { id: 'cta_call',    label: 'call CTA',    pattern: '\\bcall\\s+(now|today|us)\\b|\\btap\\s+to\\s+call\\b' },
    { id: 'cta_quote',   label: 'quote CTA',   pattern: '\\b(get|request)\\s+(a\\s+|an\\s+)?(free\\s+)?(quote|estimate)\\b|\\bfree\\s+quote\\b' },
    { id: 'cta_book',    label: 'booking CTA', pattern: '\\b(book|schedule)\\b[^.!?]{0,40}\\b(appointment|service|visit|now|online|today)\\b|\\bbook\\s+now\\b' },
    { id: 'cta_contact', label: 'contact CTA', pattern: '\\bcontact\\s+us\\b|\\bget\\s+in\\s+touch\\b' },
    { id: 'cta_form',    label: 'form CTA',    pattern: '\\bfill\\s+out\\b[^.!?]{0,30}\\bform\\b|\\brequest\\s+service\\b' }
  ];

  var TRUST_PATTERNS = [
    { id: 'trust_years',     label: 'years in business',   pattern: '\\b(served|serving)\\b[^.!?]{0,40}\\b\\d{1,3}\\+?\\s*years?\\b|\\b\\d{1,3}\\+?\\s*years?\\s+(?:in\\s+business|of\\s+experience)\\b|\\bsince\\s+(?:19|20)\\d{2}\\b|\\bfamily[\\s-]?owned\\b' },
    { id: 'trust_reviews',   label: 'reviews / ratings',   pattern: '\\b\\d[\\d,]*\\+?\\s*(?:google\\s+)?reviews?\\b|\\btestimonials?\\b|\\b\\d\\.\\d\\s*stars?\\b|\\brated\\s+\\d' },
    { id: 'trust_guarantee', label: 'guarantee / warranty', pattern: '\\b(guarantee\\w*|warranty|warranties)\\b' },
    { id: 'trust_insured',   label: 'insured / bonded',     pattern: '\\b(insured|bonded)\\b' }
  ];

  var AREA_PATTERNS = [
    '\\bserving\\b[^.!?]{0,50}\\b(area|county|region|metro|residents|community)\\b',
    '\\bservice\\s+area\\b',
    '\\b\\d{1,5}\\s+[A-Z][a-z]+\\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Lane|Ln|Dr|Drive|Way|Ct|Court)\\b',
    '\\b[A-Z]{2}\\s*\\d{5}(?:-\\d{4})?\\b'
  ];

  function findAll(page, list) {
    var hits = [], seen = {};
    var sents = splitSentences(page.text);
    list.forEach(function (pat) {
      var rx = new RegExp(pat.pattern, 'i');
      for (var i = 0; i < sents.length; i++) {
        rx.lastIndex = 0;
        if (rx.test(sents[i])) {
          var key = pat.id + '::' + i;
          if (!seen[key]) { seen[key] = 1; hits.push({ id: pat.id, label: pat.label, quote: sents[i] }); }
        }
      }
    });
    return hits;
  }

  /* ---------------- findings, scoring, verdict ---------------- */

  var CHECK_FIXES = {
    phone_missing: 'Add a click-to-call phone number in the header and next to the main call to action — use a tel: link so mobile visitors can tap to call.',
    phone_mismatch: 'Make every phone number on the page identical, and make the tel: link match the visible number. Stale numbers cost you calls.',
    license_unconfirmed: 'Either print the actual credential (state + letters + number) next to the claim, or remove the bare word until you can show it. A bare "licensed" claim with no number erodes trust.',
    license_missing: 'Add your trade license number in the footer or near the contact info — it is one of the strongest trust signals on a contractor page.',
    name_mismatch: 'Use the same business name in the page title, headline, and body copy. Mismatches confuse visitors and hurt local search.',
    cta_missing: 'Add at least one clear call to action above the fold — call now, get a free quote, or book online — and repeat it after each major section.',
    area_missing: 'State where you work: city names, a service-area list, or a street address with ZIP. Visitors and search engines both need it.'
  };

  function scoreFindings(findings) {
    var high = findings.filter(function (f) { return f.severity === 'HIGH'; }).length;
    var med = findings.filter(function (f) { return f.severity === 'MEDIUM'; }).length;
    var score = 100 - 20 * high - 8 * med;
    if (high >= 2) score = Math.min(score, 60);
    return Math.max(score, 40);
  }

  function verdictFor(findings) {
    if (findings.some(function (f) { return f.severity === 'HIGH'; })) return 'HIGH RISK';
    if (findings.some(function (f) { return f.severity === 'MEDIUM'; })) return 'NEEDS REVIEW';
    return 'CLEAR';
  }

  function auditLanding(page) {
    var findings = [];
    var strengths = [];

    /* 1 — phones */
    var ph = detectPhones(page);
    if (!ph.canonical) {
      findings.push({
        check_id: 'phone_missing', check_name: 'Phone extraction & consistency',
        severity: 'HIGH', quote: null,
        explanation: 'No phone number was found anywhere on the page — not in the text and not in any tel: link. A contractor landing page without a phone number loses mobile callers.',
        fix: CHECK_FIXES.phone_missing
      });
    } else if (!ph.consistent) {
      var conflict = sentenceWith(page, new RegExp(ph.allNumbers.filter(function (n) { return n !== ph.canonical; })[0] || 'a^'));
      findings.push({
        check_id: 'phone_mismatch', check_name: 'Phone extraction & consistency',
        severity: 'HIGH',
        quote: conflict || ('The page shows these numbers: ' + ph.allNumbers.join(', ') + '.'),
        explanation: 'Phone numbers on the page do not match. The tel: link uses ' + ph.canonical + ' but the page also shows ' + ph.allNumbers.filter(function (n) { return n !== ph.canonical; }).join(', ') + '. One of them is stale.',
        fix: CHECK_FIXES.phone_mismatch
      });
    } else {
      strengths.push('Phone number consistent across the page (' + ph.canonical + ').');
    }

    /* 2 — license */
    var lic = detectLicense(page);
    if (lic.found) {
      strengths.push('License credential detected: ' + lic.match + ' (' + lic.label + ').');
    } else if (lic.bareWord) {
      var bq = sentenceWith(page, /\b(licensed?|insured|bonded)\b/i);
      findings.push({
        check_id: 'license_unconfirmed', check_name: 'License credential detection',
        severity: 'MEDIUM',
        quote: bq,
        // The bare word is evidence of the claim — it is NEVER presented as the credential itself.
        explanation: 'The page claims to be licensed/insured but no formatted credential (letters + number, e.g. ROC #123456) was found — couldn\'t confirm — verify manually.',
        fix: CHECK_FIXES.license_unconfirmed
      });
    } else {
      findings.push({
        check_id: 'license_missing', check_name: 'License credential detection',
        severity: 'MEDIUM', quote: null,
        explanation: 'No license signal at all — no credential pattern and no licensed/insured wording. Trade pages convert better with a visible license number.',
        fix: CHECK_FIXES.license_missing
      });
    }

    /* 3 — business name */
    var nm = checkBusinessName(page);
    if (nm.assessed) {
      if (nm.consistent) strengths.push('Business name consistent between page title/headline and body copy.');
      else findings.push({
        check_id: 'name_mismatch', check_name: 'Business name consistency',
        severity: 'MEDIUM',
        quote: page.title || page.h1,
        explanation: 'The name in the page title/headline ("' + nm.name + '") does not clearly appear in the body copy.',
        fix: CHECK_FIXES.name_mismatch
      });
    }

    /* 4 — CTAs */
    var ctas = findAll(page, CTA_PATTERNS);
    var ctaLabels = uniqueOrdered(ctas.map(function (c) { return c.label; }));
    if (ctas.length === 0) {
      findings.push({
        check_id: 'cta_missing', check_name: 'Call-to-action inventory',
        severity: 'HIGH', quote: null,
        explanation: 'No call to action was detected — no call/quote/book/schedule/contact/form prompt. Visitors are never told what to do next.',
        fix: CHECK_FIXES.cta_missing
      });
    } else {
      strengths.push(ctas.length + ' call' + (ctas.length === 1 ? '' : 's') + ' to action found (' + ctaLabels.join(', ') + ').');
    }

    /* 5 — trust signals (strengths only; absence is not a violation) */
    var trust = findAll(page, TRUST_PATTERNS);
    var trustLabels = uniqueOrdered(trust.map(function (t) { return t.label; }));
    if (trustLabels.length > 0) strengths.push('Trust signals present: ' + trustLabels.join(', ') + '.');

    /* 6 — service area */
    var areaHit = AREA_PATTERNS.some(function (p) { return new RegExp(p, 'i').test(page.text); });
    if (areaHit) {
      strengths.push('Service area / location signal found.');
    } else {
      findings.push({
        check_id: 'area_missing', check_name: 'Service area signal',
        severity: 'MEDIUM', quote: null,
        explanation: 'No service area or address signal found — no "serving" area, street address, or ZIP code.',
        fix: CHECK_FIXES.area_missing
      });
    }

    findings.sort(function (a, b) {
      if (a.severity !== b.severity) return a.severity === 'HIGH' ? -1 : 1;
      return 0;
    });

    var score = scoreFindings(findings);
    return {
      version: LANDING_VERSION,
      score: score,
      verdict: verdictFor(findings), // HIGH RISK | NEEDS REVIEW | CLEAR
      phone: ph,
      license: lic,
      businessName: nm,
      ctaCount: ctas.length,
      ctaLabels: ctaLabels,
      trustLabels: trustLabels,
      areaFound: areaHit,
      findings: findings,
      strengths: strengths,
      audited_at: new Date().toISOString()
    };
  }

  function auditLandingHtml(html) { return auditLanding(extractFromHtml(html)); }
  function auditLandingText(text) { return auditLanding(extractFromText(text)); }

  var api = {
    LANDING_VERSION: LANDING_VERSION,
    looksLikeHtml: looksLikeHtml,
    extractFromHtml: extractFromHtml,
    extractFromText: extractFromText,
    detectPhones: detectPhones,
    detectLicense: detectLicense,
    checkBusinessName: checkBusinessName,
    auditLanding: auditLanding,
    auditLandingHtml: auditLandingHtml,
    auditLandingText: auditLandingText,
    CHECK_FIXES: CHECK_FIXES
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.LandingEngine = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
