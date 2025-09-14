/// <reference types="astro/client" />

interface ImportMetaEnv {
  // Firebase configuration
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;

  // App configuration
  readonly VITE_APP_TITLE: string;
  readonly VITE_APP_DESCRIPTION: string;
  readonly VITE_APP_URL: string;
  readonly VITE_API_BASE_URL: string;

  // Feature flags
  readonly VITE_ENABLE_ANALYTICS: string;
  readonly VITE_ENABLE_DEBUG: string;

  // Contact information
  readonly VITE_CONTACT_EMAIL: string;
  readonly VITE_SUPPORT_EMAIL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Astro specific types
declare module "*.astro" {
  const Component: any;
  export default Component;
}

// Markdown types
declare module "*.md" {
  const Content: any;
  export { Content };
}

declare module "*.md?raw" {
  const content: string;
  export default content;
}
