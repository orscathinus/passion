"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { defaultCmsDocument, type CmsDocument } from "../data/cms";

const CmsContext = createContext<CmsDocument>(defaultCmsDocument);

export function cmsApiUrl(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
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
        const response = await fetch(cacheBustedUrl("/api/cms/public"), {
          signal: controller.signal,
          credentials: "same-origin",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error("CMS unavailable");
        const payload: unknown = await response.json();
        const publishedDocument = payload && typeof payload === "object" && "document" in payload
          ? (payload as { document?: CmsDocument }).document
          : undefined;
        if (publishedDocument?.schemaVersion !== 2) throw new Error("CMS unavailable");
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
