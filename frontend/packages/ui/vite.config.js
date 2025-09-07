import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'chat',
      fileName: 'chat',
    },
    rollupOptions: {
      output: { esModule: 'if-default-prop' },
      external: ['react', '@tanstack/react-query', '@tabler/icons-react'],
    },
  },
  plugins: [dts({ insertTypesEntry: true })],
});
