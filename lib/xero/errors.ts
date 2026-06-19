type XeroErrorBody = {
  Message?: string;
  Detail?: string;
  Title?: string;
  Type?: string;
  ErrorNumber?: number;
};

/** xero-node rejects with JSON.stringify(ApiError) or { response, body } shapes. */
export function xeroErrorMessage(err: unknown): string {
  let payload: unknown = err;

  if (typeof err === "string") {
    try {
      payload = JSON.parse(err);
    } catch {
      return err.length > 240 ? `${err.slice(0, 240)}…` : err;
    }
  }

  if (payload && typeof payload === "object") {
    const obj = payload as {
      body?: XeroErrorBody;
      response?: { body?: XeroErrorBody; data?: XeroErrorBody; statusCode?: number; status?: number };
    };

    const body = obj.body ?? obj.response?.body ?? obj.response?.data;
    if (body?.Message) {
      const parts = [body.Message, body.Detail, body.Type ? `(${body.Type})` : null].filter(Boolean);
      return parts.join(" — ");
    }
    if (body?.Title) return body.Title;

    const status = obj.response?.statusCode ?? obj.response?.status;
    if (status) return `HTTP ${status}`;
  }

  if (err instanceof Error && err.message) return err.message;
  return "Unknown Xero API error";
}
