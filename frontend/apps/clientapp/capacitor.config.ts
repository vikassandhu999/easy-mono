import type {CapacitorConfig} from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.easy.client',
  appName: 'Easy',
  backgroundColor: '#fff9f3',
  webDir: 'dist',
  server: {androidScheme: 'https'},
  ios: {contentInset: 'never'},
};

export default config;
