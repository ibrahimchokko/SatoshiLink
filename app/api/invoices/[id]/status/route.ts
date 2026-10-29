import { refreshStatus } from '@/lib/service';
import { getInvoice } from '@/lib/store';
import { idSchema } from '@/lib/validation';

export async function GET(_req: Request, ctx: RouteContext<'/api/invoices/[id]/status'>) {
  const { id } = await ctx.params;
  const inv = idSchema.safeParse(id).success ? await getInvoice(id) : undefined;
  if (!inv) return Response.json({ error: 'Invoice not found' }, { status: 404 });
  return Response.json(await refreshStatus(inv), { headers: { 'Cache-Control': 'no-store' } });
}
