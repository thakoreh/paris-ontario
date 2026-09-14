/** No AI dependency is needed. An optional transformer must only consume supplied text. */
export interface SummaryProvider {
  summarize(sourceText: string): Promise<string>;
}
export async function summarizeSafely(
  sourceText: string,
  provider?: SummaryProvider,
) {
  if (!provider)
    return { text: sourceText, ai_used: false, review_required: false };
  try {
    const text = await provider.summarize(sourceText);
    if (!text.trim()) throw Error("Empty summary");
    return { text, ai_used: true, review_required: true };
  } catch {
    return { text: sourceText, ai_used: false, review_required: false };
  }
}
