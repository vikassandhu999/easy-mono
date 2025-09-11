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
        }
    }
});
