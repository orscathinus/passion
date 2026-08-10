import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, extname, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { applyAdminSecurityHeaders, handleCmsRequest } from "../server/cms";
import { applyContributionAdminSecurityHeaders, handleContributionRequest } from "../server/contributions";
import { importCloudflareData, migrationRequestAuthorized } from "./import-cloudflare";
import { getHostingerRuntime } from "./mysql";

const STATIC_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "out");
const MIME_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".odp": "application/vnd.oasis.opendocument.presentation",
  ".ods": "application/vnd.oasis.opendocument.spreadsheet",
  ".odt": "application/vnd.oasis.opendocument.text",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xml": "application/xml; charset=utf-8",
};

let activeRuntime: Awaited<ReturnType<typeof getHostingerRuntime>> | undefined;

const server = createServer(async (incoming, outgoing) => {
  try {
    const request = webRequest(incoming);
    const url = new URL(request.url);

    if (url.pathname === "/healthz" && request.method === "GET") {
      await sendWebResponse(outgoing, Response.json({ ok: true }), request.method);
      return;
    }

    if (url.pathname === "/api/_migration/import") {
      if (request.method !== "POST" || !migrationRequestAuthorized(request)) {
        await sendWebResponse(outgoing, Response.json({ error: "Not found." }, { status: 404 }), request.method);
        return;
      }
      try {
        const runtime = await runtimeForRequest();
        const result = await importCloudflareData(runtime);
        await sendWebResponse(outgoing, Response.json({ ok: true, ...result }), request.method);
      } catch (error) {
        const message = error instanceof Error ? error.message : "The migration could not be completed.";
        await sendWebResponse(outgoing, Response.json({ error: message }, { status: 500 }), request.method);
      }
      return;
    }

    // Hostinger checks that the process is listening immediately after launch.
    // Initialize MySQL only for API requests so a slow or temporarily unavailable
    // database cannot make the otherwise healthy Node process fail its startup check.
    const runtime = url.pathname.startsWith("/api/") ? await runtimeForRequest() : undefined;

    const contributionResponse = runtime ? await handleContributionRequest(request, runtime) : null;
    if (contributionResponse) {
      await sendWebResponse(outgoing, applyAdminSecurityHeaders(request, applyContributionAdminSecurityHeaders(request, contributionResponse)), request.method);
      return;
    }

    const cmsResponse = runtime ? await handleCmsRequest(request, runtime) : null;
    if (cmsResponse) {
      await sendWebResponse(outgoing, applyAdminSecurityHeaders(request, cmsResponse), request.method);
      return;
    }

    await serveStatic(request, outgoing);
  } catch (error) {
    console.error("Hostinger request failed", error);
    if (!outgoing.headersSent) {
      outgoing.statusCode = 500;
      outgoing.setHeader("Cache-Control", "no-store");
      outgoing.setHeader("Content-Type", "text/plain; charset=utf-8");
    }
    outgoing.end("The server could not complete this request.");
  }
});

const port = Number(process.env.PORT ?? "3000");
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be a valid TCP port.");
server.listen(port, "0.0.0.0", () => console.log(`AllegoryNow is listening on port ${port}.`));

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => {
      if (!activeRuntime) {
        process.exit(0);
        return;
      }
      activeRuntime.pool.end().catch((error) => console.error("MySQL shutdown failed", error)).finally(() => process.exit(0));
    });
  });
}

async function runtimeForRequest() {
  activeRuntime ??= await getHostingerRuntime();
  return activeRuntime;
}

function webRequest(incoming: IncomingMessage) {
  const forwardedProtocol = incoming.headers["x-forwarded-proto"]?.toString().split(",")[0]?.trim();
  const protocol = forwardedProtocol === "https" ? "https" : "http";
  const authority = incoming.headers["x-forwarded-host"]?.toString().split(",")[0]?.trim() || incoming.headers.host || "localhost";
  const url = new URL(incoming.url || "/", `${protocol}://${authority}`);
  const headers = new Headers();
  for (const [name, value] of Object.entries(incoming.headers)) {
    if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
    else if (value !== undefined) headers.set(name, value);
  }
  const method = incoming.method || "GET";
  const init: RequestInit & { duplex?: "half" } = { headers, method };
  if (method !== "GET" && method !== "HEAD") {
    init.body = Readable.toWeb(incoming) as ReadableStream;
    init.duplex = "half";
  }
  return new Request(url, init);
}

async function sendWebResponse(outgoing: ServerResponse, response: Response, requestMethod: string) {
  outgoing.statusCode = response.status;
  response.headers.forEach((value, name) => outgoing.setHeader(name, value));
  if (requestMethod === "HEAD" || !response.body) {
    outgoing.end();
    return;
  }
  Readable.fromWeb(response.body as import("node:stream/web").ReadableStream).pipe(outgoing);
}

async function serveStatic(request: Request, outgoing: ServerResponse) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    outgoing.statusCode = 405;
    outgoing.setHeader("Allow", "GET, HEAD");
    outgoing.end();
    return;
  }

  const url = new URL(request.url);
  const decoded = decodeURIComponent(url.pathname);
  if (decoded.includes("\0")) return notFound(outgoing);
  const relative = decoded.replace(/^\/+/, "");
  const direct = safeStaticPath(relative || "index.html");
  const directoryIndex = safeStaticPath(`${relative.replace(/\/+$/, "")}/index.html`);
  const file = await regularFile(direct) ? direct : await regularFile(directoryIndex) ? directoryIndex : "";
  if (!file) return notFound(outgoing);

  if (file === directoryIndex && relative && !decoded.endsWith("/")) {
    outgoing.statusCode = 308;
    outgoing.setHeader("Location", `${url.pathname}/${url.search}`);
    outgoing.end();
    return;
  }

  const details = await stat(file);
  const extension = extname(file).toLowerCase();
  outgoing.statusCode = 200;
  outgoing.setHeader("Content-Length", String(details.size));
  outgoing.setHeader("Content-Type", MIME_TYPES[extension] ?? "application/octet-stream");
  outgoing.setHeader("X-Content-Type-Options", "nosniff");
  outgoing.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  if (url.pathname.startsWith("/_next/static/")) {
    outgoing.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  } else if (extension === ".html" || url.pathname.startsWith("/admin/")) {
    outgoing.setHeader("Cache-Control", "no-store");
  } else {
    outgoing.setHeader("Cache-Control", "public, max-age=3600");
  }
  if (url.pathname.startsWith("/admin/")) {
    outgoing.setHeader("Content-Security-Policy", "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    outgoing.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
    outgoing.setHeader("Referrer-Policy", "no-referrer");
    outgoing.setHeader("X-Frame-Options", "DENY");
  }
  if (request.method === "HEAD") {
    outgoing.end();
    return;
  }
  createReadStream(file).pipe(outgoing);
}

function safeStaticPath(relative: string) {
  const candidate = resolve(STATIC_ROOT, relative);
  return candidate === STATIC_ROOT || candidate.startsWith(`${STATIC_ROOT}${sep}`) ? candidate : "";
}

async function regularFile(path: string) {
  if (!path) return false;
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

function notFound(outgoing: ServerResponse) {
  outgoing.statusCode = 404;
  outgoing.setHeader("Cache-Control", "no-store");
  outgoing.setHeader("Content-Type", "text/plain; charset=utf-8");
  outgoing.end("Not found.");
}
