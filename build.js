// Bundles the renderer (Milkdown/Crepe is ESM and ships CSS + font assets,
// so it needs a bundler). Fonts/SVGs are inlined as data URLs to keep the
// output self-contained for loading over file:// in Electron.
const esbuild = require('esbuild');

const options = {
  entryPoints: ['src/renderer/renderer.js', 'src/renderer/capture.js'],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'chrome130', // Electron 36 ships Chromium 136
  outdir: 'dist',
  sourcemap: true,
  // Crepe pulls in the esm-bundler build of Vue, which expects these
  // compile-time flags to be defined by the bundler.
  define: {
    __VUE_OPTIONS_API__: 'true',
    __VUE_PROD_DEVTOOLS__: 'false',
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
  },
  loader: {
    '.woff': 'dataurl',
    '.woff2': 'dataurl',
    '.ttf': 'dataurl',
    '.svg': 'dataurl',
    '.png': 'dataurl',
  },
};

async function run() {
  if (process.argv.includes('--watch')) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
    console.log('[build] watching for changes...');
  } else {
    await esbuild.build(options);
    console.log('[build] done -> dist/');
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
