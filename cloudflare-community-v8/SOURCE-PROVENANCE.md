# Source provenance

The application baseline was recovered from the account's existing `carpool-network-preview` Worker version `4b27067b-ea07-4af1-b6f0-5b4a8b417521` (v7 preview). The standalone reporting implementation and selected error handling came from restored v5.9 source in this repository. Original logo, install icons and community artwork are preserved.

The recovered passkey vendor bundle has been removed. Server verification now imports pinned `@simplewebauthn/server@14.0.3`; `scripts/build-browser.mjs` builds the browser asset from pinned `@simplewebauthn/browser@14.0.0`. `package-lock.json` fixes the dependency graph. No cryptographic protocol implementation was rewritten. Signed synthetic WebAuthn fixtures exercise the verification path, but real-device passkeys remain a pilot requirement.

`public/uk-places.json` was generated on 28 September 2026 from GeoNames GB.zip and admin2Codes.txt using `scripts/update-places.py`. It contains 5,868 populated places, filtered by feature class/population and disambiguated by district. It is not a street-address or live map service. Data attribution and the SimpleWebAuthn license are in `THIRD-PARTY-NOTICES.md` and the public attribution page.

`test/fixtures/photo-placeholder.jpg` is a generated blank gray JPEG used only to exercise storage and image review. It is not a real person or evidence of successful face verification.

This is a recovered baseline with targeted improvements, not a claim that all inherited code has been redesigned or independently audited. Do not commit recovered Cloudflare metadata, asset JWTs, OAuth credentials, `.dev.vars`, signing secrets, session data, OTP files, private audit logs or database exports.
