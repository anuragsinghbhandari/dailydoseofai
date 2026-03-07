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

const manifestPlugin = plugins.find(p => p && p.name === 'tanstack-start:start-manifest-plugin');
if (manifestPlugin && manifestPlugin.load && typeof manifestPlugin.load === 'object' && manifestPlugin.load.handler) {
  const origHandler = manifestPlugin.load.handler;
  manifestPlugin.load.handler = function (this: any, id: string, ...args: any[]) {
    if (typeof id === 'string' && id.includes('tanstack-start-manifest:v') && this.environment?.name === 'nitro') {
      // Temporarily mock environment name to 'ssr' so TanStack Start injects the manifest
      Object.defineProperty(this.environment, 'name', { value: 'ssr', configurable: true });
      const res = origHandler.apply(this, [id, ...args]);
      Object.defineProperty(this.environment, 'name', { value: 'nitro', configurable: true });
      return res;
    }
    return origHandler.apply(this, [id, ...args]);
  };
}

export default defineConfig({
  server: {
    port: 3000
  },
  plugins: plugins
});
