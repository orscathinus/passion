"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { defaultCmsDocument, type CmsDocument } from "../data/cms";

const CmsContext = createContext<CmsDocument>(defaultCmsDocument);
const configuredApi = process.env.NEXT_PUBLIC_CMS_API;
const CANONICAL_CMS_ORIGIN = "https://allegorynow.thirtytwo32percent.chatgpt.site";

export function cmsApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return configuredApi
    ? `${configuredApi.replace(/\/$/, "")}${normalizedPath}`
    : normalizedPath;
}

function publicCmsEndpoints() {
  const path = "/api/cms/public";
  const endpoints = [
    configuredApi ? `${configuredApi.replace(/\/$/, "")}${path}` : "",
    `${CANONICAL_CMS_ORIGIN}${path}`,
    path,
  ].filter(Boolean);
  return [...new Set(endpoints)];
}

function cacheBustedUrl(endpoint: string) {
  const divider = endpoint.includes("?") ? "&" : "?";
  return `${endpoint}${divider}published=${Date.now()}`;
}

export function CmsProvider({ children }: { children: ReactNode }) {
  const [document, setDocument] = useState<CmsDocument | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    let initialRequest = true;
    const loadPublishedDocument = async () => {
      try {
        let publishedDocument: CmsDocument | undefined;

        for (const endpoint of publicCmsEndpoints()) {
          try {
            const response = await fetch(cacheBustedUrl(endpoint), {
              signal: controller.signal,
              credentials: "omit",
              cache: "no-store",
              headers: { Accept: "application/json" },
            });
            if (!response.ok) continue;
            const payload: unknown = await response.json();
            const candidate = payload && typeof payload === "object" && "document" in payload
              ? (payload as { document?: CmsDocument }).document
              : undefined;
            if (candidate?.schemaVersion !== 2) continue;
            publishedDocument = candidate;
            break;
          } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") throw error;
          }
        }

        if (!publishedDocument) throw new Error("CMS unavailable");
        setDocument(publishedDocument);
      } catch (error) {
        if (initialRequest && !(error instanceof DOMException && error.name === "AbortError")) {
          // A neutral loading state is shown first; checked-in content is used only
          // if every live CMS endpoint is unavailable.
          setDocument(defaultCmsDocument);
        }
      } finally {
        initialRequest = false;
      }
    };

    loadPublishedDocument();
    const refresh = window.setInterval(loadPublishedDocument, 60_000);

    return () => {
      window.clearInterval(refresh);
      controller.abort();
    };
  }, []);

  if (!document) {
    return (
      <div className="cms-loading" role="status" aria-live="polite">
        <span aria-hidden="true">A</span>
        <p>Loading the latest published version…</p>
      </div>
    );
  }

  return <CmsContext.Provider value={document}>{children}</CmsContext.Provider>;
}

export function useCmsDocument() {
  return useContext(CmsContext);
}
