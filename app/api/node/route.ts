import { fetchNodeInfo } from '@/lib/service';

export async function GET() {
  const result = await fetchNodeInfo();
  return Response.json(result, { status: result.ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}
