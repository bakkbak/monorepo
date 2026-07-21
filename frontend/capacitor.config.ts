import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.teevo.app',
  appName: 'Teevo',
  // Vite builds the web assets here; `cap sync` copies them into the native
  // projects. Run `npm run build:native` first so VITE_API_BASE is baked in.
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // The app is fully bundled; only its own origin is allowed to load in the
    // WebView. API calls go cross-origin via fetch (CORS is open on the backend).
    allowNavigation: [],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: '#FACC15',
      showSpinner: false,
    },
  },
};

export default config;
