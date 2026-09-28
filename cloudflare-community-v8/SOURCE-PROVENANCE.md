# Source provenance

The community starting point was recovered from the account's existing `carpool-network-preview` Worker version `4b27067b-ea07-4af1-b6f0-5b4a8b417521` (v7 preview). Application code was separated from its bundled passkey implementation. The original vendor license notices remain in `src/vendor/passkeys.js`; no cryptographic verification algorithm was rewritten.

The standalone reporting implementation and selected error-handling improvements came from the restored v5.9 source in this repository. The original logo, install icons and community picture are preserved from that source.

This is a recovered baseline with targeted improvements, not a claim that all inherited code has been redesigned or independently audited. Replacing the retained bundle with a pinned, maintained package and validating real-device passkey registration/sign-in remains follow-up work before relying on that optional sign-in method broadly.

Do not commit recovered Cloudflare version metadata, asset JWTs, OAuth credentials, `.dev.vars`, signing secrets, session data, OTP simulator files or database exports. They are not needed to build this source package.
