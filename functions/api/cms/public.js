const CANONICAL_CMS_URL = "https://allegorynow.thirtytwo32percent.chatgpt.site/api/cms/public";

export async function onRequestGet() {
  try {
    const upstream = await fetch(CANONICAL_CMS_URL, {
      headers: { Accept: "application/json" },
      cf: { cacheTtl: 0, cacheEverything: false },
    });

    if (!upstream.ok) {
      return Response.json(
        { error: "The published CMS could not be loaded." },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    const body = await upstream.text();
    return new Response(body, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Content-Type": "application/json; charset=utf-8",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  } catch {
    return Response.json(
      { error: "The published CMS could not be reached." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: { Allow: "GET, OPTIONS", "Cache-Control": "no-store" },
  });
}

export function onRequest() {
  return Response.json(
    { error: "Method not allowed." },
    { status: 405, headers: { Allow: "GET, OPTIONS", "Cache-Control": "no-store" } },
  );
}
