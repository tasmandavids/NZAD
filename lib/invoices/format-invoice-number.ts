/** Format a studio invoice sequence as INV-0001. */
export function formatInvoiceNumber(invoiceNumber: number): string {
  return `INV-${String(invoiceNumber).padStart(4, "0")}`;
}
