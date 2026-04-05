import type {CapacitorConfig} from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.coacheasy.client',
  appName: 'CoachEasy',
  webDir: 'dist',
  server: {
    // During development, point to the Vite dev server
    // url: 'http://192.168.x.x:1314',
    // cleartext: true,
  },
  // Note: vite-plugin-pwa generates sw.js in dist/, which gets copied to
  // native projects by `cap sync`. The service worker is NOT registered on
  // native — src/pwa.ts checks Capacitor.isNativePlatform() and skips it.
};

export default config;
