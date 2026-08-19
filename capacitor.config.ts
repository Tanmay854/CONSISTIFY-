import type { CapacitorConfig } from '@capacitor/cli';

// Standalone native build: the web app compiled into `dist/` is bundled into the
// native app (no dependency on the Lovable preview URL).
//
// For live-reload during development you may temporarily add:
//   server: {
//     url: 'https://eec72d85-d044-4261-b29a-8882a5f34c1e.lovableproject.com?forceHideBadge=true',
//     cleartext: true,
//   }
// ...but remove it again before producing a release build (IPA/APK).
const config: CapacitorConfig = {
  appId: 'app.lovable.eec72d85d0444261b29a8882a5f34c1e',
  appName: 'DISCIPLINE X',
  webDir: 'dist',
  ios: {
    contentInset: 'never',
    limitsNavigationsToAppBoundDomains: false,
    backgroundColor: '#000000',
    scrollEnabled: true,
  },
  android: {
    backgroundColor: '#000000',
  },
  plugins: {
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'DARK', // dark background => light content
      backgroundColor: '#000000',
      overlaysWebView: true,
    },
  },
};

export default config;
