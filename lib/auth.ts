import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from './prisma'
import { ensureSeeded } from './seed'

const COOKIE = 'tc_session'

function secret() {
  const value = process.env.AUTH_SECRET || 'tumbuh-ceria-dev-auth-secret-ganti-di-produksi-32+'
  return new TextEncoder().encode(value)
}

export type SessionUser = {
  id: string
  email: string
  name: string
  phone: string
  role: 'parent' | 'admin'
  status: string
}

export async function signSession(user: { id: string; email: string; role: string }, remember: boolean) {
  const token = await new SignJWT({ email: user.email, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(remember ? '30d' : '7d')
    .sign(secret())

  const store = await cookies()
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7,
  })
}

export async function clearSession() {
  const store = await cookies()
  store.delete(COOKIE)
}

export async function getSession(): Promise<SessionUser | null> {
  await ensureSeeded()
  const store = await cookies()
  const token = store.get(COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret())
    const id = String(payload.sub || '')
    if (!id) return null
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user || user.status !== 'active') return null
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role as 'parent' | 'admin',
      status: user.status,
    }
  } catch {
    return null
  }
}

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

export function requireUser(session: SessionUser | null) {
  if (!session) return jsonError('Sesi tidak valid. Silakan masuk kembali.', 401)
  return null
}

export function requireAdmin(session: SessionUser | null) {
  const auth = requireUser(session)
  if (auth) return auth
  if (session!.role !== 'admin') return jsonError('Akses ditolak.', 403)
  return null
}
