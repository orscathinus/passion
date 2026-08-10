import { rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { build } from "esbuild";

await rm("out", { force: true, recursive: true });
await rm("hostinger-dist", { force: true, recursive: true });

await run(process.execPath, ["node_modules/next/dist/bin/next", "build"], {
  ...process.env,
  HOSTINGER_BUILD: "1",
});

await build({
  bundle: true,
  entryPoints: ["hostinger/server.ts"],
  format: "esm",
  logLevel: "info",
  outfile: "hostinger-dist/server.mjs",
  packages: "external",
  platform: "node",
  sourcemap: true,
  target: "node22",
});

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
