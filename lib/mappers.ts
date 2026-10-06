import type { Account, Article, Child, ExternalFormConfig, FormResponse, Question, QuestionType } from './types'
import { DEFAULT_EXT_CONFIG } from './types'

export function ageFromBirth(birth: string) {
  if (!birth) return ''
  const d = new Date(birth)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  let months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
  if (now.getDate() < d.getDate()) months -= 1
  if (months < 0) return ''
  const years = Math.floor(months / 12)
  const m = months % 12
  if (years <= 0) return `${m} bln`
  if (m === 0) return `${years} th`
  return `${years} th ${m} bln`
}

export function initialsFromName(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

const COLORS = ['mint', 'peach', 'lavender', 'blue']

export function colorForIndex(index: number) {
  return COLORS[index % COLORS.length]
}

export function toAccount(user: { id: string; name: string; email: string; phone: string; role: string; status: string }): Account {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role as Account['role'],
    status: user.status,
  }
}

export function toChild(
  child: {
    id: string
    parentId: string
    name: string
    birth: string
    gender: string
    status: string
    initials: string
    color: string
  },
  pretest: boolean,
): Child {
  return {
    id: child.id,
    parentId: child.parentId,
    name: child.name,
    birth: child.birth,
    age: ageFromBirth(child.birth),
    gender: child.gender,
    status: child.status,
    initials: child.initials || initialsFromName(child.name),
    color: child.color,
    pretest,
  }
}

export function toQuestion(row: {
  id: string
  questionText: string
  category: string
  questionType: string
  optionsJson: string
  required: boolean
  active: boolean
  sortOrder: number
  description: string | null
}): Question {
  let options: string[] = []
  try {
    const parsed = JSON.parse(row.optionsJson || '[]')
    if (Array.isArray(parsed)) options = parsed.map(String)
  } catch {
    options = []
  }
  const qType = row.questionType as QuestionType
  return {
    questionId: row.id,
    questionText: row.questionText,
    category: row.category,
    questionType: qType,
    options,
    required: row.required,
    active: row.active,
    order: row.sortOrder,
    id: row.id,
    title: row.questionText,
    form: row.category,
    type: qType,
    status: row.active ? 'active' : 'inactive',
    description: row.description || undefined,
  }
}

export function toArticle(
  row: {
    id: string
    title: string
    category: string
    timeLabel: string
    color: string
    description: string
    mediaType: string | null
    status: string
    fileUrl: string | null
  },
  seen: boolean,
): Article {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    time: row.timeLabel,
    color: row.color,
    description: row.description,
    type: row.mediaType || undefined,
    status: row.status,
    fileUrl: row.fileUrl || undefined,
    seen,
  }
}

export function toResponse(row: { id: string; formName: string; childId: string; accountId: string; date: string; answersJson: string }): FormResponse {
  let answers: Record<string, string> = {}
  try {
    const parsed = JSON.parse(row.answersJson || '{}')
    if (parsed && typeof parsed === 'object') answers = parsed
  } catch {
    answers = {}
  }
  return {
    id: row.id,
    formName: row.formName,
    childId: row.childId,
    accountId: row.accountId,
    date: row.date,
    answers,
  }
}

export function parseExtConfig(raw: string | null | undefined): ExternalFormConfig {
  if (!raw) return DEFAULT_EXT_CONFIG
  try {
    const parsed = JSON.parse(raw)
    if (parsed?.kpsp && parsed?.screentime) {
      return {
        kpsp: {
          title: String(parsed.kpsp.title || DEFAULT_EXT_CONFIG.kpsp.title),
          description: String(parsed.kpsp.description || DEFAULT_EXT_CONFIG.kpsp.description),
          formUrl: String(parsed.kpsp.formUrl || ''),
        },
        screentime: {
          title: String(parsed.screentime.title || DEFAULT_EXT_CONFIG.screentime.title),
          description: String(parsed.screentime.description || DEFAULT_EXT_CONFIG.screentime.description),
          formUrl: String(parsed.screentime.formUrl || ''),
        },
      }
    }
  } catch {
    /* use default */
  }
  return DEFAULT_EXT_CONFIG
}
