import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.harmix',
  appName: 'Harmix',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
    captureInput: false,
    initialFocus: false,
  },
};

export default config;
