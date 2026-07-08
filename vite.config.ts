import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
    css: { transformer: "lightningcss" },
    plugins: [
        tailwindcss(),
        tsConfigPaths({ projects: ["./tsconfig.json"] }),
        tanstackStart({
            importProtection: {
                behavior: "error",
                client: {
                    files: ["**/server/**"],
                    specifiers: ["server-only"],
                },
            },
            server: { entry: "server" },
        }),
        nitro({ defaultPreset: "cloudflare-module" }),
        viteReact(),
    ],
    resolve: {
        alias: {
            "@": `${process.cwd()}/src`,
        },
        dedupe: [
            "react",
            "react-dom",
            "react/jsx-runtime",
            "react/jsx-dev-runtime",
            "@tanstack/react-query",
            "@tanstack/query-core",
        ],
    },
    optimizeDeps: {
        include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime"],
        ignoreOutdatedRequests: true,
    },
    server: {
        host: "::",
        port: 8080,
        watch: {
            awaitWriteFinish: {
                stabilityThreshold: 1000,
                pollInterval: 100,
            },
        },
    },
});
