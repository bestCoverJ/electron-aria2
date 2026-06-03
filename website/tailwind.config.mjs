/** @type {import("tailwindcss").Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        tide: {
          ink: "#202124",
          muted: "#5f6368",
          blue: "#2f54eb",
          soft: "#f6f7f9",
          line: "#e5e7eb"
        }
      },
      fontFamily: {
        sans: [
          "Source Han Sans SC",
          "Noto Sans CJK SC",
          "Microsoft YaHei",
          "PingFang SC",
          "Inter",
          "system-ui",
          "sans-serif"
        ]
      }
    }
  }
};
