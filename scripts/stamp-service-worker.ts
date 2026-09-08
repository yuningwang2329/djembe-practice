import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

export async function cacheVersionForFiles(paths: string[]): Promise<string> {
  const hash = createHash("sha256");
  for (const path of [...paths].sort()) hash.update(await readFile(path));
  return hash.digest("hex").slice(0, 12);
}

export async function stampServiceWorker(
  indexPath: string,
  serviceWorkerPath: string,
  additionalAssetPaths: string[] = [],
): Promise<string> {
  const version = await cacheVersionForFiles([indexPath, ...additionalAssetPaths]);
  const serviceWorker = await readFile(serviceWorkerPath, "utf8");
  if (!serviceWorker.includes("__CACHE_VERSION__")) {
    throw new Error("Service Worker is missing its cache-version placeholder");
  }
  await writeFile(serviceWorkerPath, serviceWorker.replaceAll("__CACHE_VERSION__", version));
  return version;
}
