// PWA and Performance utilities
const PWAUtils = {
    // Get First Paint timing
    getFirstPaint() {
        const paintEntries = performance.getEntriesByType('paint');
        const firstPaint = paintEntries.find((entry) => entry.name === 'first-paint');
        return firstPaint ? firstPaint.startTime : 0;
    },

    // Get Largest Contentful Paint
    getLCP() {
        return new Promise((resolve) => {
            if ('PerformanceObserver' in window) {
                const observer = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    resolve(lastEntry.startTime);
                });
                observer.observe({entryTypes: ['largest-contentful-paint']});

                // Fallback timeout
                setTimeout(() => resolve(0), 5000);
            } else {
                resolve(0);
            }
        });
    },

    // Detect if app is running as PWA
    isPWA() {
        return (
            window.matchMedia('(display-mode: standalone)').matches ||
            window.matchMedia('(display-mode: fullscreen)').matches ||
            (window.navigator as any).standalone === true
        );
    },

    // Enhanced performance monitoring
    measurePerformance() {
        if ('performance' in window) {
            window.addEventListener('load', () => {
                // Core Web Vitals monitoring
                const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

                const startTime = perfData.fetchStart || perfData.connectStart;
                const metrics = {
                    // Time to Interactive
                    domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
                    // First Paint
                    firstPaint: this.getFirstPaint(),
                    // Largest Contentful Paint
                    largestContentfulPaint: this.getLCP(),
                    // Load Complete
                    loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
                    // Total Page Load
                    totalTime: perfData.loadEventEnd - startTime,
                };

                console.log('Performance Metrics:', metrics);

                // Report to analytics if needed
                this.reportPerformanceMetrics(metrics);
            });
        }
    },

    // Comprehensive Chrome intervention prevention
    preventChromeInterventions() {
        // Set document language
        document.documentElement.lang = 'en-US';
        document.documentElement.setAttribute('translate', 'no');

        // Add comprehensive styles to hide translation UI
        const style = document.createElement('style');
        style.textContent = `
            /* Hide Google Translate and Chrome intervention UI */
            .goog-te-banner-frame,
            .goog-te-menu-frame,
            .chrome-search-suggestion,
            .translate-infobar,
            .goog-te-gadget,
            #google_translate_element,
            .skiptranslate,
            .goog-te-combo,
            .goog-tooltip,
            .VIpgJd-ZVi9od-aZ2wEe-wOHMyf,
            .VIpgJd-ZVi9od-aZ2wEe-wOHMyf-ti6hGc,
            .translate-infobar-element {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                height: 0 !important;
                width: 0 !important;
                overflow: hidden !important;
                position: absolute !important;
                top: -9999px !important;
                left: -9999px !important;
                z-index: -1 !important;
            }

            body.translated-ltr,
            body.translated-rtl {
                margin-top: 0 !important;
                top: 0 !important;
            }

            /* Prevent blue highlights and native mobile interventions */
            * {
                -webkit-tap-highlight-color: transparent;
                -webkit-touch-callout: none;
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
            }

            /* Allow text selection for text inputs and content areas */
            input, textarea, [contenteditable], [role="textbox"] {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
            }
        `;
        document.head.appendChild(style);

        // Set additional meta properties
        const metaNoTranslate = document.createElement('meta');
        metaNoTranslate.name = 'google';
        metaNoTranslate.content = 'notranslate';
        document.head.appendChild(metaNoTranslate);

        // Disable context menu on long press (mobile)
        document.addEventListener('contextmenu', (e) => {
            if (e.target instanceof HTMLElement && !e.target.matches('input, textarea, [contenteditable]')) {
                e.preventDefault();
            }
        });
    },

    // Enhanced service worker registration with error handling
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/',
                    updateViaCache: 'none',
                });

                console.log('Service Worker registered successfully:', registration);

                // Handle service worker updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New content available, notify user
                                this.showUpdateNotification();
                            }
                        });
                    }
                });

                // Send message to prevent Chrome nudges
                const channel = new MessageChannel();
                channel.port1.onmessage = (event) => {
                    console.log('Chrome nudges prevention:', event.data.message);
                };

                if (registration.active) {
                    registration.active.postMessage({type: 'PREVENT_CHROME_NUDGES'}, [channel.port2]);
                }

                return registration;
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    },

    // Report performance metrics (extend as needed)
    reportPerformanceMetrics(metrics: any) {
        // This can be extended to send to analytics services
        if (metrics.totalTime > 3000) {
            console.warn('Slow page load detected:', metrics.totalTime + 'ms');
        }
    },

    // Request notification permission at appropriate time
    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            try {
                const permission = await Notification.requestPermission();
                console.log('Notification permission:', permission);
                return permission;
            } catch (error) {
                console.error('Error requesting notification permission:', error);
                return 'denied';
            }
        }
        return Notification.permission;
    },

    // Enhanced install prompt handling
    setupInstallPrompt() {
        let deferredPrompt: any = null;

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            console.log('Install prompt available');

            // Store it globally for custom install button
            (window as any).deferredPrompt = deferredPrompt;

            // Optionally show custom install banner after user interaction
            this.showInstallPrompt(deferredPrompt);
        });

        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed successfully');
            deferredPrompt = null;
            (window as any).deferredPrompt = null;
        });
    },

    // Enhanced network status monitoring
    setupNetworkStatus() {
        const updateOnlineStatus = () => {
            const isOnline = navigator.onLine;
            console.log('Network status:', isOnline ? 'online' : 'offline');

            document.body.setAttribute('data-network-status', isOnline ? 'online' : 'offline');

            // Dispatch custom event for app to handle
            const networkEvent = new CustomEvent('network-status-change', {
                detail: {isOnline},
            });
            window.dispatchEvent(networkEvent);

            // Show notification for offline mode
            if (!isOnline) {
                this.showOfflineNotification();
            }
        };

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        updateOnlineStatus(); // Initial check
    },

    // Handle PWA-specific behaviors
    setupPWABehaviors() {
        if (this.isPWA()) {
            console.log('Running as PWA');
            document.body.classList.add('pwa-mode');

            // Prevent pull-to-refresh on PWA
            document.body.style.overscrollBehavior = 'none';
        }
    },

    // Show custom install prompt
    showInstallPrompt(deferredPrompt: any) {
        // This can be customized to show a beautiful install prompt
        // For now, we'll just store it for later use
        const installPromptEvent = new CustomEvent('pwa-install-available', {
            detail: {deferredPrompt},
        });
        window.dispatchEvent(installPromptEvent);
    },

    // Show offline notification
    showOfflineNotification() {
        console.log('App is now offline - cached content available');
        // Can be extended to show in-app notification
    },

    // Show update notification to user
    showUpdateNotification() {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification('CoachEasy Update Available', {
                badge: '/android-chrome-192x192.png',
                body: 'A new version is available. Restart the app to update.',
                icon: '/android-chrome-192x192.png',
                tag: 'app-update',
            });

            // Auto-close after 5 seconds
            setTimeout(() => notification.close(), 5000);
        } else {
            // Fallback to console or show in-app notification
            console.log('App update available - restart to get latest version');
        }
    },
};

// Initialize PWA features
async function initializePWA() {
    try {
        // Hide initial loading spinner
        const loader = document.getElementById('initial-loader');
        if (loader) {
            loader.style.display = 'none';
        }

        // Setup PWA features
        PWAUtils.setupInstallPrompt();
        PWAUtils.preventChromeInterventions();
        PWAUtils.measurePerformance();
        PWAUtils.setupNetworkStatus();
        PWAUtils.setupPWABehaviors();

        // Register service worker
        await PWAUtils.registerServiceWorker();

        // Request notification permission after user interaction (optional)
        // This can be triggered later based on user actions
        // await PWAUtils.requestNotificationPermission();

        console.log('PWA initialization complete');
    } catch (error) {
        console.error('PWA initialization error:', error);
    }
}

export default initializePWA;
