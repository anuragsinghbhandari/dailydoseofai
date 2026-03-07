import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";

const plugins = [
  tsconfigPaths(),
  tanstackStart({
    srcDirectory: "src",
    router: {
      routesDirectory: "routes"
    }
  }),
  nitro({
    entry: "src/server.ts"
  }),
  viteReact()
].flat(10) as any[];

// Helper to mock 'nitro' environment as 'ssr' for TanStack Start plugins
plugins.forEach(plugin => {
  if (plugin && plugin.name && plugin.name.includes('tanstack-start')) {
    // 1. Make plugin apply to 'nitro' if it was destined for 'ssr'
    if (typeof plugin.applyToEnvironment === 'function') {
      const origApply = plugin.applyToEnvironment;
      plugin.applyToEnvironment = function (env: any) {
        if (env.name === 'nitro') {
          return origApply.call(this, { ...env, name: 'ssr' });
        }
        return origApply.call(this, env);
      };
    }

    // 2. Mock 'this.environment.name' to 'ssr' inside the hooks so the internal logic works
    const hooks = ['resolveId', 'load', 'transform', 'buildStart', 'buildEnd', 'closeBundle', 'generateBundle', 'renderChunk', 'writeBundle'];
    for (const hook of hooks) {
      if (plugin[hook]) {
        const isObj = typeof plugin[hook] === 'object' && plugin[hook] !== null && plugin[hook].handler;
        const origHook = isObj ? plugin[hook].handler : plugin[hook];
        if (typeof origHook === 'function') {
          const mockedHook = function (this: any, ...args: any[]) {
            let reset = false;
            // Only mock if we are actually in the nitro environment
            if (this && this.environment && this.environment.name === 'nitro') {
              Object.defineProperty(this.environment, 'name', { value: 'ssr', configurable: true });
              reset = true;
            }
            try {
              return origHook.apply(this, args);
            } finally {
              if (reset) {
                Object.defineProperty(this.environment, 'name', { value: 'nitro', configurable: true });
              }
            }
          };
          if (isObj) {
            plugin[hook].handler = mockedHook;
          } else {
            plugin[hook] = mockedHook;
          }
        }
      }
    }
  }
});

export default defineConfig({
  server: {
    port: 3000
  },
  plugins: plugins
});
