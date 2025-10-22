# Profile Page - Testing Guide

**Component**: `ProfilePage.tsx`
**Last Updated**: January 2025
**Status**: Ready for QA

---

## Quick Start

1. **Navigate to Profile**: `/profile` route
2. **Default view**: Should land on "Profile" tab
3. **Switch tabs**: Click/tap "Account" tab
4. **Test features**: Follow scenarios below

---

## Test Scenarios

### ✅ Scenario 1: Default State
**Goal**: Verify page loads correctly

**Steps**:
1. Navigate to `/profile`
2. Wait for profile data to load

**Expected**:
- ✅ Profile header visible (avatar, name, title, badge)
- ✅ "Profile" tab selected by default (highlighted)
- ✅ Edit button visible in top-right
- ✅ Personal Information card displayed
- ✅ No TypeScript/console errors

---

### ✅ Scenario 2: Tab Switching
**Goal**: Verify tabs work correctly

**Steps**:
1. On Profile tab (default)
2. Click "Account" tab
3. Verify content changes
4. Click "Profile" tab
5. Verify content changes back

**Expected**:
- ✅ Tab indicator moves smoothly
- ✅ Content changes without page reload
- ✅ Profile header remains visible
- ✅ Edit button appears/disappears correctly
- ✅ No layout shift or flicker

---

### ✅ Scenario 3: Profile Tab Content
**Goal**: Verify Profile tab displays all sections

**On Profile Tab**:
- ✅ Personal Information card
  - Full name
  - Email address
  - Professional title
  - Specialization (if set)
  - Years of experience (if set)
- ✅ About card (if bio exists)
- ✅ Qualifications card (if set)
- ✅ Services Offered card (if services exist)
- ✅ Edit button visible

---

### ✅ Scenario 4: Account Tab Content
**Goal**: Verify Account tab displays all sections

**On Account Tab**:
- ✅ Business Information card
  - Business ID
  - Member since date
- ✅ Help & Legal card
  - Privacy policy link
  - Terms and conditions link
  - Report a bug button
  - Share feedback button
  - Contact us button
- ✅ Account Actions card
  - Version display (0.0.0 Beta)
  - Log out button
- ✅ Edit button NOT visible

---

### ✅ Scenario 5: Edit Profile
**Goal**: Verify edit functionality

**Steps**:
1. On Profile tab
2. Click Edit button (top-right)
3. Should navigate to `/profile/edit`

**Expected**:
- ✅ Edit button visible on Profile tab
- ✅ Edit button hidden on Account tab
- ✅ Navigation works correctly

---

### ✅ Scenario 6: External Links
**Goal**: Verify legal document links

**Steps**:
1. Switch to Account tab
2. Click "Privacy policy"
3. Verify new tab opens
4. Close tab
5. Click "Terms and conditions"
6. Verify new tab opens

**Expected**:
- ✅ Links have external link icon (→)
- ✅ Opens in new tab (`target="_blank"`)
- ✅ Profile page remains open
- ✅ URLs correct (update placeholders in production)

---

### ✅ Scenario 7: Email Links
**Goal**: Verify support email links

**Steps**:
1. On Account tab
2. Click "Report a bug"
3. Verify email client opens
4. Check subject line
5. Test other email links similarly

**Expected**:
- ✅ "Report a bug" → Opens email with subject "Bug Report"
- ✅ "Share feedback" → Opens email with subject "Feedback"
- ✅ "Contact us" → Opens email to support@coacheasy.com
- ✅ Works on mobile (opens native email app)

---

### ✅ Scenario 8: Logout Flow
**Goal**: Verify logout functionality

**Steps**:
1. Switch to Account tab
2. Scroll to bottom
3. See version info
4. Click "Log out" button
5. Confirm in modal
6. Verify logout

**Expected**:
- ✅ Version displays "Version 0.0.0 (Beta)"
- ✅ Logout button red with icon
- ✅ Modal opens with confirmation
- ✅ "Cancel" closes modal
- ✅ "Log out" logs user out
- ✅ Loading state shows during logout
- ✅ Redirects to `/login` after logout

---

### ✅ Scenario 9: Mobile Experience
**Goal**: Test on mobile viewport

