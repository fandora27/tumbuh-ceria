import { prisma } from './prisma'
import { parseExtConfig, toAccount, toArticle, toChild, toQuestion, toResponse } from './mappers'
import { DEFAULT_EXT_CONFIG } from './types'

export async function loadBootstrap(session: { id: string; role: 'parent' | 'admin' }) {
  const isAdmin = session.role === 'admin'
  const [childrenRows, submissions, questions, articles, views, accounts, extSetting] = await Promise.all([
    prisma.child.findMany({
      where: isAdmin ? undefined : { parentId: session.id },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.pretestSubmission.findMany({
      where: isAdmin ? undefined : { accountId: session.id },
    }),
    prisma.pretestQuestion.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.educationContent.findMany({
      where: isAdmin ? undefined : { status: 'active' },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.contentView.findMany({ where: { userId: session.id } }),
    isAdmin ? prisma.user.findMany({ where: { role: 'parent' }, orderBy: { createdAt: 'desc' } }) : Promise.resolve([]),
    prisma.appSetting.findUnique({ where: { key: 'external_forms' } }),
  ])

  const pretestChildIds = new Set(submissions.filter(s => s.formName === 'Pre-Test').map(s => s.childId))
  const seenIds = new Set(views.map(v => v.contentId))

  return {
    children: childrenRows.map(c => toChild(c, pretestChildIds.has(c.id))),
    articles: articles.map(a => toArticle(a, seenIds.has(a.id))),
    questions: questions.map(toQuestion),
    responses: submissions.map(toResponse),
    accounts: accounts.map(toAccount),
    extConfig: parseExtConfig(extSetting?.value) || DEFAULT_EXT_CONFIG,
  }
}
