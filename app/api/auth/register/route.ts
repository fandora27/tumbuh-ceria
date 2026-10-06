import { jsonError, signSession } from '@/lib/auth'
import { hashPassword } from '@/lib/password'
import { prisma } from '@/lib/prisma'
import { toAccount } from '@/lib/mappers'
import { ensureSeeded } from '@/lib/seed'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    await ensureSeeded()
    const body = await request.json().catch(() => ({}))
    const name = String(body.name || '').trim()
    const phone = String(body.phone || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')

    if (!name || !phone || !email || password.length < 8) {
      return jsonError(password.length < 8 ? 'Password minimal 8 karakter.' : 'Semua field wajib diisi.', 400)
    }

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) return jsonError('Email sudah digunakan oleh akun orang tua lain.', 409)

    const user = await prisma.user.create({
      data: {
        name,
        phone,
        email,
        role: 'parent',
        status: 'active',
        passwordHash: await hashPassword(password),
      },
    })

    return Response.json({ account: toAccount(user) })
  } catch (err) {
    console.error('[auth/register] gagal:', err)
    const message = err instanceof Error ? String(err.message).split('\n').map(l => l.trim()).filter(Boolean).find(l => /^error:/i.test(l)) || String(err.message).split('\n').map(l => l.trim()).filter(Boolean).slice(0, 4).join(' · ') : 'Kesalahan server yang tidak diketahui.'
    return jsonError(`Pendaftaran gagal: ${String(message).slice(0, 300)}`, 500)
  }
}
