import { describe, expect, it } from "vitest";
import { xeroErrorMessage } from "@/lib/xero/errors";

describe("xeroErrorMessage", () => {
  it("parses stringified xero-node ApiError payloads", () => {
    const err = JSON.stringify({
      response: {
        statusCode: 400,
        body: {
          Message: "Invalid parameter",
          Detail: "periods must be less than or equal to 11",
          Type: "ValidationException",
        },
      },
    });
    expect(xeroErrorMessage(err)).toContain("Invalid parameter");
    expect(xeroErrorMessage(err)).toContain("11");
  });
});
