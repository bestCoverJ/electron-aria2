import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const packageJson = JSON.parse(await readFile(new URL("package.json", root)));
const mainSource = await readFile(
  new URL("src/main/services/updates/application-updater.ts", root),
  "utf8",
);
const appEntrySource = await readFile(
  new URL("src/main/index.ts", root),
  "utf8",
);
const preloadSource = await readFile(
  new URL("src/preload/index.ts", root),
  "utf8",
);
const workflow = await readFile(
  new URL(".github/workflows/main.yml", root),
  "utf8",
);

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

expect(
  packageJson.dependencies?.["electron-updater"],
  "electron-updater must be a runtime dependency",
);
expect(
  packageJson.build?.publish?.provider === "github",
  "electron-builder must publish through GitHub",
);
expect(
  packageJson.repository?.url ===
    "https://github.com/bestCoverJ/electron-aria2.git",
  "package repository must identify the GitHub update source",
);
expect(
  !("signAndEditExecutable" in (packageJson.build?.win ?? {})),
  "Windows executable signing must not be disabled",
);
expect(
  packageJson.scripts?.pack?.includes("win.signAndEditExecutable=false"),
  "default local packaging must explicitly skip Windows signing",
);
expect(
  packageJson.scripts?.pack?.includes("electron-builder --win") &&
    !packageJson.scripts.pack.includes("--dir"),
  "default packaging must generate the configured Windows installer and archive targets",
);
expect(
  packageJson.scripts?.["pack:dir"]?.includes("--dir"),
  "directory-only packaging must remain available through pack:dir",
);
expect(
  !packageJson.scripts?.["pack:signed"]?.includes(
    "win.signAndEditExecutable=false",
  ),
  "signed packaging must retain Windows executable signing",
);
expect(
  mainSource.includes("autoDownload = false"),
  "updates must require an explicit download action",
);
expect(
  mainSource.includes("app.isPackaged"),
  "remote updates must be restricted to packaged apps",
);
expect(
  preloadSource.includes("updatesStatusChanged"),
  "preload must expose update status events",
);
expect(
  workflow.includes("CSC_LINK"),
  "release workflow must inject Windows signing credentials",
);
expect(
  workflow.includes("APPLE_APP_SPECIFIC_PASSWORD"),
  "release workflow must inject Apple notarization credentials",
);
expect(
  workflow.includes("verify:release-tag"),
  "release workflow must verify tag/package versions",
);
expect(
  packageJson.build?.productName === "TideX",
  "product name must be TideX",
);
expect(
  packageJson.build?.executableName === "TideX",
  "Windows executable must be TideX",
);
expect(
  packageJson.build?.afterPack === "scripts/after-pack.cjs",
  "Windows resources must be edited after packaging",
);
expect(
  appEntrySource.includes('app.setName("TideX")'),
  "runtime app name must be TideX",
);
expect(
  appEntrySource.includes('"tide-x"'),
  "legacy userData directory must remain stable",
);
expect(
  mainSource.includes("UPD-002"),
  "updater must expose stable error codes",
);
expect(
  mainSource.includes('"updater.log"'),
  "updater errors must be persisted to a log file",
);

if (failures.length) {
  throw new Error(`Release verification failed:\n- ${failures.join("\n- ")}`);
}

console.log("Release, signing, and updater contracts verified.");
