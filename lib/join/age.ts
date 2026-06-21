/** Returns true when the person is 18+ on the given date (studio-local calendar day). */
export function isAdult(birthday: string, asOf: Date = new Date()): boolean {
  const dob = new Date(birthday);
  if (Number.isNaN(dob.getTime())) return false;
  const cutoff = new Date(asOf);
  cutoff.setFullYear(cutoff.getFullYear() - 18);
  return dob <= cutoff;
}
