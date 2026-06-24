import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type CertificatePdfInput = {
  studioName: string;
  studentName: string;
  certificateTitle: string;
  awardedAt: string;
  instructorName?: string | null;
};

function formatAwardDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function generateCertificatePdf(input: CertificatePdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([842, 595]); // A4 landscape
  const { width, height } = page.getSize();

  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const sans = await doc.embedFont(StandardFonts.Helvetica);

  const brand = rgb(0.12, 0.12, 0.14);
  const accent = rgb(0.55, 0.2, 0.45);
  const muted = rgb(0.45, 0.45, 0.5);

  // Border
  page.drawRectangle({
    x: 28,
    y: 28,
    width: width - 56,
    height: height - 56,
    borderColor: accent,
    borderWidth: 2,
  });
  page.drawRectangle({
    x: 36,
    y: 36,
    width: width - 72,
    height: height - 72,
    borderColor: accent,
    borderWidth: 0.5,
  });

  const centerX = width / 2;
  const drawCentered = (text: string, y: number, size: number, font = serif, color = brand) => {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: centerX - textWidth / 2, y, size, font, color });
  };

  drawCentered(input.studioName.toUpperCase(), height - 88, 11, sans, muted);
  drawCentered("Certificate of Achievement", height - 140, 28, serifBold, brand);
  drawCentered("This certifies that", height - 190, 14, serif, muted);

  drawCentered(input.studentName, height - 235, 32, serifBold, accent);

  drawCentered("has been awarded", height - 275, 14, serif, muted);
  drawCentered(input.certificateTitle, height - 320, 22, serifBold, brand);

  const dateLine = `Awarded on ${formatAwardDate(input.awardedAt)}`;
  drawCentered(dateLine, 120, 12, sans, muted);

  if (input.instructorName) {
    drawCentered(`Instructor: ${input.instructorName}`, 96, 11, sans, muted);
  }

  return doc.save();
}

export function certificatePdfFilename(studentName: string, title: string): string {
  const safe = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
  return `${safe(studentName)}-${safe(title)}-certificate.pdf`;
}
