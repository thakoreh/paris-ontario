import { describe, expect, it } from "vitest";
import { authErrorMessage } from "@/lib/auth-feedback";

describe("authentication feedback", () => {
  it("explains when signup confirmation email delivery is unavailable", () => {
    expect(
      authErrorMessage("signup", new Error("Error sending confirmation email")),
    ).toBe(
      "We couldn’t send the confirmation email. Email delivery needs to be configured for this project; please try again later.",
    );
  });
});
