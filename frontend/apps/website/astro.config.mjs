// @ts-check
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
    vite: {
        plugins: [
            tailwindcss()
        ],
        resolve: {
            alias: {
                '@': '/src',
                '@easy/ui': '/../../packages/ui/src',
                '@easy/utils': '/../../packages/utils/src',
                '@easy/hooks': '/../../packages/hooks/src',
                '@easy/typings': '/../../packages/typings/src'
            }
        },
        define: {
            // Make environment variables available at build time
            __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
            __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
        },
        envPrefix: ['VITE_', 'PUBLIC_'],
    }
});
