import { getSession } from '@/lib/auth'
import { toAccount } from '@/lib/mappers'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ account: null })
  return Response.json({ account: toAccount(session) })
}
