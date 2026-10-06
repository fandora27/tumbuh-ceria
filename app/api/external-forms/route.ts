import { getSession, jsonError, requireAdmin, requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseExtConfig } from '@/lib/mappers'
import { DEFAULT_EXT_CONFIG } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  const denied = requireUser(session)
  if (denied) return denied
  const row = await prisma.appSetting.findUnique({ where: { key: 'external_forms' } })
  return Response.json({ extConfig: parseExtConfig(row?.value) })
}

export async function PUT(request: Request) {
  const session = await getSession()
  const denied = requireAdmin(session)
  if (denied) return denied
  const body = await request.json().catch(() => ({}))
  const current = parseExtConfig((await prisma.appSetting.findUnique({ where: { key: 'external_forms' } }))?.value)
  const next = {
    kpsp: { ...current.kpsp, ...(body.kpsp || {}) },
    screentime: { ...current.screentime, ...(body.screentime || {}) },
  }
  await prisma.appSetting.upsert({
    where: { key: 'external_forms' },
    update: { value: JSON.stringify(next), updatedBy: session!.id },
    create: { key: 'external_forms', value: JSON.stringify(next || DEFAULT_EXT_CONFIG), updatedBy: session!.id },
  })
  return Response.json({ extConfig: next })
}
