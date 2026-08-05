/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { applyAdminSecurityHeaders, handleCmsRequest } from "../server/cms";
import { applyContributionAdminSecurityHeaders, handleContributionRequest } from "../server/contributions";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  UPLOADS: R2Bucket;
  ADMIN_EMAILS?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

function allowPublicCmsFromAnySite(response: Response) {
  const publicResponse = new Response(response.body, response);
  publicResponse.headers.set("Access-Control-Allow-Origin", "*");
  publicResponse.headers.set("Cross-Origin-Resource-Policy", "cross-origin");
  return publicResponse;
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    const contributionResponse = await handleContributionRequest(request, env);
    if (contributionResponse) return applyAdminSecurityHeaders(request, applyContributionAdminSecurityHeaders(request, contributionResponse));

    const cmsResponse = await handleCmsRequest(request, env);
    if (cmsResponse) {
      const securedResponse = applyAdminSecurityHeaders(request, cmsResponse);
      if (url.pathname === "/api/cms/public" && request.method === "GET") {
        // The published CMS document is intentionally public and is fetched
        // without credentials by GitHub Pages, Cloudflare Pages, and custom domains.
        return allowPublicCmsFromAnySite(securedResponse);
      }
      return securedResponse;
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    const response = await handler.fetch(request, env, ctx);
    return applyAdminSecurityHeaders(request, response);
  },
};

export default worker;
