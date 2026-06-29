import type { CapacitorConfig } from '@capacitor/cli';

// NOTE: For a standalone APK that bundles the built web app (so it works on
// any phone without depending on the Lovable preview URL), we intentionally
// do NOT set `server.url`. Capacitor will load the assets compiled into
// `dist/` (via `npm run build` + `npx cap sync android`).
//
// If you ever need live-reload from the Lovable sandbox during development,
// temporarily add:
//   server: {
//     url: 'https://eec72d85-d044-4261-b29a-8882a5f34c1e.lovableproject.com?forceHideBadge=true',
//     cleartext: true,
//   }
// ...but remove it again before producing the release APK.
const config: CapacitorConfig = {
  appId: 'app.lovable.eec72d85d0444261b29a8882a5f34c1e',
  appName: 'DISCIPLINE X',
  webDir: 'dist',
};

export default config;
