import { getSession, jsonError, requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toQuestion } from '@/lib/mappers'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  const denied = requireAdmin(session)
  if (denied) return denied
  const { id } = await context.params
  const [existing, body] = await Promise.all([
    prisma.pretestQuestion.findUnique({ where: { id } }),
    request.json().catch(() => ({})),
  ])
  if (!existing) return jsonError('Pertanyaan tidak ditemukan.', 404)
  const questionText = body.questionText !== undefined || body.title !== undefined
    ? String(body.questionText || body.title || '').trim()
    : existing.questionText
  if (!questionText) return jsonError('Teks pertanyaan wajib diisi.', 400)

  const questionType = String(body.questionType || body.type || existing.questionType)
  let options: string[] = []
  try {
    const parsed = JSON.parse(existing.optionsJson || '[]')
    options = Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    options = []
  }
  if (Array.isArray(body.options)) options = body.options.map(String)
  if (questionType === 'YES_NO') options = ['Ya', 'Tidak']
  if ((questionType === 'MULTIPLE_CHOICE' || questionType === 'CHECKBOX') && options.filter((o: string) => String(o).trim()).length === 0) {
    return jsonError('Harus ada minimal 1 opsi.', 400)
  }

  const active = body.active !== undefined ? Boolean(body.active) : body.status ? body.status === 'active' : existing.active
  const row = await prisma.pretestQuestion.update({
    where: { id },
    data: {
      questionText,
      questionType,
      optionsJson: JSON.stringify(options),
      required: body.required !== undefined ? Boolean(body.required) : existing.required,
      active,
      sortOrder: body.order !== undefined || body.sortOrder !== undefined ? Number(body.order || body.sortOrder) || 1 : existing.sortOrder,
      description: body.description !== undefined ? (body.description ? String(body.description) : null) : existing.description,
    },
  })
  return Response.json({ question: toQuestion(row) })
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  const denied = requireAdmin(session)
  if (denied) return denied
  const { id } = await context.params
  try {
    await prisma.pretestQuestion.delete({ where: { id } })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2025') {
      return jsonError('Pertanyaan tidak ditemukan.', 404)
    }
    throw err
  }
  return Response.json({ ok: true })
}
