import { describe, expect, it } from "vitest";
import { parseClassPaste, parseStudentPaste } from "@/lib/setup/parsers";

describe("parseStudentPaste", () => {
  it("parses tab-separated rows without headers", () => {
    const rows = parseStudentPaste("Emma Johnson\temma@test.com\t021 111");
    expect(rows).toHaveLength(1);
    expect(rows[0].fullName).toBe("Emma Johnson");
    expect(rows[0].email).toBe("emma@test.com");
  });

  it("maps parent columns separately from parent email", () => {
    const text = [
      "Student Name\tEmail\tParent Name\tParent Email",
      "Emma Johnson\temma@test.com\tJane Johnson\tjane@test.com",
    ].join("\n");
    const rows = parseStudentPaste(text);
    expect(rows[0].parentName).toBe("Jane Johnson");
    expect(rows[0].parentEmail).toBe("jane@test.com");
  });

  it("combines first and last name columns", () => {
    const text = "First Name\tLast Name\tEmail\nEmma\tJohnson\temma@test.com";
    const rows = parseStudentPaste(text);
    expect(rows[0].fullName).toBe("Emma Johnson");
  });

  it("returns empty for blank input", () => {
    expect(parseStudentPaste("")).toEqual([]);
    expect(parseStudentPaste("   \n  ")).toEqual([]);
  });
});

describe("parseClassPaste", () => {
  it("parses class rows with day and time", () => {
    const text = "Class\tStyle\tDay\tStart\tEnd\nJunior Ballet\tBallet\tMon\t4:00pm\t5:00pm";
    const rows = parseClassPaste(text);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Junior Ballet");
    expect(rows[0].dayOfWeek).toBe(1);
    expect(rows[0].startTime).toBe("16:00");
  });
});
