import { z } from "zod";
import { sourceUrl } from "@/lib/validation";
import type { Notice, Source } from "@/types";
export interface RawSourceItem {
  external_id: string;
  title: string;
  body: string;
  url: string;
  published_at: string;
  [key: string]: unknown;
}
export type NormalizedNotice = Omit<Notice, "id" | "slug">;
export interface SourceAdapter {
  fetch(): Promise<RawSourceItem[]>;
  normalize(item: RawSourceItem): Promise<NormalizedNotice>;
}
export class ManualSourceAdapter implements SourceAdapter {
  constructor(
    protected source: Source,
    private items: RawSourceItem[] = [],
  ) {}
  async fetch() {
    return this.items;
  }
  async normalize(item: RawSourceItem): Promise<NormalizedNotice> {
    sourceUrl.parse(item.url);
    return {
      community_id: this.source.community_id!,
      source_id: this.source.id,
      external_id: item.external_id,
      title: item.title,
      summary: item.body.slice(0, 2000),
      body: item.body,
      category: "other",
      severity: "info",
      official_url: item.url,
      published_at: z.string().datetime().parse(item.published_at),
      retrieved_at: new Date().toISOString(),
      verified_at: null,
      latitude: null,
      longitude: null,
      city: "",
      tags_json: [],
      verification_status: "needs_review",
      confidence_score: 0,
      is_sample: false,
    };
  }
}
/** Network fetching is injected by an operator-controlled runner. No arbitrary URL fetch from user input. */
export type ApprovedFetcher = (url: string) => Promise<string>;
export class JsonApiSourceAdapter extends ManualSourceAdapter {
  constructor(
    source: Source,
    private fetchApproved: ApprovedFetcher,
    private parse: (payload: unknown) => RawSourceItem[],
  ) {
    super(source);
  }
  async fetch() {
    if (!this.source.ingestion_enabled || !this.source.feed_url)
      throw Error("API ingestion is not configured. Use manual curation.");
    sourceUrl.parse(this.source.feed_url);
    return this.parse(
      JSON.parse(await this.fetchApproved(this.source.feed_url)),
    );
  }
}
export class RSSSourceAdapter extends ManualSourceAdapter {
  constructor(
    source: Source,
    private fetchApproved: ApprovedFetcher,
    private parseXml: (xml: string) => RawSourceItem[],
  ) {
    super(source);
  }
  async fetch() {
    if (!this.source.ingestion_enabled || !this.source.feed_url)
      throw Error("RSS feed and reviewed parser required.");
    sourceUrl.parse(this.source.feed_url);
    return this.parseXml(await this.fetchApproved(this.source.feed_url));
  }
}
export class HtmlSourceAdapter extends ManualSourceAdapter {
  constructor(
    source: Source,
    private fetchApproved: ApprovedFetcher,
    private parseHtml: (html: string) => RawSourceItem[],
    private termsReviewed = false,
  ) {
    super(source);
  }
  async fetch() {
    if (!this.termsReviewed || !this.source.ingestion_enabled)
      throw Error(
        "Review robots.txt and terms, then explicitly enable this source.",
      );
    sourceUrl.parse(this.source.url);
    return this.parseHtml(await this.fetchApproved(this.source.url));
  }
}
export async function ingest(adapter: SourceAdapter) {
  const started_at = new Date().toISOString();
  try {
    const raw = await adapter.fetch();
    const settled = await Promise.allSettled(
      raw.map((item) => adapter.normalize(item)),
    );
    return {
      started_at,
      completed_at: new Date().toISOString(),
      status: settled.some((r) => r.status === "rejected")
        ? "partial"
        : "success",
      records_found: raw.length,
      records_failed: settled.filter((r) => r.status === "rejected").length,
      notices: settled.flatMap((r) =>
        r.status === "fulfilled" ? [r.value] : [],
      ),
      error_message:
        settled
          .filter((r) => r.status === "rejected")
          .map((r) => String((r as PromiseRejectedResult).reason))
          .join("; ") || null,
    };
  } catch (e) {
    return {
      started_at,
      completed_at: new Date().toISOString(),
      status: "failed",
      records_found: 0,
      records_failed: 0,
      notices: [],
      error_message: e instanceof Error ? e.message : "Ingestion failed",
    };
  }
}
