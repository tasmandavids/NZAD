// Pure helpers for public /enrol trial lead submissions.

export function splitParentName(fullName: string): { firstName: string; lastName: string | null } {
  const trimmed = fullName.trim().replace(/\s+/g, " ");
  if (!trimmed) return { firstName: "", lastName: null };
  const parts = trimmed.split(" ");
  if (parts.length === 1) return { firstName: parts[0], lastName: null };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function buildTrialLeadNotes(input: {
  childName?: string;
  className?: string;
  disciplineLabel?: string;
  phone?: string;
}): string {
  const lines: string[] = ["Trial request from /enrol"];
  if (input.childName?.trim()) lines.push(`Child: ${input.childName.trim()}`);
  if (input.className?.trim()) lines.push(`Class: ${input.className.trim()}`);
  if (input.disciplineLabel?.trim()) lines.push(`Interest: ${input.disciplineLabel.trim()}`);
  if (input.phone?.trim()) lines.push(`Phone: ${input.phone.trim()}`);
  return lines.join("\n");
}
