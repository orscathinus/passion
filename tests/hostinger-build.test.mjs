import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import test from "node:test";

async function exists(path) {
  try {
    return (await stat(new URL(path, import.meta.url))).isFile();
  } catch {
    return false;
  }
}

test("the Hostinger export contains every public route and administrator asset", async () => {
  const expected = [
    "../out/index.html",
    "../out/contact/index.html",
    "../out/exhibits/index.html",
    "../out/inquiry/index.html",
    "../out/inquiry/list/index.html",
    "../out/mission/index.html",
    "../out/qa-rules/index.html",
    "../out/who-we-are/index.html",
    "../out/admin/index.html",
    "../out/admin/admin.js",
    "../out/admin/uploads.html",
    "../out/hero-road.png",
  ];
  for (const path of expected) assert.equal(await exists(path), true, `Missing ${path}`);
});

test("the Hostinger deployment directory is self-contained", async () => {
  const expected = [
    "../hostinger-dist/server.mjs",
    "../hostinger-dist/out/index.html",
    "../hostinger-dist/out/admin/index.html",
    "../hostinger-dist/out/admin/admin.js",
    "../hostinger-dist/out/hero-road.png",
  ];
  for (const path of expected) assert.equal(await exists(path), true, `Missing ${path}`);
});

test("the Hostinger server is a Node and MySQL artifact, not a Worker artifact", async () => {
  const server = await readFile(new URL("../hostinger-dist/server.mjs", import.meta.url), "utf8");
  assert.match(server, /AllegoryNow is listening on port/);
  assert.match(server, /api\/_migration\/import/);
  assert.match(server, /fileURLToPath\(import\.meta\.url\)/);
  assert.doesNotMatch(server, /from ["']mysql2\/promise["']/);
  assert.doesNotMatch(server, /cloudflare:workers/);
  assert.doesNotMatch(server, /CANONICAL_CMS_ORIGIN|NEXT_PUBLIC_CMS_API/);
});

test("the Hostinger server starts before MySQL is initialized", async (context) => {
  const port = 32000 + Math.floor(Math.random() * 1000);
  const child = spawn(process.execPath, ["hostinger-dist/server.mjs"], {
    cwd: new URL("..", import.meta.url),
    env: {
      PATH: process.env.PATH,
      PORT: String(port),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  context.after(() => child.kill("SIGTERM"));

  await new Promise((resolvePromise, reject) => {
    const timer = setTimeout(() => reject(new Error("The Hostinger server did not start in time.")), 5000);
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`The Hostinger server exited during startup (${code}).`));
    });
    child.stdout.on("data", (chunk) => {
      if (!chunk.toString().includes("AllegoryNow is listening")) return;
      clearTimeout(timer);
      resolvePromise();
    });
  });

  const health = await fetch(`http://127.0.0.1:${port}/healthz`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { ok: true });

  const home = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /AllegoryNow/);
});

test("the Hostinger seed matches the current published CMS generation", async () => {
  const seed = JSON.parse(await readFile(new URL("../hostinger/published-seed.json", import.meta.url), "utf8"));
  assert.equal(seed.version, 22);
  assert.equal(seed.document.schemaVersion, 2);
  assert.equal(seed.document.centralConclusion.title, "FC");
  assert.deepEqual(seed.document.claims.map((claim) => claim.id), ["2", "3"]);
});

test("Hostinger deployment scripts keep the Cloudflare backup build separate", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(packageJson.scripts.build, "npm run build:hostinger");
  assert.equal(packageJson.scripts["build:sites"], "bash scripts/build-verified.sh");
  assert.equal(packageJson.scripts["build:hostinger"], "node scripts/build-hostinger.mjs");
  assert.equal(packageJson.scripts.start, "node hostinger-dist/server.mjs");
});
