export const MAX_MAILTO_URI_LENGTH = 2000;

const MAX_TITLE_LENGTH = 140;
const MAX_BODY_LENGTH = 2000;
const MAX_SOURCE_URL_LENGTH = 2048;
const MAX_NOTICE_TITLE_LENGTH = 200;
const MAX_NOTICE_URL_LENGTH = 2048;
const SHORT_SOURCE_LENGTH = 420;
const SHORT_BODY_LENGTH = 520;

type CommunityEmailInput = {
  title: string;
  body: string;
  sourceUrl: string;
};

type CorrectionEmailInput = {
  noticeTitle: string;
  noticeUrl: string;
  sourceUrl: string;
};

export type CommunityEmailDraft = {
  recipient: string;
  subject: string;
  fullText: string;
  shortText: string;
  mailto: string;
  wasTruncated: boolean;
};

function hasWellFormedUnicode(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (!(nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff)) return false;
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return false;
    }
  }
  return true;
}

function hasUnsafeControlCharacter(value: string): boolean {
  return /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value);
}

function hasHeaderBreak(value: string): boolean {
  return /[\r\n\t]/.test(value);
}

function boundedText(
  value: unknown,
  maxLength: number,
  options: { header?: boolean } = {},
): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    hasWellFormedUnicode(value) &&
    !hasUnsafeControlCharacter(value) &&
    (!options.header || !hasHeaderBreak(value))
  );
}

function isSafeSourceUrl(value: unknown, maxLength = MAX_SOURCE_URL_LENGTH): value is string {
  if (
    !boundedText(value, maxLength) ||
    /[\s\\]/.test(value) ||
    value.includes("#")
  ) {
    return false;
  }
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !!url.hostname.includes(".") &&
      !url.hostname.endsWith(".") &&
      !url.username &&
      !url.password &&
      !url.port &&
      !/^[\d.]+$/.test(url.hostname) &&
      !/\.(local|internal|localhost|test|example|invalid)$/i.test(url.hostname) &&
      ![...url.searchParams.keys()].some(
        (key) =>
          /token|api.?key|secret|password|auth|session|credential|signature|signed|jwt|access|reset|invite/i.test(
            key,
          ) || /^(key|code|sig|ticket)$/i.test(key),
      )
    );
  } catch {
    return false;
  }
}

function isCanonicalNoticeUrl(value: unknown): value is string {
  if (
    !boundedText(value, MAX_NOTICE_URL_LENGTH) ||
    /[\s\\]/.test(value)
  ) {
    return false;
  }
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "parispulse.ca" || url.hostname === "www.parispulse.ca") &&
      url.pathname.startsWith("/notice/") &&
      url.pathname.length > "/notice/".length &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

const strictEmailPattern = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export function normalizeSupportEmail(
  value = process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
): string | null {
  if (typeof value !== "string") return null;
  if (hasUnsafeControlCharacter(value) || hasHeaderBreak(value)) return null;
  const email = value.trim();
  if (email.length > 254 || !strictEmailPattern.test(email)) {
    return null;
  }
  return email;
}

