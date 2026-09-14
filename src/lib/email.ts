import type { Match, Deadline } from "@/types";
import { isExpired } from "./relevance";
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}
export interface EmailProvider {
  send(
    message: EmailMessage,
  ): Promise<{ status: "sent" | "not_configured"; id?: string }>;
}
export class LocalEmailProvider implements EmailProvider {
  async send(_message: EmailMessage) {
    return { status: "not_configured" as const };
  }
}
export class ResendEmailProvider implements EmailProvider {
  constructor(
    private key: string,
    private from: string,
  ) {}
  async send(message: EmailMessage) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...message, from: this.from }),
    });
    if (!response.ok) throw Error(`Email provider error (${response.status})`);
    const data = await response.json();
    return { status: "sent" as const, id: String(data.id) };
  }
}
export function emailProvider(): EmailProvider {
  return process.env.RESEND_API_KEY && process.env.EMAIL_FROM
    ? new ResendEmailProvider(
        process.env.RESEND_API_KEY,
        process.env.EMAIL_FROM,
      )
    : new LocalEmailProvider();
}
export function generateDigest(
  matches: Match[],
  deadlines: Deadline[],
  base: string,
) {
  const live = matches.filter(
    (m) => !m.notice.is_sample && !isExpired(m.notice),
  );
  const upcoming = deadlines.filter(
    (d) => !d.is_sample && +new Date(d.deadline_at) > Date.now(),
  );
  return {
    subject: "Your Paris Pulse — what changed nearby",
    text: [
      "Your Paris Pulse",
      "",
      ...live
        .slice(0, 12)
        .flatMap((m) => [
          m.notice.title,
          m.match_reasons_json.join(" · "),
          `${base}/notice/${m.notice.slug}`,
          `Original source: ${m.notice.official_url}`,
          "",
        ]),
      "Deadlines coming up",
      ...upcoming
        .slice(0, 5)
        .flatMap((d) => [
          d.title,
          new Date(d.deadline_at).toISOString(),
          `${base}/deadline/${d.id}`,
          `Original source: ${d.official_url}`,
          "",
        ]),
      "Information can change. Verify important details with the original source.",
    ].join("\n"),
    notice_ids: live.slice(0, 12).map((m) => m.notice.id),
    deadline_ids: upcoming.slice(0, 5).map((d) => d.id),
  };
}
