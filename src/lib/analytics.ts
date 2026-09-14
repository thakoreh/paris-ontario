export type AnalyticsEvent =
  | "notice_viewed"
  | "source_clicked"
  | "deadline_viewed"
  | "deadline_reminder_added"
  | "location_added"
  | "alert_enabled"
  | "notice_saved"
  | "digest_signup"
  | "map_opened"
  | "event_clicked";
export interface AnalyticsProvider {
  track(
    event: AnalyticsEvent,
    properties: Record<string, string | number | boolean>,
  ): void;
}
let provider: AnalyticsProvider | undefined;
export function setAnalyticsProvider(next: AnalyticsProvider) {
  provider = next;
}
/** Only pass public IDs or coarse actions. Never send addresses or coordinates. */
export function track(
  event: AnalyticsEvent,
  properties: Record<string, string | number | boolean> = {},
) {
  provider?.track(event, properties);
}
