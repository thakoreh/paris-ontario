// Three attempts total, with bounded backoff. Callers decide which failures retry.
export async function withRetry<T>(
  operation: () => Promise<T>,
  delays = [250, 500],
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= delays.length) throw error;
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    }
  }
}
