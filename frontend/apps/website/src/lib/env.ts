/**
 * Environment configuration utilities
 * This file provides type-safe access to environment variables
 */

// App configuration
export const APP_CONFIG = {
  title: import.meta.env.VITE_APP_TITLE || "CoachEasy",
  description:
    import.meta.env.VITE_APP_DESCRIPTION ||
    "Professional coaching platform for managing clients, programs, and sessions",
  url: import.meta.env.VITE_APP_URL || "https://coacheasy.com",
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "https://api.coacheasy.com",
} as const;

// Firebase configuration
export const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
} as const;

// Feature flags
export const FEATURES = {
  analytics: import.meta.env.VITE_ENABLE_ANALYTICS === "true",
  debug: import.meta.env.VITE_ENABLE_DEBUG === "true",
} as const;

// Contact information
export const CONTACT_INFO = {
  email: import.meta.env.VITE_CONTACT_EMAIL || "kaizen.tech404@gmail.com",
  support: import.meta.env.VITE_SUPPORT_EMAIL || "kaizen.tech404@gmail.com",
} as const;

// Development utilities
export const IS_DEV = import.meta.env.DEV;
export const IS_PROD = import.meta.env.PROD;

// Build information (defined in astro.config.mjs)
declare global {
  const __APP_VERSION__: string;
  const __BUILD_DATE__: string;
}

export const BUILD_INFO = {
  version: typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "1.0.0",
  buildDate:
    typeof __BUILD_DATE__ !== "undefined"
      ? __BUILD_DATE__
      : new Date().toISOString(),
} as const;

/**
 * Validates that all required environment variables are present
 */
export function validateEnvVars(): { isValid: boolean; missing: string[] } {
  const required = [
    "VITE_FIREBASE_API_KEY",
    "VITE_FIREBASE_AUTH_DOMAIN",
    "VITE_FIREBASE_PROJECT_ID",
    "VITE_FIREBASE_STORAGE_BUCKET",
    "VITE_FIREBASE_MESSAGING_SENDER_ID",
    "VITE_FIREBASE_APP_ID",
  ];

  const missing = required.filter((key) => !import.meta.env[key]);

  return {
    isValid: missing.length === 0,
    missing,
  };
}

/**
 * Get environment-specific configuration
 */
export function getEnvConfig() {
  return {
    app: APP_CONFIG,
    firebase: FIREBASE_CONFIG,
    features: FEATURES,
    contact: CONTACT_INFO,
    build: BUILD_INFO,
    isDev: IS_DEV,
    isProd: IS_PROD,
  };
}
