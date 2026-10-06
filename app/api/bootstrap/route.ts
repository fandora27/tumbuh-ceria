import { getSession, jsonError, requireUser } from '@/lib/auth'
import { loadBootstrap } from '@/lib/bootstrap'

export const dynamic = 'force-dynamic'

export async function GET() {
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
