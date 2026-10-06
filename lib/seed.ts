import { prisma } from './prisma'
import { hashPassword } from './password'
import { DEFAULT_EXT_CONFIG } from './types'

const INITIAL_ARTICLES = [
  {
    title: 'Membangun rutinitas tidur yang sehat',
    category: 'Kesehatan',
    timeLabel: '5 min baca',
    color: 'mint',
    description:
      'Rutinitas tidur yang konsisten membantu anak merasa tenang, nyaman, dan lebih mudah terlelap. Mulai dengan mandi air hangat, membacakan buku cerita, dan meredupkan lampu kamar 30 menit sebelum jam tidur untuk menciptakan suasana rileks.',
  },
  {
    title: 'Ide aktivitas bermain untuk usia 3-5 tahun',
    category: 'Aktivitas',
    timeLabel: '7 min baca',
    color: 'peach',
    description:
      'Aktivitas sensori dan motorik seperti bermain plastisin/playdough, menyusun balok kayu, dan mewarnai bersama dapat mengasah kreativitas, koordinasi mata-tangan, serta kemampuan fokus si Kecil.',
  },
  {
    title: 'Mengenal tanda tumbuh kembang anak',
    category: 'Perkembangan',
    timeLabel: '6 min baca',
    color: 'lavender',
    description:
      'Setiap anak bertumbuh dengan ritme uniknya masing-masing. Pantau tonggak capaian motorik kasar, motorik halus, bahasa/komunikasi, dan sosial-emosional secara berkala melalui tes KPSP dan catatan perkembangan mandiri.',
  },
]

const INITIAL_QUESTIONS = [
  {
    questionText: 'Seberapa sering anak membaca buku?',
    questionType: 'MULTIPLE_CHOICE',
    optionsJson: JSON.stringify(['Tidak pernah', 'Jarang', 'Kadang-kadang', 'Sering']),
    required: true,
    active: true,
    sortOrder: 1,
  },
  {
    questionText: 'Ceritakan kebiasaan anak yang ingin dipantau',
    questionType: 'PARAGRAPH',
    optionsJson: '[]',
    required: false,
    active: true,
    sortOrder: 2,
  },
]

let seedPromise: Promise<void> | null = null

export async function ensureSeeded() {
  if (!seedPromise) {
    seedPromise = runSeed().catch(err => {
      // Reset agar bisa dicoba lagi di request berikutnya
      seedPromise = null
      console.error('[seed] Error saat seeding:', err)
    })
  }
  return seedPromise
}

async function runSeed() {
  // Cek flag seed menggunakan upsert agar idempotent
  const flag = await prisma.appSetting.findUnique({ where: { key: 'initial_seed' } })
  if (flag) return

  // Buat admin default jika belum ada
  const adminExists = await prisma.user.findFirst({ where: { role: 'admin' } })
  if (!adminExists) {
    await prisma.user.create({
      data: {
        email: 'admin321',
        name: 'Admin Tumbuh Ceria',
        phone: '',
        role: 'admin',
        status: 'active',
        passwordHash: await hashPassword('password321'),
      },
    })
  }

  // Buat konten edukasi awal jika belum ada
  const contentCount = await prisma.educationContent.count()
  if (contentCount === 0) {
    await prisma.educationContent.createMany({ data: INITIAL_ARTICLES })
  }

  // Buat pertanyaan pretest awal jika belum ada
  const questionCount = await prisma.pretestQuestion.count()
  if (questionCount === 0) {
    await prisma.pretestQuestion.createMany({
      data: INITIAL_QUESTIONS.map(q => ({ ...q, category: 'Pre-Test' })),
    })
  }

  // Buat konfigurasi form eksternal jika belum ada
  await prisma.appSetting.upsert({
    where: { key: 'external_forms' },
    update: {},
    create: { key: 'external_forms', value: JSON.stringify(DEFAULT_EXT_CONFIG) },
  })

  // Tandai seed sudah selesai
  await prisma.appSetting.create({ data: { key: 'initial_seed', value: '1' } })
}
