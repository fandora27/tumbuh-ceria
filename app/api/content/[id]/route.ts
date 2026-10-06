import { getSession, jsonError, requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  const denied = requireAdmin(session)
  if (denied) return denied
  const { id } = await context.params
  const existing = await prisma.educationContent.findUnique({ where: { id } })
  if (!existing) return jsonError('Konten tidak ditemukan.', 404)
  await prisma.educationContent.delete({ where: { id } })
  return Response.json({ ok: true })
}
