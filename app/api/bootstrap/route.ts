import { getSessionClaims, jsonError } from '@/lib/auth'
import { loadBootstrap } from '@/lib/bootstrap'
import { ensureSeeded } from '@/lib/seed'
import { prisma } from '@/lib/prisma'
import { toAccount } from '@/lib/mappers'

export const dynamic = 'force-dynamic'

export async function GET() {
  await ensureSeeded()
  const claims = await getSessionClaims()
  if (!claims) return jsonError('Sesi tidak valid. Silakan masuk kembali.', 401)
  try {
    // Verifikasi user (ada & aktif) berjalan paralel dengan query bootstrap.
    const [user, data] = await Promise.all([
      prisma.user.findUnique({ where: { id: claims.id } }),
      loadBootstrap(claims),
    ])
    if (!user || user.status !== 'active') return jsonError('Sesi tidak valid. Silakan masuk kembali.', 401)
    return Response.json({ account: toAccount(user), ...data })
  } catch {
    return jsonError('Gagal memuat data.', 500)
  }
}
