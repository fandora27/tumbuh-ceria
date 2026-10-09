'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RoleAuthPage, Account } from '../components/role-auth'
import { api } from '@/lib/api-client'
import { ArrowDown, ArrowRight, ArrowUp, Baby, BookOpen, CalendarDays, Check, ChevronDown, ChevronRight, ClipboardCheck, Clock3, Download, ExternalLink, Eye, EyeOff, FileQuestion, HeartPulse, HelpCircle, LayoutDashboard, LogIn, Menu, MoreHorizontal, Pencil, Plus, Search, Settings, ShieldCheck, Sparkles, Trash2, UserRound, Users, X, Loader2 } from 'lucide-react'

type Role = 'parent' | 'admin'
type Child = { id: string; name: string; birth: string; age: string; gender: string; status: string; initials: string; color: string; pretest: boolean; parentId: string }
export type QuestionType = 'SHORT_ANSWER' | 'PARAGRAPH' | 'MULTIPLE_CHOICE' | 'CHECKBOX' | 'YES_NO' | 'NUMBER'
export interface Question {
  questionId: string; questionText: string; category: string; questionType: QuestionType
  options: string[]; required: boolean; active: boolean; order: number
  id: string; title: string; form: string; type: QuestionType | string
  status: 'active' | 'inactive'; description?: string
}
type Article = { id: string; title: string; category: string; time: string; color: string; seen?: boolean; description?: string; type?: string; status?: string; fileUrl?: string }
type FormResponse = { id: string; formName: string; childId: string; accountId: string; date: string; answers: Record<string, string> }
type ExternalFormConfig = { kpsp: { title: string; description: string; formUrl: string }; screentime: { title: string; description: string; formUrl: string } }
const DEFAULT_EXT_CONFIG: ExternalFormConfig = {
  kpsp: { title: 'Tes KPSP', description: 'Kuesioner Pra Skrining Perkembangan (KPSP). Klik link di bawah untuk mengisi melalui Google Forms yang telah disediakan admin.', formUrl: '' },
  screentime: { title: 'Pemantauan Screen Time', description: 'Pantau screen time anak melalui Google Forms yang telah disediakan admin.', formUrl: '' },
}

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'SHORT_ANSWER', label: 'Jawaban Singkat' }, { value: 'PARAGRAPH', label: 'Paragraf' },
  { value: 'MULTIPLE_CHOICE', label: 'Pilihan Ganda' }, { value: 'CHECKBOX', label: 'Kotak Centang' },
  { value: 'YES_NO', label: 'Ya / Tidak' }, { value: 'NUMBER', label: 'Angka' },
]
const questionTypeLabels: Record<QuestionType, string> = {
  SHORT_ANSWER: 'Jawaban Singkat', PARAGRAPH: 'Paragraf', MULTIPLE_CHOICE: 'Pilihan Ganda',
  CHECKBOX: 'Kotak Centang', YES_NO: 'Ya / Tidak', NUMBER: 'Angka',
}
function normalizeQuestion(raw: any, index: number = 0): Question {
  const qId = String(raw.questionId || raw.id || `Q-${String(index + 1).padStart(3, '0')}`)
  const qText = String(raw.questionText || raw.title || '')
  const cat = String(raw.category || raw.form || 'Pre-Test')
  let qType: QuestionType = 'SHORT_ANSWER'
  const ts = String(raw.questionType || raw.type || '').toUpperCase()
  if (ts === 'YES_NO') qType = 'YES_NO'
  else if (ts === 'MULTIPLE_CHOICE') qType = 'MULTIPLE_CHOICE'
  else if (ts === 'CHECKBOX') qType = 'CHECKBOX'
  else if (ts === 'PARAGRAPH' || ts === 'ESSAY') qType = 'PARAGRAPH'
  else if (ts === 'NUMBER') qType = 'NUMBER'
  const req = typeof raw.required === 'boolean' ? raw.required : true
  const act = typeof raw.active === 'boolean' ? raw.active : (raw.status === 'active' || raw.status === undefined)
  const ord = typeof raw.order === 'number' ? raw.order : index + 1
  let opts: string[] = []
  if (Array.isArray(raw.options)) opts = raw.options.map(String)
  else if (qType === 'YES_NO') opts = ['Ya', 'Tidak']
  return { questionId: qId, questionText: qText, category: cat, questionType: qType, options: opts, required: req, active: act, order: ord, id: qId, title: qText, form: cat, type: qType, status: act ? 'active' : 'inactive', description: raw.description }
}

