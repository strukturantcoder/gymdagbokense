import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'se.gymdagboken.app',
  appName: 'Gymdagboken',
  webDir: 'dist',
  server: {
    url: 'https://676a994b-a81a-4d3d-9ea1-c5cbdc8dd075.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;
