import { getSession, jsonError, requireAdmin, requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toArticle } from '@/lib/mappers'
import { saveDataUrlFile } from '@/lib/uploads'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  const denied = requireUser(session)
  if (denied) return denied
  const [rows, views] = await Promise.all([
    prisma.educationContent.findMany({
      where: session!.role === 'admin' ? undefined : { status: 'active' },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.contentView.findMany({ where: { userId: session!.id } }),
  ])
  const seen = new Set(views.map(v => v.contentId))
  return Response.json({ articles: rows.map(a => toArticle(a, seen.has(a.id))) })
}

export async function POST(request: Request) {
  const session = await getSession()
  const denied = requireAdmin(session)
  if (denied) return denied
  const body = await request.json().catch(() => ({}))
  const title = String(body.title || '').trim()
  const description = String(body.description || '').trim()
  const fileUrlRaw = String(body.fileUrl || '')
  if (!description) return jsonError('Deskripsi konten wajib diisi.', 400)
  if (!fileUrlRaw) return jsonError('File konten wajib diunggah.', 400)

  const fileUrl = await saveDataUrlFile(fileUrlRaw, 'content')
  const row = await prisma.educationContent.create({
    data: {
      title: title || 'Konten edukasi',
      category: String(body.category || 'Edukasi'),
      timeLabel: String(body.time || 'Baru'),
      color: String(body.color || 'mint'),
      description,
      mediaType: body.type ? String(body.type) : null,
      status: 'active',
      fileUrl,
      authorId: session!.id,
    },
  })
  return Response.json({ article: toArticle(row, false) })
}