function downloadArticle(a: Article) {
  if (typeof window === 'undefined') return
  const safeTitle = (a.title || 'konten-edukasi').replace(/[\\/:*?"<>|]/g, '').trim().replace(/\s+/g, '_')

  if (a.fileUrl) {
    if (a.fileUrl.startsWith('data:') || a.fileUrl.startsWith('blob:')) {
      let ext = a.type === 'Video' ? 'mp4' : 'jpg'
      if (a.fileUrl.includes('image/png')) ext = 'png'
      else if (a.fileUrl.includes('image/webp')) ext = 'webp'
      else if (a.fileUrl.includes('image/gif')) ext = 'gif'
      else if (a.fileUrl.includes('video/mp4')) ext = 'mp4'
      else if (a.fileUrl.includes('video/webm')) ext = 'webm'
      else if (a.fileUrl.includes('application/pdf')) ext = 'pdf'

      const link = document.createElement('a')
      link.href = a.fileUrl
      link.download = `${safeTitle}.${ext}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      return
    } else {
      window.open(a.fileUrl, '_blank')
      return
    }
  }

  const textContent = `=====================================================
TUMBUH CERIA - MATERI EDUKASI ORANG TUA
=====================================================
Judul     : ${a.title}
Kategori  : ${a.category}
Durasi    : ${a.time || '-'}
-----------------------------------------------------

PANDUAN & MATERI EDUKASI:
${a.description || 'Panduan praktis tumbuh kembang anak dari Tumbuh Ceria.'}

-----------------------------------------------------
(c) Platform Tumbuh Ceria - Sahabat Tumbuh Kembang Anak
=====================================================`

  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${safeTitle}-tumbuh-ceria.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

async function exportRealData(accounts: Account[], children: Child[], responses: FormResponse[], questions: Question[]) {
  const XLSX = await import('xlsx')
  const fmt = (t: string) => t ? t.replace(/\s+/g, ' ').trim() : ''
  const ptQuestions = questions
    .filter(q => q.category === 'Pre-Test' || q.form === 'Pre-Test')
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const questionHeaders = ptQuestions.map((q, idx) => {
    const qText = q.questionText || q.title || `Pertanyaan ${idx + 1}`
    return `Jawaban Pretest ${idx + 1}: ${qText}`
  })

  const parents = accounts.filter(a => a.role === 'parent')
  const rows: Record<string, any>[] = []

  parents.forEach(parent => {
    const parentChildren = children.filter(c => c.parentId === parent.id)
    if (parentChildren.length > 0) {
      parentChildren.forEach(child => {
        const resp = responses.find(r => r.formName === 'Pre-Test' && (r.childId === child.id || (r.accountId === parent.id && !r.childId)))
        const row: Record<string, any> = {
          'Nama Orang Tua': fmt(parent.name),
          'Email': fmt(parent.email),
          'No HP': fmt(parent.phone || '-'),
          'Nama Anak': fmt(child.name),
        }
        ptQuestions.forEach((q, idx) => {
          const qId = q.questionId || q.id
          const colHeader = questionHeaders[idx]
          const ans = resp?.answers?.[qId] ?? resp?.answers?.[q.id] ?? resp?.answers?.[q.questionId] ?? resp?.answers?.[q.title] ?? resp?.answers?.[q.questionText] ?? '-'
          row[colHeader] = fmt(String(ans ?? '-'))
        })
        rows.push(row)
      })
    } else {
      const resp = responses.find(r => r.formName === 'Pre-Test' && r.accountId === parent.id)
      const row: Record<string, any> = {
        'Nama Orang Tua': fmt(parent.name),
        'Email': fmt(parent.email),
        'No HP': fmt(parent.phone || '-'),
        'Nama Anak': '-',
      }
      ptQuestions.forEach((q, idx) => {
        const qId = q.questionId || q.id
        const colHeader = questionHeaders[idx]
        const ans = resp?.answers?.[qId] ?? resp?.answers?.[q.id] ?? resp?.answers?.[q.questionId] ?? resp?.answers?.[q.title] ?? resp?.answers?.[q.questionText] ?? '-'
        row[colHeader] = fmt(String(ans ?? '-'))
      })
      rows.push(row)
    }
  })

  responses.filter(r => r.formName === 'Pre-Test').forEach(resp => {
    const parentAcc = accounts.find(a => a.id === resp.accountId)
    const childObj = children.find(c => c.id === resp.childId)
    const parentName = fmt(parentAcc?.name || '')
    const childName = fmt(childObj?.name || '')
    const isCovered = rows.some(r => r['Nama Orang Tua'] === parentName && (r['Nama Anak'] === childName || r['Nama Anak'] === '-'))
    if (!isCovered) {
      const row: Record<string, any> = {
        'Nama Orang Tua': parentName || '-',
        'Email': fmt(parentAcc?.email || '-'),
        'No HP': fmt(parentAcc?.phone || '-'),
        'Nama Anak': childName || '-',
      }
      ptQuestions.forEach((q, idx) => {
        const qId = q.questionId || q.id
        const colHeader = questionHeaders[idx]
        const ans = resp.answers?.[qId] ?? resp.answers?.[q.id] ?? resp.answers?.[q.questionId] ?? '-'
        row[colHeader] = fmt(String(ans ?? '-'))
      })
      rows.push(row)
    }
  })

  const allHeaders = ['Nama Orang Tua', 'Email', 'No HP', 'Nama Anak', ...questionHeaders]
  const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [], { header: allHeaders })
  ws['!cols'] = [
    { wch: 25 },
    { wch: 30 },
    { wch: 20 },
    { wch: 25 },
    ...ptQuestions.map(() => ({ wch: 45 }))
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'DATA PRETEST')
  XLSX.writeFile(wb, 'tumbuh-ceria-data-pretest.xlsx')
}

function Logo({ dark = false }: { dark?: boolean }) { return <div className={`brand ${dark ? 'brand-dark' : ''}`}><span className="brand-mark"><HeartPulse size={17} /></span><span>TUMBUH <b>CERIA</b></span></div> }
function Badge({ children, tone = 'green', style, className = '' }: { children: React.ReactNode; tone?: string; style?: React.CSSProperties; className?: string }) { return <span className={`badge badge-${tone} ${className}`} style={style}>{children}</span> }
function Button({ children, variant = 'primary', onClick, className = '', type = 'button', disabled = false, style, title }: { children: React.ReactNode; variant?: string; onClick?: () => void; className?: string; type?: 'button' | 'submit'; disabled?: boolean; style?: React.CSSProperties; title?: string }) { return <button type={type} className={`btn btn-${variant} ${className}`} onClick={onClick} disabled={disabled} style={style} title={title}>{children}</button> }
function StatCard({ icon, label, value, note, tone = 'green' }: { icon: React.ReactNode; label: string; value: string; note: string; tone?: string }) { return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div><div className="eyebrow">{label}</div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div></div> }

function PublicHome({ onLogin, onRegister, onAdmin }: { onLogin: () => void; onRegister: () => void; onAdmin: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  return (
    <main className="public-page">
      <header className="public-nav wrap">
        <Logo />
        <nav><a href="#tentang">Tentang kami</a><a href="#edukasi">Edukasi</a><a href="#cara">Cara kerja</a></nav>
        <div className="nav-actions">
          <Button variant="ghost" onClick={onLogin}>Login Orang Tua</Button>
          <Button variant="outline" onClick={onAdmin}>Login Admin</Button>
          <Button onClick={onRegister}>Daftar gratis <ArrowRight size={16} /></Button>
        </div>
        <button className="mobile-icon" onClick={() => setMobileOpen(true)} aria-label="Buka menu"><Menu /></button>
      </header>
      {mobileOpen && (
        <div className="mobile-nav-backdrop" onClick={() => setMobileOpen(false)}>
          <div className="mobile-nav-drawer" onClick={e => e.stopPropagation()}>
            <div className="mobile-nav-header"><Logo /><button className="icon-btn" onClick={() => setMobileOpen(false)}><X size={20} /></button></div>
            <div className="mobile-nav-links">
              <a href="#tentang" onClick={() => setMobileOpen(false)}>Tentang Kami</a>
              <a href="#edukasi" onClick={() => setMobileOpen(false)}>Edukasi</a>
              <a href="#cara" onClick={() => setMobileOpen(false)}>Cara Kerja</a>
            </div>
            <div className="mobile-nav-actions">
              <Button variant="outline" onClick={() => { setMobileOpen(false); onLogin() }}>Login Orang Tua</Button>
              <Button variant="ghost" onClick={() => { setMobileOpen(false); onAdmin() }}>Login Admin</Button>
              <Button onClick={() => { setMobileOpen(false); onRegister() }}>Daftar Gratis <ArrowRight size={16} /></Button>
            </div>
          </div>
        </div>
      )}
      <section className="hero wrap">
        <div className="hero-copy">
          <Badge tone="peach">Pendamping tumbuh kembang anak</Badge>
          <h1>Temani setiap <em>langkah</em> tumbuhnya.</h1>
          <p>Platform sederhana untuk membantu orang tua memantau perkembangan anak dengan lebih terarah, tenang, dan penuh cinta.</p>
          <div className="hero-actions">
            <Button onClick={onRegister}>Mulai bersama Tumbuh Ceria <ArrowRight size={17} /></Button>
            <button className="text-button" onClick={() => document.getElementById('cara')?.scrollIntoView()}>Pelajari lebih lanjut <ChevronRight size={16} /></button>
          </div>
          <div className="trust-row"><div className="avatar-stack"><span>NA</span><span>DP</span><span>RS</span><span>+</span></div><span>Dipercaya oleh <b>2.400+ orang tua</b></span></div>
        </div>
        <div className="hero-visual">
          <div className="sun-shape" />
          <div className="child-illustration"><div className="child-hair" /><div className="child-face"><span className="eye eye-left" /><span className="eye eye-right" /><span className="smile" /></div><div className="child-body" /></div>
        </div>
      </section>
      <section className="feature-band" id="cara"><div className="wrap feature-grid"><div><span className="section-kicker">Satu ruang untuk tumbuh</span><h2>Yang dibutuhkan orang tua, dalam satu tempat.</h2></div><p>Kelola profil anak, isi pemantauan, baca edukasi, dan lihat perjalanan perkembangan secara aman.</p></div></section>
    </main>
  )
}

function Sidebar({ active, setActive, admin, account, onExit, onHelp, onClose, isOpen }: { active: string; setActive: (s: string) => void; admin: boolean; account?: Account | null; onExit: () => void; onHelp: () => void; onClose?: () => void; isOpen?: boolean }) {
  const items: [string, string, any][] = admin
    ? [['admin', 'Overview', LayoutDashboard], ['users', 'Manajemen User', Users], ['children', 'Data Anak', Baby], ['questions', 'Form Builder', FileQuestion], ['content', 'Kelola Konten', BookOpen]]
    : [['dashboard', 'Ringkasan', LayoutDashboard], ['my-children', 'Anak Saya', Baby], ['pretest', 'Pre-Test', ClipboardCheck], ['screentime', 'Screen Time', Clock3], ['kpsp', 'Tes KPSP', ShieldCheck], ['education', 'Konten Edukasi', BookOpen]]
  return (
    <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-top"><Logo /><button className="close-sidebar icon-btn" onClick={onClose} aria-label="Tutup sidebar"><X size={18} /></button></div>
      <div className="account-pill"><div className="avatar">{admin ? 'AD' : (account?.name?.[0] || 'AP')}</div><div><b>{admin ? 'Admin Tumbuh Ceria' : account?.name || 'Orang tua'}</b><small>{admin ? 'Administrator' : 'Orang tua'}</small></div></div>
      <nav className="side-nav">
        <span className="side-label">MENU UTAMA</span>
        {items.map(([id, label, Icon]) => <button className={active === id ? 'active' : ''} key={id} onClick={() => { setActive(id); onClose?.() }}><Icon size={18} /><span>{label}</span></button>)}
      </nav>
      <div className="sidebar-bottom">
        <button onClick={() => { setActive(admin ? 'settings' : 'profile'); onClose?.() }}><Settings size={18} /> Pengaturan</button>
        <button className="help-card" onClick={onHelp}><HelpCircle size={19} /><div><b>Butuh bantuan?</b><small>Tim kami siap membantu</small></div></button>
        <button className="logout" onClick={onExit}><LogIn size={17} /> Keluar</button>
      </div>
    </aside>
  )
}

function Topbar({ title, selected, setSelected, admin, childrenData, onMenuClick }: { title: string; selected: string; setSelected: (s: string) => void; admin: boolean; childrenData?: Child[]; onMenuClick: () => void }) {
  const children = childrenData || []
  return (
    <header className="app-topbar">
      <div className="topbar-title">
        <button className="mobile-menu" onClick={onMenuClick} aria-label="Buka navigasi"><Menu size={21} /></button>
        <div><span className="breadcrumb">{admin ? 'Admin Area' : 'Area Orang Tua'} /</span><h1>{title}</h1></div>
      </div>
      <div className="topbar-actions">
        {!admin && <div className="child-selector"><span className="selector-label">Anak dipantau</span><div className="selector-value"><Baby size={16} /><select value={selected} onChange={e => setSelected(e.target.value)}>{children.length > 0 ? children.map(c => <option key={c.id} value={c.id}>{c.name}</option>) : <option value="">Belum ada anak</option>}</select><ChevronDown size={16} /></div></div>}
        <div className="top-avatar">{admin ? 'AD' : 'AP'}</div>
      </div>
    </header>
  )
}

function ParentDashboard({ selected, setActive, articles, account, childrenData, extConfig }: { selected: string; setActive: (s: string) => void; articles: Article[]; account: Account | null; childrenData: Child[]; extConfig: ExternalFormConfig }) {
  const child = childrenData.find(c => c.id === selected) || childrenData[0]
  const published = articles.filter(a => a.status === 'active')
  const seenCount = published.filter(a => a.seen).length
  const hasKpsp = !!extConfig.kpsp.formUrl
  const hasSt = !!extConfig.screentime.formUrl
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  return (
    <div className="page-content">
      <div className="welcome-row"><div><span className="section-kicker">{today}</span><h2>Selamat datang, {account?.name?.split(' ')[0] || 'Orang tua'} <span>&#x2736;</span></h2><p>Yuk, lanjutkan menemani tumbuhnya hari ini.</p></div><Button onClick={() => setActive('my-children')}><Plus size={17} /> Tambah anak</Button></div>
      <div className="dashboard-hero"><div><Badge tone="peach">Profil anak aktif</Badge><h2>{child ? `${child.name} sedang dipantau.` : 'Belum ada anak terdaftar.'}</h2><p>Data setiap anak tersimpan terpisah dan aman.</p><Button variant="dark" onClick={() => setActive('my-children')}>Lihat profil anak <ArrowRight size={16} /></Button></div><div className="hero-growth"><div className={`large-avatar ${child?.color || 'mint'}`}>{child?.initials || '?'}</div></div></div>
      <div className="stats-grid">
        <StatCard icon={<Baby size={20} />} label="Anak terdaftar" value={`${childrenData.length} anak`} note={childrenData.length > 0 ? 'Profil aktif' : 'Tambah anak dulu'} />
        <StatCard icon={<BookOpen size={20} />} label="Konten sudah dilihat" value={published.length > 0 ? `${seenCount} / ${published.length}` : '0 konten'} note="Tandai setelah membaca" tone="peach" />
        <StatCard icon={<ClipboardCheck size={20} />} label="Status Pre-Test" value={child ? (child.pretest ? 'Sudah dilakukan' : 'Tersedia') : 'Pilih anak'} note={child?.pretest ? 'Tidak dapat diulang' : 'Wajib diisi sekali'} tone="purple" />
        <StatCard icon={<ShieldCheck size={20} />} label="KPSP &amp; Screen Time" value={(hasKpsp || hasSt) ? 'Link tersedia' : 'Belum dikonfigurasi'} note={(hasKpsp || hasSt) ? 'Via Google Forms' : 'Menunggu admin'} tone="blue" />
      </div>
      <div className="content-grid">
        <section className="panel">
          <div className="panel-heading"><div><span className="section-kicker">Mulai dari sini</span><h3>Aktivitas untuk {child?.name?.split(' ')[0] || 'Anak'}</h3></div></div>
          <div className="quick-grid">
            {child?.pretest ? <button className="quick-action" onClick={() => setActive('pretest')}><span><ClipboardCheck size={19} /></span><b>Pre-Test sudah dilakukan</b><Check size={15} /></button> : <button className="quick-action" onClick={() => setActive('pretest')}><span><ClipboardCheck size={19} /></span><b>Mulai Pre-Test</b><ArrowRight size={15} /></button>}
            <button className="quick-action" onClick={() => setActive('education')}><span><BookOpen size={19} /></span><b>Baca edukasi</b><ArrowRight size={15} /></button>
            {hasSt && <button className="quick-action" onClick={() => setActive('screentime')}><span><Clock3 size={19} /></span><b>Screen Time</b><ArrowRight size={15} /></button>}
            {hasKpsp && <button className="quick-action" onClick={() => setActive('kpsp')}><span><ShieldCheck size={19} /></span><b>Tes KPSP</b><ArrowRight size={15} /></button>}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div><span className="section-kicker">Materi Siap Unduh</span><h3>Download Konten Edukasi</h3></div>
            <Button variant="ghost" onClick={() => setActive('education')} style={{ fontSize: '12px', padding: '6px 10px' }}>Lihat Semua <ChevronRight size={14} /></Button>
          </div>
          {published.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#88a098', fontSize: '13px' }}>Belum ada konten edukasi tersedia.</div>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {published.slice(0, 3).map(art => (
                <div key={art.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#f8fbf9', border: '1px solid #e5eee9', borderRadius: '12px', gap: '10px' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                      <Badge tone="green" style={{ fontSize: '10px', padding: '2px 6px' }}>{art.category}</Badge>
                      {art.type && <span style={{ fontSize: '10px', color: '#688c7d', fontWeight: 600 }}>&#x2022; {art.type}</span>}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#16382b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{art.title}</div>
                  </div>
                  <Button variant="soft" onClick={() => downloadArticle(art)} style={{ padding: '6px 12px', fontSize: '12px', flexShrink: 0 }} title="Download materi ini">
                    <Download size={14} /> Unduh
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function ChildPage({ selected, setSelected, childrenData, setChildrenData, accountId, responses, setResponses }: { selected: string; setSelected: (s: string) => void; childrenData: Child[]; setChildrenData: (c: Child[]) => void; accountId: string; responses?: FormResponse[]; setResponses?: (r: FormResponse[]) => void }) {
  const [editing, setEditing] = useState<Child | null>(null)
  const [menu, setMenu] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [birth, setBirth] = useState('')
  const [gender, setGender] = useState('Perempuan')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const colors = ['mint', 'peach', 'lavender', 'blue']
  const save = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      if (editing) {
        const { child } = await api.updateChild(editing.id, { name, birth: birth || editing.birth, gender })
        setChildrenData(childrenData.map(c => c.id === editing.id ? child : c))
      } else {
        const { child } = await api.createChild({ name, birth: birth || '', gender })
        setChildrenData([...childrenData, child])
      }
      setName(''); setBirth(''); setGender('Perempuan'); setEditing(null); setShowForm(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menyimpan data anak.')
    } finally {
      setSaving(false)
    }
  }
  const deleteChild = async (id: string, nm: string) => {
    if (deleting) return
    if (confirm(`Hapus anak "${nm}"? Tidak dapat dibatalkan.`)) {
      setDeleting(true)
      try {
        await api.deleteChild(id)
        setChildrenData(childrenData.filter(c => c.id !== id))
        if (setResponses && responses) setResponses(responses.filter(r => r.childId !== id))
        if (selected === id) setSelected(childrenData.find(c => c.id !== id)?.id || '')
        setMenu(null)
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Gagal menghapus data anak.')
      } finally {
        setDeleting(false)
      }
    }
  }
  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <span className="section-kicker">Profil keluarga</span>
          <h2>Anak Saya</h2>
          <p>Kelola profil anak secara terpisah.</p>
        </div>
        <Button onClick={() => { setEditing(null); setName(''); setBirth(''); setGender('Perempuan'); setShowForm(true) }}>
          <Plus size={17} /> Tambah anak
        </Button>
      </div>
      {showForm && (
        <div className="inline-form panel" style={{ marginBottom: '24px' }}>
          <div className="panel-heading">
            <h3>{editing ? 'Edit data anak' : 'Tambah profil anak'}</h3>
            <button className="icon-btn" onClick={() => setShowForm(false)} aria-label="Tutup"><X size={17} /></button>
          </div>
          <div style={{ display: 'grid', gap: '14px' }}>
            <label>
              Nama anak
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Nama lengkap anak" required autoFocus />
            </label>
            <div className="form-grid">
              <label>
                Tanggal lahir
                <input type="date" value={birth} onChange={e => setBirth(e.target.value)} />
              </label>
              <label>
                Jenis kelamin
                <select value={gender} onChange={e => setGender(e.target.value)}>
                  <option>Laki-laki</option>
                  <option>Perempuan</option>
                </select>
              </label>
            </div>
          </div>
          <div className="form-actions">
            <Button variant="ghost" onClick={() => setShowForm(false)}>Batal</Button>
            <Button onClick={save} disabled={saving}>{saving ? <><Loader2 size={14} className="tc-spin" /> Menyimpan…</> : 'Simpan profil'}</Button>
          </div>
        </div>
      )}
      <div className="children-grid">
        {childrenData.length === 0 && (
          <div className="panel" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 20px', color: '#7a9187' }}>
            Belum ada profil anak. Klik <b>Tambah anak</b> untuk mulai.
          </div>
        )}
        {childrenData.map(child => (
          <div className={`child-card ${selected === child.id ? 'selected' : ''}`} key={child.id}>
            <div className="child-card-top">
              <div className={`large-avatar small ${child.color}`}>{child.initials}</div>
              <div className="card-menu-wrap">
                <button className="icon-btn" onClick={() => setMenu(menu === child.id ? null : child.id)} aria-label="Menu opsi"><MoreHorizontal size={17} /></button>
                {menu === child.id && (
                  <div className="action-menu">
                    <button onClick={() => { setSelected(child.id); setMenu(null) }}>Pilih anak</button>
                    <button onClick={() => { setEditing(child); setName(child.name); setBirth(child.birth); setGender(child.gender); setShowForm(true); setMenu(null) }}>Edit data anak</button>
                    <button style={{ color: '#c05746' }} onClick={() => deleteChild(child.id, child.name)} disabled={deleting}>Hapus anak</button>
                  </div>
                )}
              </div>
              <Badge tone={child.status === 'Perlu perhatian' ? 'peach' : 'green'}>{child.status}</Badge>
            </div>
            <h3>{child.name}</h3>
            <p><CalendarDays size={14} /> {child.birth || 'Belum diisi'} <span>&#xB7;</span> {child.age || 'Usia balita'}</p>
            <p><UserRound size={14} /> {child.gender}</p>
            <div className="child-card-actions">
              <Button variant={selected === child.id ? 'soft' : 'outline'} onClick={() => setSelected(child.id)} style={{ flex: 1 }}>
                {selected === child.id ? <><Check size={15} /> Sedang dipilih</> : 'Pilih anak'}
              </Button>
              <button className="icon-btn" onClick={() => { setEditing(child); setName(child.name); setBirth(child.birth); setGender(child.gender); setShowForm(true) }} aria-label="Edit">
                <Pencil size={16} />
              </button>
            </div>
            <small>{child.pretest ? '✓ Sudah pre-test' : '• Pre-test tersedia'}</small>
          </div>
        ))}
      </div>
    </div>
  )
}

function PretestForm({ selected, setActive, childrenData, setChildrenData, questions, responses, setResponses, accountId }: { selected: string; setActive: (s: string) => void; childrenData: Child[]; setChildrenData: (c: Child[]) => void; questions: Question[]; responses: FormResponse[]; setResponses: (r: FormResponse[]) => void; accountId: string }) {
  const child = childrenData.find(c => c.id === selected) || childrenData[0]
  const activeQs = useMemo(() => questions.filter(q => (q.category === 'Pre-Test' || q.form === 'Pre-Test') && (q.active === true || q.status === 'active')).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [questions])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const upd = (qId: string, val: string) => { setAnswers(p => ({ ...p, [qId]: val })); setError('') }
  const togCb = (qId: string, opt: string) => {
    const cur = (answers[qId] || '').split(',').map(s => s.trim()).filter(Boolean)
    const next = cur.includes(opt) ? cur.filter(o => o !== opt) : [...cur, opt]
    setAnswers(p => ({ ...p, [qId]: next.join(', ') })); setError('')
  }
  const [submitting, setSubmitting] = useState(false)
  const submit = async () => {
    const miss = activeQs.find(q => q.required && !(answers[q.questionId || q.id] || '').trim())
    if (miss) { setError(`Pertanyaan wajib belum dijawab: "${miss.questionText || miss.title}"`); return }
    if (!child || submitting) return
    setSubmitting(true)
    try {
      const result = await api.submitPretest({ childId: child.id, answers })
      setResponses([...responses, result.response])
      setChildrenData(childrenData.map(c => c.id === child.id ? result.child : c))
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan jawaban.')
    } finally {
      setSubmitting(false)
    }
  }
  if (saved) return <div className="page-content centered-state"><div className="success-icon large"><Check size={36} /></div><span className="section-kicker">Data Tersimpan</span><h2>Pre-Test berhasil disimpan.</h2><p>Jawaban untuk <b>{child?.name}</b> tersimpan aman.</p><Button onClick={() => setActive('dashboard')}>Kembali ke Dashboard</Button></div>
  if (child?.pretest) return <div className="page-content centered-state"><div className="success-icon large"><Check size={36} /></div><span className="section-kicker">Sudah Selesai</span><h2>Pre-Test sudah dilakukan.</h2><p>Pre-Test untuk <b>{child?.name}</b> hanya satu kali.</p><Button onClick={() => setActive('dashboard')}>Kembali ke Dashboard</Button></div>
  if (!child) return <div className="page-content centered-state"><h2>Pilih anak terlebih dahulu</h2><Button onClick={() => setActive('my-children')}>Ke Halaman Anak</Button></div>
  return (
    <div className="page-content form-page">
      <div className="page-heading"><div><span className="section-kicker">Pre-Test &#xB7; {child.name}</span><h2>Pre-Test</h2><p>Pertanyaan aktif dari Form Builder Admin.</p></div><Badge tone="green">{activeQs.length} pertanyaan aktif</Badge></div>
      {error && <div style={{ padding: '14px 16px', background: '#fdf2f2', color: '#b93838', border: '1px solid #f8d4d4', borderRadius: '12px', marginBottom: '18px', fontWeight: 600, fontSize: '13px' }}>{error}</div>}
      {activeQs.length === 0
        ? <div className="panel" style={{ textAlign: 'center', padding: '48px 24px' }}><FileQuestion size={36} style={{ color: '#88a098', margin: '0 auto 12px' }} /><h3>Belum ada pertanyaan aktif</h3><p style={{ color: '#82968d', fontSize: '13px' }}>Admin belum mengaktifkan pertanyaan Pre-Test.</p></div>
        : <div style={{ display: 'grid', gap: '20px' }}>
          {activeQs.map((q, idx) => {
            const qId = q.questionId || q.id; const qText = q.questionText || q.title; const qt = q.questionType
            return <div className="panel" key={qId} style={{ borderRadius: '16px', border: '1px solid #e7efeb', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}><span style={{ fontSize: '11px', fontWeight: 700, color: '#769087' }}>PERTANYAAN {idx + 1}</span><Badge tone={q.required ? 'peach' : 'blue'}>{q.required ? 'Wajib' : 'Opsional'}</Badge></div>
              <h3 style={{ fontSize: '17px', margin: '0 0 4px', color: '#18332a' }}>{qText}</h3>
              {q.description && <p style={{ fontSize: '12px', color: '#82968d', margin: '4px 0 0' }}>{q.description}</p>}
              {qt === 'SHORT_ANSWER' && <div style={{ marginTop: '16px' }}><input type="text" value={answers[qId] || ''} onChange={e => upd(qId, e.target.value)} placeholder="Jawaban singkat..." style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #d8e7df', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} /></div>}
              {qt === 'PARAGRAPH' && <div style={{ marginTop: '16px' }}><textarea value={answers[qId] || ''} onChange={e => upd(qId, e.target.value)} placeholder="Tulis uraian..." rows={4} style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #d8e7df', fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} /></div>}
              {qt === 'MULTIPLE_CHOICE' && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '16px' }}>{(q.options || []).map(opt => { const sel = answers[qId] === opt; return <button type="button" key={opt} onClick={() => upd(qId, opt)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '12px', border: sel ? '2px solid #2f8767' : '1px solid #dceae1', background: sel ? '#edf7f2' : '#fff', cursor: 'pointer', textAlign: 'left', color: sel ? '#1e674d' : 'inherit', fontWeight: sel ? 600 : 400 }}><span style={{ display: 'grid', placeItems: 'center', width: '18px', height: '18px', borderRadius: '50%', border: sel ? '6px solid #2f8767' : '2px solid #a6bfb3', background: '#fff', flexShrink: 0 }} /><span style={{ fontSize: '13px' }}>{opt}</span></button> })}</div>}
              {qt === 'CHECKBOX' && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '16px' }}>{(q.options || []).map(opt => { const chk = (answers[qId] || '').split(',').map(s => s.trim()).includes(opt); return <button type="button" key={opt} onClick={() => togCb(qId, opt)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '12px', border: chk ? '2px solid #2f8767' : '1px solid #dceae1', background: chk ? '#edf7f2' : '#fff', cursor: 'pointer', textAlign: 'left', color: chk ? '#1e674d' : 'inherit', fontWeight: chk ? 600 : 400 }}><span style={{ display: 'grid', placeItems: 'center', width: '18px', height: '18px', borderRadius: '5px', border: chk ? '2px solid #2f8767' : '2px solid #a6bfb3', background: chk ? '#2f8767' : '#fff', color: '#fff', flexShrink: 0 }}>{chk && <Check size={13} strokeWidth={3} />}</span><span style={{ fontSize: '13px' }}>{opt}</span></button> })}</div>}
              {qt === 'YES_NO' && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '16px' }}>{['Ya', 'Tidak'].map(opt => { const sel = answers[qId] === opt; const iy = opt === 'Ya'; return <button type="button" key={opt} onClick={() => upd(qId, opt)} style={{ flex: '1 1 140px', maxWidth: '200px', padding: '12px 20px', borderRadius: '12px', border: sel ? (iy ? '2px solid #2f8767' : '2px solid #d97757') : '1px solid #dceae1', background: sel ? (iy ? '#edf7f2' : '#fff3ec') : '#fff', color: sel ? (iy ? '#1e674d' : '#ab4e2e') : '#557166', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}><span style={{ width: '14px', height: '14px', borderRadius: '50%', border: sel ? (iy ? '4px solid #2f8767' : '4px solid #d97757') : '2px solid #a6bfb3', background: '#fff' }} />{opt}</button> })}</div>}
              {qt === 'NUMBER' && <div style={{ marginTop: '16px' }}><input type="number" value={answers[qId] || ''} onChange={e => upd(qId, e.target.value)} placeholder="Angka..." style={{ width: '100%', maxWidth: '240px', padding: '12px 14px', borderRadius: '10px', border: '1px solid #d8e7df', fontSize: '14px', outline: 'none' }} /></div>}
            </div>
          })}
        </div>}
      <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
        <Button variant="ghost" onClick={() => setActive('dashboard')}>Batal &amp; Kembali</Button>
        <Button onClick={submit} disabled={!activeQs.length || submitting}>{submitting ? <><Loader2 size={14} className="tc-spin" /> Menyimpan…</> : <>Simpan Jawaban <ArrowRight size={16} /></>}</Button>
      </div>
    </div>
  )
}

function ExternalFormPage({ formKey, config, setActive }: { formKey: 'kpsp' | 'screentime'; config: ExternalFormConfig; setActive: (s: string) => void }) {
  const cfg = config[formKey]
  const isValidUrl = (url: string) => { try { new URL(url); return true } catch { return false } }
  const hasUrl = cfg.formUrl && isValidUrl(cfg.formUrl)
  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <span className="section-kicker">Formulir Eksternal</span>
          <h2>{cfg.title}</h2>
        </div>
      </div>
      <div className="panel" style={{ maxWidth: '640px', margin: '0 auto', padding: '36px 24px', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', background: '#e5f5eb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#2f8767' }}>{formKey === 'kpsp' ? <ShieldCheck size={28} /> : <Clock3 size={28} />}</div>
        <h3 style={{ fontSize: '20px', margin: '0 0 12px', color: '#14382c' }}>{cfg.title}</h3>
        <p style={{ color: '#627c71', fontSize: '14px', lineHeight: 1.7, margin: '0 0 28px' }}>{cfg.description}</p>
        {hasUrl ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
            <a href={cfg.formUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', padding: '12px 24px', fontSize: '14px', width: 'auto', maxWidth: '100%' }}>
              <ExternalLink size={16} /> Buka Formulir Google Forms
            </a>
            <p style={{ fontSize: '12px', color: '#88a098', margin: 0 }}>Link terbuka di tab baru.</p>
          </div>
        ) : (
          <div style={{ background: '#fef9f0', border: '1px solid #f5dfa0', borderRadius: '12px', padding: '20px' }}>
            <p style={{ color: '#9a7d3a', fontWeight: 600, margin: '0 0 6px' }}>Link belum dikonfigurasi</p>
            <p style={{ color: '#a89060', fontSize: '13px', margin: 0 }}>Admin belum menambahkan link untuk {cfg.title}.</p>
          </div>
        )}
        <div style={{ marginTop: '28px' }}>
          <Button variant="ghost" onClick={() => setActive('dashboard')}>&#8592; Kembali ke Dashboard</Button>
        </div>
      </div>
    </div>
  )
}

function EducationPage({ articles, setArticles, isAdmin, onDelete }: { articles: Article[]; setArticles: (a: Article[]) => void; isAdmin?: boolean; onDelete?: (id: string) => void }) {
  const [open, setOpen] = useState<Article | null>(null)
  const visible = articles.filter(a => a.status === 'active')
  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <span className="section-kicker">Koleksi Tumbuh Ceria</span>
          <h2>Konten Edukasi</h2>
          <p>Panduan praktis untuk mendampingi tumbuh kembang si Kecil.</p>
        </div>
      </div>
      <div className="children-grid">
        {visible.length === 0 && <div className="panel" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 20px', color: '#7a9187' }}>Belum ada konten aktif.</div>}
        {visible.map(a => (
          <article key={a.id} className="child-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {a.type === 'Foto' && a.fileUrl ? (
              <div style={{ height: '180px', overflow: 'hidden', backgroundColor: '#f8f9fa' }}>
                <img src={a.fileUrl} alt={a.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ) : a.type === 'Video' && a.fileUrl ? (
              <div style={{ height: '180px', backgroundColor: '#111' }}>
                <video src={a.fileUrl} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ) : (
              <div className={`education-art ${a.color}`} style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookOpen size={32} opacity={0.4} />
              </div>
            )}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <Badge tone="green">{a.category}</Badge>
                <small style={{ color: '#88a098', fontSize: '11px' }}>{a.time || 'Baru'}</small>
              </div>
              <h3 style={{ fontSize: '16px', margin: '0 0 8px', lineHeight: 1.4, color: '#14382c' }}>{a.title}</h3>
              <p style={{ color: '#637d72', fontSize: '13px', lineHeight: 1.5, marginBottom: '18px', flex: 1 }}>{a.description || 'Panduan tumbuh kembang anak.'}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid #edf4f0' }}>
                <Button variant="outline" onClick={() => setOpen(a)} style={{ flex: 1, padding: '8px 12px' }}>Baca</Button>
                <Button variant="soft" onClick={() => downloadArticle(a)} style={{ padding: '8px 12px', fontSize: '12px' }} title="Download konten">
                  <Download size={15} /> Unduh
                </Button>
                {isAdmin && onDelete ? (
                  <Button variant="ghost" style={{ color: '#c05746', padding: '8px 12px' }} onClick={() => { if (confirm(`Hapus konten "${a.title}"?`)) onDelete(a.id) }}>
                    <Trash2 size={15} />
                  </Button>
                ) : a.seen ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2f8767', fontSize: '12px', fontWeight: 600, padding: '8px 12px', backgroundColor: '#ecfdf5', borderRadius: '8px' }}>
                    <Check size={16} /> Selesai
                  </div>
                ) : (
                  <Button variant="ghost" onClick={() => setArticles(articles.map(x => x.id === a.id ? { ...x, seen: true } : x))} style={{ padding: '8px 12px', fontSize: '12px', color: '#64748b' }}>
                    Tandai
                  </Button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="icon-btn modal-close" onClick={() => setOpen(null)} aria-label="Tutup"><X size={18} /></button>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingRight: '36px' }}>
              <Badge tone="green">{open.category}</Badge>
              <Button variant="soft" onClick={() => downloadArticle(open)} style={{ padding: '6px 12px', fontSize: '12px' }}>
                <Download size={14} /> Download Konten
              </Button>
            </div>
            <h3 style={{ fontSize: '20px', lineHeight: 1.3, marginBottom: '12px', paddingRight: '36px', color: '#14382c' }}>{open.title}</h3>
            {open.type === 'Foto' && open.fileUrl && (
              <div style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '20px' }}>
                <img src={open.fileUrl} alt={open.title} style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '55vh', objectFit: 'contain', backgroundColor: '#f8f9fa' }} />
              </div>
            )}
            {open.type === 'Video' && open.fileUrl && (
              <div style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '20px', backgroundColor: '#000' }}>
                <video controls src={open.fileUrl} style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '55vh' }} />
              </div>
            )}
            <div style={{ fontSize: '14px', lineHeight: 1.7, color: '#456559', marginBottom: '28px', whiteSpace: 'pre-wrap' }}>
              {open.description || 'Konten panduan tumbuh kembang anak.'}
            </div>
            <div style={{ borderTop: '1px solid #edf4f0', paddingTop: '18px', display: 'flex', gap: '10px' }}>
              <Button variant="outline" onClick={() => downloadArticle(open)} style={{ flex: 1 }}>
                <Download size={16} style={{ marginRight: '6px' }} /> Download Konten
              </Button>
              <div style={{ flex: 1 }}>
                {!open.seen ? (
                  <Button onClick={() => { setArticles(articles.map(x => x.id === open.id ? { ...x, seen: true } : x)); setOpen(null) }} style={{ width: '100%' }}>
                    <Check size={17} style={{ marginRight: '6px' }} /> Tandai sudah selesai
                  </Button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2f8767', fontWeight: 600, width: '100%', justifyContent: 'center', padding: '12px', backgroundColor: '#ecfdf5', borderRadius: '10px' }}>
                    <Check size={18} /> Sudah dibaca
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AdminDashboard({ setActive, onExport, articles, setArticles, accounts, childrenData, responses, extConfig, setExtConfig }: { setActive: (s: string) => void; onExport?: () => void; articles?: Article[]; setArticles?: (a: Article[]) => void; accounts?: Account[]; childrenData?: Child[]; responses?: FormResponse[]; extConfig: ExternalFormConfig; setExtConfig: (c: ExternalFormConfig) => void }) {
  const [fileData, setFileData] = useState<{ name: string; type: string; data: string } | null>(null)
  const [desc, setDesc] = useState('')
  const [titleInput, setTitleInput] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [editK, setEditK] = useState(false)
  const [editSt, setEditSt] = useState(false)
  const [kDraft, setKDraft] = useState(extConfig.kpsp)
  const [stDraft, setStDraft] = useState(extConfig.screentime)
  const parentCount = (accounts || []).filter(a => a.role === 'parent').length
  const childCount = (childrenData || []).length
  const ptCount = (responses || []).filter(r => r.formName === 'Pre-Test').length
  const pubCount = (articles || []).filter(a => a.status === 'active').length
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    const isVid = f.type.startsWith('video'); const isImg = f.type.startsWith('image')
    if (!isVid && !isImg) { setNotice('Hanya file gambar atau video.'); return }
    setLoading(true)
    const reader = new FileReader()
    reader.onload = () => { setFileData({ name: f.name, type: isVid ? 'Video' : 'Foto', data: reader.result as string }); setLoading(false) }
    reader.readAsDataURL(f)
  }
  const publish = async () => {
    if (!fileData || !desc.trim() || publishing) return
    setPublishing(true)
    try {
      const { article } = await api.createContent({ title: titleInput.trim() || fileData.name, category: 'Edukasi', time: 'Baru', color: 'mint', description: desc, type: fileData.type, fileUrl: fileData.data, status: 'active' })
      if (articles && setArticles) setArticles([article, ...articles])
      setNotice('Konten berhasil dipublikasikan.'); setDesc(''); setTitleInput(''); setFileData(null)
      setTimeout(() => setNotice(''), 3000)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Gagal mempublikasikan konten.')
    } finally {
      setPublishing(false)
    }
  }
  const saveK = async () => {
    try {
      const { extConfig: next } = await api.saveExtConfig({ ...extConfig, kpsp: kDraft })
      setExtConfig(next)
      setEditK(false); setNotice('Konfigurasi KPSP disimpan.'); setTimeout(() => setNotice(''), 3000)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Gagal menyimpan konfigurasi.')
    }
  }
  const saveSt = async () => {
    try {
      const { extConfig: next } = await api.saveExtConfig({ ...extConfig, screentime: stDraft })
      setExtConfig(next)
      setEditSt(false); setNotice('Konfigurasi Screen Time disimpan.'); setTimeout(() => setNotice(''), 3000)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Gagal menyimpan konfigurasi.')
    }
  }
  return (
    <div className="page-content">
      <div className="welcome-row">
        <div>
          <span className="section-kicker">{today}</span>
          <h2>Selamat datang, Admin <span>&#x2736;</span></h2>
          <p>Pantau sistem dan pengelolaan data Tumbuh Ceria.</p>
        </div>
        <div className="form-actions" style={{ marginTop: 0 }}>
          <Button variant="outline" onClick={onExport}><Download size={16} /> Export Data</Button>
          <Button onClick={() => document.getElementById('cu')?.scrollIntoView({ behavior: 'smooth' })}>Upload Konten</Button>
        </div>
      </div>
      <div className="stats-grid">
        <StatCard icon={<Users size={20} />} label="Total orang tua" value={`${parentCount}`} note={parentCount > 0 ? `${parentCount} akun` : 'Belum ada'} />
        <StatCard icon={<Baby size={20} />} label="Total anak" value={`${childCount}`} note={childCount > 0 ? `dari ${parentCount} ortu` : 'Belum ada'} tone="peach" />
        <StatCard icon={<ClipboardCheck size={20} />} label="Pre-Test terisi" value={`${ptCount}`} note={ptCount > 0 ? 'Tersimpan' : 'Belum ada'} tone="purple" />
        <StatCard icon={<BookOpen size={20} />} label="Konten aktif" value={`${pubCount}`} note={pubCount > 0 ? 'Dipublikasikan' : 'Belum ada'} tone="blue" />
      </div>
      {notice && <div style={{ background: '#e5f5eb', color: '#287454', padding: '14px 16px', borderRadius: '12px', marginBottom: '20px', fontWeight: 600, fontSize: '13px' }}>{notice}</div>}
      <div className="content-grid" style={{ marginBottom: '20px' }}>
        <section className="panel">
          <div className="panel-heading">
            <div><span className="section-kicker">Pengaturan</span><h3>Konfigurasi KPSP</h3></div>
            <Button variant="soft" onClick={() => { setKDraft(extConfig.kpsp); setEditK(!editK) }} style={{ padding: '6px 12px', fontSize: '12px' }}>
              <Pencil size={14} /> {editK ? 'Batal' : 'Edit'}
            </Button>
          </div>
          {editK ? (
            <div style={{ display: 'grid', gap: '14px' }}>
              <label>Judul<input value={kDraft.title} onChange={e => setKDraft({ ...kDraft, title: e.target.value })} /></label>
              <label>Deskripsi / Instruksi<textarea rows={3} value={kDraft.description} onChange={e => setKDraft({ ...kDraft, description: e.target.value })} style={{ width: '100%', resize: 'vertical' }} /></label>
              <label>Link Google Forms<input value={kDraft.formUrl} onChange={e => setKDraft({ ...kDraft, formUrl: e.target.value })} placeholder="https://forms.gle/..." /></label>
              <div className="form-actions"><Button onClick={saveK}>Simpan KPSP</Button></div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#14382c' }}><b>Judul:</b> {extConfig.kpsp.title}</p>
              <p style={{ margin: 0, fontSize: '13px', color: '#688579', lineHeight: 1.5 }}>{extConfig.kpsp.description}</p>
              <p style={{ margin: 0, fontSize: '13px' }}><b>Link:</b> {extConfig.kpsp.formUrl ? <a href={extConfig.kpsp.formUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2f8767', wordBreak: 'break-all', textDecoration: 'underline' }}>{extConfig.kpsp.formUrl}</a> : <span style={{ color: '#c08040' }}>Belum dikonfigurasi</span>}</p>
            </div>
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div><span className="section-kicker">Pengaturan</span><h3>Konfigurasi Screen Time</h3></div>
            <Button variant="soft" onClick={() => { setStDraft(extConfig.screentime); setEditSt(!editSt) }} style={{ padding: '6px 12px', fontSize: '12px' }}>
              <Pencil size={14} /> {editSt ? 'Batal' : 'Edit'}
            </Button>
          </div>
          {editSt ? (
            <div style={{ display: 'grid', gap: '14px' }}>
              <label>Judul<input value={stDraft.title} onChange={e => setStDraft({ ...stDraft, title: e.target.value })} /></label>
              <label>Deskripsi / Instruksi<textarea rows={3} value={stDraft.description} onChange={e => setStDraft({ ...stDraft, description: e.target.value })} style={{ width: '100%', resize: 'vertical' }} /></label>
              <label>Link Google Forms<input value={stDraft.formUrl} onChange={e => setStDraft({ ...stDraft, formUrl: e.target.value })} placeholder="https://forms.gle/..." /></label>
              <div className="form-actions"><Button onClick={saveSt}>Simpan Screen Time</Button></div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#14382c' }}><b>Judul:</b> {extConfig.screentime.title}</p>
              <p style={{ margin: 0, fontSize: '13px', color: '#688579', lineHeight: 1.5 }}>{extConfig.screentime.description}</p>
              <p style={{ margin: 0, fontSize: '13px' }}><b>Link:</b> {extConfig.screentime.formUrl ? <a href={extConfig.screentime.formUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2f8767', wordBreak: 'break-all', textDecoration: 'underline' }}>{extConfig.screentime.formUrl}</a> : <span style={{ color: '#c08040' }}>Belum dikonfigurasi</span>}</p>
            </div>
          )}
        </section>
      </div>
      <div className="content-grid">
        <section className="panel" id="cu">
          <div className="panel-heading">
            <div><span className="section-kicker">Konten edukasi</span><h3>Upload konten baru</h3></div>
            <Badge tone="green">Foto / Video</Badge>
          </div>
          <div style={{ display: 'grid', gap: '14px' }}>
            <label>Judul (opsional)<input value={titleInput} onChange={e => setTitleInput(e.target.value)} placeholder="Judul konten..." /></label>
            <label>Pilih Foto / Video<input type="file" accept="image/*,video/*" onChange={handleFile} /></label>
            {loading && <p style={{ color: '#769087', fontSize: '12px', margin: 0 }}>Memproses file...</p>}
            {fileData && (
              <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                {fileData.type === 'Foto' ? <img src={fileData.data} alt="Preview" style={{ width: '100%', maxHeight: '220px', objectFit: 'cover' }} /> : <video src={fileData.data} controls style={{ width: '100%', maxHeight: '220px' }} />}
                <div style={{ padding: '10px 14px', background: '#f8fbf9', fontSize: '12px', color: '#557166' }}>
                  <Check size={14} style={{ verticalAlign: 'middle', color: '#2f8767', marginRight: '4px' }} /> <b>{fileData.type}</b> siap dipublikasikan.
                </div>
              </div>
            )}
            <label>Deskripsi<textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Tulis deskripsi konten edukasi..." rows={4} style={{ resize: 'vertical' }} /></label>
            <Button disabled={!fileData || !desc.trim() || loading || publishing} onClick={publish} style={{ width: '100%' }}>{publishing ? <><Loader2 size={14} className="tc-spin" /> Mempublikasikan…</> : 'Publikasikan konten'}</Button>
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div><span className="section-kicker">Akses cepat</span><h3>Kelola sistem</h3></div>
          </div>
          <div className="quick-grid">
            <button className="quick-action" onClick={() => setActive('users')}><span><Users size={19} /></span><b>Kelola User</b><ArrowRight size={15} /></button>
            <button className="quick-action" onClick={() => setActive('children')}><span><Baby size={19} /></span><b>Data Anak</b><ArrowRight size={15} /></button>
            <button className="quick-action" onClick={() => setActive('questions')}><span><FileQuestion size={19} /></span><b>Form Builder</b><ArrowRight size={15} /></button>
            <button className="quick-action" onClick={() => setActive('content')}><span><BookOpen size={19} /></span><b>Kelola Konten</b><ArrowRight size={15} /></button>
          </div>
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #edf4f0' }}>
            <Button variant="outline" onClick={onExport} style={{ width: '100%' }}><Download size={16} /> Export Semua Data (Excel)</Button>
          </div>
        </section>
      </div>
    </div>
  )
}

function QuestionsPage({ questions, setQuestions }: { questions: Question[]; setQuestions: (q: Question[]) => void }) {
  const [editing, setEditing] = useState<Question | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [notice, setNotice] = useState('')
  const [qId, setQId] = useState('')
  const [qText, setQText] = useState('')
  const [qType, setQType] = useState<QuestionType>('SHORT_ANSWER')
  const [options, setOptions] = useState<string[]>([])
  const [required, setRequired] = useState(true)
  const [active, setActive] = useState(true)
  const [order, setOrder] = useState(1)
  const ptQs = questions.filter(q => q.category === 'Pre-Test' || q.form === 'Pre-Test')
  const handleAddNew = () => {
    const nId = `Q-${Date.now()}`; const nOrd = ptQs.length + 1
    setIsNew(true); setEditing({ questionId: nId, questionText: '', category: 'Pre-Test', questionType: 'SHORT_ANSWER', options: [], required: true, active: true, order: nOrd, id: nId, title: '', form: 'Pre-Test', type: 'SHORT_ANSWER', status: 'active' })
    setQId(nId); setQText(''); setQType('SHORT_ANSWER'); setOptions([]); setRequired(true); setActive(true); setOrder(nOrd)
  }
  const handleEdit = (q: Question) => {
    setIsNew(false); setEditing(q); setQId(q.questionId); setQText(q.questionText)
    setQType(q.questionType); setOptions(Array.isArray(q.options) ? [...q.options] : []); setRequired(q.required); setActive(q.active); setOrder(q.order)
  }
  const handleTypeChange = (nt: QuestionType) => {
    setQType(nt)
    if (nt === 'MULTIPLE_CHOICE' || nt === 'CHECKBOX') { if (!options.length) setOptions(['Opsi 1', 'Opsi 2']) }
    else if (nt === 'YES_NO') setOptions(['Ya', 'Tidak'])
  }
  const [savingQ, setSavingQ] = useState(false)
  const handleSave = async () => {
    if (!qText.trim()) { setNotice('Teks pertanyaan wajib diisi.'); return }
    let finalOpts: string[] = []
    if (qType === 'MULTIPLE_CHOICE' || qType === 'CHECKBOX') { finalOpts = options.map(o => o.trim()).filter(Boolean); if (!finalOpts.length) { setNotice('Harus ada minimal 1 opsi.'); return } }
    else if (qType === 'YES_NO') finalOpts = ['Ya', 'Tidak']
    const fq: Question = { questionId: qId, questionText: qText.trim(), category: 'Pre-Test', questionType: qType, options: finalOpts, required, active, order: Number(order) || 1, id: qId, title: qText.trim(), form: 'Pre-Test', type: qType, status: active ? 'active' : 'inactive' }
    if (savingQ) return
    setSavingQ(true)
    try {
      if (isNew) {
        const { question } = await api.saveQuestion(fq)
        setQuestions([...questions, question])
      } else {
        const { question } = await api.updateQuestion(fq.questionId, fq)
        setQuestions(questions.map(q => q.questionId === fq.questionId ? question : q))
      }
      setEditing(null); setNotice('Pertanyaan berhasil disimpan.'); setTimeout(() => setNotice(''), 3000)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Gagal menyimpan pertanyaan.')
    } finally {
      setSavingQ(false)
    }
  }
  return (
    <div className="page-content">
      <div className="page-heading"><div><span className="section-kicker">Admin / Form Builder</span><h2>Form Builder Pre-Test</h2><p>Kelola pertanyaan Pre-Test internal. KPSP dan Screen Time gunakan Google Forms (konfigurasi di Overview).</p></div><Button onClick={handleAddNew}><Plus size={17} /> Tambah Pertanyaan</Button></div>
      {editing && <div className="builder-editor panel" style={{ border: '2px solid #2f8767', marginBottom: '24px' }}>
        <div className="panel-heading"><div><span className="section-kicker">{isNew ? 'Tambah' : 'Edit'} Pertanyaan</span><h3 style={{ margin: '4px 0 0' }}>{isNew ? 'Pertanyaan Baru' : `Edit: ${qId}`}</h3></div><button className="icon-btn" onClick={() => setEditing(null)}><X size={18} /></button></div>
        <label>Teks Pertanyaan<input value={qText} onChange={e => setQText(e.target.value)} placeholder="Tulis pertanyaan..." autoFocus /></label>
        <div className="form-grid">
          <label>Tipe<select value={qType} onChange={e => handleTypeChange(e.target.value as QuestionType)}>{QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
          <label>Urutan<input type="number" min={1} value={order} onChange={e => setOrder(parseInt(e.target.value) || 1)} /></label>
        </div>
        {(qType === 'MULTIPLE_CHOICE' || qType === 'CHECKBOX') && <div style={{ background: '#f8fbf9', border: '1px solid #dceae1', borderRadius: '12px', padding: '16px', marginTop: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}><b style={{ fontSize: '13px', color: '#1e674d' }}>Editor Pilihan Jawaban</b><Button variant="outline" type="button" onClick={() => setOptions(p => [...p, `Opsi ${p.length + 1}`])} style={{ padding: '6px 12px', fontSize: '12px' }}><Plus size={14} /> Tambah Opsi</Button></div>
          {options.length === 0 ? <p style={{ fontSize: '12px', color: '#88a098' }}>Belum ada opsi.</p> : <div style={{ display: 'grid', gap: '8px' }}>{options.map((opt, idx) => <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '12px', fontWeight: 700, color: '#769087', minWidth: '24px', textAlign: 'center' }}>{idx + 1}.</span><input type="text" value={opt} onChange={e => { const n = [...options]; n[idx] = e.target.value; setOptions(n) }} style={{ flex: 1, padding: '9px 12px', borderRadius: '8px', border: '1px solid #d8e7df', fontSize: '13px' }} /><button type="button" className="icon-btn" onClick={() => { const n = [...options]; if(idx > 0)[n[idx], n[idx-1]] = [n[idx-1], n[idx]]; setOptions(n) }} disabled={idx === 0} style={{ opacity: idx === 0 ? 0.3 : 1 }}><ArrowUp size={15} /></button><button type="button" className="icon-btn" onClick={() => { const n = [...options]; if(idx < n.length-1)[n[idx], n[idx+1]] = [n[idx+1], n[idx]]; setOptions(n) }} disabled={idx === options.length - 1} style={{ opacity: idx === options.length - 1 ? 0.3 : 1 }}><ArrowDown size={15} /></button><button type="button" className="icon-btn" onClick={() => setOptions(options.filter((_, i) => i !== idx))} style={{ color: '#c05746' }}><Trash2 size={15} /></button></div>)}</div>}
        </div>}
        <div style={{ display: 'flex', gap: '20px', paddingTop: '8px' }}>
          <label className="check-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}><input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} /><span>Wajib diisi</span></label>
          <label className="check-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /><span>Status Aktif</span></label>
        </div>
        <div className="form-actions"><Button variant="ghost" onClick={() => setEditing(null)}>Batal</Button><Button onClick={handleSave} disabled={savingQ}>{savingQ ? <><Loader2 size={14} className="tc-spin" /> Menyimpan…</> : 'Simpan Pertanyaan'}</Button></div>
      </div>}
      {notice && <div style={{ padding: '14px', margin: '0 0 16px', borderRadius: '10px', background: '#e5f5eb', color: '#287454', fontWeight: 600 }}>{notice}</div>}
      <div className="question-admin-list panel">
        {ptQs.length === 0 ? <div style={{ textAlign: 'center', padding: '36px 0', color: '#88a098' }}>Belum ada pertanyaan Pre-Test.</div>
          : ptQs.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(q => (
            <div key={q.questionId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #edf2ef', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}><Badge tone={q.active ? 'green' : 'gray'}>Pre-Test</Badge><span style={{ fontSize: '11px', fontWeight: 700, color: '#71877d' }}>#{q.order}</span><span className="badge badge-purple" style={{ fontSize: '10px' }}>{questionTypeLabels[q.questionType]}</span><Badge tone={q.required ? 'peach' : 'blue'}>{q.required ? 'Wajib' : 'Opsional'}</Badge><Badge tone={q.active ? 'green' : 'gray'}>{q.active ? 'Aktif' : 'Nonaktif'}</Badge></div>
                <h4 style={{ margin: '4px 0 6px', fontSize: '15px', color: '#18332a' }}>{q.questionText}</h4>
                {(q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'CHECKBOX') && (q.options || []).length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}><small style={{ color: '#8aa098', alignSelf: 'center', fontSize: '11px' }}>Opsi:</small>{q.options.map((opt, i) => <span key={i} style={{ fontSize: '11px', background: '#edf5f1', color: '#2f8767', padding: '2px 8px', borderRadius: '6px' }}>{opt}</span>)}</div>}
              </div>
              <div className="form-actions" style={{ marginTop: 0, display: 'flex', gap: '6px' }}>
                <Button variant="soft" onClick={() => handleEdit(q)}><Pencil size={14} /> Edit</Button>
                <Button variant="ghost" onClick={async () => {
                  try {
                    const { question } = await api.updateQuestion(q.questionId, { active: !q.active, status: !q.active ? 'active' : 'inactive' })
                    setQuestions(questions.map(x => x.questionId === q.questionId ? question : x))
                  } catch (err) {
                    setNotice(err instanceof Error ? err.message : 'Gagal mengubah status.')
                  }
                }}>{q.active ? 'Nonaktifkan' : 'Aktifkan'}</Button>
                <Button variant="ghost" style={{ color: '#bd714a' }} onClick={async () => {
                  if (!confirm(`Hapus pertanyaan "${q.questionText}"?`)) return
                  try {
                    await api.deleteQuestion(q.questionId)
                    setQuestions(questions.filter(x => x.questionId !== q.questionId))
                  } catch (err) {
                    setNotice(err instanceof Error ? err.message : 'Gagal menghapus pertanyaan.')
                  }
                }}><Trash2 size={14} /></Button>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

function DataTable({ kind, onExport, accounts, setAccounts, childrenData, setChildrenData, responses, setResponses }: { kind: 'users' | 'children'; onExport?: () => void; accounts?: Account[]; setAccounts?: (a: Account[]) => void; childrenData?: Child[]; setChildrenData?: (c: Child[]) => void; responses?: FormResponse[]; setResponses?: (r: FormResponse[]) => void }) {
  const [search, setSearch] = useState('')
  const [resetUser, setResetUser] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [delBusy, setDelBusy] = useState(false)
  const parents = (accounts || []).filter(a => a.role === 'parent')
  const children = childrenData || []
  const delParent = async (id: string, nm: string) => {
    if (!confirm(`Hapus orang tua "${nm}" dan SEMUA data anaknya? Tidak dapat dibatalkan.`)) return
    try {
      await api.deleteUser(id)
      const parentChildIds = (children || []).filter(c => c.parentId === id).map(c => c.id)
      if (setAccounts) setAccounts((accounts || []).filter(a => a.id !== id))
      if (setChildrenData) setChildrenData(children.filter(c => c.parentId !== id))
      if (setResponses && responses) setResponses(responses.filter(r => r.accountId !== id && !parentChildIds.includes(r.childId)))
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Gagal menghapus akun.')
    }
  }
  const delChild = async (id: string, nm: string) => {
    if (delBusy) return
    if (!confirm(`Hapus anak "${nm}"?`)) return
    setDelBusy(true)
    try {
      await api.deleteChild(id)
      if (setChildrenData) setChildrenData(children.filter(c => c.id !== id))
      if (setResponses && responses) setResponses(responses.filter(r => r.childId !== id))
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Gagal menghapus anak.')
    } finally {
      setDelBusy(false)
    }
  }
  const rows = kind === 'users'
    ? parents.map(a => ({ id: a.id, cols: [a.name, a.email, a.phone || '-', `${children.filter(c => c.parentId === a.id).length} anak`] }))
    : children.map(c => { const p = parents.find(x => x.id === c.parentId); return { id: c.id, cols: [c.name, p?.name || '-', c.age, c.gender, c.status] } })
  const visible = rows.filter(r => r.cols.join(' ').toLowerCase().includes(search.toLowerCase()))
  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <span className="section-kicker">Admin / {kind === 'users' ? 'User' : 'Anak'}</span>
          <h2>{kind === 'users' ? 'Manajemen User' : 'Data Anak'}</h2>
          <p>Total {visible.length} {kind === 'users' ? 'orang tua' : 'anak'}.</p>
        </div>
        <Button variant="outline" onClick={onExport}><Download size={16} /> Export Excel</Button>
      </div>
      <div className="table-toolbar">
        <div className="search-box">
          <Search size={17} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari data..." />
        </div>
        <span className="result-count">{visible.length} hasil</span>
      </div>
      <div className="table-card panel">
        <div className="data-table-wrap">
          {visible.length === 0
            ? <div style={{ padding: '40px', textAlign: 'center', color: '#88a098' }}>Belum ada data.</div>
            : <table>
                <thead>
                  <tr>
                    {(kind === 'users' ? ['Nama', 'Email', 'No HP', 'Jml Anak'] : ['Nama Anak', 'Orang Tua', 'Umur', 'Kelamin', 'Status']).map(x => <th key={x}>{x}</th>)}
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map(r => (
                    <tr key={r.id}>
                      {r.cols.map((x, i) => <td key={i}>{x}</td>)}
                      <td>
                        <div className="form-actions" style={{ marginTop: 0, gap: '6px', justifyContent: 'flex-start' }}>
                          {kind === 'users' ? (
                            <>
                              <Button variant="soft" onClick={() => { setResetUser(r.id); setNewPassword(''); setMessage('') }} style={{ padding: '6px 12px', fontSize: '12px' }}>
                                Ganti password
                              </Button>
                              <Button variant="ghost" style={{ color: '#c05746', padding: '6px 10px' }} onClick={() => delParent(r.id, r.cols[0])} aria-label="Hapus">
                                <Trash2 size={15} />
                              </Button>
                            </>
                          ) : (
                            <Button variant="ghost" style={{ color: '#c05746', padding: '6px 10px' }} onClick={() => delChild(r.id, r.cols[0])} aria-label="Hapus">
                              <Trash2 size={15} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>}
        </div>
      </div>
      {resetUser && (
        <div className="modal-backdrop" onClick={() => setResetUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="icon-btn modal-close" onClick={() => setResetUser(null)} aria-label="Tutup"><X size={18} /></button>
            <span className="section-kicker">Admin / Keamanan</span>
            <h3 style={{ margin: '4px 0 16px', fontSize: '18px', color: '#14382c' }}>Ganti password user</h3>
            <label style={{ marginBottom: '16px' }}>
              Password baru
              <input type="password" minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Minimal 8 karakter" />
            </label>
            <div className="form-actions">
              <Button variant="ghost" onClick={() => setResetUser(null)}>Batal</Button>
              <Button disabled={newPassword.length < 8} onClick={async () => {
                try {
                  await api.resetUserPassword(resetUser, newPassword)
                  setMessage('Password diperbarui.'); setNewPassword('')
                } catch (err) {
                  setMessage(err instanceof Error ? err.message : 'Gagal memperbarui password.')
                }
              }}>
                Simpan password
              </Button>
            </div>
            {message && <div style={{ background: '#e5f5eb', color: '#287454', padding: '12px 14px', marginTop: '14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600 }}>{message}</div>}
          </div>
        </div>
      )}
    </div>
  )
}

function SettingsPage({ admin, account, onUpdateAccount }: { admin: boolean; account?: Account | null; onUpdateAccount?: (u: Account) => void | Promise<void> }) {
  const [name, setName] = useState(account?.name || (admin ? 'Admin Tumbuh Ceria' : ''))
  const [email, setEmail] = useState(account?.email || (admin ? 'admin@tumbuhceria.id' : ''))
  const [phone, setPhone] = useState(account?.phone || '')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showP, setShowP] = useState(false)
  const [showC, setShowC] = useState(false)
  const [notice, setNotice] = useState('')
  const [savingAcc, setSavingAcc] = useState(false)
  const save = async () => {
    if (password && password.length < 8) { setNotice('Password baru minimal 8 karakter.'); return }
    if (password && password !== confirmation) { setNotice('Konfirmasi password belum sama.'); return }
    if (!name.trim()) { setNotice('Nama tidak boleh kosong.'); return }
    if (savingAcc) return
    setSavingAcc(true)
    try {
      if (account && onUpdateAccount) await onUpdateAccount({ ...account, name: name.trim(), email: email.trim(), phone: phone.trim(), ...(password ? { password } : {}) })
      setNotice('Perubahan berhasil disimpan.'); setPassword(''); setConfirmation(''); setTimeout(() => setNotice(''), 3000)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Gagal menyimpan perubahan.')
    } finally {
      setSavingAcc(false)
    }
  }
  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <span className="section-kicker">Pengaturan</span>
          <h2>Pengaturan Akun</h2>
          <p>Kelola informasi profil dan keamanan akun Anda.</p>
        </div>
      </div>
      <div style={{ display: 'grid', gap: '20px', maxWidth: '640px' }}>
        <div className="panel">
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', borderBottom: '1px solid #edf4f0', paddingBottom: '12px', color: '#14382c' }}>
            Informasi Akun
          </h3>
          <div style={{ display: 'grid', gap: '14px' }}>
            <label>Nama Lengkap<input value={name} onChange={e => setName(e.target.value)} placeholder="Nama lengkap" /></label>
            <label>Email<input value={email} onChange={e => setEmail(e.target.value)} type="email" /></label>
            <label>No. WhatsApp<input value={phone} onChange={e => setPhone(e.target.value)} placeholder="08xx xxxx xxxx" /></label>
          </div>
        </div>
        <div className="panel">
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', borderBottom: '1px solid #edf4f0', paddingBottom: '12px', color: '#14382c' }}>
            Keamanan
          </h3>
          <div style={{ display: 'grid', gap: '14px' }}>
            <label>
              Password baru <span style={{ fontWeight: 400, color: '#88a098', fontSize: '12px' }}>(kosongkan jika tidak ingin mengubah)</span>
              <div className="input-wrap">
                <input value={password} onChange={e => setPassword(e.target.value)} type={showP ? 'text' : 'password'} placeholder="Masukkan jika ingin mengubah" />
                <button type="button" className="password-toggle" onClick={() => setShowP(v => !v)} aria-label="Toggle password visibility">
                  {showP ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>
            <label>
              Konfirmasi password baru
              <div className="input-wrap">
                <input value={confirmation} onChange={e => setConfirmation(e.target.value)} type={showC ? 'text' : 'password'} placeholder="Masukkan kembali password" />
                <button type="button" className="password-toggle" onClick={() => setShowC(v => !v)} aria-label="Toggle password visibility">
                  {showC ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>
          </div>
        </div>
        {notice && (
          <div style={{ padding: '14px 16px', borderRadius: '12px', fontWeight: 600, fontSize: '13px', background: notice.includes('berhasil') ? '#e5f5eb' : '#fdf2f2', color: notice.includes('berhasil') ? '#287454' : '#b93838' }}>
            {notice}
          </div>
        )}
        <div>
          <Button onClick={save} disabled={savingAcc}>{savingAcc ? <><Loader2 size={14} className="tc-spin" /> Menyimpan…</> : 'Simpan Perubahan'}</Button>
        </div>
      </div>
    </div>
  )
}

function AppShell({ admin, account, onExit, childrenData, setChildrenData, articles, setArticles, questions, setQuestions, responses, setResponses, accounts, setAccounts, onExport, extConfig, setExtConfig, onUpdateAccount }: { admin: boolean; account: Account | null; onExit: () => void; childrenData: Child[]; setChildrenData: (c: Child[]) => void; articles: Article[]; setArticles: (a: Article[]) => void; questions: Question[]; setQuestions: (q: Question[]) => void; responses: FormResponse[]; setResponses: (r: FormResponse[]) => void; accounts: Account[]; setAccounts: (a: Account[]) => void; onExport?: () => void; extConfig: ExternalFormConfig; setExtConfig: (c: ExternalFormConfig) => void; onUpdateAccount: (u: Account) => void | Promise<void> }) {
  const [active, setActive] = useState(admin ? 'admin' : 'dashboard')
  const myChildren = admin ? childrenData : childrenData.filter(c => c.parentId === account?.id)
  const [selected, setSelected] = useState(() => myChildren[0]?.id || '')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  useEffect(() => { if (!admin && !myChildren.find(c => c.id === selected) && myChildren.length > 0) setSelected(myChildren[0].id) }, [myChildren.length, selected, admin])
  const titles: Record<string, string> = { dashboard: 'Ringkasan', 'my-children': 'Anak Saya', pretest: 'Pre-Test', screentime: 'Screen Time', kpsp: 'Tes KPSP', education: 'Konten Edukasi', admin: 'Overview', users: 'Manajemen User', children: 'Data Anak', questions: 'Form Builder', content: 'Kelola Konten', settings: 'Pengaturan', profile: 'Profil Saya' }
  const delContent = async (id: string) => {
    try {
      await api.deleteContent(id)
      setArticles(articles.filter(a => a.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus konten.')
    }
  }
  const mergeChildren = (updated: Child[]) => { const others = childrenData.filter(c => c.parentId !== account?.id); setChildrenData([...others, ...updated]) }
  let content: React.ReactNode = null
  if (admin) {
    if (active === 'users') content = <DataTable kind="users" onExport={onExport} accounts={accounts} setAccounts={setAccounts} childrenData={childrenData} setChildrenData={setChildrenData} responses={responses} setResponses={setResponses} />
    else if (active === 'children') content = <DataTable kind="children" onExport={onExport} accounts={accounts} setAccounts={setAccounts} childrenData={childrenData} setChildrenData={setChildrenData} responses={responses} setResponses={setResponses} />
    else if (active === 'questions') content = <QuestionsPage questions={questions} setQuestions={setQuestions} />
    else if (active === 'content') content = <EducationPage articles={articles} setArticles={setArticles} isAdmin onDelete={delContent} />
    else if (active === 'settings') content = <SettingsPage admin account={account} onUpdateAccount={onUpdateAccount} />
    else content = <AdminDashboard setActive={setActive} articles={articles} setArticles={setArticles} onExport={onExport} accounts={accounts} childrenData={childrenData} responses={responses} extConfig={extConfig} setExtConfig={setExtConfig} />
  } else {
    if (active === 'my-children') content = <ChildPage selected={selected} setSelected={setSelected} childrenData={myChildren} setChildrenData={mergeChildren} accountId={account?.id || ''} responses={responses} setResponses={setResponses} />
    else if (active === 'education') content = <EducationPage articles={articles} setArticles={setArticles} />
    else if (active === 'profile') content = <SettingsPage admin={false} account={account} onUpdateAccount={onUpdateAccount} />
    else if (active === 'pretest') content = <PretestForm selected={selected} setActive={setActive} childrenData={myChildren} setChildrenData={mergeChildren} questions={questions} responses={responses} setResponses={setResponses} accountId={account?.id || ''} />
    else if (active === 'kpsp') content = <ExternalFormPage formKey="kpsp" config={extConfig} setActive={setActive} />
    else if (active === 'screentime') content = <ExternalFormPage formKey="screentime" config={extConfig} setActive={setActive} />
    else content = <ParentDashboard selected={selected} setActive={setActive} articles={articles} account={account} childrenData={myChildren} extConfig={extConfig} />
  }
  return (
    <div className={`app-shell ${admin ? 'admin-shell' : ''}`}>
      {sidebarOpen && <div className="modal-backdrop" style={{ zIndex: 998 }} onClick={() => setSidebarOpen(false)} />}
      <Sidebar active={active} setActive={setActive} admin={admin} account={account} onExit={onExit} onHelp={() => alert('Hubungi bantuan@tumbuhceria.id')} onClose={() => setSidebarOpen(false)} isOpen={sidebarOpen} />
      <main className="app-main">
        <Topbar title={titles[active] || 'Tumbuh Ceria'} selected={selected} setSelected={setSelected} admin={admin} childrenData={admin ? undefined : myChildren} onMenuClick={() => setSidebarOpen(true)} />
        {content}
      </main>
    </div>
  )
}

export default function Page() {
  const [view, setView] = useState<'public' | 'login' | 'admin-login' | 'register' | 'forgot' | 'parent' | 'admin'>('public')
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null)
  const [children, setChildren] = useState<Child[]>([])
  const [articles, setArticlesRaw] = useState<Article[]>([])
  const [responses, setResponses] = useState<FormResponse[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [extConfig, setExtConfig] = useState<ExternalFormConfig>(DEFAULT_EXT_CONFIG)
  const [booting, setBooting] = useState(true)

  const applyBootstrap = useCallback((data: Awaited<ReturnType<typeof api.bootstrap>>) => {
    setCurrentAccount(data.account)
    setChildren(data.children)
    setArticlesRaw(data.articles)
    setResponses(data.responses)
    setQuestions(data.questions)
    setAccounts(data.accounts)
    setExtConfig(data.extConfig)
  }, [])

  const setArticles = useCallback((next: Article[]) => {
    setArticlesRaw(prev => {
      next.forEach(a => {
        const old = prev.find(x => x.id === a.id)
        if (a.seen && old && !old.seen) {
          api.markContentSeen(a.id).catch(() => {})
        }
      })
      return next
    })
  }, [])

  useEffect(() => {
    let active = true
    api.bootstrap()
      .then(data => {
        if (!active) return
        applyBootstrap(data)
        setView(data.account.role === 'admin' ? 'admin' : 'parent')
      })
      .catch(() => {})
      .finally(() => { if (active) setBooting(false) })
    return () => { active = false }
  }, [applyBootstrap])

  const handleUpdateAccount = useCallback(async (updated: Account) => {
    const { account } = await api.updateProfile({
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      password: updated.password,
    })
    setCurrentAccount(account)
    setAccounts(current => current.map(a => a.id === account.id ? account : a))
  }, [])

  const handleDone = useCallback(async (role: Role, account: Account) => {
    setCurrentAccount(account)
    const data = await api.bootstrap()
    applyBootstrap(data)
    setView(role === 'admin' ? 'admin' : 'parent')
  }, [applyBootstrap])

  const handleExit = useCallback(async () => {
    try { await api.logout() } catch {}
    setCurrentAccount(null)
    setChildren([])
    setArticlesRaw([])
    setResponses([])
    setQuestions([])
    setAccounts([])
    setExtConfig(DEFAULT_EXT_CONFIG)
    setView('public')
  }, [])

  if (booting) return <div style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', gap: '10px' }}><Loader2 size={22} className="tc-spin" style={{ color: 'var(--green)' }} /><p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Memuat data…</p></div>

  if (view === 'public') return <PublicHome onLogin={() => setView('login')} onRegister={() => setView('register')} onAdmin={() => setView('admin-login')} />

  if (['login', 'admin-login', 'register', 'forgot'].includes(view)) return <RoleAuthPage
    mode={view === 'admin-login' ? 'admin-login' : view === 'register' ? 'register' : view === 'forgot' ? 'forgot' : 'parent-login'}
    accounts={accounts}
    onDone={handleDone}
    onRegisterAccount={(account: Account) => { setAccounts([...accounts, account]) }}
    onForgot={() => setView('forgot')}
    onRegister={() => setView('register')}
    onBack={() => setView(view === 'register' || view === 'forgot' ? 'login' : 'public')}
  />

  return <AppShell admin={currentAccount?.role === 'admin'} account={currentAccount} onExit={handleExit} childrenData={children} setChildrenData={setChildren} articles={articles} setArticles={setArticles} questions={questions} setQuestions={setQuestions} responses={responses} setResponses={setResponses} accounts={accounts} setAccounts={setAccounts} onExport={() => exportRealData(accounts, children, responses, questions)} extConfig={extConfig} setExtConfig={setExtConfig} onUpdateAccount={handleUpdateAccount} />
}
