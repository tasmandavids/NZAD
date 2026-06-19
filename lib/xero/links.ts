export type XeroResource = "dashboard" | "reports" | "invoices" | "invoice";

export function openInXeroUrl(
  orgShortCode: string | null | undefined,
  resource: XeroResource = "dashboard",
  resourceId?: string,
): string {
  if (!orgShortCode) {
    return "https://go.xero.com/";
  }

  const base = `https://go.xero.com/app/!${orgShortCode}`;

  switch (resource) {
    case "reports":
      return `${base}/Reports`;
    case "invoices":
      return `${base}/Invoices`;
    case "invoice":
      return resourceId
        ? `https://go.xero.com/AccountsReceivable/View.aspx?InvoiceID=${resourceId}`
        : `${base}/Invoices`;
    case "dashboard":
    default:
      return `${base}/Dashboard`;
  }
}
