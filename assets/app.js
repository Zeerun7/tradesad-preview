/* TradesAd Suite — shared site chrome + form behavior.
 * Zero dependencies. Reads window.TradesAdConfig (assets/config.js).
 * HONESTY RULE: this static site has no backend. While every endpoint
 * in config.js is empty, forms validate locally, show an inline
 * "demo mode" notice, and NEVER claim an account/message/payment went
 * through. Demo sessions live only in this browser's localStorage. */
(function () {
  'use strict';

  var cfg = (window.TradesAdConfig && window.TradesAdConfig.BACKEND) || {
    signupEndpoint: '', loginEndpoint: '', contactEndpoint: '',
    stripePaymentLinks: { starter: '', pro: '', scale: '' }
  };
  var DEMO_KEY = 'tradesad_demo_session';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function $(id) { return document.getElementById(id); }
  function emailOK(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }

  /* ---------- shared nav + footer ---------- */
  var NAV_LINKS = [
    ['index.html', 'Home'],
    ['audit.html', 'Ad Audit'],
    ['landing-audit.html', 'Landing Page Audit'],
    ['competitor-scan.html', 'Competitor Scanner'],
    ['watchlist.html', 'Watchlist'],
    ['features.html', 'Features'],
    ['pricing.html', 'Pricing'],
    ['contact.html', 'Contact']
  ];

  function currentPage() {
    var p = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    return p === '' ? 'index.html' : p;
  }

  function getSession() {
    try { return JSON.parse(localStorage.getItem(DEMO_KEY) || 'null'); }
    catch (e) { return null; }
  }
  function setSession(s) {
    try {
      if (s) localStorage.setItem(DEMO_KEY, JSON.stringify(s));
      else localStorage.removeItem(DEMO_KEY);
    } catch (e) {}
  }

  function accountHTML() {
    var s = getSession();
    if (s) {
      return '<span class="demo-pill" title="Demo session stored only in this browser">Demo: ' +
        esc(s.name || s.email || 'account') + '</span>' +
        '<button class="link-btn" id="logoutBtn" type="button">Log out</button>';
    }
    return '<a class="login-link" href="login.html">Log in</a>' +
      '<a class="btn-volt" href="signup.html">Sign up free</a>';
  }

  function renderNav() {
    var host = $('siteNav');
    if (!host) return;
    var here = currentPage();
    var links = NAV_LINKS.map(function (l) {
      return '<a href="' + l[0] + '"' + (l[0] === here ? ' class="active"' : '') + '>' + l[1] + '</a>';
    }).join('');
    host.innerHTML =
      '<div class="site-nav-inner">' +
        '<a class="site-brand" href="index.html">' +
          '<span class="logo">TS</span>' +
          '<span><span class="brand-name">TradesAd Suite&trade;</span><br>' +
          '<span class="brand-sub">Rule-based ad audits</span></span>' +
        '</a>' +
        '<div class="nav-account" id="navAccount">' + accountHTML() + '</div>' +
        '<button class="nav-toggle" id="navToggle" aria-label="Open menu" type="button">&#9776;</button>' +
        '<div class="nav-links" id="navLinks">' + links + '</div>' +
      '</div>';
    var toggle = $('navToggle'), menu = $('navLinks');
    if (toggle && menu) {
      toggle.addEventListener('click', function () {
        var open = menu.classList.toggle('open');
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      });
      menu.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') menu.classList.remove('open');
      });
    }
    var logout = $('logoutBtn');
    if (logout) logout.addEventListener('click', function () {
      setSession(null);
      renderNav();
    });
  }

  function renderFooter() {
    var host = $('siteFoot');
    if (!host) return;
    host.innerHTML =
      '<div class="foot-grid">' +
        '<div><div class="foot-brand">TradesAd Suite<span>&trade;</span></div>' +
        '<p class="foot-blurb">Deterministic, rule-based audits for residential contractors and the agencies that serve them: ad-copy audits, landing-page audits, and competitor scans. Same input in, same verdict out — every time.</p></div>' +
        '<div><h4>PRODUCT</h4>' +
          '<a href="audit.html">Ad audit</a><a href="landing-audit.html">Landing page audit</a><a href="competitor-scan.html">Competitor scanner</a><a href="watchlist.html">Client watchlist</a><a href="features.html">Features</a><a href="pricing.html">Pricing</a></div>' +
        '<div><h4>ACCOUNT</h4>' +
          '<a href="signup.html">Sign up</a><a href="login.html">Log in</a><a href="pricing.html">Plans</a></div>' +
        '<div><h4>SUPPORT</h4>' +
          '<a href="contact.html">Contact us</a><a href="mailto:support@tradesad.com">support@tradesad.com</a></div>' +
      '</div>' +
      '<div class="foot-bottom"><span>&copy; 2026 LOCAL RADAR LLC &middot; TradesAd Suite&trade;</span>' +
      '<span>Policy Engine v2026-09-29 &middot; pre-screen only, not legal advice</span></div>';
  }

  /* ---------- pricing plan buttons ---------- */
  function wirePlanButtons() {
    var links = cfg.stripePaymentLinks || {};
    document.querySelectorAll('[data-plan]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var plan = btn.getAttribute('data-plan');
        var stripe = links[plan];
        if (stripe) { location.href = stripe; return; }
        location.href = 'signup.html?plan=' + encodeURIComponent(plan);
      });
    });
  }

  /* ---------- form helpers ---------- */
  function setErr(inputId, msg) {
    var el = $('ferr-' + inputId);
    if (el) el.textContent = msg || '';
    var inp = $(inputId);
    if (inp) inp.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  function noticeHTML(kind, text) {
    return '<div class="notice ' + kind + '">' + text + '</div>';
  }
  function showNotice(boxId, kind, html) {
    var box = $(boxId);
    if (box) { box.innerHTML = noticeHTML(kind, html); box.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  }

  /* ---------- signup ---------- */
  function initSignup() {
    var form = $('signupForm');
    if (!form) return;
    // ?plan= preselect
    try {
      var plan = new URLSearchParams(location.search).get('plan');
      var sel = $('plan');
      if (plan && sel && ['starter', 'pro', 'scale'].indexOf(plan) > -1) sel.value = plan;
    } catch (e) {}

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      var name = $('su-name').value.trim();
      var email = $('su-email').value.trim();
      var pw = $('su-password').value;
      var terms = $('su-terms').checked;

      setErr('su-name', ''); setErr('su-email', ''); setErr('su-password', ''); setErr('su-terms', '');
      if (!name) { setErr('su-name', 'Please enter your name.'); ok = false; }
      if (!emailOK(email)) { setErr('su-email', 'Enter a valid email address.'); ok = false; }
      if (pw.length < 8) { setErr('su-password', 'Password must be at least 8 characters.'); ok = false; }
      if (!terms) { setErr('su-terms', 'Please accept the terms to continue.'); ok = false; }
      if (!ok) return;

      var planVal = $('plan').value;
      var company = $('su-company').value.trim();

      if (!cfg.signupEndpoint) {
        // DEMO MODE — honest: no real account exists.
        setSession({ name: name, email: email, company: company, plan: planVal, ts: Date.now() });
        renderNav();
        showNotice('formNotice', 'demo',
          '<strong>Demo mode.</strong> This static site has no backend yet, so no real account was created. ' +
          'Your details were saved <strong>only in this browser</strong> (localStorage) so you can preview the signed-in nav state. ' +
          'To enable real accounts, set <code>signupEndpoint</code> in <code>assets/config.js</code>.<br><br>' +
          '<a class="btn-volt" href="audit.html">Continue to the audit tool &rarr;</a>');
        return;
      }
      // TODO: wire your real API call here (POST name/company/email/password/plan to cfg.signupEndpoint).
      showNotice('formNotice', 'demo',
        '<strong>Almost there.</strong> A signup endpoint is configured in <code>assets/config.js</code>, ' +
        'but the API call still needs to be wired in <code>app.js &rarr; initSignup</code> (marked TODO). ' +
        'No account was created by this page.');
    });
  }

  /* ---------- login ---------- */
  function initLogin() {
    var form = $('loginForm');
    if (!form) return;
    var forgot = $('forgotLink');
    if (forgot) forgot.addEventListener('click', function (e) {
      e.preventDefault();
      showNotice('formNotice', 'demo',
        '<strong>Demo mode.</strong> Password reset isn\'t available — this static site has no backend and no real accounts. ' +
        'To enable it, set <code>loginEndpoint</code> in <code>assets/config.js</code> and wire the reset flow.');
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      var email = $('li-email').value.trim();
      var pw = $('li-password').value;
      setErr('li-email', ''); setErr('li-password', '');
      if (!emailOK(email)) { setErr('li-email', 'Enter a valid email address.'); ok = false; }
      if (!pw) { setErr('li-password', 'Enter your password.'); ok = false; }
      if (!ok) return;

      if (!cfg.loginEndpoint) {
        showNotice('formNotice', 'demo',
          '<strong>Demo mode.</strong> This static site has no backend, so there are no real accounts to log in to. ' +
          'No session was created. To enable real logins, set <code>loginEndpoint</code> in <code>assets/config.js</code>.<br><br>' +
          'New here? <a href="signup.html">Create a demo account</a> to preview the flow.');
        return;
      }
      // TODO: wire your real API call here (POST email/password to cfg.loginEndpoint).
      showNotice('formNotice', 'demo',
        '<strong>Almost there.</strong> A login endpoint is configured in <code>assets/config.js</code>, ' +
        'but the API call still needs to be wired in <code>app.js &rarr; initLogin</code> (marked TODO). ' +
        'No session was created by this page.');
    });
  }

  /* ---------- contact ---------- */
  function initContact() {
    var form = $('contactForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      var name = $('c-name').value.trim();
      var email = $('c-email').value.trim();
      var msg = $('c-message').value.trim();
      setErr('c-name', ''); setErr('c-email', ''); setErr('c-message', '');
      if (!name) { setErr('c-name', 'Please enter your name.'); ok = false; }
      if (!emailOK(email)) { setErr('c-email', 'Enter a valid email address.'); ok = false; }
      if (msg.length < 10) { setErr('c-message', 'Tell us a little more (10+ characters).'); ok = false; }
      if (!ok) return;

      if (!cfg.contactEndpoint) {
        showNotice('formNotice', 'demo',
          '<strong>Demo mode.</strong> Your message was <strong>not sent</strong> — this static site has no backend to deliver it. ' +
          'To receive messages, set <code>contactEndpoint</code> in <code>assets/config.js</code>. ' +
          'In the meantime you can reach us directly at <a href="mailto:support@tradesad.com">support@tradesad.com</a>.');
        return;
      }
      // TODO: wire your real API call here (POST name/email/subject/message to cfg.contactEndpoint).
      showNotice('formNotice', 'demo',
        '<strong>Almost there.</strong> A contact endpoint is configured in <code>assets/config.js</code>, ' +
        'but the API call still needs to be wired in <code>app.js &rarr; initContact</code> (marked TODO). ' +
        'Your message was not sent.');
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    renderNav();
    renderFooter();
    wirePlanButtons();
    initSignup();
    initLogin();
    initContact();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
