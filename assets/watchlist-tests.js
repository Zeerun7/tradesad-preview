/* watchlist-tests.js — node regression tests for watchlist.js pure functions.
 * Run: node assets/watchlist-tests.js */
const W = require('./watchlist.js');

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', name); }
}
function memShim() {
  const m = {};
  return {
    getItem: (k) => (k in m ? m[k] : null),
    setItem: (k, v) => { m[k] = String(v); },
    removeItem: (k) => { delete m[k]; },
    _raw: m
  };
}
const NOW = Date.parse('2026-09-29T12:00:00Z');
const daysAgo = (n) => new Date(NOW - n * 86400000).toISOString();

/* ---- addSite validation ---- */
{
  const s = W.blankStore();
  ok(!W.addSite(s, '', 'https://a.com').ok, 'reject empty name');
  ok(!W.addSite(s, 'A', 'not a url').ok, 'reject bad url');
  const r1 = W.addSite(s, 'Acme', 'acmeplumbing.com');
  ok(r1.ok && r1.site.url === 'https://acmeplumbing.com', 'normalize bare domain to https');
  ok(!W.addSite(s, 'Acme2', 'https://ACMEplumbing.com').ok, 'reject duplicate url (case-insensitive)');
  for (let i = s.sites.length; i < W.MAX_SITES_DEMO; i++) {
    W.addSite(s, 'S' + i, 'https://site' + i + '.com');
  }
  const over = W.addSite(s, 'TooMany', 'https://toomany.com');
  ok(!over.ok && /10/.test(over.error), 'enforce demo site cap with plain-English error');
}

/* ---- recordAudit + snapshot compactness ---- */
{
  const s = W.blankStore();
  const site = W.addSite(s, 'Acme', 'https://acme.com').site;
  const audit = {
    audited_at: daysAgo(10), score: 58, verdict: 'NEEDS REVIEW', version: '2026-09-29',
    findings: [
      { check_id: 'phone_missing', check_name: 'Phone extraction & consistency', severity: 'HIGH', quote: 'long...', explanation: 'long...', fix: 'long...' },
      { check_id: 'cta_missing', check_name: 'Call-to-action inventory', severity: 'HIGH' }
    ],
    strengths: ['a', 'b'],
    phone: { canonical: '5551234567' },
    license: { found: true, match: 'ROC #123' }
  };
  const snap = W.recordAudit(s, site.id, audit);
  ok(snap.score === 58 && snap.findings.length === 2, 'snapshot recorded');
  ok(snap.findings[0].quote === undefined, 'snapshot drops verbose fields (compact)');
  ok(snap.phone === '5551234567' && snap.license === 'ROC #123', 'snapshot keeps phone/license');
  ok(W.latestAudit(site).score === 58, 'latestAudit returns newest');
}

/* ---- diffFindings: fixed / added / delta ---- */
{
  const prev = { score: 58, findings: [
    { check_id: 'phone_missing', check_name: 'Phone', severity: 'HIGH' },
    { check_id: 'cta_missing', check_name: 'CTA', severity: 'HIGH' }
  ]};
  const curr = { score: 84, findings: [
    { check_id: 'cta_missing', check_name: 'CTA', severity: 'HIGH' },
    { check_id: 'area_missing', check_name: 'Area', severity: 'MEDIUM' }
  ]};
  const d = W.diffFindings(prev, curr);
  ok(d.fixed.length === 1 && d.fixed[0].check_id === 'phone_missing', 'diff finds fixed check');
  ok(d.added.length === 1 && d.added[0].check_id === 'area_missing', 'diff finds added check');
  ok(d.scoreDelta === 26, 'diff computes score delta');
  const d2 = W.diffFindings(null, curr);
  ok(d2.fixed.length === 0 && d2.added.length === 2 && d2.scoreDelta === null, 'diff handles first audit');
}

/* ---- dueState ---- */
{
  const s = W.blankStore();
  const site = W.addSite(s, 'A', 'https://a.com').site;
  ok(W.dueState(site, NOW) === 'never', 'never audited -> never');
  W.recordAudit(s, site.id, { audited_at: daysAgo(10), score: 80, verdict: 'CLEAR', version: 'v', findings: [], strengths: [] });
  ok(W.dueState(site, NOW) === 'ok', 'recent audit -> ok');
  site.audits[0].at = daysAgo(45);
  ok(W.dueState(site, NOW) === 'due', 'old audit -> due');
}

/* ---- svgGraph ---- */
{
  ok(W.svgGraph([]) === '', 'empty series -> empty string');
  const one = W.svgGraph([{ at: daysAgo(5), score: 70 }]);
  ok(one.includes('<svg') && one.includes('70'), 'single point renders with score label');
  const three = W.svgGraph([
    { at: daysAgo(60), score: 58 }, { at: daysAgo(30), score: 71 }, { at: daysAgo(1), score: 84 }
  ]);
  ok((three.match(/<circle/g) || []).length === 3, 'three points -> three dots');
  ok(three.includes('M') && three.includes('L'), 'polyline path present');
}

/* ---- storage round-trip ---- */
{
  const shim = memShim();
  const s = W.blankStore();
  W.addSite(s, 'Acme', 'https://acme.com');
  ok(W.saveStore(s, shim), 'saveStore writes');
  const s2 = W.loadStore(shim);
  ok(s2.sites.length === 1 && s2.sites[0].name === 'Acme', 'loadStore round-trips');
  shim.setItem(W.STORE_KEY, 'not json{{{');
  ok(W.loadStore(shim).sites.length === 0, 'corrupt JSON -> blank store, no crash');
}

/* ---- url normalization edge ---- */
{
  ok(W.normalizeUrl('  example.com/page ') === 'https://example.com/page', 'trims + prepends https');
  ok(W.normalizeUrl('http://x.com') === 'http://x.com', 'keeps explicit scheme');
  ok(!W.urlOK('https://'), 'rejects scheme-only');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
