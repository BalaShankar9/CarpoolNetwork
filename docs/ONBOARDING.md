# User Onboarding Guide

> **Phase E Documentation**: Safety Rails & Clear Messaging

---

## 1. Overview

This document describes the onboarding gates, error handling, and user guidance that prevent confusion and misuse during first impressions.

### Core Principles

1. **No dead-end screens** - Users always know what to do next
2. **Clear error messaging** - No generic "Something went wrong" 
3. **Friendly but strict blockers** - Features are blocked with explanation, not silently disabled
4. **Progressive disclosure** - Don't overwhelm, guide step by step

---

## 2. Onboarding Gates

### 2.1 Gate: Email Verification

**Required For**:
- Posting rides
- Requesting rides
- Booking rides
- Sending messages

**Implementation**:

```typescript
// src/pages/PostRide.tsx
const { isEmailVerified } = useAuth();

if (!isEmailVerified) {
  setError('Please verify your email address before posting rides.');
  return;
}
```

**User Experience**:
- `EmailVerificationBanner` shown at top of protected pages
- Clear call-to-action: "Verify Email" button
- Resend verification option available

**Error Message**:
> "Please verify your email address before posting rides. Check your inbox for the verification link, or click 'Resend' to get a new one."

---

### 2.2 Gate: Profile Completion

**Required Fields**:
- Full name (minimum 2 characters)
- Profile photo (avatar_url OR profile_photo_url)
- Phone number (phone_e164)
- Phone verified
- Country

**Implementation**:

```typescript
// src/utils/profileCompleteness.ts
export function getProfileMissingFields(profile): string[] {
  const missing: string[] = [];
  if (name.length < 2) missing.push('full_name');
  if (!hasAvatar) missing.push('avatar');
  if (!hasPhone) missing.push('phone');
  if (!profile.phone_verified) missing.push('phone_verified');
  if (!hasCountry) missing.push('country');
  return missing;
}
```

**User Experience**:
- Service gating modal shows what's missing
- Direct link to complete specific section
- Progress indicator on profile page

**Error Message**:
> "To use this feature, please complete your profile by adding a profile picture. This helps maintain trust and safety in our community."

---

### 2.3 Gate: Vehicle Required (Drivers Only)

**Required For**:
- Posting rides as a driver

**Implementation**:

```typescript
// src/pages/PostRide.tsx
const { data, error } = await getUserVehicles(user.id, { activeOnly: true });
if (!data.length) {
  setError('Please add a vehicle to your profile first');
  return;
}
```

**User Experience**:
- Clear prompt to add vehicle
- Link to vehicle management page
- Shows after profile completion gate

**Error Message**:
> "Please add a vehicle to your profile first. You need at least one active vehicle to offer rides."

---

## 3. Gate Sequence

Users must pass gates in this order:

```
┌─────────────────┐
│ 1. Sign Up      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. Verify Email │ ← Banner shown, can browse but not act
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. Complete     │ ← Modal blocks actions, guides to fix
│    Profile      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. Add Vehicle  │ ← Only for drivers wanting to post rides
│   (if driver)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ✓ Full Access   │
└─────────────────┘
```

---

## 4. Error Message Standards

### 4.1 Good Error Messages

| Situation | Message |
|-----------|---------|
| Email not verified | "Please verify your email address before posting rides." |
| Profile incomplete | "Complete your profile to unlock this feature. Add a profile photo to build trust." |
| No vehicle | "Add a vehicle to your profile to offer rides." |
| Invalid date | "Please select a valid date and time for your ride." |
| Location missing | "Please provide both origin and destination." |
| Booking full | "Sorry, this ride is now fully booked. Try another ride." |

### 4.2 Bad Error Messages (Avoid)

