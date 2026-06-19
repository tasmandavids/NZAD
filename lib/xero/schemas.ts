import { z } from "zod";

export const xeroSettingsSchema = z.object({
  sync_enabled: z.boolean().optional(),
  sales_account_code: z.string().max(20).optional(),
  payment_account_code: z.string().max(20).optional(),
});

export type ParsedXeroSettings = z.infer<typeof xeroSettingsSchema>;
