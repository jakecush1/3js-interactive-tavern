import { readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

import { cloudflare } from "@cloudflare/vite-plugin";

// CACHE RULES (the _headers file Cloudflare reads from the built site)
// Everything the build writes under /assets carries a hash of its contents
// in its name (the scripts, the stylesheet, the fonts), so a given URL can
// never mean different bytes. Browsers may keep those for a year and not
// even ask whether they have changed: a returning visitor loads the code
// from disk without a single request. index.html is not covered, so a new
// deploy is still picked up at once, and the songs and pictures in /audio,
// /artwork and /band keep their names when replaced, so they stay on the
// default (cached, but checked for changes on each visit).
//
// The rules are written here, one per file that actually exists, rather
// than as a single "/assets/*" line in public/_headers. Cloudflare matches
// these rules against the address asked for, and this site answers an
// address it does not have with index.html. Under a wildcard, a request for
// a script that is not there (a browser holding the previous page while a
// new version is rolling out, say) would be answered with the page itself,
// marked "keep for a year", and that browser would then be stuck on the
// loading screen. Named file by file, only the real files get the long
// life.
const HEADER_RULE_LIMIT = 100; // the most rules Cloudflare reads from one file

function cacheHeaders(): Plugin {
  let assetsDir = "assets";
  return {
    name: "tavern:cache-headers",
    apply: "build",
    configResolved(config) {
      assetsDir = config.build.assetsDir;
    },
    writeBundle: {
      order: "post",
      handler(options) {
        if (!options.dir) return;
        const dir = join(options.dir, assetsDir);
        let files: { name: string; size: number }[];
        try {
          files = readdirSync(dir, { withFileTypes: true })
            .filter((entry) => entry.isFile())
            .map((entry) => ({ name: entry.name, size: statSync(join(dir, entry.name)).size }));
        } catch {
          return; // nothing was written there
        }
        if (files.length > HEADER_RULE_LIMIT) {
          // more files than rules: the biggest ones get them, the rest are
          // merely checked for changes on each visit
          files.sort((a, b) => b.size - a.size);
          this.warn(`${files.length} files under /${assetsDir} but only ${HEADER_RULE_LIMIT} cache rules: the ${files.length - HEADER_RULE_LIMIT} smallest are left on the default.`);
          files.length = HEADER_RULE_LIMIT;
        }
        files.sort((a, b) => (a.name < b.name ? -1 : 1));
        const lines = [
          "# Written by the build (see vite.config.ts): the files under /" + assetsDir + " have a hash",
          "# of their contents in their names, so browsers may keep them for good.",
        ];
        for (const file of files) {
          lines.push(`/${assetsDir}/${file.name}`, "  Cache-Control: public, max-age=31536000, immutable");
        }
        writeFileSync(join(options.dir, "_headers"), lines.join("\n") + "\n");
      },
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cloudflare(), cacheHeaders()],
  build: {
    // Font files stay files. Left alone, Vite inlines the small ones (the
    // rarely needed subsets) into the stylesheet as base64, and then every
    // visitor downloads them before anything can be painted.
    assetsInlineLimit: (file) => (file.endsWith(".woff2") ? false : undefined),
    rolldownOptions: {
      output: {
        // The libraries go in their own file. They are most of the download
        // and change only when a dependency is upgraded, so a returning
        // visitor keeps them cached across deploys and fetches just the
        // site's own code.
        codeSplitting: {
          groups: [
            { name: "vendor", test: /node_modules[\\/](three|three-stdlib|@react-three|react|react-dom|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
})
