import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.e41703b9fbbf41b1bca6ff39488d8f25',
  appName: 'Harmix',

  webDir: 'dist',
  server: {
    url: 'https://e41703b9-fbbf-41b1-bca6-ff39488d8f25.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
