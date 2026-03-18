# DNS & Email Security Setup — carpoolnetwork.co.uk

> **Priority: MEDIUM** — Without these records, attackers can spoof emails from your domain.

## Problem

The security scan found:
- ❌ No **SPF** record → anyone can send email pretending to be `@carpoolnetwork.co.uk`
- ❌ No **DMARC** record → no policy telling receivers how to handle spoofed emails
- ❌ No **DKIM** record → no cryptographic signing of outbound emails

## Required DNS Records

Add these DNS records at your domain registrar / DNS provider (Netlify DNS, Cloudflare, etc.).

---

### 1. SPF Record (Sender Policy Framework)

Tells email receivers which servers are allowed to send email for your domain.

| Field   | Value |
|---------|-------|
| **Type**    | `TXT` |
| **Host**    | `@` (or `carpoolnetwork.co.uk`) |
| **Value**   | `v=spf1 include:_spf.google.com include:amazonses.com ~all` |
| **TTL**     | `3600` |

> **Adjust the `include:` entries** based on your actual email providers:
> - Supabase uses **Amazon SES** → `include:amazonses.com`
> - If you use **Google Workspace** → `include:_spf.google.com`
> - If you use **Resend** → `include:resend.com`
> - If you use **SendGrid** → `include:sendgrid.net`
> - If you only use Supabase for auth emails: `v=spf1 include:amazonses.com ~all`

---

### 2. DMARC Record (Domain-based Message Authentication)

Tells receivers what to do when SPF/DKIM checks fail.

| Field   | Value |
|---------|-------|
| **Type**    | `TXT` |
| **Host**    | `_dmarc` (i.e., `_dmarc.carpoolnetwork.co.uk`) |
| **Value**   | `v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@carpoolnetwork.co.uk; ruf=mailto:dmarc-reports@carpoolnetwork.co.uk; fo=1; pct=100` |
| **TTL**     | `3600` |

**Policy progression:**
1. Start with `p=none` (monitor only) for 2 weeks to collect reports
2. Move to `p=quarantine` (spam-folder failed messages)
3. Finally `p=reject` (block all spoofed emails)

---

### 3. DKIM Record (DomainKeys Identified Mail)

DKIM requires your email provider to generate a keypair. Follow the provider-specific steps:

#### If using Supabase (Amazon SES):
1. Go to **Supabase Dashboard → Project Settings → Auth → SMTP**
2. If using a custom SMTP, your provider will give you the DKIM record
3. Add the CNAME records they provide (usually 3 CNAME entries)

#### If using Google Workspace:
1. Go to **Google Admin → Apps → Gmail → Authenticate Email**
2. Click **Generate New Record**
3. Add the TXT record Google provides

#### If using Resend:
1. Go to **Resend Dashboard → Domains → carpoolnetwork.co.uk**
2. Copy the 3 CNAME records provided
3. Add them to your DNS

---

### 4. MTA-STS (Mail Transfer Agent Strict Transport Security) — Optional but Recommended

Ensures emails to your domain are always encrypted in transit.

| Field   | Value |
|---------|-------|
| **Type**    | `TXT` |
| **Host**    | `_mta-sts` |
| **Value**   | `v=STSv1; id=20260312` |
| **TTL**     | `3600` |

Also create a file at `https://mta-sts.carpoolnetwork.co.uk/.well-known/mta-sts.txt`:
```
version: STSv1
mode: enforce
mx: *.google.com
max_age: 604800
```

---

## Verification Commands

After adding records, verify them:

```bash
# Check SPF
dig TXT carpoolnetwork.co.uk +short

# Check DMARC
dig TXT _dmarc.carpoolnetwork.co.uk +short

# Check DKIM (replace 'google' with your selector)
dig TXT google._domainkey.carpoolnetwork.co.uk +short

# Online tool
# https://mxtoolbox.com/SuperTool.aspx?action=spf:carpoolnetwork.co.uk
```

---

## Timeline

| Step | Action | When |
|------|--------|------|
| 1 | Add SPF record | **Immediately** |
| 2 | Add DMARC with `p=none` | **Immediately** |
| 3 | Configure DKIM with email provider | **Within 1 week** |
| 4 | Monitor DMARC reports for 2 weeks | Weeks 1–2 |
| 5 | Upgrade DMARC to `p=quarantine` | Week 3 |
| 6 | Upgrade DMARC to `p=reject` | Week 5+ |
