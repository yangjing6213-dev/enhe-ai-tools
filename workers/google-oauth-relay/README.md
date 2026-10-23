# ENHE Google OAuth relay

This Cloudflare Worker moves only Google's authorization-code exchange and public-key lookup off the ENHE application server. It has one fixed Google client ID, one fixed production callback URL, a 4 KiB request-body limit, no logging, no storage, and no token cache. It returns only the short-lived Google ID token and Google's public signing keys. The ENHE application still verifies the token signature, issuer, audience, expiry, email verification, and nonce before creating a session.

## Worker settings

Set `GOOGLE_CLIENT_ID` as a text variable and `GOOGLE_CLIENT_SECRET` as an encrypted secret. The same Google client secret is already configured on ENHE and is used to sign requests to this Worker with HMAC; the secret itself is never sent in those requests. Never add it to source code.

The application relay URL must use HTTPS and the Worker hostname, with the `/exchange` path; for example, `https://<worker-name>.<account-subdomain>.workers.dev/exchange`.

## Data flow

ENHE sends the one-time Google authorization code and fixed callback URL to this Worker over HTTPS. It authenticates that request using an HMAC signature derived from the Google client secret. The Worker sends the code and its encrypted Google client secret to Google's token endpoint, fetches Google's public signing keys, then returns the ID token and public keys to ENHE. The ID token contains the user's Google subject and email. The Worker does not write requests or responses to storage or log their contents.

Cloudflare processes those request and response values while the Worker runs. Do not configure request-body or authorization-header logging for this Worker.

## Cloudflare dashboard setup

Cloudflare's dashboard flow creates the Worker when you first select **Deploy**. That first deployment publishes only the stock Hello World response at its public `workers.dev` address; it has no credentials and handles no Google data. After it exists, open the Worker editor and replace the starter code with `index.ts`. Then set the text variable and encrypted secret above under **Settings → Variables and Secrets**, and deploy the protected code. The application must not be pointed at the Worker until the protected code and both Worker settings are live.

The starter deployment is optional if the Worker is created through Wrangler and the real code is deployed directly. Review and approve the data flow before deploying the protected relay or connecting the application.
