# Activate phone verification on the preview

Implementation uses Twilio Verify's SMS channel. The preview deliberately has no SMS credentials and zero send allowances. It does not send codes or mark real accounts phone-verified. Browsing, sign-in, Support, cancellation and logout remain available; new participation requires verification.

## Provider setup

1. The owner supplies the chosen provider/account and an approved monthly budget. This implementation targets Twilio Verify; another provider needs a reviewed adapter. No paid account or billing commitment has been created.
2. In the owner's Twilio account, create a Verify Service with six-digit codes, a clear Carpool Network name, fraud protection and appropriate destination-country permissions. Complete required provider onboarding. Start with a consenting test number; Twilio trial accounts have recipient restrictions.
3. Use a dedicated Twilio API key. Add `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET`, and `TWILIO_VERIFY_SERVICE_SID` as **Worker secrets** on `carpool-community-design`. Never put credentials into JavaScript, Git, screenshots, issue reports or chat. Use `wrangler secret put NAME --config wrangler.jsonc` or the Cloudflare secret editor. The DVLA secret is separate and is already installed.
4. Set `SMS_DAILY_LIMIT` and `SMS_MONTHLY_LIMIT` in the preview configuration to positive whole-number send-attempt allowances, each no larger than 10,000, consistent with the approved budget. Current values remain zero. These are conservative application send caps, not a guarantee of the provider's final currency bill. Also configure provider billing alerts and fraud/country limits.
5. Deploy only the preview. With two consenting phones, verify successful delivery, wrong/expired codes, resend cooldown, changing a number, duplicate-number rejection and account export/deletion. Keep the earlier number private and unchanged until a replacement is successfully verified. Confirm blocked/unconnected members cannot see either contact.
6. The owner must separately qualify production credentials, limits and delivery before the public launch. Do not copy synthetic test verification rows into real accounts.

## Implemented controls

- Verified email and authenticated session before sending; six-digit SMS code, ten-minute challenge, 60-second resend cooldown, five checks per challenge.
- Rate limits per account, destination number and requesting network; atomic global day/month send caps. Failed provider attempts count conservatively against the caps.
- Twilio result must match the configured service, challenge SID, destination and SMS channel. Only approved and valid responses establish verification.
- One account per verified phone number; account-bound challenges, replay prevention and safe number replacement. Verification expires after 180 days; this proves number access, not identity or WhatsApp-account ownership.
- Production Worker has no test-code bypass. Unit tests inject a synthetic provider outside the Worker. Hosted tests seed and retire separately named synthetic accounts; those tests are not evidence of real SMS delivery.

References: [Verify API](https://www.twilio.com/docs/verify/api/verification), [Verification Check](https://www.twilio.com/docs/verify/api/verification-check), [current pricing](https://www.twilio.com/en-us/verify/pricing).
