/* engine.js — VERBATIM COPY of scripts 1-2 from dist/index.html (POLICY_LIBRARY + rule engine).
 * Do not hand-edit. Logic is byte-identical to the verified build (policy_version 2026-09-29).
 * Source: ../dist/index.html — regenerate from there if the library is updated. */

// AUTO-GENERATED from policy_patterns.json — do not hand-edit.
const POLICY_LIBRARY = {
  "categories": [
    {
      "default_severity": "HIGH",
      "id": "superlatives",
      "patterns": [
        {
          "exclusions": [
            "\\bdo (our|your|their) best\\b",
            "\\btry(ing)? (our|your|their) best\\b",
            "\\bbest practices\\b"
          ],
          "explanation": "Unsubstantiated superlative 'best' requires verifiable third-party proof (awards, published rankings); otherwise it risks disapproval under misleading-claims rules.",
          "id": "sup_best",
          "pattern": "\\bbest\\b"
        },
        {
          "explanation": "'#1 / No.1 / number one' is a ranking claim. Without a named source and date it is treated as an unsubstantiated superlative.",
          "id": "sup_number_one",
          "pattern": "(?<!\\w)(#1|no\\.?\\s*1|number one)\\b"
        },
        {
          "explanation": "'Top-rated' is a superlative claim that needs a verifiable source (review platform, award body, year).",
          "id": "sup_top_rated",
          "pattern": "\\btop[-\\s]?rated\\b"
        },
        {
          "explanation": "'Finest' is an unsubstantiated superlative under misleading-claims rules.",
          "id": "sup_finest",
          "pattern": "\\bfinest\\b"
        },
        {
          "explanation": "'Nobody beats our prices' is an absolute price-superiority claim that cannot be substantiated across all competitors.",
          "id": "sup_nobody_beats",
          "pattern": "\\b(nobody|no\\s*one)\\s+beats?\\b"
        },
        {
          "explanation": "'Unbeatable' is an absolute superiority claim that cannot be proven.",
          "id": "sup_unbeatable",
          "pattern": "\\bunbeatabl\\w*\\b"
        },
        {
          "explanation": "'Lowest prices' / 'guaranteed lowest prices' requires comprehensive, current proof across competitors.",
          "id": "sup_lowest_price",
          "pattern": "\\b(guaranteed\\s+)?lowest\\s+prices?\\b"
        },
        {
          "explanation": "'Cheapest' is a price-superlative claim that cannot be substantiated market-wide.",
          "id": "sup_cheapest",
          "pattern": "\\bcheapest\\b"
        },
        {
          "explanation": "'Fastest' is a superlative that needs substantiation; borderline puffery — human review recommended.",
          "id": "sup_fastest",
          "pattern": "\\bfastest\\b",
          "severity": "MEDIUM"
        }
      ],
      "policy": "Google/Meta Ads — Misleading Claims & Exaggerated Guarantees"
    },
    {
      "default_severity": "HIGH",
      "id": "absolute_guarantees",
      "patterns": [
        {
          "explanation": "'Money back' promises are absolute financial guarantees. They need clear, visible terms and conditions or they are treated as exaggerated guarantees.",
          "id": "gua_money_back",
          "pattern": "\\bmoney[-\\s]?back\\b"
        },
        {
          "explanation": "'100% guaranteed' is an absolute guarantee with no possible qualification.",
          "id": "gua_100_percent",
          "pattern": "100%\\s+guaranteed\\b"
        },
        {
          "explanation": "'Iron-clad guarantee' is an absolute guarantee claim requiring visible terms.",
          "id": "gua_ironclad",
          "pattern": "\\biron[-\\s]?clad\\s+guarantee\\b"
        },
        {
          "explanation": "'That's a promise' attached to a price or outcome claim makes it an absolute guarantee.",
          "id": "gua_thats_a_promise",
          "pattern": "\\bthat'?s\\s+(a|our)\\s+promise\\b"
        },
        {
          "explanation": "'On the house' is an absolute free-service promise; free offers need clear limits and conditions.",
          "id": "gua_on_the_house",
          "pattern": "\\bon\\s+the\\s+house\\b"
        },
        {
          "explanation": "'Satisfaction guaranteed' is a broad guarantee — human review recommended to check that terms are stated.",
          "id": "gua_satisfaction",
          "pattern": "\\bsatisfaction\\s+guaranteed\\b",
          "severity": "MEDIUM"
        }
      ],
      "policy": "Google/Meta Ads — Misleading Claims & Exaggerated Guarantees"
    },
    {
      "default_severity": "HIGH",
      "id": "financial_claims",
      "patterns": [
        {
          "explanation": "'Save you up to $X' is a projected-savings claim that needs a disclosed basis (typical customer, study, or timeframe).",
          "id": "fin_save_up_to",
          "pattern": "\\bsaves?\\s+you\\s+up\\s+to\\b"
        },
        {
          "explanation": "A specific savings amount ('save $500') presented as fact needs substantiation of how the figure was calculated.",
          "id": "fin_save_amount",
          "pattern": "\\bsave\\s+\\$?[\\d,]+\\b"
        },
        {
          "explanation": "'Money back in your pocket' implies a guaranteed financial return, which needs proof.",
          "id": "fin_money_pocket",
          "pattern": "\\bmoney\\s+back\\s+in\\s+your\\s+pocket\\b"
        },
        {
          "explanation": "'Pays for itself' is a return-on-investment promise that needs a disclosed calculation basis.",
          "id": "fin_pays_for_itself",
          "pattern": "\\bpays?\\s+for\\s+itsel(f|ves)\\b"
        },
        {
          "explanation": "'Cut your bills by X%' is a projected-savings claim requiring substantiation.",
          "id": "fin_cut_bills",
          "pattern": "\\bcut\\s+(your\\s+)?bills?\\s+by\\b"
        }
      ],
      "policy": "Google/Meta Ads — Misleading Claims & Exaggerated Guarantees"
    },
    {
      "default_severity": "HIGH",
      "id": "personal_attributes",
      "patterns": [
        {
          "explanation": "Direct second-person questions asserting the viewer's personal attributes, situation, or struggles ('Do you own a home...', 'Are you struggling...'). Meta bans asserting or implying personal attributes.",
          "id": "pa_direct_question",
          "pattern": "\\b(do you|are you|did you|have you|is your|are your)\\b[^.!?]{0,60}\\b(homeowners?|home|family|families|struggl\\w+|tired|bills?|debt|overpay\\w*|old\\b)"
        },
        {
          "explanation": "Phrases like 'tired of YOUR old AC' assert the viewer's personal situation — a personal-attributes violation.",
          "id": "pa_tired_your",
          "pattern": "\\b(tired|struggl\\w+)\\b[^.!?]{0,30}\\bof\\s+your\\b"
        },
        {
          "explanation": "Telling the viewer 'you're overpaying' asserts their financial situation — a personal-attributes violation.",
          "id": "pa_youre_overpaying",
          "pattern": "\\byou'?re\\b[^.!?]{0,40}\\boverpay\\w*\\b"
        },
        {
          "explanation": "'If you're like most homeowners' groups the viewer into an attributed class — a soft personal-attributes assertion.",
          "id": "pa_like_most",
          "pattern": "\\bif\\s+you'?re\\s+like\\s+most\\b"
        },
        {
          "explanation": "'Homeowners like you' attributes a class membership to the viewer — a personal-attributes violation.",
          "id": "pa_like_you",
          "pattern": "\\b(homeowners?|families)\\s+like\\s+you(rs)?\\b"
        },
        {
          "explanation": "Invoking 'your family's safety/health' asserts the viewer's family circumstances — a personal-attributes violation.",
          "id": "pa_your_family_safety",
          "pattern": "\\byour\\s+family'?s\\s+(safety|health)\\b"
        }
      ],
      "policy": "Meta/Facebook Advertising Policies — Personal Attributes (Section 4.6.2)"
    },
    {
      "default_severity": "HIGH",
      "id": "safety_claims",
      "patterns": [
        {
          "explanation": "'100% safe' is an absolute safety claim. For pest/chemical treatments, EPA/FTC prohibit absolute safety or risk-free claims.",
          "id": "saf_100_safe",
          "pattern": "100%\\s+safe\\b"
        },
        {
          "explanation": "Absolute safety qualifiers ('completely safe') are prohibited for treatments and health-adjacent claims.",
          "id": "saf_completely_safe",
          "pattern": "\\b(completely|totally|absolutely)\\s+safe\\b"
        },
        {
          "explanation": "'Harmless to children/pets' is an absolute safety claim about a treatment product.",
          "id": "saf_harmless",
          "pattern": "\\bharmless\\s+to\\b"
        },
        {
          "explanation": "'Chemical-free' is a regulated claim — everything is made of chemicals; absolute versions mislead.",
          "id": "saf_chemical_free",
          "pattern": "\\bchemical[-\\s]?free\\b"
        },
        {
          "explanation": "'All-natural' implies safety without proof; natural substances can still be hazardous.",
          "id": "saf_all_natural",
          "pattern": "\\ball[-\\s]?natural\\b"
        },
        {
          "explanation": "'Non-toxic' is a regulated safety claim that needs a proper basis.",
          "id": "saf_nontoxic",
          "pattern": "\\bnon[-\\s]?toxic\\b"
        },
        {
          "explanation": "'Zero risk / risk-free' is an absolute safety claim prohibited by EPA/FTC standards.",
          "id": "saf_zero_risk",
          "pattern": "\\b(zero\\s+risk|risk[-\\s]?free|no\\s+risk)\\b"
        },
        {
          "explanation": "'Kills ... on contact' style absolute efficacy claims for pest treatments are high-risk under EPA/FTC rules.",
          "id": "saf_kills_contact",
          "pattern": "\\bkill\\w*\\b[^.!?]{0,30}\\bon\\s+contact\\b"
        },
        {
          "explanation": "'Wipes out ... on contact' is an absolute efficacy claim for a treatment product.",
          "id": "saf_wipes_out",
          "pattern": "\\bwipes?\\s+out\\b[^.!?]{0,30}\\bon\\s+contact\\b"
        },
        {
          "explanation": "'Kills every pest' is an absolute efficacy claim that cannot be proven.",
          "id": "saf_kills_every",
          "pattern": "\\bkill\\w*\\s+every\\b"
        }
      ],
      "policy": "EPA, FTC Regulations & Ad Networks — Safety Claims Standards"
    }
  ],
  "engine": "tradesad-rule-engine",
  "gray_zone_note": "Contains promotional triggers ({triggers}) but no high-risk pattern matched. Human review recommended before launch.",
  "gray_zone_triggers": [
    "\\bfree\\b",
    "\\bsave\\b",
    "\\bsavings\\b",
    "\\bguarantee\\w*\\b",
    "\\bcleaner\\s+(air|water)\\b",
    "\\bact\\s+now\\b",
    "\\blimited\\s+time\\b",
    "\\b\\d+%",
    "\\$\\d[\\d,]*\\s*(a|per|/)\\s*(year|month|day)"
  ],
  "license": {
    "description": "Trade license credential formats like ROC #276078, TECL #19787, LCB # 8573. Only fires on LETTERS + # + digits, so plain numbers ('10 years old') and words ('Mesa') never match.",
    "found_text": "License credential detected in ad copy: '{match}'.",
    "not_found_text": "No license credential found in ad copy. Adding a trade license number is recommended.",
    "pattern": "\\b([A-Z]{2,6})\\s*#\\s*(\\d[\\d\\-]{1,})\\b"
  },
  "policy_updated_note": "Bump policy_version and add patterns whenever Google/Meta/EPA/FTC guidance changes. Every change must pass run_regression.py before release.",
  "policy_version": "2026-09-29",
  "scoring": {
    "floor": 40,
    "high_penalty": 20,
    "medium_penalty": 8,
    "multi_high_cap": 60,
    "note": "2+ HIGH findings caps the score at 60. Verdict: any HIGH = HIGH RISK; else any MEDIUM/gray triggers = NEEDS REVIEW; else CLEAR (no blessing language — this tool pre-screens, it never declares an ad safe to launch)."
  }
};
if (typeof module !== 'undefined') module.exports = POLICY_LIBRARY;



