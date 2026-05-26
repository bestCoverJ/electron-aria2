module.exports = {
  root: true,
  ignorePatterns: ["out", "dist", "dist-electron", "node_modules"],
  extends: [
    "@electron-toolkit/eslint-config-ts",
    "@electron-toolkit/eslint-config-prettier",
  ],
};
