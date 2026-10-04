import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

// Sites supplies its own identity gateway and D1 bindings. A native Next.js
// deployment must not impersonate that gateway or import Workers built-ins.
const sites = !process.env.VERCEL && process.env.SOLVEX_RUNTIME === "sites";
const nextConfig: NextConfig = {
  devIndicators: {position:'top-right'},
  env: { NEXT_PUBLIC_APP_RUNTIME: sites ? "sites" : "nextjs" },
  ...(sites ? {} : {
    turbopack: {
      root: fileURLToPath(new URL(".", import.meta.url)),
      resolveAlias: { "@/lib/platform-database": "./lib/node-database.ts" },
    },
    webpack(config) {
      config.resolve.alias["@/lib/platform-database"] =
        fileURLToPath(new URL("./lib/node-database.ts", import.meta.url));
      return config;
    },
  }),
};

export default nextConfig;
