import {resolve} from 'path';
import {defineConfig} from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: {
        typings: resolve(__dirname, 'src/index.ts'),
        coach: resolve(__dirname, 'src/coach/index.ts'),
        client: resolve(__dirname, 'src/client/index.ts'),
      },
    },
    rollupOptions: {
      output: {},
    },
  },
  plugins: [dts({insertTypesEntry: true})],
});
