import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://tide-x.example.com",
  output: "static",
  vite: {
    cacheDir: ".astro-cache/vite"
  }
});
