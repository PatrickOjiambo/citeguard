import { createHash } from "node:crypto";

import type { SourceInput } from "../schema/acceptance.js";

import { dbReady } from "../db.js";
import { env } from "../env.js";
import { SourceCache } from "../models/index.js";

/**
 * Source fetcher + cache. URL sources are fetched and normalized to plain text,
 * cached by URL hash with a TTL. On fetch failure the source is kept but marked
 * unreachable so the pipeline can still return a valid `not_enough_info` result.
 */

export type ResolvedSource = {
  index: number;
  type: "url" | "text";
  value: string;
  reachable: boolean;
  text: string;
};

function hashUrl(url: string): string {
  return createHash("sha256").update(url).digest("hex");
}

/** Strip HTML to readable text. Deliberately lightweight (no heavy deps). */
export function htmlToText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchUrlText(url: string): Promise<{ text: string; reachable: boolean }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.SOURCE_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "CiteGuard/1.0 (+https://croo.network)" },
      redirect: "follow",
    });
    if (!res.ok)
      return { text: "", reachable: false };
    const contentType = res.headers.get("content-type") ?? "";
    const body = await res.text();
    const text = contentType.includes("html") ? htmlToText(body) : body.trim();
    return { text, reachable: text.length > 0 };
  }
  catch {
    return { text: "", reachable: false };
  }
  finally {
    clearTimeout(timer);
  }
}

async function resolveUrl(url: string): Promise<{ text: string; reachable: boolean }> {
  const urlHash = hashUrl(url);
  const useCache = dbReady();

  if (useCache) {
    const cached = await SourceCache.findOne({ urlHash }).lean();
    if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < (cached.ttl ?? env.SOURCE_CACHE_TTL_MS)) {
      return { text: cached.fetchedText, reachable: cached.reachable };
    }
  }

  const fetched = await fetchUrlText(url);

  if (useCache) {
    await SourceCache.updateOne(
      { urlHash },
      {
        urlHash,
        url,
        fetchedText: fetched.text,
        reachable: fetched.reachable,
        fetchedAt: new Date(),
        ttl: env.SOURCE_CACHE_TTL_MS,
      },
      { upsert: true },
    );
  }
  return fetched;
}

export async function resolveSources(sources: SourceInput[]): Promise<ResolvedSource[]> {
  return Promise.all(
    sources.map(async (s, index): Promise<ResolvedSource> => {
      if (s.type === "text") {
        return { index, type: "text", value: s.value, reachable: true, text: s.value };
      }
      const { text, reachable } = await resolveUrl(s.value);
      return { index, type: "url", value: s.value, reachable, text };
    }),
  );
}
