import { jsonError } from '@/lib/auth'
import { ensureSeeded } from '@/lib/seed'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  await ensureSeeded()
  const body = await request.json().catch(() => ({}))
  const email = String(body.email || '').trim()
  if (!email.includes('@')) return jsonError('Masukkan email orang tua yang valid.', 400)
  return Response.json({ ok: true })
}
