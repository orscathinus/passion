import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), developmentPreviewMeta);
});

test("the public Tree center is visually blank", async () => {
  const source = await readFile(new URL("../app/components/InquiryTree.tsx", import.meta.url), "utf8");

  assert.match(source, /<Link className="tree-center-node"[^>]+\/>/);
  assert.doesNotMatch(source, /<span>#\{centralClaim\.id\}<\/span>/);
});

test("the editor protects its only Central claim", async () => {
  const source = await readFile(new URL("../public/admin/admin.js", import.meta.url), "utf8");

  assert.match(source, /const centralClaimLocked = claim\.level === "Central"/);
  assert.match(source, /select\.disabled = centralClaimLocked/);
  assert.match(source, /The public Tree center remains visually blank\./);
});
