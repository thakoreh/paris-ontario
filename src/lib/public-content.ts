import { isExpired } from "@/lib/relevance";
import type { Deadline, Notice } from "@/types";

export function isPublicNotice(notice: Notice, now = new Date()): boolean {
  const publishedAt = new Date(notice.published_at).getTime();
  return (
    notice.verification_status === "verified" &&
    !notice.is_sample &&
    Number.isFinite(publishedAt) &&
    publishedAt <= now.getTime() &&
    !isExpired(notice, now)
  );
}

export function isPublicDeadline(
  deadline: Deadline,
  now = new Date(),
): boolean {
  const deadlineAt = new Date(deadline.deadline_at).getTime();
  return (
    !deadline.is_sample &&
    Boolean(deadline.verified_at) &&
    Number.isFinite(deadlineAt) &&
    deadlineAt > now.getTime()
  );
}

type DatedContent = {
  source_updated_at?: string | null;
  published_at?: string | null;
  verified_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

export function contentLastModified(content: DatedContent): string | null {
  const value =
    content.source_updated_at ||
    content.verified_at ||
    content.published_at ||
    content.updated_at ||
    content.created_at;
  if (!value || !Number.isFinite(new Date(value).getTime())) return null;
  return value;
}
