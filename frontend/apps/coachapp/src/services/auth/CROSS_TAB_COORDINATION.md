# Cross-Tab Token Refresh Coordination

## Overview

The TokenRefreshManager now supports cross-tab coordination to ensure that only one browser tab performs token refresh at a time, while all other tabs wait for the result.

## How It Works

### 1. Tab Identification
Each browser tab generates a unique ID when the TokenRefreshManager is initialized:
```typescript
this.tabId = `tab-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
```

### 2. localStorage Communication
Tabs communicate using two localStorage keys:

- **`token_refresh_state`**: Stores the current refresh state (which tab is refreshing, timestamp)
- **`token_refresh_event`**: Used to broadcast events between tabs (refresh started/completed/failed)

### 3. Event Broadcasting
When a tab starts, completes, or fails a refresh, it broadcasts an event:

```typescript
interface RefreshEvent {
  type: 'refresh_started' | 'refresh_completed' | 'refresh_failed';
  tabId: string;
  timestamp: number;
}
```

### 4. Storage Event Listener
Each tab listens for `storage` events from other tabs:

```typescript
window.addEventListener('storage', (event: StorageEvent) => {
  if (event.key === STORAGE_EVENT_KEY) {
    // Handle refresh events from other tabs
  }
});
```

## Coordination Flow

### Scenario 1: Single Tab Refresh
1. Tab A detects expired token
2. Tab A checks if another tab is refreshing → No
3. Tab A marks itself as refreshing in localStorage
4. Tab A broadcasts "refresh_started" event
5. Tab A performs refresh
6. Tab A broadcasts "refresh_completed" event
7. Tab A clears refresh state

### Scenario 2: Multiple Tabs Concurrent Refresh
1. Tab A and Tab B both detect expired token simultaneously
2. Tab A checks if another tab is refreshing → No
3. Tab A marks itself as refreshing in localStorage
4. Tab B checks if another tab is refreshing → Yes (Tab A)
5. Tab B waits for Tab A to complete (polls every 100ms, 5s timeout)
6. Tab A completes refresh and broadcasts "refresh_completed"
7. Tab B detects completion and proceeds with its original request

### Scenario 3: Tab Closure During Refresh
1. Tab A starts refreshing
2. Tab A closes/crashes before completing
3. Other tabs waiting will timeout after 5 seconds
4. After timeout, another tab can attempt refresh
5. Stale refresh state (>10 seconds old) is automatically ignored

## Key Features

### 1. Race Condition Prevention
- Only the first tab to mark itself as refreshing will perform the refresh
- Other tabs detect this and wait

### 2. Timeout Protection
- Tabs waiting for another tab's refresh will timeout after 5 seconds
- Prevents indefinite waiting if a tab crashes

### 3. Stale State Handling
- Refresh states older than 10 seconds are considered stale and ignored
- Prevents issues from crashed tabs leaving stale state

### 4. Event Cleanup
- Events are removed from localStorage immediately after broadcasting
- Prevents localStorage from filling up with old events

### 5. Tab Cleanup
- `beforeunload` event listener clears state when tab closes
- Prevents stale state from closed tabs

## Benefits

1. **Reduced Server Load**: Only one refresh request per token expiration across all tabs
2. **Better User Experience**: Consistent authentication state across all tabs
3. **Prevents Race Conditions**: No conflicting refresh attempts
4. **Handles Edge Cases**: Tab crashes, network failures, timeouts

## Testing Cross-Tab Coordination

To manually test:

1. Open the application in two browser tabs
2. Let the token expire (or force a 401 response)
3. Trigger an API call in both tabs simultaneously
4. Check browser console logs:
   - One tab should show "Starting token refresh"
   - Other tab should show "Another tab is refreshing, waiting..."
   - Both tabs should eventually succeed with the refreshed token

## Debugging

Enable verbose logging by checking the browser console for messages prefixed with `[TokenRefresh]`:

- `refresh_started`: A tab began refreshing
- `waiting_for_other_tab`: A tab is waiting for another tab's refresh
- `refresh_completed`: Refresh succeeded
- `refresh_failed`: Refresh failed
- `Timeout waiting for other tab`: A tab gave up waiting and will try itself

## Security Considerations

- localStorage is same-origin only, so only tabs from the same domain can coordinate
- No sensitive token data is stored in localStorage (tokens remain in HTTP-only cookies)
- Only coordination metadata is shared between tabs
