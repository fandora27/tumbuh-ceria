import { getSession, jsonError, requireUser } from '@/lib/auth'
import { hashPassword } from '@/lib/password'
import { prisma } from '@/lib/prisma'
import { toAccount } from '@/lib/mappers'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request) {
  const session = await getSession()
  const denied = requireUser(session)
  if (denied) return denied

  const body = await request.json().catch(() => ({}))
  const name = String(body.name || '').trim()
  const email = String(body.email || '').trim().toLowerCase()
  const phone = String(body.phone || '').trim()
  const password = body.password ? String(body.password) : ''

  if (!name) return jsonError('Nama tidak boleh kosong.', 400)
  if (password && password.length < 8) return jsonError('Password baru minimal 8 karakter.', 400)

  if (email) {
    const taken = await prisma.user.findFirst({ where: { email, NOT: { id: session!.id } } })
    if (taken) return jsonError('Email sudah digunakan oleh akun lain.', 409)
  }

  const user = await prisma.user.update({
    where: { id: session!.id },
    data: {
      name,
      phone,
      ...(email ? { email } : {}),
      ...(password ? { passwordHash: await hashPassword(password) } : {}),
    },
  })

  return Response.json({ account: toAccount(user) })
}
