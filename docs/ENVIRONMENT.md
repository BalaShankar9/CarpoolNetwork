# Environment Configuration Guide

> **Phase E Documentation**: Production Launch Readiness

---

## 1. Environment Separation

### Three Environments

| Environment | Purpose | Supabase Project | Netlify Context |
|-------------|---------|------------------|-----------------|
| **Production** | Real users only | `uqofmsreosfjflmgurzb` | `production` (main branch) |
| **Staging** | PR previews, QA testing | Separate project | `deploy-preview`, `branch-deploy` |
| **Local Development** | Developer machines | Personal project or local | N/A |

### Environment Detection

The app detects environment via `VITE_APP_ENV`:

```typescript
// Determined by netlify.toml context or local .env
const env = import.meta.env.VITE_APP_ENV; // 'development' | 'staging' | 'production'
```

**Visual Indicators**:
- Production: No banner (clean UI)
- Staging: Amber "STAGING" banner
- Development: Orange "DEVELOPMENT" banner

---

## 2. Environment Variables

### 2.1 Required Variables

| Variable | Type | Description | Environments |
|----------|------|-------------|--------------|
| `VITE_SUPABASE_URL` | Public | Supabase project URL | All |
| `VITE_SUPABASE_ANON_KEY` | Public | Supabase anonymous key | All |
| `VITE_GOOGLE_MAPS_API_KEY` | Public | Google Maps API key | All |
| `VITE_APP_ENV` | Public | Environment identifier | All |

### 2.2 Auth Configuration Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `VITE_BETA_MODE` | Public | `false` | Restrict signups to allowlisted emails |
| `VITE_AUTH_ALLOW_SIGNUPS` | Public | `true` | Enable new user registration |
| `VITE_AUTH_ALLOW_PASSWORD_LOGIN` | Public | `true` | Enable password-based login |
| `VITE_AUTH_ALLOW_EMAIL_OTP` | Public | `true` | Enable email magic link login |
| `VITE_AUTH_ALLOW_OTP_SIGNUPS` | Public | `true` | Allow OTP for new signups |
| `VITE_AUTH_REQUIRE_EMAIL_VERIFICATION` | Public | `true` | Require email verification |
| `VITE_AUTH_REQUIRE_PROFILE_COMPLETION` | Public | `true` | Require profile completion |
| `VITE_SKIP_EMAIL_VERIFICATION` | Public | `false` | Skip email verification (dev only) |

### 2.3 Server-Only Variables (NEVER expose to frontend)

| Variable | Location | Description |
|----------|----------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard / Edge Functions | Full database access |
| `SUPABASE_DB_PASSWORD` | Supabase Dashboard | Direct database password |
| `OPENAI_API_KEY` | Edge Functions secrets | AI features |
| `ANTHROPIC_API_KEY` | Edge Functions secrets | AI features |

⚠️ **CRITICAL**: Service role keys must NEVER be in:
- `.env` files committed to git
- Frontend code (`VITE_` prefix)
- Client-side JavaScript

### 2.4 Feature Flags (Database)

Feature flags are stored in the `feature_flags` table:

```sql
SELECT * FROM feature_flags;
```

| Flag | Description | Production Default |
|------|-------------|-------------------|
| `subscriptions` | Enable premium features | `false` (community platform) |
| `chatbot` | Enable AI chatbot | `true` |

---

## 3. Environment-Specific Configuration

### 3.1 Production (`main` branch)

```toml
# netlify.toml [context.production.environment]
VITE_APP_ENV = "production"
VITE_BETA_MODE = "false"
VITE_AUTH_REQUIRE_EMAIL_VERIFICATION = "true"
VITE_SKIP_EMAIL_VERIFICATION = "false"
```

**Requirements**:
- Real Supabase project with all migrations applied
- Email verification ENABLED
- Beta mode OFF (unless controlled launch)
- All Edge Functions deployed

### 3.2 Staging (Deploy Previews)

```toml
# netlify.toml [context.deploy-preview.environment]
VITE_APP_ENV = "staging"
```

**Requirements**:
- Separate Supabase project (NOT production)
- Can have test/demo data
- Safe for breaking experiments

### 3.3 Local Development

```env
# .env (NOT committed)
VITE_SUPABASE_URL=https://your-dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-dev-anon-key
VITE_GOOGLE_MAPS_API_KEY=your-maps-key
VITE_APP_ENV=development
VITE_SKIP_EMAIL_VERIFICATION=true
```

---

## 4. Secret Rotation Procedure

### 4.1 Supabase Anon Key Rotation

1. **Generate new key** in Supabase Dashboard > Settings > API
2. **Update Netlify** environment variables (all scopes)
3. **Redeploy** all environments
4. **Verify** app works with new key
5. **Revoke** old key after 24 hours

### 4.2 Service Role Key Rotation

1. **Generate new key** in Supabase Dashboard
2. **Update Edge Functions** secrets in Supabase Dashboard
3. **Update any external services** using the key
4. **Test** all admin operations
5. **Revoke** old key

### 4.3 Google Maps API Key Rotation

1. **Create new key** in Google Cloud Console
2. **Apply same restrictions** (HTTP referrers, APIs enabled)
3. **Update Netlify** environment variables
4. **Redeploy** all environments
5. **Delete** old key after verification

---

## 5. Security Checklist

### Pre-Launch Verification

- [ ] `.env` is in `.gitignore`
- [ ] No secrets in repository history (`git log -p | grep -i key`)
- [ ] Service role key NOT in any `VITE_` variable
- [ ] Production Supabase URL does NOT appear in staging deploys
- [ ] Staging database is separate from production
- [ ] Google Maps API key has HTTP referrer restrictions
- [ ] Supabase RLS is enabled on all tables
- [ ] Email verification is REQUIRED in production

### Ongoing Monitoring

- [ ] Review Supabase Auth logs weekly
- [ ] Check for unauthorized API calls
- [ ] Monitor Google Maps usage quotas
- [ ] Audit admin_audit_log for suspicious activity

---

## 6. Environment Variable Template

### .env.example (committed to repo)

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Google Maps API Key
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Application Environment
VITE_APP_ENV=development

# Auth Configuration
VITE_BETA_MODE=false
VITE_AUTH_ALLOW_SIGNUPS=true
VITE_AUTH_REQUIRE_EMAIL_VERIFICATION=true
VITE_SKIP_EMAIL_VERIFICATION=false
```

---

## 7. Netlify Configuration Reference

```toml
# netlify.toml

[build]
  command = "npm ci && npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"

[context.production.environment]
  VITE_APP_ENV = "production"

[context.deploy-preview.environment]
  VITE_APP_ENV = "staging"

[context.branch-deploy.environment]
  VITE_APP_ENV = "staging"
```

---

*Document Version: Phase E - January 2026*
