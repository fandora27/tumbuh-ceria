import { NextRequest } from 'next/server'
import { jsonError, signSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/password'
import { toAccount } from '@/lib/mappers'
import { ensureSeeded } from '@/lib/seed'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  await ensureSeeded()
  const body = await request.json().catch(() => ({}))
  const identifier = String(body.identifier || '').trim()
  const password = String(body.password || '')
  const role = body.role === 'admin' ? 'admin' : 'parent'
  const remember = Boolean(body.remember)

  if (!identifier || !password) return jsonError('Semua field wajib diisi.', 400)

  const user = await prisma.user.findFirst({
    where: {
      email: identifier.toLowerCase(),
      role,
    },
  })

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return jsonError(role === 'admin' ? 'Username atau password admin salah.' : 'Email atau password orang tua salah.', 401)
  }
  if (user.status !== 'active') return jsonError('Akun tidak aktif.', 403)

  await signSession(user, remember)
  return Response.json({ account: toAccount(user) })
}
