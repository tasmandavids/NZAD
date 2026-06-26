import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  certificatePdfFilename,
  generateCertificatePdf,
} from "@/lib/certificates/generate-certificate-pdf";

describe("certificatePdfFilename", () => {
  it("sanitizes student and certificate names for download headers", () => {
    expect(certificatePdfFilename("Ari Taylor-Smith", "Bronze Jazz Level 1")).toBe(
      "ari-taylor-smith-bronze-jazz-level-1-certificate.pdf",
    );
  });

  it("trims long unsafe segments to stable lowercase slugs", () => {
    expect(
      certificatePdfFilename(
        "  A Very Long Student Name With Symbols !!! ",
        "Contemporary Extension Award: Improvisation & Choreography",
      ),
    ).toBe("a-very-long-student-name-with-symbols-contemporary-extension-award-improvisati-certificate.pdf");
  });
});

describe("generateCertificatePdf", () => {
  it("creates a valid one-page landscape certificate PDF", async () => {
    const bytes = await generateCertificatePdf({
      studioName: "Olune Dance",
      studentName: "Ari Taylor",
      certificateTitle: "Bronze Jazz",
      awardedAt: "2026-06-20T10:00:00.000Z",
      instructorName: "Riley Coach",
    });

    expect(Buffer.from(bytes.subarray(0, 5)).toString("utf8")).toBe("%PDF-");

    const doc = await PDFDocument.load(bytes);
    const pages = doc.getPages();
    expect(pages).toHaveLength(1);
    expect(pages[0].getSize()).toEqual({ width: 842, height: 595 });
  });
});
