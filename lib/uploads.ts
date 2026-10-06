import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

function extFromMime(mime: string) {
  if (mime.includes('png')) return 'png'
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('gif')) return 'gif'
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg'
  if (mime.includes('mp4')) return 'mp4'
  if (mime.includes('webm')) return 'webm'
  if (mime.includes('pdf')) return 'pdf'
  return 'bin'
}

export async function saveDataUrlFile(dataUrl: string, prefix: string) {
  if (!dataUrl) return ''
  if (dataUrl.startsWith('/') || dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) return dataUrl
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return dataUrl
  const mime = match[1]
  const buf = Buffer.from(match[2], 'base64')
  const dir = path.join(process.cwd(), 'public', 'uploads')
  await mkdir(dir, { recursive: true })
  const name = `${prefix}-${Date.now()}.${extFromMime(mime)}`
  await writeFile(path.join(dir, name), buf)
  return `/uploads/${name}`
}
