/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("node:path");
const rcedit = require("rcedit");

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== "win32") return;
  const executable = path.join(context.appOutDir, "TideX.exe");
  const icon = path.join(
    context.packager.projectDir,
    "resources",
    "assets",
    "icons",
    "tide-logo.ico",
  );
  await rcedit(executable, {
    icon,
    "file-version": context.packager.appInfo.version,
    "product-version": context.packager.appInfo.version,
    "version-string": {
      CompanyName: "TideX",
      FileDescription: "TideX",
      InternalName: "TideX",
      OriginalFilename: "TideX.exe",
      ProductName: "TideX",
    },
  });
};
