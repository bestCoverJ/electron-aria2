import { readFile } from "node:fs/promises";

const app = await readFile("src/renderer/src/App.tsx", "utf8");
const css = await readFile("src/renderer/src/styles/globals.css", "utf8");
const designSystem = await readFile("design-system/MASTER.md", "utf8");

const checks = [
  {
    name: "React hooks are used for renderer state",
    pass: app.includes("useMemo") && app.includes("useState"),
  },
  {
    name: "Left menu and right list split layout exists",
    pass:
      app.includes("grid-cols-[264px_1fr]") &&
      app.includes("下载任务列表") &&
      app.includes("Sidebar"),
  },
  {
    name: "Compact mode shows progress and restores on double-click",
    pass:
      app.includes("isCompactMode") &&
      app.includes("onDoubleClick={onExpand}") &&
      app.includes("当前下载总进度"),
  },
  {
    name: "shadcn-style primitives and Lucide icons are used",
    pass:
      app.includes("@/components/ui/button") &&
      app.includes("@/components/ui/progress") &&
      app.includes("lucide-react"),
  },
  {
    name: "Accessible labels and visible focus states exist",
    pass:
      app.includes("aria-label") &&
      app.includes("aria-modal") &&
      app.includes("focus-visible:ring") &&
      css.includes("--ring"),
  },
  {
    name: "No horizontal overflow on the app shell",
    pass: app.includes("overflow-hidden") && app.includes("min-w-0"),
  },
  {
    name: "Light and dark themes are defined",
    pass: css.includes(":root") && css.includes(".dark"),
  },
  {
    name: "Reduced motion preference is respected",
    pass: css.includes("prefers-reduced-motion"),
  },
  {
    name: "Source Han Sans typography is the design-system default",
    pass:
      css.includes("Source Han Sans SC") &&
      designSystem.includes("Source Han Sans"),
  },
  {
    name: "Glass panels are restrained for readability",
    pass:
      css.includes(".glass-panel") &&
      css.includes("hsl(var(--card) / 0.78)") &&
      designSystem.includes("opaque-enough surfaces"),
  },
];

const failed = checks.filter((check) => !check.pass);

for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.name}`);
}

if (failed.length > 0) {
  throw new Error(`${failed.length} UI contract check(s) failed.`);
}

console.log("UI contract verification passed.");
