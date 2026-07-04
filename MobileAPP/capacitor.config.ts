import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.robot4wd.controller',
  appName: '4WD Robot Controller',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  android: { allowMixedContent: true, backgroundColor: '#0b1326' },
  plugins: { CapacitorHttp: { enabled: true } },
};

export default config;
