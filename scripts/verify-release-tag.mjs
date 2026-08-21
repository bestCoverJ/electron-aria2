import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url)),
);
const tag = process.env.GITHUB_REF_NAME ?? process.argv[2];

if (!tag || !/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(tag)) {
  throw new Error(`发布 tag 必须符合 vX.Y.Z 格式，当前值: ${tag ?? "<empty>"}`);
}

if (tag.slice(1) !== packageJson.version) {
  throw new Error(
    `tag ${tag} 与 package.json 版本 ${packageJson.version} 不一致。`,
  );
}

console.log(
  `Release tag ${tag} matches package version ${packageJson.version}.`,
);