**Test on**:
- iPhone SE (320px)
- iPhone 12 (390px)
- Android phones (various)

**Steps**:
1. Resize browser to mobile width (or use device)
2. Navigate to Profile page
3. Test tab switching
4. Test scrolling
5. Test all buttons/links

**Expected**:
- ✅ SegmentedControl visible and tappable
- ✅ No horizontal scrolling
- ✅ Full-width buttons easy to tap
- ✅ Icons properly sized
- ✅ Text readable
- ✅ Less scrolling per tab than old version
- ✅ Touch targets 44×44pt minimum

---

### ✅ Scenario 10: Keyboard Navigation
**Goal**: Test accessibility with keyboard

**Steps**:
1. Navigate to Profile page
2. Tab through interactive elements
3. Use arrow keys on SegmentedControl
4. Enter on buttons/links

**Expected**:
- ✅ Tab key moves through: Edit → Profile tab → Account tab → buttons
- ✅ Left/Right arrow keys switch tabs
- ✅ Enter/Space activates selected tab
- ✅ Focus indicators visible
- ✅ Can navigate entire page with keyboard
- ✅ Tab order logical

---

### ✅ Scenario 11: Screen Reader
**Goal**: Test with screen reader (VoiceOver/TalkBack)

**Steps**:
1. Enable screen reader
2. Navigate to Profile page
3. Swipe through elements
4. Test tab switching

**Expected**:
- ✅ Profile header content announced
- ✅ "Profile sections" label announced for tabs
- ✅ Current tab state announced
- ✅ Card section headers announced
- ✅ Button labels clear and descriptive
- ✅ External link status announced

---

### ✅ Scenario 12: Loading State
**Goal**: Verify loading behavior

**Steps**:
1. Clear cache or use slow network
2. Navigate to Profile page
3. Observe loading state

**Expected**:
- ✅ Loader centered on page
- ✅ No layout shift when data loads
- ✅ Profile header renders first
- ✅ Tabs render with data
- ✅ Smooth transition to loaded state

---

### ✅ Scenario 13: Error State
**Goal**: Verify error handling

**Steps**:
1. Simulate API error (network tab, block request)
2. Navigate to Profile page
3. Observe error state

**Expected**:
- ✅ Error message displayed
- ✅ "Retry" button present
- ✅ Retry reloads data
- ✅ No console errors
- ✅ Graceful degradation

---

### ✅ Scenario 14: Empty/Missing Data
**Goal**: Handle optional fields

**Test with coach profile that has**:
- No bio/biography
- No qualifications
- No services_offered
- No specialization
- No experience_years

**Expected**:
- ✅ Personal Information always shows (name, email required)
- ✅ Optional sections hidden gracefully
- ✅ No empty cards displayed
- ✅ No errors or "undefined" text
- ✅ Layout remains clean

---

### ✅ Scenario 15: Cross-Browser Testing
**Goal**: Ensure compatibility

**Test on**:
- Chrome (desktop & mobile)
- Firefox (desktop & mobile)
- Safari (macOS & iOS)
- Edge (desktop)

**Expected**:
- ✅ Tabs work consistently
- ✅ Icons render correctly
- ✅ Links open properly
- ✅ Email links work
- ✅ Styling consistent
- ✅ No browser-specific bugs

---

## Visual Regression Checklist

- [ ] Profile header card centered
- [ ] Avatar properly sized (80px)
- [ ] Badge positioned correctly
- [ ] SegmentedControl full-width
- [ ] Tab icons aligned with text
- [ ] Cards have consistent padding (lg)
- [ ] InfoRow icons aligned (18px)
- [ ] Button icons sized correctly (18px main, 16px secondary)
- [ ] Spacing between cards consistent (lg/24pt)
- [ ] Edit button positioned top-right
- [ ] Modal centered and sized correctly
- [ ] No text overflow or truncation
- [ ] Colors match theme (gray for secondary actions)
- [ ] Dividers visible but subtle

---

## Performance Testing

### Metrics to Monitor
- [ ] Initial page load time
- [ ] Time to interactive
- [ ] Tab switch responsiveness (<100ms)
- [ ] No memory leaks on tab switching
- [ ] Smooth animations (60fps)

