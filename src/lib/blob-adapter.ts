import "server-only";

export type BlobUploadResult = {
  url: string;
  size: number;
  mime: string;
};

export type BlobAdapter = {
  upload: (
    folder: string,
    filename: string,
    body: Buffer,
    mime: string
  ) => Promise<BlobUploadResult>;
  delete: (url: string) => Promise<void>;
};

/**
 * Storage adapter factory. Falls back to local disk when Vercel Blob
 * isn't configured. Code that consumes uploads is unchanged
 * either way.
 *
 * Wired up in Week 7 of Room 1. For now, returns the local adapter.
 */
export async function getBlobAdapter(): Promise<BlobAdapter> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    return await makeVercelAdapter(token);
  }
  return makeLocalAdapter();
}

async function makeVercelAdapter(token: string): Promise<BlobAdapter> {
  // @vercel/blob is an optional dependency; loaded dynamically only
  // when BLOB_READ_WRITE_TOKEN is set, so v1.0 doesn't require it.
  const mod: any = await import(/* webpackIgnore: true */ "@vercel/blob").catch(
    () => null
  );
  if (!mod || typeof mod.put !== "function") {
    return makeLocalAdapter();
  }
  const { put, del } = mod;
  return {
    async upload(folder, filename, body, mime) {
      const path = `${folder}/${filename}`;
      const r = await put(path, body, { token, contentType: mime });
      return { url: r.url, size: body.length, mime };
    },
    async delete(url) {
      try {
        await del(url, { token });
      } catch {}
    },
  };
}

function makeLocalAdapter(): BlobAdapter {
  return {
    async upload(folder, filename, body, _mime) {
      const fs = await import("fs/promises");
      const path = await import("path");
      const dir = path.join(process.cwd(), "public", "uploads", folder);
      await fs.mkdir(dir, { recursive: true });
      const target = path.join(dir, filename);
      await fs.writeFile(target, body);
      return {
        url: `/uploads/${folder}/${filename}`,
        size: body.length,
        mime: _mime,
      };
    },
    async delete(url) {
      const fs = await import("fs/promises");
      const path = await import("path");
      const cleaned = url.replace(/^\/uploads\//, "").replace(/^https?:\/\/[^/]+\//, "");
      const p = path.join(process.cwd(), "public", "uploads", cleaned);
      try {
        await fs.unlink(p);
      } catch {}
    },
  };
}
