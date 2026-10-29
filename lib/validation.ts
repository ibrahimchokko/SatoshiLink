import { z } from 'zod';

export const MAX_SATS = 10_000_000;

export const createInvoiceSchema = z.object({
  clientName: z
    .string({ error: 'Client name is required' })
    .trim()
    .min(1, { error: 'Client name is required' })
    .max(60, { error: 'Client name must be 60 characters or less' }),
  clientEmail: z
    .union([z.literal(''), z.email({ error: 'That email address doesn’t look right' })])
    .optional()
    .transform((v) => (v ? v : undefined)),
  description: z
    .string({ error: 'Service description is required' })
    .trim()
    .min(1, { error: 'Service description is required' })
    .max(200, { error: 'Description must be 200 characters or less' }),
  amountSat: z
    .union([z.number(), z.string().trim()], { error: 'Amount must be a whole number of sats' })
    .transform((v) => (typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v))
    .pipe(
      z
        .number({ error: 'Amount must be a whole number of sats' })
        .int({ error: 'Amount must be a whole number of sats (no decimals)' })
        .min(1, { error: 'Amount must be at least 1 sat' })
        .max(MAX_SATS, { error: `Amount can’t be more than ${MAX_SATS.toLocaleString('en-US')} sats` }),
    ),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

/** Field → first error message, for showing next to form inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const flat = z.flattenError(error).fieldErrors as Record<string, string[] | undefined>;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(flat)) if (v?.[0]) out[k] = v[0];
  return out;
}

export const idSchema = z.string().regex(/^[a-z0-9]{10}$/);
