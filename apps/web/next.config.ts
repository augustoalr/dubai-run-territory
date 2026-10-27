import type { NextConfig } from "next";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(webRoot, "../..");

// Turbopack rewrites MapLibre's dynamic `new URL("./${workerName}")` to the
// dev bundle, so the Web Worker never starts and the map stays blank (Chrome
// and iPhone Safari both). Publish the real worker as a static file. The same
// file is what Cloudflare Pages will serve later; this is not a Vercel API.
const require = createRequire(import.meta.url);
const workerSrc = require.resolve("maplibre-gl/dist/maplibre-gl-worker.mjs");
const workerDir = path.join(webRoot, "public/map");
mkdirSync(workerDir, { recursive: true });
const workerText = readFileSync(workerSrc, "utf8").replace(/\n\/\/# sourceMappingURL=.*\n?$/, "\n");
writeFileSync(path.join(workerDir, "maplibre-gl-worker.mjs"), workerText);

const nextConfig: NextConfig = {
  // Static files only. The same `out/` directory deploys to Vercel Hobby
  // and, later, to Cloudflare Pages, without Vercel-specific runtime APIs.
  output: "export",
  images: { unoptimized: true },
  transpilePackages: ["@dubai-run/core"],
  turbopack: {
    root,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
