# Profile Page - Quick Reference Guide

## New Sections Overview

### 1. Help & Legal Section
**Location**: Between "Business information" and "Account actions" cards

#### Legal Documents (External Links)
- 🛡️ **Privacy Policy** → `https://coacheasy.com/privacy`
- 🛡️ **Terms and Conditions** → `https://coacheasy.com/terms`
  - Opens in new tab (`target="_blank"`)
  - External link icon indicator on right
  - Shield icon on left

#### Support Actions (Email Links)
- 🐛 **Report a Bug** → `mailto:support@coacheasy.com?subject=Bug Report`
- 💬 **Share Feedback** → `mailto:support@coacheasy.com?subject=Feedback`
- ✉️ **Contact Us** → `mailto:support@coacheasy.com`
  - Opens default email client
  - Pre-filled subject lines for routing
  - Left-aligned with contextual icons

### 2. Version Display
**Location**: In "Account actions" card, before logout button

- ℹ️ **Version 0.0.0 (Beta)**
  - Info icon + dimmed text
  - Helps users identify platform version when reporting issues
  - Currently hardcoded, can be dynamically imported from package.json

---

## Visual Layout

```
┌─────────────────────────────────┐
│  HELP & LEGAL                   │
├─────────────────────────────────┤
│  🛡️  Privacy policy          →  │  (External)
│  🛡️  Terms and conditions    →  │  (External)
│  ─────────────────────────────  │
│  🐛  Report a bug               │  (Email)
│  💬  Share feedback             │  (Email)
│  ✉️  Contact us                 │  (Email)
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  ACCOUNT ACTIONS                │
├─────────────────────────────────┤
│  ℹ️  Version 0.0.0 (Beta)       │
│  ─────────────────────────────  │
│  🚪  Log out                    │  (Red button)
└─────────────────────────────────┘
```

---

## Configuration Checklist

### Before Production Deploy

- [ ] Update privacy policy URL: `https://coacheasy.com/privacy`
- [ ] Update terms URL: `https://coacheasy.com/terms`
- [ ] Verify support email is monitored: `support@coacheasy.com`
- [ ] Set up email routing for subjects: "Bug Report", "Feedback"
- [ ] Consider importing version from package.json dynamically
- [ ] Test all links on mobile and desktop
- [ ] Verify email client opens correctly on iOS and Android

---

## Technical Details

### Icons Used
- `IconShield` - Legal documents
- `IconExternalLink` - External link indicator (16px)
- `IconBug` - Bug reporting
- `IconMessageCircle` - Feedback
- `IconMail` - Contact
- `IconInfoCircle` - Version info

### Button Patterns
```typescript
// External links
<Button
  component="a"
  href="https://..."
  target="_blank"
  variant="subtle"
  color="gray"
  justify="space-between"
  leftSection={icon}
  rightSection={<IconExternalLink />}
/>

// Email links
<Button
  component="a"
  href="mailto:..."
  variant="subtle"
  color="gray"
  justify="flex-start"
  leftSection={icon}
/>
```

---

## Accessibility Features

✅ Keyboard navigable (Tab + Enter)
✅ Screen reader friendly labels
✅ Semantic HTML (`<a>` tags)
✅ Adequate touch targets (44×44pt)
✅ Clear visual indicators (icons + text)
✅ External link affordance (→ icon)

---

## User Flows

### Accessing Legal Documents
1. User scrolls to "Help & Legal" section
2. Taps "Privacy policy" or "Terms and conditions"
3. New browser tab opens with document
4. User reviews and returns to app

### Reporting Issues
1. User taps "Report a bug"
2. Email client opens (Gmail, Mail, Outlook, etc.)
3. Email pre-addressed with subject "Bug Report"
4. User writes description and sends

### Checking Version
1. User scrolls to "Account actions"
2. Sees "Version 0.0.0 (Beta)" at top
3. Can reference this when contacting support

---

## Notes

- All support emails go to: `support@coacheasy.com`
- Legal links open in new tab to preserve context
- Version info is informational (not clickable)
- Gray color maintains visual hierarchy (secondary actions)
- Full-width buttons for mobile-friendly tapping
- Divider separates legal links from support actions
