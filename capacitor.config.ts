import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.harmix',
  appName: 'Harmix',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
  },
};

export default config;
