"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { defaultCmsDocument, type CmsDocument } from "../data/cms";

const CmsContext = createContext<CmsDocument>(defaultCmsDocument);
const configuredApi = process.env.NEXT_PUBLIC_CMS_API;

export function CmsProvider({ children }: { children: ReactNode }) {
  const [document, setDocument] = useState(defaultCmsDocument);

  useEffect(() => {
    const endpoint = configuredApi
      ? `${configuredApi.replace(/\/$/, "")}/api/cms/public`
      : "/api/cms/public";
    const controller = new AbortController();

    const loadPublishedDocument = () => {
      fetch(endpoint, {
        signal: controller.signal,
        credentials: "omit",
        cache: "no-store",
      })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error("CMS unavailable")))
        .then((payload: unknown) => {
          const candidate = payload && typeof payload === "object" && "document" in payload
            ? (payload as { document?: CmsDocument }).document
            : undefined;
          if (candidate?.schemaVersion === 1) setDocument(candidate);
        })
        .catch(() => {
          // The checked-in content remains the reliable fallback for static builds.
        });
    };

    loadPublishedDocument();
    const refresh = window.setInterval(loadPublishedDocument, 60_000);

    return () => {
      window.clearInterval(refresh);
      controller.abort();
    };
  }, []);

  return <CmsContext.Provider value={document}>{children}</CmsContext.Provider>;
}

export function useCmsDocument() {
  return useContext(CmsContext);
}
