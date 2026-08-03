"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { defaultCmsDocument, type CmsDocument } from "../data/cms";

const CmsContext = createContext<CmsDocument>(defaultCmsDocument);
const configuredApi = process.env.NEXT_PUBLIC_CMS_API;

export function cmsApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return configuredApi
    ? `${configuredApi.replace(/\/$/, "")}${normalizedPath}`
    : normalizedPath;
}

export function CmsProvider({ children }: { children: ReactNode }) {
  const [document, setDocument] = useState<CmsDocument | null>(null);

  useEffect(() => {
    const endpoint = cmsApiUrl("/api/cms/public");
    const controller = new AbortController();

    let initialRequest = true;
    const loadPublishedDocument = async () => {
      try {
        const response = await fetch(endpoint, {
        signal: controller.signal,
        credentials: "omit",
        cache: "no-store",
        });
        if (!response.ok) throw new Error("CMS unavailable");
        const payload: unknown = await response.json();
        const candidate = payload && typeof payload === "object" && "document" in payload
          ? (payload as { document?: CmsDocument }).document
          : undefined;
        if (candidate?.schemaVersion !== 1) throw new Error("CMS response is invalid");
        setDocument(candidate);
      } catch (error) {
        if (initialRequest && !(error instanceof DOMException && error.name === "AbortError")) {
          // A neutral loading state is shown first; checked-in content is used only
          // if the live CMS cannot be reached, so stale writing never flashes.
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
