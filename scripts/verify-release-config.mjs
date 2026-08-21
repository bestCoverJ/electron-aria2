import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const packageJson = JSON.parse(await readFile(new URL("package.json", root)));
const mainSource = await readFile(
  new URL("src/main/services/updates/application-updater.ts", root),
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
  packageJson.build?.publish?.owner === "${env.GH_OWNER}",
  "GitHub owner must come from GH_OWNER",
);
expect(
  packageJson.build?.publish?.repo === "${env.GH_REPO}",
  "GitHub repo must come from GH_REPO",
);
expect(
  !("signAndEditExecutable" in (packageJson.build?.win ?? {})),
  "Windows executable signing must not be disabled",
);
expect(
  packageJson.scripts?.["pack:unsigned"]?.includes(
    "win.signAndEditExecutable=false",
  ),
  "unsigned local packaging must explicitly skip Windows signing",
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

if (failures.length) {
  throw new Error(`Release verification failed:\n- ${failures.join("\n- ")}`);
}

console.log("Release, signing, and updater contracts verified.");