/* TradesAd Rule-Based Ad Policy Engine (JavaScript port of engine.py)
 * Deterministic, zero-AI. Same ad in -> same verdict out, every time.
 * Expects POLICY_LIBRARY (patterns.js) loaded before this file.
 */
(function (global) {
  'use strict';

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

  function regexFlagsFor(categoryId) {
    return 'i'; // all violation + gray-zone patterns are case-insensitive
  }

  function scan(text, lib) {
    lib = lib || POLICY_LIBRARY;
    var normalized = normalizeText(text);
    var sentences = splitSentences(normalized);
    var findings = [];
    var seen = new Set();

    lib.categories.forEach(function (cat) {
      cat.patterns.forEach(function (pat) {
        var severity = pat.severity || cat.default_severity;
        var rx;
        try { rx = new RegExp(pat.pattern, regexFlagsFor(cat.id)); }
        catch (e) { return; } // a bad pattern must never crash an audit
        sentences.forEach(function (sentence, idx) {
          if (!rx.test(sentence)) return;
          var excluded = (pat.exclusions || []).some(function (ex) {
            try { return new RegExp(ex, 'i').test(sentence); }
            catch (e) { return false; }
          });
          if (excluded) return;
          var key = pat.id + '::' + idx;
          if (seen.has(key)) return;
          seen.add(key);
          findings.push({
            pattern_id: pat.id,
            category_id: cat.id,
            policy: cat.policy,
            severity: severity,
            quote: sentence,          // FULL sentence, never a keyword fragment
            explanation: pat.explanation
          });
        });
      });
    });

    return { normalized: normalized, sentences: sentences, findings: findings };
  }

  function licenseCheck(text, lib) {
    lib = lib || POLICY_LIBRARY;
    var lic = lib.license;
    var m = null;
    try { m = new RegExp(lic.pattern).exec(normalizeText(text)); } // case-SENSITIVE
    catch (e) { m = null; }
    if (m) {
      return { found: true, match: m[0], text: lic.found_text.replace('{match}', m[0]) };
    }
    return { found: false, match: null, text: lic.not_found_text };
  }

  function grayZoneCheck(text, lib) {
    lib = lib || POLICY_LIBRARY;
    var hits = [];
    (lib.gray_zone_triggers || []).forEach(function (t) {
      try { if (new RegExp(t, 'i').test(text)) hits.push(t); } catch (e) {}
    });
    if (hits.length > 0) {
      return { triggered: true, triggers: hits, note: lib.gray_zone_note };
    }
    return { triggered: false, triggers: [], note: null };
  }

  function scoreFindings(findings) {
    var high = findings.filter(function (f) { return f.severity === 'HIGH'; }).length;
    var med = findings.filter(function (f) { return f.severity === 'MEDIUM'; }).length;
    var score = 100 - 20 * high - 8 * med;
    if (high >= 2) score = Math.min(score, 60);
    return Math.max(score, 40);
  }

  function verdictFor(findings, grayTriggered) {
    var high = findings.some(function (f) { return f.severity === 'HIGH'; });
    var med = findings.some(function (f) { return f.severity === 'MEDIUM'; });
    if (high) return 'HIGH RISK';
    if (med || grayTriggered) return 'NEEDS REVIEW';
    return 'CLEAR';
  }

  var CATEGORY_FIXES = {
    superlatives: 'Replace the superlative with a verifiable fact (award name + year, published ranking, review count) or soften it to a specific, provable claim.',
    absolute_guarantees: 'State the actual terms instead of absolute language: timeframe, conditions, and how the customer claims it.',
    financial_claims: 'Add the basis for the figure (typical customer, timeframe, conditions) or remove the specific number.',
    personal_attributes: 'Describe the problem in general terms instead of the reader. Example: "Many homeowners overpay..." becomes "Older AC units often cost more to run..."',
    safety_claims: 'Avoid absolute safety promises. Prefer "designed to be family- and pet-friendly when used as directed" and keep the label directions visible.'
  };

  function deriveStrengths(result) {
    var strengths = [];
    var cats = new Set(result.findings.map(function (f) { return f.category_id; }));
    if (result.license.found) {
      strengths.push('License credential detected in the ad copy (' + result.license.match + ').');
    }
    if (!cats.has('superlatives') && !cats.has('absolute_guarantees')) {
      strengths.push('No unsubstantiated superlatives or absolute guarantees detected.');
    }
    if (!cats.has('financial_claims')) {
      strengths.push('No specific savings or earnings claims that would need substantiation.');
    }
    if (!cats.has('personal_attributes')) {
      strengths.push('No personal-attribute targeting detected (compliant with Meta policy 4.6.2).');
    }
    if (!cats.has('safety_claims')) {
      strengths.push('No absolute safety claims detected.');
    }
    if (result.findings.length === 0 && !result.license.found) {
      strengths.push('Copy focuses on service details rather than risky claims.');
    }
    return strengths;
  }

  function audit(text, lib) {
    lib = lib || POLICY_LIBRARY;
    var scanned = scan(text, lib);
    var license = licenseCheck(text, lib);
    var gray = grayZoneCheck(scanned.normalized, lib);
    var score = scoreFindings(scanned.findings);
    var verdict = verdictFor(scanned.findings, gray.triggered);
    var result = {
      policy_version: lib.policy_version,
      score: score,
      verdict: verdict, // HIGH RISK | NEEDS REVIEW | CLEAR — never blessing language
      findings: scanned.findings,
      license: license,
      gray_zone: gray,
      audited_at: new Date().toISOString()
    };
    result.strengths = deriveStrengths(result);
    return result;
  }

  var api = {
    normalizeText: normalizeText,
    splitSentences: splitSentences,
    scan: scan,
    licenseCheck: licenseCheck,
    grayZoneCheck: grayZoneCheck,
    scoreFindings: scoreFindings,
    verdictFor: verdictFor,
    audit: audit,
    CATEGORY_FIXES: CATEGORY_FIXES
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.RuleEngine = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);

