/**
 * Token Refresh Manager
 * 
 * Singleton service to manage token refresh state and prevent concurrent refresh attempts.
 * Ensures only one token refresh happens at a time across the application and across browser tabs.
 */

const STORAGE_KEY = 'token_refresh_state';
const STORAGE_EVENT_KEY = 'token_refresh_event';

// Development flag for verbose logging
const DEV_MODE = import.meta.env.DEV;

interface RefreshState {
  isRefreshing: boolean;
  tabId: string;
  timestamp: number;
}

interface RefreshEvent {
  type: 'refresh_started' | 'refresh_completed' | 'refresh_failed';
  tabId: string;
  timestamp: number;
}

class TokenRefreshManager {
  private refreshPromise: Promise<void> | null = null;
  private isRefreshing: boolean = false;
  private requestCounter: number = 0;
  private tabId: string;
  private storageListener: ((event: StorageEvent) => void) | null = null;

  constructor() {
    // Generate unique tab ID
    this.tabId = `tab-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    // Set up cross-tab coordination
    this.setupCrossTabCoordination();
  }

  /**
   * Logs messages only in development mode
   */
  private devLog(message: string, data?: unknown): void {
    if (DEV_MODE) {
      console.log(message, data);
    }
  }

  /**
   * Sets up localStorage event listener for cross-tab coordination
   */
  private setupCrossTabCoordination(): void {
    if (typeof window === 'undefined') return;

    this.storageListener = (event: StorageEvent) => {
      // Only handle our specific storage event
      if (event.key !== STORAGE_EVENT_KEY) return;

      try {
        const refreshEvent: RefreshEvent = JSON.parse(event.newValue || '{}');
        
        // Ignore events from this tab
        if (refreshEvent.tabId === this.tabId) return;

        this.devLog(`[TokenRefresh] ${this.tabId} - Received cross-tab event`, {
          timestamp: new Date().toISOString(),
          event: refreshEvent.type,
          fromTab: refreshEvent.tabId
        });

        // Handle different event types
        switch (refreshEvent.type) {
          case 'refresh_started':
            this.handleRemoteRefreshStarted(refreshEvent);
            break;
          case 'refresh_completed':
            this.handleRemoteRefreshCompleted(refreshEvent);
            break;
          case 'refresh_failed':
            this.handleRemoteRefreshFailed(refreshEvent);
            break;
        }
      } catch (error) {
        console.error('[TokenRefresh] Error parsing cross-tab event', error);
      }
    };

    window.addEventListener('storage', this.storageListener);

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }

  /**
   * Handles when another tab starts refreshing
   */
  private handleRemoteRefreshStarted(event: RefreshEvent): void {
    // If we're not currently refreshing, we should wait for the other tab
    if (!this.isRefreshing) {
      this.devLog(`[TokenRefresh] ${this.tabId} - Waiting for tab ${event.tabId} to complete refresh`);
    }
  }

  /**
   * Handles when another tab completes refresh successfully
   */
  private handleRemoteRefreshCompleted(event: RefreshEvent): void {
    this.devLog(`[TokenRefresh] ${this.tabId} - Tab ${event.tabId} completed refresh successfully`);
    
    // Clear our local refresh state if we were waiting
    if (this.isRefreshing && this.refreshPromise) {
      this.clearRefreshState();
    }
  }

  /**
   * Handles when another tab's refresh fails
   */
  private handleRemoteRefreshFailed(event: RefreshEvent): void {
    this.devLog(`[TokenRefresh] ${this.tabId} - Tab ${event.tabId} refresh failed`);
    
    // Clear our local refresh state
    this.clearRefreshState();
  }

  /**
   * Broadcasts a refresh event to other tabs
   */
  private broadcastRefreshEvent(type: RefreshEvent['type']): void {
    if (typeof window === 'undefined') return;

    const event: RefreshEvent = {
      type,
      tabId: this.tabId,
      timestamp: Date.now()
    };

    try {
      localStorage.setItem(STORAGE_EVENT_KEY, JSON.stringify(event));
      // Remove immediately to allow repeated events
      localStorage.removeItem(STORAGE_EVENT_KEY);
    } catch (error) {
      console.error('[TokenRefresh] Error broadcasting event', error);
    }
  }

  /**
   * Checks if another tab is currently refreshing
   */
  private isAnotherTabRefreshing(): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const stateStr = localStorage.getItem(STORAGE_KEY);
      if (!stateStr) return false;

      const state: RefreshState = JSON.parse(stateStr);
      
      // Check if the refresh is recent (within last 10 seconds)
      const isRecent = Date.now() - state.timestamp < 10000;
      
      // Check if it's from another tab
      const isOtherTab = state.tabId !== this.tabId;
      
      return state.isRefreshing && isRecent && isOtherTab;
    } catch (error) {
      console.error('[TokenRefresh] Error checking refresh state', error);
      return false;
    }
  }

  /**
   * Marks this tab as the one performing the refresh
   */
  private markRefreshInProgress(): void {
    if (typeof window === 'undefined') return;

    const state: RefreshState = {
      isRefreshing: true,
      tabId: this.tabId,
      timestamp: Date.now()
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('[TokenRefresh] Error marking refresh in progress', error);
    }
  }

  /**
   * Clears the refresh state from localStorage
   */
  private clearRefreshState(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('[TokenRefresh] Error clearing refresh state', error);
    }
  }

  /**
   * Generates a unique request identifier for tracking
   */
  private generateRequestId(): string {
    this.requestCounter++;
    return `refresh-${Date.now()}-${this.requestCounter}`;
  }

  /**
   * Attempts to refresh the token, ensuring only one refresh happens at a time.
   * Coordinates with other browser tabs to prevent concurrent refresh attempts.
   * If a refresh is already in progress (in this tab or another), returns the existing promise.
   * 
   * @param refreshFn - Function that performs the actual token refresh
   * @returns Promise that resolves when refresh completes or rejects on failure
   */
  async refresh(refreshFn: () => Promise<void>): Promise<void> {
    const requestId = this.generateRequestId();

    // Check if another tab is already refreshing
    if (this.isAnotherTabRefreshing()) {
      this.devLog(`[TokenRefresh] ${requestId} - Another tab is refreshing, waiting...`, {
        timestamp: new Date().toISOString(),
        requestId,
        tabId: this.tabId,
        status: 'waiting_for_other_tab'
      });

      // Wait for the other tab to complete (with timeout)
      return this.waitForOtherTabRefresh();
    }

    // If already refreshing in this tab, return the existing promise
    if (this.refreshPromise) {
      this.devLog(`[TokenRefresh] ${requestId} - Refresh already in progress in this tab, waiting...`, {
        timestamp: new Date().toISOString(),
        requestId,
        tabId: this.tabId,
        status: 'skipped'
      });
      return this.refreshPromise;
    }

    // Log refresh start
    this.devLog(`[TokenRefresh] ${requestId} - Starting token refresh`, {
      timestamp: new Date().toISOString(),
      requestId,
      tabId: this.tabId,
      status: 'started'
    });

    // Mark as refreshing in this tab and in localStorage
    this.isRefreshing = true;
    this.markRefreshInProgress();
    this.broadcastRefreshEvent('refresh_started');

    // Create new promise
    this.refreshPromise = refreshFn()
      .then(() => {
        // Log successful refresh
        this.devLog(`[TokenRefresh] ${requestId} - Token refresh succeeded`, {
          timestamp: new Date().toISOString(),
          requestId,
          tabId: this.tabId,
          status: 'success'
        });
        
        // Broadcast success to other tabs
        this.broadcastRefreshEvent('refresh_completed');
      })
      .catch((error) => {
        // Always log failed refresh (not just in dev mode)
        console.error(`[TokenRefresh] ${requestId} - Token refresh failed`, {
          timestamp: new Date().toISOString(),
          requestId,
          tabId: this.tabId,
          status: 'failed',
          error: error.message || 'Unknown error',
          statusCode: error.response?.status
        });
        
        // Broadcast failure to other tabs
        this.broadcastRefreshEvent('refresh_failed');
        
        // Re-throw to propagate the error
        throw error;
      })
      .finally(() => {
        this.isRefreshing = false;
        this.refreshPromise = null;
        this.clearRefreshState();
      });

    return this.refreshPromise;
  }

  /**
   * Waits for another tab to complete its refresh
   */
  private waitForOtherTabRefresh(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.devLog(`[TokenRefresh] ${this.tabId} - Timeout waiting for other tab, proceeding with own refresh`);
        cleanup();
        reject(new Error('Timeout waiting for other tab refresh'));
      }, 5000); // 5 second timeout

      const checkInterval = setInterval(() => {
        if (!this.isAnotherTabRefreshing()) {
          this.devLog(`[TokenRefresh] ${this.tabId} - Other tab completed refresh`);
          cleanup();
          resolve();
        }
      }, 100); // Check every 100ms

      const cleanup = () => {
        clearTimeout(timeout);
        clearInterval(checkInterval);
      };
    });
  }

  /**
   * Checks if a token refresh is currently in progress.
   * 
   * @returns true if refresh is in progress, false otherwise
   */
  isCurrentlyRefreshing(): boolean {
    return this.isRefreshing || this.isAnotherTabRefreshing();
  }

  /**
   * Resets the refresh state, clearing any in-progress refresh.
   * Should be called on logout or when clearing authentication state.
   */
  reset(): void {
    this.devLog('[TokenRefresh] Resetting refresh state', {
      timestamp: new Date().toISOString(),
      tabId: this.tabId,
      wasRefreshing: this.isRefreshing
    });
    this.isRefreshing = false;
    this.refreshPromise = null;
    this.clearRefreshState();
  }

  /**
   * Cleans up event listeners and state
   */
  private cleanup(): void {
    if (this.storageListener && typeof window !== 'undefined') {
      window.removeEventListener('storage', this.storageListener);
    }
    this.clearRefreshState();
  }
}

// Export singleton instance for use across the application
export const tokenRefreshManager = new TokenRefreshManager();