### Tools
- Lighthouse (Accessibility, Performance)
- React DevTools Profiler
- Browser Performance tab

**Target Scores**:
- Performance: 90+
- Accessibility: 100
- Best Practices: 90+

---

## Automated Testing Checklist

### Unit Tests Needed
- [ ] Tab state management (useState)
- [ ] Conditional rendering (Profile/Account tabs)
- [ ] Edit button visibility toggle
- [ ] Modal open/close logic
- [ ] Logout flow

### Integration Tests Needed
- [ ] Profile data fetching (useGetCoachQuery)
- [ ] Tab switching preserves state
- [ ] Navigation to edit page
- [ ] Logout mutation and redirect

### E2E Tests Needed
- [ ] Full user flow: Load → Switch tabs → Edit → Logout
- [ ] Mobile flow
- [ ] External link behavior
- [ ] Email link behavior

---

## Known Issues / Limitations

### Current
- Version hardcoded as "0.0.0 (Beta)" (update before prod)
- Legal URLs are placeholders (update before prod)
- Support email needs to be monitored
- Tab state not persisted in URL (future enhancement)

### Future Enhancements
- URL parameters for deep linking (`/profile?tab=account`)
- Badge notifications on Account tab
- Third tab for Activity/History
- Dynamic version from package.json

---

## Bug Report Template

If you find an issue, report with:

```
**Environment**:
- Browser: [Chrome 120 / Safari 17 / etc]
- Device: [iPhone 14 / Desktop / etc]
- Viewport: [320px / 1920px / etc]

**Steps to Reproduce**:
1. Navigate to /profile
2. Click Account tab
3. [Describe action]

**Expected**:
[What should happen]

**Actual**:
[What actually happens]

**Screenshots**:
[Attach if visual issue]

**Console Errors**:
[Paste any errors from console]
```

---

## Sign-Off Checklist

Before approving for production:

### Functionality
- [ ] All test scenarios pass
- [ ] No console errors or warnings
- [ ] All links/buttons work
- [ ] Data displays correctly
- [ ] Loading states work
- [ ] Error states work

### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader friendly
- [ ] Focus indicators visible
- [ ] ARIA labels present
- [ ] Color contrast WCAG AA compliant
- [ ] Touch targets adequate (44×44pt)

### Responsive Design
- [ ] Works on 320px (smallest mobile)
- [ ] Works on tablet sizes
- [ ] Works on desktop
- [ ] No horizontal scrolling
- [ ] Proper text sizing on all screens

### Browser Support
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] iOS Safari (latest)
- [ ] Android Chrome (latest)

### Performance
- [ ] Lighthouse score acceptable
- [ ] No performance regressions
- [ ] Tab switching fast (<100ms)
- [ ] No memory leaks

### Content
- [ ] All text correct (spelling, grammar)
- [ ] Legal URLs updated (prod)
- [ ] Support email verified
- [ ] Version number accurate

---

## Testing Timeline

**Day 1-2**: Functional testing (Scenarios 1-8)
**Day 3**: Mobile & responsive testing (Scenario 9)
**Day 4**: Accessibility testing (Scenarios 10-11)
**Day 5**: Edge cases & cross-browser (Scenarios 12-15)
**Day 6**: Performance & visual regression
**Day 7**: Final review & sign-off

---

## Contact for Issues

- **Developer**: [Your Name]
- **QA Lead**: [QA Lead Name]
- **Design Review**: [Designer Name]

---

## Approval

- [ ] Development Complete
- [ ] QA Testing Complete
- [ ] Accessibility Review Complete
- [ ] Design Review Complete
- [ ] Product Owner Approval

**Approved by**: _______________
**Date**: _______________

---

## Quick Test (5 minutes)

**Fast smoke test**:
1. ✅ Load page (Profile tab default)
2. ✅ Switch to Account tab
3. ✅ Switch back to Profile tab
4. ✅ Click Edit button
5. ✅ Go back, switch to Account
6. ✅ Click "Report a bug" (email opens)
7. ✅ Click "Log out" (modal opens)
8. ✅ Cancel modal
9. ✅ Test on mobile viewport (320px)
10. ✅ Tab with keyboard

**If all pass → Ready for deeper testing**
**If any fail → Stop and fix issues**
