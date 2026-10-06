export type Role = 'parent' | 'admin'

export type Account = {
  id: string
  name: string
  email: string
  phone: string
  password?: string
  role: Role
  status?: string
}

export type Child = {
  id: string
  name: string
  birth: string
  age: string
  gender: string
  status: string
  initials: string
  color: string
  pretest: boolean
  parentId: string
}

export type QuestionType = 'SHORT_ANSWER' | 'PARAGRAPH' | 'MULTIPLE_CHOICE' | 'CHECKBOX' | 'YES_NO' | 'NUMBER'

export interface Question {
  questionId: string
  questionText: string
  category: string
  questionType: QuestionType
  options: string[]
  required: boolean
  active: boolean
  order: number
  id: string
  title: string
  form: string
  type: QuestionType | string
  status: 'active' | 'inactive'
  description?: string
}

export type Article = {
  id: string
  title: string
  category: string
  time: string
  color: string
  seen?: boolean
  description?: string
  type?: string
  status?: string
  fileUrl?: string
}

export type FormResponse = {
  id: string
  formName: string
  childId: string
  accountId: string
  date: string
  answers: Record<string, string>
}

export type ExternalFormConfig = {
  kpsp: { title: string; description: string; formUrl: string }
  screentime: { title: string; description: string; formUrl: string }
}

export const DEFAULT_EXT_CONFIG: ExternalFormConfig = {
  kpsp: {
    title: 'Tes KPSP',
    description: 'Kuesioner Pra Skrining Perkembangan (KPSP). Klik link di bawah untuk mengisi melalui Google Forms yang telah disediakan admin.',
    formUrl: '',
  },
  screentime: {
    title: 'Pemantauan Screen Time',
    description: 'Pantau screen time anak melalui Google Forms yang telah disediakan admin.',
    formUrl: '',
  },
}
