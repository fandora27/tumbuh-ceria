import { getSession, jsonError, requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { colorForIndex, initialsFromName, toChild } from '@/lib/mappers'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  const denied = requireUser(session)
  if (denied) return denied

  const rows = await prisma.child.findMany({
    where: session!.role === 'admin' ? undefined : { parentId: session!.id },
    include: { submissions: { where: { formName: 'Pre-Test' }, select: { id: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return Response.json({ children: rows.map(c => toChild(c, c.submissions.length > 0)) })
}

export async function POST(request: Request) {
  const session = await getSession()
  const denied = requireUser(session)
  if (denied) return denied
  if (session!.role !== 'parent') return jsonError('Hanya orang tua yang dapat menambah anak.', 403)

  const body = await request.json().catch(() => ({}))
  const name = String(body.name || '').trim()
  const birth = String(body.birth || '').trim()
  const gender = String(body.gender || 'Perempuan')
  if (!name) return jsonError('Nama anak wajib diisi.', 400)

  const count = await prisma.child.count({ where: { parentId: session!.id } })
  const child = await prisma.child.create({
    data: {
      parentId: session!.id,
      name,
      birth,
      gender,
      status: 'Belum dipantau',
      initials: initialsFromName(name),
      color: colorForIndex(count),
    },
  })
  return Response.json({ child: toChild(child, false) })
}
