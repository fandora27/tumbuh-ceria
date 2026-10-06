import type { Account, Article, Child, ExternalFormConfig, FormResponse, Question } from './types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (init?.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const res = await fetch(path, { credentials: 'include', ...init, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Permintaan gagal')
  return data as T
}

export type BootstrapPayload = {
  account: Account
  children: Child[]
  articles: Article[]
  questions: Question[]
  responses: FormResponse[]
  accounts: Account[]
  extConfig: ExternalFormConfig
}

export const api = {
  login(body: { identifier: string; password: string; role: 'parent' | 'admin'; remember?: boolean }) {
    return request<{ account: Account }>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) })
  },
  register(body: { name: string; email: string; phone: string; password: string }) {
    return request<{ account: Account }>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) })
  },
  forgot(email: string) {
    return request<{ ok: boolean }>('/api/auth/forgot', { method: 'POST', body: JSON.stringify({ email }) })
  },
  logout() {
    return request<{ ok: boolean }>('/api/auth/logout', { method: 'POST', body: JSON.stringify({}) })
  },
  me() {
    return request<{ account: Account | null }>('/api/auth/me')
  },
  bootstrap() {
    return request<BootstrapPayload>('/api/bootstrap')
  },
  updateProfile(body: { name: string; email: string; phone: string; password?: string }) {
    return request<{ account: Account }>('/api/profile', { method: 'PATCH', body: JSON.stringify(body) })
  },
  createChild(body: { name: string; birth: string; gender: string }) {
    return request<{ child: Child }>('/api/children', { method: 'POST', body: JSON.stringify(body) })
  },
  updateChild(id: string, body: { name: string; birth: string; gender: string }) {
    return request<{ child: Child }>(`/api/children/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
  },
  deleteChild(id: string) {
    return request<{ ok: boolean }>(`/api/children/${id}`, { method: 'DELETE' })
  },
  saveQuestion(body: Partial<Question> & { questionText: string; questionType: string }) {
    return request<{ question: Question }>('/api/questions', { method: 'POST', body: JSON.stringify(body) })
  },
  updateQuestion(id: string, body: Partial<Question>) {
    return request<{ question: Question }>(`/api/questions/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
  },
  deleteQuestion(id: string) {
    return request<{ ok: boolean }>(`/api/questions/${id}`, { method: 'DELETE' })
  },
  submitPretest(body: { childId: string; answers: Record<string, string> }) {
    return request<{ response: FormResponse; child: Child }>('/api/pretest', { method: 'POST', body: JSON.stringify(body) })
  },
  createContent(body: Partial<Article>) {
    return request<{ article: Article }>('/api/content', { method: 'POST', body: JSON.stringify(body) })
  },
  deleteContent(id: string) {
    return request<{ ok: boolean }>(`/api/content/${id}`, { method: 'DELETE' })
  },
  markContentSeen(id: string) {
    return request<{ article: Article }>(`/api/content/${id}/seen`, { method: 'POST', body: JSON.stringify({}) })
  },
  saveExtConfig(config: ExternalFormConfig) {
    return request<{ extConfig: ExternalFormConfig }>('/api/external-forms', { method: 'PUT', body: JSON.stringify(config) })
  },
  deleteUser(id: string) {
    return request<{ ok: boolean }>(`/api/admin/users/${id}`, { method: 'DELETE' })
  },
  resetUserPassword(id: string, password: string) {
    return request<{ ok: boolean }>(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ password }) })
  },
}
