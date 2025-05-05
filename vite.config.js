import { defineConfig } from 'vite';
import preserveShebang from 'rollup-plugin-preserve-shebang';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { builtinModules } from 'module';

export default defineConfig({
  define: {
    'process.env': 'process.env'
  },
  build: {
    outDir: 'package/lib',
    target: 'node18',
    minify: 'esbuild',
    rollupOptions: {
      input: 'bin/executable.js',
      external: [
        ...builtinModules,
        'fsevents'
      ],
      plugins: [
        preserveShebang(),
        nodeResolve({ preferBuiltins: true }),
        commonjs({ ignore: ['fsevents'] })
      ],
      output: {
        entryFileNames: 'aux4-test.js',
        format: 'cjs',
      }
    }
  },
});
