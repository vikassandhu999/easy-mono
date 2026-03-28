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
};

export default config;
