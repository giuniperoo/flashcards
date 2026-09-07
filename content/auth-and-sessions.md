# Auth and sessions
tint: #DFF2CA
blurb: Sessions, tokens, OAuth and OTP flows, with the browser details interviewers probe.

id: 23355e3d-5153-4116-9c83-1d996198f23e
Q: Authentication vs authorization?
A: Authentication proves who you are; authorization decides what that identity is allowed to do.

id: 81fe3a4a-700b-4358-8c01-574deac5cd8a
Q: Server session vs JWT — what is the real trade-off?
A: Sessions are revocable but need a lookup; JWTs are stateless but stay valid until they expire.

id: 84b9cad0-4dc3-4e3d-8720-47bb2f9b006a
Q: How do you revoke a JWT before it expires?
A: You cannot, directly — keep access tokens short-lived and check a denylist or version claim on refresh.

id: 70975e7e-771e-4dca-832e-6dd26745849c
Q: What cookie flags does a session cookie need?
A: HttpOnly, Secure, SameSite, a scoped Path and Domain, and an explicit expiry rather than session-only.

id: d63bacda-6876-4f72-a21a-a267efef7020
Q: What does SameSite actually defend against?
A: Cross-site requests carrying the cookie automatically — Lax blocks most CSRF, Strict breaks inbound links.

id: c56bb26f-f307-44c3-8b76-63720198395e
Q: Why store tokens in cookies rather than localStorage?
A: localStorage is readable by any script, so one XSS leaks the token; HttpOnly cookies are not script-readable.

id: db876b62-49ee-46b4-b0d0-2fee41349783
Q: What is refresh token rotation?
A: Each refresh issues a new token and invalidates the old; reuse of a retired token signals theft and kills the family.

id: e476009d-8d58-4c24-b0e8-cd78c080ab98
Q: Walk the OAuth 2 authorization code flow.
A: Redirect to the provider, user consents, provider returns a code, server exchanges it for tokens over the back channel.

id: b42b98cd-77e7-4d86-917b-ebee857205b2
Q: What is PKCE and who needs it?
A: A code verifier and challenge binding the exchange to the client — required for public clients like SPAs and mobile.

id: 901102c7-6cc3-4c32-8317-ec49a390385b
Q: What is the state parameter for?
A: A random value echoed back on redirect, proving the callback belongs to a flow this browser actually started.

id: 1eb5273b-dabb-4d1a-8b74-fb2910376ae8
Q: OAuth 2 vs OIDC?
A: OAuth 2 grants access to resources; OIDC layers identity on top, adding an ID token and a userinfo endpoint.

id: 12a76ade-cd0b-4af1-908a-fd58603dcd55
Q: What is an ID token, and how does it differ from an access token?
A: The ID token describes the user and is for your app; the access token is a credential for calling an API.

id: 35f585ef-25e7-4484-9e7a-58bd640531bb
Q: How do you validate a JWT properly?
A: Verify the signature against the provider's JWKS, then check issuer, audience, expiry and algorithm explicitly.

id: 01c44f57-d8f7-4f4c-9e92-c279419bd2e5
Q: Why pin the expected algorithm when verifying?
A: Otherwise a token can claim alg none or swap RS256 for HS256 and trick the verifier into accepting it.

id: 24916417-b1ed-443a-9545-0416e081db29
Q: Walk a one-time-code email login flow.
A: Generate a short code, store its hash with an expiry, email it, verify on submit, then issue a session.

id: 5926919e-39ab-4d34-bd15-e363f02b0bb1
Q: How do you keep an OTP flow from being abused?
A: Hash and single-use the code, cap attempts, rate limit per address and IP, and expire in minutes not hours.

id: 5752f871-a440-46c8-a807-a7b54d8b2dce
Q: Why do magic links need care in email clients?
A: Scanners and previews follow links, consuming a single-use token before the user ever clicks it.

id: 50428de2-23e6-4073-a07d-21f3cead9d9b
Q: What is session fixation and how do you prevent it?
A: An attacker plants a known session ID; rotate the session identifier on every privilege change or login.

id: c7d14f8a-1ce6-46b0-8c44-bd5796115cdc
Q: How should passwords be stored?
A: Hashed with a slow, salted algorithm like Argon2 or bcrypt — never encrypted, never a fast general-purpose hash.

id: 1501b192-6967-4480-a602-18bbd07924e6
Q: What does the auth boundary look like in Next.js?
A: Read the session in a Server Component or Server Action; proxy.ts is a coarse gate, not the real authorization check.

id: de76d140-eec7-406d-b31e-13dc34f28104
Q: Why is proxy or middleware alone insufficient for authz?
A: It guards navigation, not data access — every action and route handler must re-check permissions server-side.

id: edd7a79b-9d0d-4a55-baae-ab405c8c1c1b
Q: What is the confused deputy problem here?
A: A server component fetching on the user's behalf must scope the query to that user, not just to a valid session.

id: 5a0e0378-6e69-4b7b-8ed0-53bd152ec5ee
Q: How do you handle multi-tenant authorization?
A: Scope every query by tenant at the data layer, and treat the tenant as part of the identity, not a request parameter.

id: 66ec5682-a08a-4063-bcf0-d6f69839e125
Q: Interview one-liner: what is your default auth stance?
A: Short-lived tokens in HttpOnly cookies, rotation on refresh, and authorization enforced at the data boundary.
