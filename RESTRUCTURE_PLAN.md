# RESTRUCTURE PLAN

**Date:** 2026-03-09
**Goal:** Turn the repo from a documentation graveyard into something a serious team can operate.

---

## Current Anti-Patterns

### 1. Root Directory = Document Dump
38 markdown files, 5 PNGs, 1 TXT file in root. The root is a junk drawer, not a project entrance.

### 2. Duplicated Architecture Docs
`flow-map.md`, `invariants.md`, `state-model.md` exist in BOTH root AND `docs/`. Guaranteed drift.

### 3. Phase Reports as Changelog
13 "PHASE_X_COMPLETION_REPORT" files used as progress tracking. Should be a single CHANGELOG or git tags.

### 4. Fix Reports as Documentation
8 "FIX" files (EMAIL_BOUNCE_FIX, IMAGE_DISPLAY_FIX, etc.) document one-time patches. These belong in git commit history, not as permanent files.

### 5. No docs/ Organisation
`docs/` has 44 files in a flat structure. No subdirectories for product, ops, architecture, or archive.

### 6. Screenshots in Root
5 PNG files (admin-dashboard-phase1.png, social-hub-*.png, messaging-*.png) sitting in the project root.

### 7. No CHANGELOG, CONTRIBUTING, or LICENSE
Standard open-source/team files are missing.

---

## Proposed Target Structure

### Root Directory (Clean)

```
/
├── README.md                    # Project overview, setup, quick start
├── STATUS.md                    # Current state of the product
├── ROADMAP.md                   # What's next
├── CONTRIBUTING.md              # How to contribute (future)
├── LICENSE                      # License (if applicable)
│
├── package.json                 # Dependencies
├── package-lock.json            # Lock file
├── tsconfig.json                # TypeScript config
├── tsconfig.app.json            # App TS config
├── tsconfig.node.json           # Node TS config
├── vite.config.ts               # Vite config
├── vitest.config.ts             # Vitest config
├── eslint.config.js             # ESLint config
├── tailwind.config.js           # Tailwind config
├── postcss.config.js            # PostCSS config
├── playwright.config.ts         # Playwright config
├── capacitor.config.ts          # Capacitor config
├── netlify.toml                 # Netlify deployment
├── index.html                   # SPA entry point
│
├── .env.example                 # Environment template
├── .gitignore                   # Git ignore
│
├── src/                         # Application source
├── public/                      # Static assets
├── supabase/                    # Database migrations & functions
├── netlify/                     # Serverless functions
├── scripts/                     # Utility scripts
├── tests/                       # Unit tests
├── e2e/                         # E2E tests
├── android/                     # Capacitor Android
├── ios/                         # Capacitor iOS
├── docs/                        # All documentation
└── tools/                       # Development tools
```

### Docs Directory (Organised)

