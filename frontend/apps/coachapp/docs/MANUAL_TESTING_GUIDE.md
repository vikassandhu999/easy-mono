# Manual Testing Guide - Token Refresh System

This guide provides step-by-step instructions for manually testing the token refresh system to ensure it works correctly and doesn't have infinite loops.

## Prerequisites

- Coach application running locally
- Backend API running
- Browser DevTools open (Network and Console tabs)
- Multiple browser tabs available for cross-tab testing

## Test 7.1: Login Page Testing

### Test 7.1.1: No Refresh Calls on Initial Page Load

**Objective:** Verify that navigating to the login page doesn't trigger any refresh token requests.

**Steps:**
1. Clear browser cookies and localStorage
2. Open browser DevTools → Network tab
3. Navigate to the login page (`/login`)
4. Wait for page to fully load

**Expected Results:**
- ✅ Login page renders correctly
- ✅ No requests to `/api/auth/refresh` in Network tab
- ✅ No console errors related to authentication
- ✅ Page loads within 2 seconds

**Failure Indicators:**
- ❌ Multiple `/api/auth/refresh` requests
- ❌ Console errors about token refresh
- ❌ Page keeps re-rendering
- ❌ Infinite loading state

### Test 7.1.2: Successful Login Creates Session Without Loops

**Objective:** Verify that logging in successfully creates a session without triggering refresh loops.

**Steps:**
1. On the login page, enter valid credentials
2. Click "Send OTP" button
3. Enter the OTP code received
4. Click "Verify" button
5. Monitor Network tab and Console

**Expected Results:**
- ✅ OTP sent successfully
- ✅ OTP verified successfully
- ✅ User redirected to dashboard within 3 seconds
- ✅ Exactly one request to `/api/auth/verify-otp`
- ✅ No requests to `/api/auth/refresh` during login
- ✅ No console errors

**Failure Indicators:**
- ❌ Multiple refresh requests after login
- ❌ User not redirected to dashboard
- ❌ Console errors about authentication
- ❌ Page keeps loading indefinitely

### Test 7.1.3: Check Browser Network Tab for Unexpected Calls

**Objective:** Verify that no unexpected API calls are made during login flow.

**Steps:**
1. Clear Network tab
2. Perform complete login flow (send OTP → verify OTP)
3. Review all network requests

**Expected Results:**
- ✅ Only expected requests:
  - `/api/auth/send-otp`
  - `/api/auth/verify-otp`
  - Dashboard data requests (after login)
- ✅ No duplicate requests
- ✅ All requests return 200 or expected status codes

**Failure Indicators:**
- ❌ Duplicate requests to same endpoint
- ❌ Unexpected `/api/auth/refresh` calls
- ❌ 401 errors during login flow
- ❌ Requests to unknown endpoints

### Test 7.1.4: Test with Browser Dev Tools Open

**Objective:** Verify that having DevTools open doesn't affect authentication behavior.

**Steps:**
1. Open browser DevTools (F12)
2. Clear cookies and localStorage
3. Navigate to login page
4. Complete login flow
5. Keep DevTools open and use the app normally

**Expected Results:**
- ✅ Login works the same with DevTools open
- ✅ No additional network requests
- ✅ Console logs are visible (in dev mode)
- ✅ No performance degradation

**Failure Indicators:**
- ❌ Different behavior with DevTools open
- ❌ Additional requests when DevTools is open
- ❌ Console errors only when DevTools is open

## Test 7.2: Token Refresh Scenarios

### Test 7.2.1: API Call with Expired Token Refreshes Once

**Objective:** Verify that an API call with an expired token triggers exactly one refresh attempt.

**Steps:**
1. Log in successfully
2. Wait for access token to expire (or manually expire it)
   - Option A: Wait for token expiration time
   - Option B: Clear access token cookie in DevTools
3. Make an API call (e.g., navigate to a page that fetches data)
4. Monitor Network tab

**Expected Results:**
- ✅ Exactly one request to `/api/auth/refresh`
- ✅ Original API request is retried after refresh
- ✅ Original API request succeeds
- ✅ No additional refresh requests
- ✅ Console log shows refresh attempt (in dev mode)

**Failure Indicators:**
- ❌ Multiple refresh requests
- ❌ Original request not retried
- ❌ Original request fails after refresh
- ❌ Infinite refresh loop

### Test 7.2.2: API Call with Invalid Refresh Token Redirects

**Objective:** Verify that an invalid refresh token causes logout and redirect to login.

**Steps:**
1. Log in successfully
2. Manually invalidate refresh token:
   - Open DevTools → Application → Cookies
   - Delete or modify the refresh token cookie
3. Make an API call (e.g., navigate to a page)
4. Monitor Network tab and page behavior

**Expected Results:**
- ✅ One request to `/api/auth/refresh` returns 401
- ✅ User is redirected to login page
- ✅ Auth state is cleared
- ✅ No additional refresh attempts
- ✅ Console error log shows refresh failure

**Failure Indicators:**
- ❌ Multiple refresh attempts
- ❌ User not redirected to login
- ❌ Auth state not cleared
- ❌ Infinite refresh loop

### Test 7.2.3: Multiple Simultaneous API Calls with Expired Token

**Objective:** Verify that multiple concurrent API calls with expired token trigger only one refresh.

**Steps:**
1. Log in successfully
2. Wait for token to expire (or manually expire it)
3. Quickly navigate to multiple pages or trigger multiple API calls
   - Open multiple tabs/windows
   - Click multiple buttons quickly