| ❌ Don't | ✅ Do Instead |
|----------|---------------|
| "Error" | "Unable to load your vehicles. Please try again." |
| "Invalid input" | "Phone number must be in international format (+44...)" |
| "Failed" | "We couldn't save your changes. Check your connection and try again." |
| "Unauthorized" | "Please sign in to continue." |
| "500" | "Something went wrong on our end. Please try again in a few minutes." |

---

## 5. Component: Service Gating Modal

**Location**: `src/hooks/useServiceGating.tsx`

**Purpose**: Friendly blocker for actions requiring profile completion

**Usage**:

```typescript
const { checkAccess, ServiceGatingModal } = useServiceGating();

const handlePostRide = () => {
  if (!checkAccess('post-ride')) {
    return; // Modal shown automatically
  }
  // Proceed with posting
};

return (
  <>
    <button onClick={handlePostRide}>Post Ride</button>
    <ServiceGatingModal />
  </>
);
```

**Supported Actions**:
- `post-ride`
- `request-ride`
- `book-ride`
- `send-offer`
- `message`

---

## 6. Component: Email Verification Banner

**Location**: `src/components/shared/EmailVerificationBanner.tsx`

**Behavior**:
- Shows at top of protected pages when email not verified
- Clear explanation and CTA
- Resend option with cooldown
- Dismissible but reappears on protected actions

---

## 7. Onboarding Flow Pages

### 7.1 Profile Onboarding (`/onboarding/profile`)

**Steps**:
1. Welcome & name
2. Profile photo upload
3. Phone number entry
4. Phone verification (OTP)
5. Country selection
6. Completion confirmation

**Features**:
- Progress indicator
- Skip not allowed for required fields
- Back navigation preserved
- Auto-redirect to intended destination after completion

### 7.2 Vehicle Addition (`/vehicles`)

**Flow**:
1. Vehicle lookup (registration number)
2. Confirm/edit details
3. Photo upload (optional)
4. Save

**Error Handling**:
- Invalid registration: "We couldn't find that vehicle. Please check the number and try again."
- Duplicate vehicle: "This vehicle is already registered to your account."

---

## 8. Dead-End Prevention

### 8.1 Always Provide Next Steps

Every blocker screen must include:
- **What's wrong**: Clear explanation
- **How to fix**: Specific action
- **Where to go**: Button/link to resolution

### 8.2 Never Show Empty States Without Guidance

```tsx
// ❌ Bad
{rides.length === 0 && <p>No rides found</p>}

// ✅ Good
{rides.length === 0 && (
  <EmptyState
    title="No rides yet"
    description="Be the first to offer a ride in your area!"
    action={<Button href="/post-ride">Post a Ride</Button>}
  />
)}
```

### 8.3 Loading States

Always show loading indicator for:
- Initial page load
- Form submissions
- Data fetches

```tsx
if (loading) {
  return <LoadingSpinner message="Loading your rides..." />;
}
```

---

## 9. Contextual Guidance Messages

### 9.1 First-Time User Hints

| Page | Hint |
|------|------|
| Dashboard | "Welcome! Complete your profile to get started." |
| Find Rides | "Looking for a ride? Enter your route to see available options." |
| Post Ride | "Share your commute and help fellow commuters!" |
| Messages | "Messages with ride partners appear here." |

### 9.2 Feature Discovery

Use tooltips and info icons for less obvious features:
- Recurring rides
- Pickup radius
- Trust badges

---

## 10. Verification Checklist

Before launch, verify each scenario:

- [ ] New user sign-up → Verification email sent
- [ ] Unverified user tries to post → Clear blocker shown
- [ ] Incomplete profile tries to book → Modal with missing fields
- [ ] Driver without vehicle tries to post → Vehicle prompt shown
- [ ] All error messages are specific and actionable
- [ ] No page shows only "Loading..." indefinitely
- [ ] No page shows only "Error" without explanation
- [ ] Back button works on all onboarding steps
- [ ] Refresh doesn't lose progress

---

*Document Version: Phase E - January 2026*