```
docs/
├── product/
│   ├── PRODUCT_SCOPE_V1.md
│   ├── PRIVATE_BETA_LAUNCH_PLAN.md
│   └── GAP_ANALYSIS_PRIVATE_BETA.md
│
├── engineering/
│   ├── ENGINEERING_PRIORITIES.md
│   ├── API_DOCUMENTATION.md
│   ├── SYSTEM_DESIGN_NARRATIVE.md
│   ├── invariants.md
│   ├── flow-map.md
│   ├── state-model.md
│   └── DB_APPLY_ALL.sql
│
├── ops/
│   ├── DEPLOYMENT_RUNBOOK.md
│   ├── INCIDENT_RESPONSE.md
│   ├── ENVIRONMENT.md
│   ├── NETLIFY_SETUP.md
│   ├── LAUNCH_CHECKLIST.md
│   ├── RELEASE_CHECKLIST.md
│   ├── ONBOARDING.md
│   ├── OPERATIONS.md
│   ├── SAFETY.md
│   └── TESTING_MANUAL_STEPS.md → testing.md
│
├── setup/
│   ├── EMAIL_VERIFICATION_SETUP.md
│   ├── GOOGLE_MAPS_INTEGRATION.md
│   ├── MAPS_CAPACITOR.md
│   └── SEEDING.md
│
├── plans/
│   ├── (existing plan docs)
│   └── ...
│
├── audit/
│   ├── AUDIT_REPORT_RECOVERY.md
│   ├── SECURITY_AUDIT_REPORT.md
│   └── spec-audit-report.md
│
├── archive/                     # ← Everything that's done/stale goes here
│   ├── phase-reports/
│   │   ├── PHASE_0_COMPLETION_REPORT.md
│   │   ├── PHASE_1_STATUS.md
│   │   ├── PHASE_1_COMPLETION_REPORT.md
│   │   ├── PHASE_2_COMPLETION_REPORT.md (×2)
│   │   ├── PHASE_3_COMPLETION_REPORT.md
│   │   ├── PHASE_4_COMPLETION_REPORT.md
│   │   ├── PHASE_5_COMPLETION_REPORT.md
│   │   ├── PHASE_7_COMPLETION_REPORT.md
│   │   ├── PHASE_7_8_COMPLETION_REPORT.md
│   │   ├── PHASE_7_QUICK_DEPLOY.md
│   │   ├── PHASE_8_COMPLETION_REPORT.md
│   │   ├── PHASE_C_COMPLETION_REPORT.md
│   │   ├── PHASE_E_COMPLETION_REPORT.md
│   │   └── PHASE_FPP_G_COMPLETION_REPORT.md
│   │
│   ├── fix-reports/
│   │   ├── EMAIL_BOUNCE_FIX_INSTRUCTIONS.md
│   │   ├── IMAGE_DISPLAY_FIX.md
│   │   ├── MESSAGING_FIX_SUMMARY.md
│   │   ├── PRODUCTION_DB_FIX.md
│   │   ├── PRODUCTION_FIXES_SUMMARY.md
│   │   └── QUICK_FIX_GUIDE.md
│   │
│   ├── implementation-notes/
│   │   ├── CARPOOL_CORE_IMPLEMENTATION.md
│   │   ├── CARPOOL_NETWORK_PROJECT_SUMMARY.txt
│   │   ├── IMPLEMENTATION_COMPLETE_SUMMARY.md
│   │   ├── MESSAGING_RELIABILITY_IMPLEMENTATION.md
│   │   ├── NEW_FEATURES_QUICK_REFERENCE.md
│   │   └── PUBLISHED_CHANGES.md
│   │
│   ├── old-audits/
│   │   ├── CODE_CHECK_REPORT.md
│   │   ├── FLOW_AUDIT_REPORT.md
│   │   ├── FULL_AUDIT_REPORT.md
│   │   ├── PROD_LOAD_AUDIT_REPORT.md
│   │   └── REMAINING_GAPS_AND_FIXES.md
│   │
│   ├── old-checklists/
│   │   ├── DEPLOY_NOW.md
│   │   ├── DEPLOYMENT_GUIDE.md
│   │   ├── MIGRATION_INSTRUCTIONS.md
│   │   ├── PRODUCTION_READINESS_CHECKLIST.md
│   │   └── SUPABASE_EMAIL_VERIFICATION_SETUP.md
│   │
│   └── feature-specs/
│       ├── FACE_VERIFICATION.md
│       └── SMART_INTELLIGENCE.md
│
└── images/
    ├── admin-dashboard-phase1.png
    ├── social-hub-final.png
    ├── social-hub-full.png
    ├── messages-redesign.png
    └── messaging-redesign.png
```

---

## Migration Steps

### Phase A: Zero-Risk Moves (Do First)

These moves cannot break anything — they only touch documentation and images.

1. **Create directory structure:**
   ```
   mkdir -p docs/{product,engineering,ops,setup,audit,archive/{phase-reports,fix-reports,implementation-notes,old-audits,old-checklists,feature-specs},images}
   ```

2. **Move root PNGs to docs/images/:**
   ```
   mv admin-dashboard-phase1.png docs/images/
   mv social-hub-final.png docs/images/
   mv social-hub-full.png docs/images/
   mv messages-redesign.png docs/images/
   mv messaging-redesign.png docs/images/
   ```

3. **Move phase reports to archive:**
   ```
   mv PHASE_1_STATUS.md docs/archive/phase-reports/
   mv PHASE_2_COMPLETION_REPORT.md docs/archive/phase-reports/
   mv PHASE_7_COMPLETION_REPORT.md docs/archive/phase-reports/
   mv PHASE_7_8_COMPLETION_REPORT.md docs/archive/phase-reports/
   mv PHASE_7_QUICK_DEPLOY.md docs/archive/phase-reports/
   mv PHASE_8_COMPLETION_REPORT.md docs/archive/phase-reports/
   mv PHASE_C_COMPLETION_REPORT.md docs/archive/phase-reports/
   mv PHASE_E_COMPLETION_REPORT.md docs/archive/phase-reports/
   mv PHASE_FPP_G_COMPLETION_REPORT.md docs/archive/phase-reports/
   ```

4. **Move fix reports to archive:**
   ```
   mv EMAIL_BOUNCE_FIX_INSTRUCTIONS.md docs/archive/fix-reports/
   mv IMAGE_DISPLAY_FIX.md docs/archive/fix-reports/
   mv MESSAGING_FIX_SUMMARY.md docs/archive/fix-reports/
   mv PRODUCTION_DB_FIX.md docs/archive/fix-reports/
   mv PRODUCTION_FIXES_SUMMARY.md docs/archive/fix-reports/
   mv QUICK_FIX_GUIDE.md docs/archive/fix-reports/
   ```