4. Monitor Network tab

**Expected Results:**
- ✅ Exactly one request to `/api/auth/refresh`
- ✅ All original API requests are retried after refresh
- ✅ All original API requests succeed
- ✅ Console logs show request deduplication (in dev mode)

**Failure Indicators:**
- ❌ Multiple refresh requests
- ❌ Some requests not retried
- ❌ Some requests fail after refresh
- ❌ Race conditions or inconsistent state

### Test 7.2.4: Refresh During Active Usage

**Objective:** Verify that token refresh works seamlessly during normal app usage.

**Steps:**
1. Log in successfully
2. Use the app normally (navigate, create data, etc.)
3. Wait for token to approach expiration
4. Continue using the app
5. Monitor Network tab and user experience

**Expected Results:**
- ✅ Token refreshes automatically before expiration
- ✅ No interruption to user experience
- ✅ No visible loading states during refresh
- ✅ All API calls continue to work

**Failure Indicators:**
- ❌ User sees loading states during refresh
- ❌ API calls fail during refresh
- ❌ User is logged out unexpectedly
- ❌ Data loss or inconsistent state

## Cross-Tab Testing

### Test: Multiple Tabs Coordinate Token Refresh

**Objective:** Verify that multiple browser tabs coordinate token refresh properly.

**Steps:**
1. Log in successfully in Tab 1
2. Open Tab 2 with the same app
3. Wait for token to expire in both tabs
4. Make API calls in both tabs simultaneously
5. Monitor Network tab in both tabs

**Expected Results:**
- ✅ Only one tab performs the refresh
- ✅ Other tab waits for refresh to complete
- ✅ Both tabs use the new token
- ✅ Console logs show cross-tab coordination (in dev mode)

**Failure Indicators:**
- ❌ Both tabs perform refresh
- ❌ Tabs have inconsistent auth state
- ❌ One tab is logged out while other is logged in
- ❌ Race conditions between tabs

## Console Logging Verification

### Development Mode Logging

**Objective:** Verify that verbose logging works in development mode.

**Steps:**
1. Ensure app is running in development mode
2. Open Console tab in DevTools
3. Filter by `[TokenRefresh]`
4. Perform various auth operations

**Expected Results:**
- ✅ Detailed logs for refresh attempts
- ✅ Logs show request IDs and timestamps
- ✅ Logs show cross-tab coordination events
- ✅ Logs show success/failure status

### Production Mode Logging

**Objective:** Verify that verbose logging is disabled in production mode.

**Steps:**
1. Build app for production
2. Run production build
3. Open Console tab in DevTools
4. Perform various auth operations

**Expected Results:**
- ✅ No verbose `[TokenRefresh]` logs
- ✅ Only error logs are shown
- ✅ No sensitive data in logs
- ✅ Console is clean and minimal

## Error Scenarios

### Test: Network Error During Refresh

**Objective:** Verify that network errors during refresh are handled gracefully.

**Steps:**
1. Log in successfully
2. Open DevTools → Network tab
3. Enable "Offline" mode
4. Wait for token to expire
5. Make an API call
6. Disable "Offline" mode

**Expected Results:**
- ✅ Refresh fails with network error
- ✅ User sees appropriate error message
- ✅ User can retry when back online
- ✅ No infinite retry loop

### Test: Backend Returns 500 During Refresh

**Objective:** Verify that server errors during refresh are handled gracefully.

**Steps:**
1. Log in successfully
2. Configure backend to return 500 for refresh endpoint (if possible)
3. Wait for token to expire
4. Make an API call

**Expected Results:**
- ✅ Refresh fails with server error
- ✅ User sees appropriate error message
- ✅ Auth state is cleared after multiple failures
- ✅ User is redirected to login after 3 failures

## Test Results Template

Use this template to record your test results:

```
Test: [Test Name]
Date: [Date]
Tester: [Your Name]
Environment: [Development/Production]

Steps Performed:
1. [Step 1]
2. [Step 2]
...

Results:
✅/❌ [Expected Result 1]
✅/❌ [Expected Result 2]
...

Issues Found:
- [Issue 1]
- [Issue 2]
...

Screenshots/Logs:
[Attach screenshots or paste relevant logs]

Status: PASS/FAIL
```

## Troubleshooting During Testing

If you encounter issues during testing:

1. **Check Console Logs**: Look for `[TokenRefresh]` logs and error messages
2. **Check Network Tab**: Verify request/response details
3. **Check Application Tab**: Verify cookies and localStorage
4. **Clear State**: Clear cookies and localStorage, then retry
5. **Check Backend**: Verify backend is running and responding correctly
6. **Check Token Expiration**: Verify token expiration times are correct

## Reporting Issues

When reporting issues found during testing:

1. **Test Name**: Which test failed
2. **Steps to Reproduce**: Exact steps to reproduce the issue
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happened
5. **Screenshots**: Network tab, console logs, UI state
6. **Environment**: Browser, OS, dev/prod mode
7. **Frequency**: Always, sometimes, rarely

## Success Criteria

All tests must pass with the following criteria:

- ✅ No infinite refresh loops
- ✅ No unexpected API calls
- ✅ Token refresh happens exactly once per expiration
- ✅ Cross-tab coordination works correctly
- ✅ Error handling works as expected
- ✅ User experience is smooth and uninterrupted
- ✅ Console logs are appropriate for environment
- ✅ No sensitive data exposed in logs
