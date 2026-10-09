import { getSession, jsonError, requireUser } from '@/lib/auth'
import { loadBootstrap } from '@/lib/bootstrap'
import { ensureSeeded } from '@/lib/seed'

export const dynamic = 'force-dynamic'

export async function GET() {
  await ensureSeeded()
  const session = await getSession()
  const denied = requireUser(session)
  if (denied) return denied
  try {
    const data = await loadBootstrap(session!)
    return Response.json(data)
  } catch {
    return jsonError('Gagal memuat data.', 500)
  }
}
