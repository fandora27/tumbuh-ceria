import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../lib/password'
import { DEFAULT_EXT_CONFIG } from '../lib/types'

const prisma = new PrismaClient()

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: 'admin' } })
  if (!admin) {
    await prisma.user.create({
      data: {
        email: 'admin321',
        name: 'Admin Tumbuh Ceria',
        role: 'admin',
        status: 'active',
        passwordHash: await hashPassword('password321'),
      },
    })
  }

  if ((await prisma.educationContent.count()) === 0) {
    await prisma.educationContent.createMany({
      data: [
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
      ],
    })
  }

  if ((await prisma.pretestQuestion.count()) === 0) {
    await prisma.pretestQuestion.createMany({
      data: [
        {
          questionText: 'Seberapa sering anak membaca buku?',
          category: 'Pre-Test',
          questionType: 'MULTIPLE_CHOICE',
          optionsJson: JSON.stringify(['Tidak pernah', 'Jarang', 'Kadang-kadang', 'Sering']),
          required: true,
          active: true,
          sortOrder: 1,
        },
        {
          questionText: 'Ceritakan kebiasaan anak yang ingin dipantau',
          category: 'Pre-Test',
          questionType: 'PARAGRAPH',
          optionsJson: '[]',
          required: false,
          active: true,
          sortOrder: 2,
        },
      ],
    })
  }

  await prisma.appSetting.upsert({
    where: { key: 'external_forms' },
    update: {},
    create: { key: 'external_forms', value: JSON.stringify(DEFAULT_EXT_CONFIG) },
  })
  await prisma.appSetting.upsert({
    where: { key: 'initial_seed' },
    update: {},
    create: { key: 'initial_seed', value: '1' },
  })
}

main()
  .then(() => prisma.$disconnect())
  .catch(async err => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  })
