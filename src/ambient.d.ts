// Minimal ambient stubs for `@vercel/blob` so v1.0 builds when the
// optional dep is not installed. When BLOB_READ_WRITE_TOKEN is set,
// the package is added and these stubs are shadowed by the real
// module at runtime.
declare module "@vercel/blob" {
  export function put(
    pathname: string,
    body: Blob | Buffer,
    options: { token: string; contentType?: string; access?: string }
  ): Promise<{ url: string }>;
  export function del(url: string, options: { token: string }): Promise<void>;
}
