import { getSession, jsonError, requireAdmin, requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toQuestion } from '@/lib/mappers'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  const denied = requireUser(session)
  if (denied) return denied
  const rows = await prisma.pretestQuestion.findMany({ orderBy: { sortOrder: 'asc' } })
  return Response.json({ questions: rows.map(toQuestion) })
}

export async function POST(request: Request) {
  const session = await getSession()
  const denied = requireAdmin(session)
  if (denied) return denied
  const body = await request.json().catch(() => ({}))
  const questionText = String(body.questionText || body.title || '').trim()
  if (!questionText) return jsonError('Teks pertanyaan wajib diisi.', 400)
  const questionType = String(body.questionType || body.type || 'SHORT_ANSWER')
  const options = Array.isArray(body.options) ? body.options.map(String) : []
  if ((questionType === 'MULTIPLE_CHOICE' || questionType === 'CHECKBOX') && options.filter((o: string) => o.trim()).length === 0) {
    return jsonError('Harus ada minimal 1 opsi.', 400)
  }
  const required = body.required !== false
  const active = body.active !== false && body.status !== 'inactive'
  const sortOrder = Number(body.order || body.sortOrder || 1) || 1
  const row = await prisma.pretestQuestion.create({
    data: {
      questionText,
      category: 'Pre-Test',
      questionType,
      optionsJson: JSON.stringify(questionType === 'YES_NO' ? ['Ya', 'Tidak'] : options),
      required,
      active,
      sortOrder,
      description: body.description ? String(body.description) : null,
      createdById: session!.id,
    },
  })
  return Response.json({ question: toQuestion(row) })
}
