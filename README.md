# TradesAd Suite — static marketing + app site

7 pages, zero build step, zero dependencies. Open `index.html` directly or serve the folder.

## Pages
- `index.html` — home (hero, how-it-works, features, placeholder testimonials, FAQ)
- `audit.html` — the rule-based audit tool in site chrome
- `features.html` — 5 violation families, scoring, mock report preview (labeled mock)
- `pricing.html` — Starter $0 / Pro Agency $197/mo / Scale $497/mo + comparison table
- `signup.html` / `login.html` / `contact.html` — forms with front-end validation

## The audit engine (do not hand-edit)
- `assets/engine.js` — byte-identical copy of scripts 1–2 from `../dist/index.html`
  (POLICY_LIBRARY + rule engine, policy_version 2026-09-29). Verified 18/18 on the regression suite.
- `assets/audit-ui.js` — byte-identical copy of script 3 (tool UI wiring).
- To update patterns: edit `../dist/index.html`, then re-extract with the script noted in the parent README.

## Backend wiring (honest demo mode)
`assets/config.js` holds `BACKEND = { signupEndpoint, loginEndpoint, contactEndpoint,
stripePaymentLinks: { starter, pro, scale } }`. While values are empty:
- signup/login validate locally, show an inline "Demo mode" notice, and store a
  demo session in localStorage only (nav shows "Demo account" + logout).
- pricing buttons route to `signup.html?plan=X` instead of Stripe.
- contact form validates and tells the visitor the message was NOT sent.
- Nothing ever claims a real account, message, or payment went through.

When your backend exists: fill in the endpoints, then complete the marked TODOs in
`assets/app.js` (`initSignup` / `initLogin` / `initContact`), and paste your Stripe
Payment Links into `stripePaymentLinks`.

## Deploy
Drag the `site/` folder onto **app.netlify.com/drop** (or any static host).
All links are relative, so it works from a domain root or a subfolder.
Then add your custom domain in the host's domain settings.
