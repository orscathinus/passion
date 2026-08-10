export type SqlRunResult = {
  meta: {
    changes: number;
  };
};

export type SqlRows<T> = {
  results: T[];
};

export interface SqlStatement {
  bind(...values: unknown[]): SqlStatement;
  run(): Promise<SqlRunResult>;
  all<T>(): Promise<SqlRows<T>>;
  first<T>(): Promise<T | null>;
}

export interface SqlDatabase {
  prepare(sql: string): SqlStatement;
  batch(statements: SqlStatement[]): Promise<unknown>;
}

export interface StoredObject {
  body: BodyInit;
}

export interface ObjectStore {
  put(
    key: string,
    value: ReadableStream,
    options?: {
      customMetadata?: Record<string, string>;
      httpMetadata?: { contentType?: string };
    },
  ): Promise<unknown>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
}

export type AdminAuthMode = "password" | "workspace";

export function configuredAdminEmail(adminEmails: string | undefined) {
  return (adminEmails ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .find(Boolean) ?? "";
}

export function requestAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return request.headers.get("cf-connecting-ip")?.trim() || forwarded || "unknown";
}