5. **Move implementation notes to archive:**
   ```
   mv CARPOOL_CORE_IMPLEMENTATION.md docs/archive/implementation-notes/
   mv CARPOOL_NETWORK_PROJECT_SUMMARY.txt docs/archive/implementation-notes/
   mv IMPLEMENTATION_COMPLETE_SUMMARY.md docs/archive/implementation-notes/
   mv MESSAGING_RELIABILITY_IMPLEMENTATION.md docs/archive/implementation-notes/
   mv NEW_FEATURES_QUICK_REFERENCE.md docs/archive/implementation-notes/
   mv PUBLISHED_CHANGES.md docs/archive/implementation-notes/
   ```

6. **Move old audits to archive:**
   ```
   mv CODE_CHECK_REPORT.md docs/archive/old-audits/
   mv FLOW_AUDIT_REPORT.md docs/archive/old-audits/
   mv FULL_AUDIT_REPORT.md docs/archive/old-audits/
   mv PROD_LOAD_AUDIT_REPORT.md docs/archive/old-audits/
   mv REMAINING_GAPS_AND_FIXES.md docs/archive/old-audits/
   ```

7. **Move old checklists to archive:**
   ```
   mv DEPLOY_NOW.md docs/archive/old-checklists/
   mv DEPLOYMENT_GUIDE.md docs/archive/old-checklists/
   mv MIGRATION_INSTRUCTIONS.md docs/archive/old-checklists/
   mv PRODUCTION_READINESS_CHECKLIST.md docs/archive/old-checklists/
   mv SUPABASE_EMAIL_VERIFICATION_SETUP.md docs/archive/old-checklists/
   ```

8. **Move feature specs to archive:**
   ```
   mv FACE_VERIFICATION.md docs/archive/feature-specs/
   mv GOOGLE_MAPS_INTEGRATION.md docs/archive/feature-specs/
   ```

9. **Delete root duplicates** (keep the `docs/` versions):
   ```
   rm flow-map.md         # duplicate of docs/flow-map.md
   rm invariants.md       # duplicate of docs/invariants.md
   rm state-model.md      # duplicate of docs/state-model.md
   ```

10. **Move remaining useful docs to organised locations:**
    ```
    mv API_DOCUMENTATION.md docs/engineering/
    mv TESTING_MANUAL_STEPS.md docs/ops/
    ```

### Phase B: Low-Risk Code Moves

1. **Remove root .env.e2e** — should be in .gitignore, not committed
2. **Clean up public/ directory** — remove GUID-named PNG files ({000EFEF1-...}.png etc.) — these look like accidentally committed screenshots

### Phase C: Moderate-Risk Code Changes (After Validation)

1. **Feature-flag non-MVP routes in App.tsx** — Don't delete, just wrap in a `FEATURE_FLAGS.enableSocial` check
2. **Hide non-MVP nav items in Layout.tsx** — Remove social/gamification/premium from navigation
3. **Regenerate database.types.ts** — Run `supabase gen types typescript` to sync types with actual DB

### Phase D: Higher-Risk Changes (With Testing)

1. **Refactor Community.tsx** (1,413 lines) — Extract into smaller components
2. **Wire reviewService.ts** into ride completion flow — Currently orphaned
3. **Add community creation/invitation flow** — New feature needed for v1

---

## What Should NOT Be Moved or Deleted

| File | Reason |
|------|--------|
| `README.md` | Will be rewritten in place |
| `netlify.toml` | Active deployment config |
| `capacitor.config.ts` | Active mobile config |
| All config files (tsconfig, vite, eslint, etc.) | Active build config |
| `package.json` / `package-lock.json` | Dependencies |
| `.env.example` | Environment template |
| `index.html` | SPA entry |

---

## Risk Assessment

| Move | Risk | Mitigation |
|------|------|------------|
| Moving markdown files | Zero | No code references these files |
| Moving PNGs | Zero | Only referenced in markdown, update links |
| Deleting root duplicates | Zero | `docs/` copies are canonical |
| Feature-flagging routes | Low | Routes still exist, just hidden |
| Hiding nav items | Low | Pages accessible via direct URL |
| Regenerating DB types | Medium | Could reveal type mismatches — test thoroughly |
| Refactoring Community.tsx | Medium | Large file, many inline queries |
| Adding community flow | High | New feature, needs DB migration |

---

## Post-Restructure Root Directory

After Phase A, the root should contain exactly:

```
README.md
STATUS.md
ROADMAP.md
PRODUCT_SCOPE_V1.md
AUDIT_REPORT_RECOVERY.md
ENGINEERING_PRIORITIES.md
GAP_ANALYSIS_PRIVATE_BETA.md
PRIVATE_BETA_LAUNCH_PLAN.md
RESTRUCTURE_PLAN.md
```

Plus config files and project directories. That's a root that communicates purpose, not chaos.
