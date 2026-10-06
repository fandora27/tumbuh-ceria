import { getSession, jsonError, requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toChild, toResponse } from '@/lib/mappers'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const session = await getSession()
  const denied = requireUser(session)
  if (denied) return denied
  if (session!.role !== 'parent') return jsonError('Hanya orang tua yang dapat mengisi pre-test.', 403)

  const body = await request.json().catch(() => ({}))
  const childId = String(body.childId || '')
  const answers = body.answers && typeof body.answers === 'object' ? (body.answers as Record<string, string>) : {}

  const child = await prisma.child.findUnique({ where: { id: childId } })
  if (!child || child.parentId !== session!.id) return jsonError('Pilih anak terlebih dahulu.', 403)

  const existing = await prisma.pretestSubmission.findUnique({
    where: { childId_formName: { childId, formName: 'Pre-Test' } },
  })
  if (existing) return jsonError('Pre-Test untuk anak ini sudah dilakukan.', 409)

  const questions = await prisma.pretestQuestion.findMany({
    where: { category: 'Pre-Test', active: true },
    orderBy: { sortOrder: 'asc' },
  })
  const missing = questions.find(q => q.required && !(String(answers[q.id] || '').trim()))
  if (missing) return jsonError(`Pertanyaan wajib belum dijawab: "${missing.questionText}"`, 400)

  const dateStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
  const submission = await prisma.pretestSubmission.create({
    data: {
      formName: 'Pre-Test',
      childId,
      accountId: session!.id,
      date: dateStr,
      answersJson: JSON.stringify(answers),
      answers: {
        create: Object.entries(answers).map(([questionId, value]) => ({
          questionId,
          value: String(value ?? ''),
        })),
      },
    },
  })

  await prisma.child.update({
    where: { id: childId },
    data: { status: 'Sudah dipantau' },
  })

  const updated = await prisma.child.findUnique({ where: { id: childId } })
  return Response.json({
    response: toResponse(submission),
    child: toChild(updated!, true),
  })
}
