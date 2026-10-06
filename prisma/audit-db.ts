/* eslint-disable @typescript-eslint/no-explicit-any */
// Script audit read-only terhadap Supabase PostgreSQL via Prisma.
// Tidak menampilkan password/hash/token — hanya email, role, status, dan jumlah baris.
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function audit() {
  console.log('=== SUPABASE (via Prisma) ===')
  const tables = [
    'users', 'children', 'pretest_questions', 'pretest_submissions',
    'pretest_answers', 'education_contents', 'content_views', 'app_settings',
  ]
  for (const t of tables) {
    try {
      const r: any = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "${t}"`)
      console.log(`${t} = ${r[0].n}`)
    } catch (e: any) {
      console.log(`${t} = ERROR: ${e.message.split('\n')[0]}`)
    }
  }
  try {
    const users: any = await prisma.$queryRawUnsafe('SELECT email, role, status, created_at FROM users ORDER BY created_at')
    console.log('users:', JSON.stringify(users))
  } catch (e: any) {
    console.log('users ERROR:', e.message.split('\n')[0])
  }
}

audit()
  .catch(e => { console.error('FATAL:', e.message); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
