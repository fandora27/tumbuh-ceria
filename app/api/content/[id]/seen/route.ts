import { getSession, jsonError, requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toArticle } from '@/lib/mappers'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  const denied = requireUser(session)
  if (denied) return denied
  if (session!.role !== 'parent') return jsonError('Akses ditolak.', 403)
  const { id } = await context.params
  const content = await prisma.educationContent.findUnique({ where: { id } })
  if (!content || content.status !== 'active') return jsonError('Konten tidak ditemukan.', 404)
  await prisma.contentView.upsert({
    where: { userId_contentId: { userId: session!.id, contentId: id } },
    update: { seenAt: new Date() },
    create: { userId: session!.id, contentId: id },
  })
  return Response.json({ article: toArticle(content, true) })
}
