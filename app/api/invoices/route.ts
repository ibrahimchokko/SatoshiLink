import { friendlyLndError } from '@/lib/lnd';
import { createLndInvoice, publicInvoice } from '@/lib/service';
import { listInvoices } from '@/lib/store';
import { createInvoiceSchema, fieldErrors } from '@/lib/validation';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Request body must be JSON' }, { status: 400 });
  }

  const parsed = createInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    const fields = fieldErrors(parsed.error);
    return Response.json({ error: Object.values(fields)[0] ?? 'Invalid input', fields }, { status: 400 });
  }

  try {
    const invoice = await createLndInvoice(parsed.data);
    return Response.json({ invoice }, { status: 201 });
  } catch (e) {
    console.error('[api] create invoice failed:', (e as Error).message);
    const { message, kind } = friendlyLndError(e);
    return Response.json({ error: message, kind }, { status: 503 });
  }
}

export async function GET() {
  const invoices = (await listInvoices()).map(publicInvoice);
  return Response.json({ invoices }, { headers: { 'Cache-Control': 'no-store' } });
}
