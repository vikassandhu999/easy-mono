/// <reference types="vite/client" />

interface ImportMetaEnv {
  // API Configuration
  readonly VITE_API_BASE_URL: string;

  // Environment identifier
  readonly VITE_APP_ENV: 'development' | 'production' | 'staging';

  // Debug flag
  readonly VITE_DEBUG: string;

  // PWA Settings
  readonly VITE_PWA_ENABLED: string;

  // Analytics & Error Tracking (optional)
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_GA_MEASUREMENT_ID?: string;

  // App Info
  readonly VITE_APP_NAME?: string;
  readonly VITE_APP_SHORT_NAME?: string;

  // Feature Flags
  readonly VITE_ENABLE_DEBUG_LOGS?: string;

  // Vite built-in
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly SSR: boolean;
  readonly BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    _retry?: boolean;
    skipAuth?: boolean;
    authToken?: string;
  }
}

import '@kiwicom/orbit-components/lib/primitives/ButtonPrimitive/types';

declare module '@kiwicom/orbit-components/lib/primitives/ButtonPrimitive/types' {
  export interface ButtonCommonProps {
    to?: string;
  }
}
