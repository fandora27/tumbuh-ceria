import { getSession, jsonError, requireAdmin } from '@/lib/auth'
import { hashPassword } from '@/lib/password'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  const denied = requireAdmin(session)
  if (denied) return denied
  const { id } = await context.params
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user || user.role !== 'parent') return jsonError('Akun tidak ditemukan.', 404)
  const body = await request.json().catch(() => ({}))
  const password = String(body.password || '')
  if (password.length < 8) return jsonError('Password baru minimal 8 karakter.', 400)
  await prisma.user.update({ where: { id }, data: { passwordHash: await hashPassword(password) } })
  return Response.json({ ok: true })
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  const denied = requireAdmin(session)
  if (denied) return denied
  const { id } = await context.params
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user || user.role !== 'parent') return jsonError('Akun tidak ditemukan.', 404)
  await prisma.user.delete({ where: { id } })
  return Response.json({ ok: true })
}
