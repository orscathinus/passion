import { cp, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { build } from "esbuild";

await rm("out", { force: true, recursive: true });
await rm("hostinger-dist", { force: true, recursive: true });

await run(process.execPath, ["node_modules/next/dist/bin/next", "build"], {
  ...process.env,
  HOSTINGER_BUILD: "1",
});

await build({
  banner: {
    js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
  },
  bundle: true,
  entryPoints: ["hostinger/server.ts"],
  format: "esm",
  logLevel: "info",
  outfile: "hostinger-dist/server.mjs",
  platform: "node",
  sourcemap: true,
  target: "node22",
});

// Hostinger deploys one output directory. Keep the Node entry point and the
// exported site together so the "Other" framework preset can deploy this as a
// normal server-side Node application.
await cp("out", "hostinger-dist/out", { recursive: true });

function run(command, args, env) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`Hostinger static build failed (${signal || `exit ${code}`}).`));
    });
  });
}
