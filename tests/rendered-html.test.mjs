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

  assert.match(source, /<Link className="tree-center-node" href="\/inquiry\/list#central-conclusion"[^>]+\/>/);
  assert.doesNotMatch(source, /centralClaim/);
});

test("the editor manages the Central Conclusion separately from claims", async () => {
  const source = await readFile(new URL("../public/admin/admin.js", import.meta.url), "utf8");

  assert.match(source, /label: "Central Conclusion"/);
  assert.match(source, /renderCentralConclusion/);
  assert.match(source, /\["Broader","Focused","Specific"\]/);
  assert.doesNotMatch(source, /centralClaimLocked/);
});

test("the CMS schema stores an unnumbered conclusion", async () => {
  const cms = await readFile(new URL("../app/data/cms.ts", import.meta.url), "utf8");
  const inquiry = await readFile(new URL("../app/data/inquiry.ts", import.meta.url), "utf8");

  assert.match(cms, /schemaVersion: 2/);
  assert.match(cms, /centralConclusion: CentralConclusion/);
  assert.match(inquiry, /level: "Broader" \| "Focused" \| "Specific"/);
  assert.doesNotMatch(inquiry, /level: "Central"/);
});

test("the production CMS and administrator use only same-origin endpoints", async () => {
  const runtimeFiles = [
    "../app/components/CmsProvider.tsx",
    "../app/components/ContributionForm.tsx",
    "../public/admin/admin.js",
    "../public/admin/index.html",
    "../public/admin/uploads.html",
    "../public/admin/uploads.js",
    "../server/cms.ts",
    "../server/contributions.ts",
    "../worker/index.ts",
  ];
  const sources = await Promise.all(runtimeFiles.map((path) => readFile(new URL(path, import.meta.url), "utf8")));
  const runtimeSource = sources.join("\n");

  assert.doesNotMatch(runtimeSource, /chatgpt\.site|pages\.dev|github\.io/);
  assert.doesNotMatch(runtimeSource, /NEXT_PUBLIC_CMS_API|CANONICAL_CMS/);
  assert.match(sources[0], /fetch\(cacheBustedUrl\("\/api\/cms\/public"\)/);
  assert.match(sources[2], /fetch\(`\/api\/cms\/\$\{path\}`/);
});
