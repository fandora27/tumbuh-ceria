import { getSession, jsonError, requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { initialsFromName, toChild } from '@/lib/mappers'

export const dynamic = 'force-dynamic'

async function loadOwnedChild(sessionId: string, role: string, childId: string) {
  const child = await prisma.child.findUnique({
    where: { id: childId },
    include: { submissions: { where: { formName: 'Pre-Test' }, select: { id: true } } },
  })
  if (!child) return { error: jsonError('Data anak tidak ditemukan.', 404), child: null }
  if (role !== 'admin' && child.parentId !== sessionId) {
    return { error: jsonError('Akses ditolak.', 403), child: null }
  }
  return { error: null, child }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  const denied = requireUser(session)
  if (denied) return denied
  const { id } = await context.params
  const [found, body] = await Promise.all([
    loadOwnedChild(session!.id, session!.role, id),
    request.json().catch(() => ({})),
  ])
  if (found.error || !found.child) return found.error
  const name = String(body.name || found.child.name).trim()
  const birth = body.birth !== undefined ? String(body.birth || '') : found.child.birth
  const gender = String(body.gender || found.child.gender)
  if (!name) return jsonError('Nama anak wajib diisi.', 400)

  const child = await prisma.child.update({
    where: { id },
    data: { name, birth, gender, initials: initialsFromName(name) },
    include: { submissions: { where: { formName: 'Pre-Test' }, select: { id: true } } },
  })
  return Response.json({ child: toChild(child, child.submissions.length > 0) })
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  const denied = requireUser(session)
  if (denied) return denied
  const { id } = await context.params
  const { count } = await prisma.child.deleteMany({
    where: { id, ...(session!.role !== 'admin' ? { parentId: session!.id } : {}) },
  })
  if (count > 0) return Response.json({ ok: true })
  // Jalur error jarang terjadi (tidak ditemukan / bukan milik user) — pertahankan respons lama persis
  const found = await loadOwnedChild(session!.id, session!.role, id)
  if (found.error) return found.error
  return Response.json({ ok: true })
}
