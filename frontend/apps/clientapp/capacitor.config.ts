import type {CapacitorConfig} from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.easy.client',
  appName: 'Easy',
  webDir: 'dist',
  server: {androidScheme: 'https'},
  ios: {contentInset: 'never'},
};

export default config;
