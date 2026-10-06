import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toAccount } from '@/lib/mappers'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ account: null })
  const user = await prisma.user.findUnique({ where: { id: session.id } })
  if (!user) return Response.json({ account: null })
  return Response.json({ account: toAccount(user) })
}
