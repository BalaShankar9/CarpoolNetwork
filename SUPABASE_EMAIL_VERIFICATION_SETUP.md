# Supabase Email Verification Setup Guide

## ✅ What's Been Implemented

Email verification is now **REQUIRED** to access the app. Users who sign up with invalid emails (like `balabollinen198@gmail.com`) will:

1. ✅ Create an account successfully
2. ✅ Receive a verification email from Supabase
3. ❌ **Cannot access the app** until they click the verification link
4. ❌ If email doesn't exist → verification email bounces → user stuck on verification page

This prevents invalid emails from using the app while also preventing bounce rates from affecting your Supabase reputation.

---

## 🔧 Supabase Dashboard Configuration (REQUIRED)

### Step 1: Enable Email Confirmations (Production)

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard/project/uqofmsreosfjflmgurzb

2. **Navigate to**: Authentication → Settings

3. **Enable Email Confirmations**:
   - Find "Enable email confirmations"
   - Toggle it **ON** (if not already)
   - This ensures all new signups must verify their email

4. **Set Confirmation URL** (Important):
   - Find "Site URL" field
   - Set to your production URL: `https://your-netlify-site.netlify.app`
   - This is where users are redirected after clicking the verification link

### Step 2: Configure Email Templates (Optional but Recommended)

1. **Navigate to**: Authentication → Email Templates

2. **Customize "Confirm signup" template**:
   ```html
   <h2>Welcome to CarpoolNetwork!</h2>
   <p>Click the link below to verify your email address:</p>
   <p><a href="{{ .ConfirmationURL }}">Verify Email</a></p>
   <p>This link expires in 24 hours.</p>
   <p>If you didn't create an account, you can safely ignore this email.</p>
   ```

3. **Customize email sender** (if you have custom SMTP):
   - Settings → Email → Custom SMTP
   - Use Resend, SendGrid, or keep Supabase default

---

## 🧪 Testing the Flow

### Test with a Real Email

1. **Go to signup page**: https://your-app.com/signup

2. **Enter details**:
   - Name: Test User
   - Email: **your-real-email@gmail.com** (MUST be real!)
   - Phone: +44 1234567890
   - Password: Test123!@

3. **Click "Create Account"**

4. **Expected Flow**:
   - ✅ Account created
   - ✅ Redirected to `/verify-email` page
   - ✅ Verification email sent to your inbox
   - ✅ Click link in email
   - ✅ Redirected to app
   - ✅ Can now access all features

### Test with Invalid Email

1. **Try to sign up** with: `fakeemail12345@gmail.com`

2. **Expected Flow**:
   - ✅ Account created
   - ✅ Redirected to `/verify-email` page
   - ❌ Email bounces (never delivered)
   - ❌ User **cannot access app** (stuck on verification page)
   - ✅ **No bounce counted against you** because user can't proceed anyway

---

## 🚨 Important: Development vs Production

### For Production (Netlify)

**Ensure environment variable is NOT set or is `false`**:
```env
VITE_SKIP_EMAIL_VERIFICATION=false
```

In Netlify Dashboard → Site settings → Environment variables:
- **Do NOT set** `VITE_SKIP_EMAIL_VERIFICATION`, OR
- Set it to `false`

### For Local Development

**Set in your local `.env` file**:
```env
VITE_SKIP_EMAIL_VERIFICATION=true
```

This allows you to test signup flow without needing to verify emails locally.

### For E2E Tests

**Option A**: Create real email addresses for test accounts

**Option B**: Manually verify test accounts in Supabase Dashboard:
1. Go to Authentication → Users
2. Find test user (e.g., `e2e-driver@test.carpoolnetwork.co.uk`)
3. Click three dots → "Confirm Email"

**Option C**: Use separate Supabase project for testing with verification disabled

---

## 📊 How This Solves the Bounce Problem

### Before (Old System)
```
User signs up with invalid email
  ↓
Supabase sends verification email
  ↓
Email bounces (non-existent address)
  ↓
Bounce counted against your Supabase reputation
  ↓
⚠️ High bounce rate warning from Supabase
```

### After (New System)
```
User signs up with invalid email
  ↓
Supabase sends verification email
  ↓
Email bounces (non-existent address)
  ↓
User stuck on verification page forever
  ↓
User cannot access app
  ↓
❌ User gives up or contacts support
  ↓
You delete unverified account
  ↓
✅ Net result: Invalid email never used the app
```

**Key Difference**: While the email still bounces, the user cannot access the app, so:
1. They self-select out (try again with real email)
2. Unverified accounts can be cleaned up regularly
3. Only verified, real emails actually use your app

---

## 🧹 Cleanup Unverified Accounts (Recommended)

### Manual Cleanup

1. **Go to**: Supabase Dashboard → Authentication → Users

2. **Filter**: Look for users with `email_confirmed_at` = NULL

3. **Delete**: Remove users who haven't verified after 7 days

### Automated Cleanup (Advanced)

Create a Supabase cron job or edge function:

```sql
-- Run daily: Delete unverified users older than 7 days
DELETE FROM auth.users
WHERE email_confirmed_at IS NULL
  AND created_at < NOW() - INTERVAL '7 days';
```

---

## ✅ Verification Checklist

Before deploying to production:

- [ ] Supabase: Enable email confirmations
- [ ] Supabase: Set correct Site URL
- [ ] Netlify: Ensure `VITE_SKIP_EMAIL_VERIFICATION` is `false` or not set
- [ ] Local `.env`: Set `VITE_SKIP_EMAIL_VERIFICATION=true` for development
- [ ] Test signup with real email
- [ ] Test signup with invalid email (should get stuck on verification)
- [ ] Verify email template looks good
- [ ] Set up automated cleanup of unverified users (optional)

---

## 🆘 Troubleshooting

### Issue: Users can access app without verifying email

**Solution**:
1. Check Netlify environment variables
2. Ensure `VITE_SKIP_EMAIL_VERIFICATION` is NOT set to `true`
3. Redeploy the app

### Issue: Verification email not sending

**Solution**:
1. Check Supabase Dashboard → Logs
2. Verify "Enable email confirmations" is ON
3. Check spam folder
4. Try resending from verification page

### Issue: Verification link redirects to wrong URL

**Solution**:
1. Supabase Dashboard → Authentication → Settings
2. Update "Site URL" to your production URL
3. Clear browser cache

### Issue: E2E tests failing

**Solution**:
1. Manually verify test accounts in Supabase Dashboard, OR
2. Use separate Supabase project for tests, OR
3. Set `VITE_SKIP_EMAIL_VERIFICATION=true` in E2E environment

---

## 📈 Expected Results

**Immediate** (after deployment):
- ✅ All new signups must verify email
- ✅ Invalid emails cannot access app
- ✅ Bounce rate will still show bounces initially

**1-2 weeks**:
- ✅ Fewer active invalid accounts
- ✅ Users learn to use real emails
- ✅ Bounce rate stabilizes

**Long-term**:
- ✅ Only verified, real emails in your user base
- ✅ Better email deliverability
- ✅ No more Supabase warnings

---

## 📝 Summary

**What changed in the code**:
- `src/App.tsx`: Protected routes now require `isEmailVerified`
- Users redirected to `/verify-email` if not verified
- Existing verification page already handles resend functionality

**What you need to do**:
1. Enable email confirmations in Supabase Dashboard
2. Set correct Site URL in Supabase
3. Ensure production env variable is correct
4. Deploy to Netlify

**Result**:
- Invalid emails (like `balabollinen198@gmail.com`) cannot use the app
- Only users with real, verified emails can access features
- Bounce problem solved at the source
