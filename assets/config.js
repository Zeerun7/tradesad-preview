/* TradesAd Suite — backend wiring.
 * ------------------------------------------------------------------
 * This is a STATIC site: there is no server, no database, no real
 * accounts or payments until YOU connect them. Fill in the values
 * below when your backend / Stripe are ready — app.js reads them.
 *
 *   signupEndpoint / loginEndpoint / contactEndpoint:
 *     Full HTTPS URL of YOUR API (e.g. "https://api.example.com/signup").
 *     Leave "" for demo mode: forms validate locally, show an honest
 *     "demo mode" notice, and never pretend an account was created.
 *
 *   stripePaymentLinks.{starter,pro,scale}:
 *     Your Stripe Payment Link URLs (Dashboard > Payments > Payment Links).
 *     Leave "" for demo mode: pricing buttons send visitors to the
 *     signup page instead of a checkout.
 * ------------------------------------------------------------------ */
window.TradesAdConfig = {
  BACKEND: {
    signupEndpoint: "",
    loginEndpoint: "",
    contactEndpoint: "",
    stripePaymentLinks: {
      starter: "",
      pro: "",
      scale: ""
    }
  }
};
