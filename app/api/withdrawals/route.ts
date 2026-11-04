import { fieldErrors, withdrawSchema } from '@/lib/validation';
import { withdraw, WithdrawError } from '@/lib/withdraw';

export async function POST(req: Request) {
  // There's no login, and this spends the node's money. Requests through a public Cloudflare tunnel
  // (the "share localhost with judges" option) carry this header — only the node owner's own browser may withdraw.
  if (req.headers.get('cf-connecting-ip')) {
    return Response.json({ error: 'Withdrawals only work on the node owner’s own computer, not through a public link.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Request body must be JSON' }, { status: 400 });
  }

  const parsed = withdrawSchema.safeParse(body);
  if (!parsed.success) {
    const fields = fieldErrors(parsed.error);
    return Response.json({ error: Object.values(fields)[0] ?? 'Invalid input', fields }, { status: 400 });
  }

  try {
    const withdrawal = await withdraw(parsed.data);
    return Response.json({ withdrawal }, { status: 201 });
  } catch (e) {
    if (e instanceof WithdrawError) return Response.json({ error: e.message }, { status: 422 });
    console.error('[api] withdrawal failed:', (e as Error).message);
    return Response.json({ error: 'Something went wrong sending the withdrawal. Check the server logs.' }, { status: 500 });
  }
}
