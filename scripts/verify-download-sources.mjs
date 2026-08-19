import assert from "node:assert/strict";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const downloadsDirectory = join(
  process.cwd(),
  "src",
  "main",
  "services",
  "downloads",
);
const {
  maxDownloadBatchSize,
  normalizeDownloadSource,
  prepareDownloadBatch,
  redactDownloadSource,
} = await import(
  pathToFileURL(join(downloadsDirectory, "source-normalization.ts"))
);
const { planFollowedTaskMigrations } = await import(
  pathToFileURL(join(downloadsDirectory, "followed-task-planning.ts"))
);

const directSource = "https://user:secret@example.com/files/demo.bin?q=1";
const direct = normalizeDownloadSource(directSource);
assert.equal(direct.kind, "http");
assert.equal(direct.transportSource, directSource);
assert.equal(direct.displaySource.includes("user"), false);
assert.equal(direct.displaySource.includes("secret"), false);
assert.equal(redactDownloadSource(directSource).includes("secret"), false);

assert.equal(normalizeDownloadSource("FTP://example.com/a.bin").kind, "ftp");
assert.equal(normalizeDownloadSource("sftp://example.com/a.bin").kind, "ftp");
assert.equal(
  normalizeDownloadSource("https://example.com/file.TORRENT").remoteDescriptor,
  "torrent",
);
assert.equal(
  normalizeDownloadSource("https://example.com/file.meta4").canRename,
  false,
);
assert.equal(
  normalizeDownloadSource(join(downloadsDirectory, "fixture.TORRENT")).kind,
  "torrent",
);

const magnet = normalizeDownloadSource(
  "MAGNET:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567",
);
assert.equal(magnet.kind, "magnet");
assert.throws(() => normalizeDownloadSource("magnet:?dn=no-hash"), /xt/iu);

const plainTransport = "https://example.com/archive.bin";
const thunder = `thunder://${toBase64(`AA${plainTransport}ZZ`)}`;
const flashget = `flashget://${toBase64(
  `[FLASHGET]${plainTransport}[FLASHGET]`,
)}&ignored-tracker`;
const qqdl = `qqdl://${toUrlSafeBase64("sftp://example.com/archive.bin")}`;

assert.equal(normalizeDownloadSource(thunder).transportSource, plainTransport);
assert.equal(normalizeDownloadSource(thunder).kind, "thunder");
assert.equal(normalizeDownloadSource(flashget).transportSource, plainTransport);
assert.equal(
  normalizeDownloadSource(qqdl).transportSource,
  "sftp://example.com/archive.bin",
);
assert.equal(normalizeDownloadSource(qqdl).canRename, false);

assert.throws(
  () => normalizeDownloadSource(`thunder://${toBase64(plainTransport)}`),
  /AA…ZZ/iu,
);
assert.throws(
  () => normalizeDownloadSource(`flashget://${toBase64(plainTransport)}`),
  /FLASHGET/iu,
);
assert.throws(() => normalizeDownloadSource("qqdl://%%%"), /转义字符/iu);
assert.throws(() => normalizeDownloadSource("qqdl://***"), /Base64/iu);
assert.throws(
  () =>
    normalizeDownloadSource(`qqdl://${Buffer.from([0xff]).toString("base64")}`),
  /UTF-8/iu,
);
assert.throws(
  () => normalizeDownloadSource(`qqdl://${toBase64(thunder)}`),
  /协议不受支持/iu,
);
assert.throws(() => normalizeDownloadSource("ed2k://|file|a|1|x|/"), /ed2k/iu);
assert.throws(
  () => normalizeDownloadSource("thunderx://cloud-id"),
  /thunderx/iu,
);
assert.throws(
  () => normalizeDownloadSource("gopher://example.com/a"),
  /gopher/iu,
);
assert.throws(
  () => normalizeDownloadSource("https://pan.xunlei.com/s/example"),
  /迅雷云盘/iu,
);

const prepared = prepareDownloadBatch([
  `  ${plainTransport}  `,
  thunder,
  "ed2k://|file|a|1|x|/",
  "",
]);
assert.deepEqual(
  prepared.map((item) => item.status),
  ["ready", "skipped", "failed"],
);
assert.throws(() => prepareDownloadBatch([]), /至少/iu);
assert.throws(
  () =>
    prepareDownloadBatch(
      Array.from({ length: 101 }, (_, index) => `https://example.com/${index}`),
    ),
  new RegExp(String(maxDownloadBatchSize), "u"),
);

const parent = createTask("parent", ["child", "child"]);
const child = createTask("child");
const normal = createTask("normal");
const plan = planFollowedTaskMigrations([parent, child, normal]);
assert.deepEqual(plan.migrations, [
  { parentGid: "parent", childGids: ["child"] },
]);
assert.deepEqual(
  plan.visibleTasks.map((task) => task.gid),
  ["child", "normal"],
);

console.log(
  "download source verification passed: protocols, classic wrappers, redaction, validation, batch dedupe/limit, followed task planning",
);

function toBase64(value) {
  return Buffer.from(value, "utf8").toString("base64");
}

function toUrlSafeBase64(value) {
  return toBase64(value)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function createTask(gid, followedBy) {
  return {
    gid,
    status: "complete",
    totalLength: "0",
    completedLength: "0",
    downloadSpeed: "0",
    uploadSpeed: "0",
    connections: "0",
    followedBy,
  };
}
