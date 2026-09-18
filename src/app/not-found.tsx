import Link from "next/link";
import type { Metadata } from "next";
import { privateRouteMetadata } from "@/lib/seo";

export const metadata: Metadata = privateRouteMetadata("Update not found");

export default function NotFound() {
  return (
    <div className="page-wrap">
      <h1>This update isn’t here.</h1>
      <p>It may have moved or may not be published yet.</p>
      <Link href="/today" className="button primary">
        Back to today in Paris
      </Link>
    </div>
  );
}
