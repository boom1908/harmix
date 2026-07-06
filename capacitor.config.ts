import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.harmix',
  appName: 'Harmix',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
  },
  plugins: {
    Keyboard: {
      resize: 'body' as any,
      resizeOnFullScreen: true,
    },
  },
};

export default config;