function encodeComponent(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function encodedLength(value: string): number {
  return encodeComponent(value).length;
}

function fitToEncodedBudget(value: string, budget: number): string {
  if (encodedLength(value) <= budget) return value;
  const suffix =
    "\n\n[This email draft is shortened to fit safely. Full details are available in the copyable text below.]";
  if (encodedLength(suffix) > budget) {
    let output = "";
    for (const character of Array.from(value)) {
      const candidate = `${output}${character}`;
      if (encodedLength(candidate) > budget) break;
      output += character;
    }
    return output;
  }
  let output = "";
  for (const character of Array.from(value)) {
    const candidate = `${output}${character}${suffix}`;
    if (encodedLength(candidate) > budget) break;
    output += character;
  }
  return `${output}${suffix}`;
}

function shortExcerpt(value: string, maxLength: number): string {
  if (Array.from(value).length <= maxLength) return value;
  return `${Array.from(value).slice(0, maxLength).join("")}…`;
}

function makeMailtoDraft({
  recipient,
  subject,
  fullText,
  shortText,
  wasTruncated,
}: Omit<CommunityEmailDraft, "mailto">): CommunityEmailDraft {
  const prefix = `mailto:${encodeComponent(recipient)}?subject=${encodeComponent(subject)}&body=`;
  const budget = Math.max(0, MAX_MAILTO_URI_LENGTH - prefix.length);
  const boundedShortText = fitToEncodedBudget(shortText, budget);
  return {
    recipient,
    subject,
    fullText,
    shortText: boundedShortText,
    mailto: `${prefix}${encodeComponent(boundedShortText)}`,
    wasTruncated: wasTruncated || boundedShortText !== shortText,
  };
}

export function buildCommunityEmailDraft(
  input: CommunityEmailInput,
  configuredEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
): CommunityEmailDraft | null {
  const recipient = normalizeSupportEmail(configuredEmail);
  if (!recipient) return null;
  if (
    !boundedText(input.title, MAX_TITLE_LENGTH, { header: true }) ||
    !boundedText(input.body, MAX_BODY_LENGTH) ||
    !isSafeSourceUrl(input.sourceUrl)
  ) {
    return null;
  }

  const fullText = [
    "Hello Paris Pulse,",
    "",
    "I would like to share this public local update for editorial review.",
    "",
    `Title: ${input.title}`,
    `Original source: ${input.sourceUrl}`,
    "",
    "Details:",
    input.body,
    "",
    "Please review the original source before deciding whether anything should be published.",
  ].join("\n");
  const sourceExcerpt = shortExcerpt(input.sourceUrl, SHORT_SOURCE_LENGTH);
  const bodyExcerpt = shortExcerpt(input.body, SHORT_BODY_LENGTH);
  const sourceWasTruncated = sourceExcerpt !== input.sourceUrl;
  const bodyWasTruncated = bodyExcerpt !== input.body;
  const shortText = [
    "Hello Paris Pulse,",
    "",
    `Title: ${input.title}`,
    sourceWasTruncated
      ? "Original source: [paste the full source URL from copyable details]"
      : `Original source: ${sourceExcerpt}`,
    "",
    "Details:",
    bodyExcerpt,
    bodyWasTruncated ? "\n[Full details are available in the copyable text below.]" : "",
  ].join("\n");

  return makeMailtoDraft({
    recipient,
    subject: "Paris Pulse community update",
    fullText,
    shortText,
    wasTruncated: sourceWasTruncated || bodyWasTruncated,
  });
}

export function buildCorrectionEmailDraft(
  input: CorrectionEmailInput,
  configuredEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
): CommunityEmailDraft | null {
  const recipient = normalizeSupportEmail(configuredEmail);
  if (!recipient) return null;
  if (
    !boundedText(input.noticeTitle, MAX_NOTICE_TITLE_LENGTH, { header: true }) ||
    !isCanonicalNoticeUrl(input.noticeUrl) ||
    !isSafeSourceUrl(input.sourceUrl)
  ) {
    return null;
  }

  const fullText = [
    "Hello Paris Pulse,",
    "",
    "I would like to report a possible correction.",
    "",
    `Notice title: ${input.noticeTitle}`,
    `Paris Pulse notice: ${input.noticeUrl}`,
    `Original source: ${input.sourceUrl}`,
    "",
    "Please describe the correction in this email and include any source-backed context that would help an editor check it.",
  ].join("\n");
  const noticeWasTruncated = input.noticeUrl.length > SHORT_SOURCE_LENGTH;
  const sourceWasTruncated = input.sourceUrl.length > SHORT_SOURCE_LENGTH;
  const shortText = [
    "Hello Paris Pulse,",
    "",
    "I would like to report a possible correction.",
    "",
    `Notice title: ${input.noticeTitle}`,
    noticeWasTruncated
      ? "Paris Pulse notice: [paste the full notice URL from copyable details]"
      : `Paris Pulse notice: ${input.noticeUrl}`,
    sourceWasTruncated
      ? "Original source: [paste the full source URL from copyable details]"
      : `Original source: ${input.sourceUrl}`,
    "",
    "Please describe the correction in this email.",
  ].join("\n");

  return makeMailtoDraft({
    recipient,
    subject: "Paris Pulse correction request",
    fullText,
    shortText,
    wasTruncated: noticeWasTruncated || sourceWasTruncated,
  });
}
