'use client'

import { FormEvent, useState } from 'react'
import { Check, Eye, EyeOff, HeartPulse, Sparkles } from 'lucide-react'

type Role = 'parent' | 'admin'
type Mode = 'parent-login' | 'admin-login' | 'register' | 'forgot'

type Account = { id: string; name: string; email: string; phone: string; password: string; role: Role }

const adminAccount: Account = { id: 'ADM-001', name: 'Admin Tumbuh Ceria', email: 'admin321', phone: '', password: 'password321', role: 'admin' }

function Logo() {
  return <div className="brand"><span className="brand-mark"><HeartPulse size={17} /></span><span>TUMBUH <b>CERIA</b></span></div>
}

function PasswordInput({ name, label, placeholder, value, onChange }: { name: string; label: string; placeholder: string; value: string; onChange: (value: string) => void }) {
  const [visible, setVisible] = useState(false)
  return <label>{label}<div className="input-wrap"><input name={name} type={visible ? 'text' : 'password'} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} minLength={8} required /><button type="button" className="password-toggle" onClick={() => setVisible(current => !current)} aria-label={visible ? 'Sembunyikan password' : 'Tampilkan password'}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
}

export function RoleAuthPage({ mode, accounts, onDone, onBack, onRegisterAccount, onForgot, onRegister }: { mode: Mode; accounts: Account[]; onDone: (role: Role, account: Account) => void; onBack: () => void; onRegisterAccount: (account: Account) => void; onForgot?: () => void; onRegister?: () => void }) {
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const isRegister = mode === 'register'
  const isForgot = mode === 'forgot'
  const isAdmin = mode === 'admin-login'
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const data = new FormData(event.currentTarget)
    const identifier = String(data.get(isAdmin ? 'username' : 'email') || '').trim()
    if (isForgot) { if (!identifier.includes('@')) { setError('Masukkan email orang tua yang valid.'); return }; setSent(true); return }
    if (isRegister) {
      const name = String(data.get('name') || '').trim()
      const phone = String(data.get('phone') || '').trim()
      if (!name || !phone || !identifier || password.length < 8 || password !== confirmation) { setError(password.length < 8 ? 'Password minimal 8 karakter.' : password !== confirmation ? 'Konfirmasi password belum sama.' : 'Semua field wajib diisi.'); return }
      if (accounts.some(account => account.email.toLowerCase() === identifier.toLowerCase())) { setError('Email sudah digunakan oleh akun orang tua lain.'); return }
      const newAccountId = `U-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      onRegisterAccount({ id: newAccountId, name, email: identifier, phone, password, role: 'parent' }); setSent(true); return
    }
    const credential = isAdmin ? adminAccount : accounts.find(account => account.role === 'parent' && account.email.toLowerCase() === identifier.toLowerCase())
    if (!credential || credential.password !== password || (isAdmin && identifier !== adminAccount.email)) { setError(isAdmin ? 'Username atau password admin salah.' : 'Email atau password orang tua salah.'); return }
    onDone(credential.role, credential)
  }
  return <main className="auth-page"><div className="auth-side"><button className="back-home" onClick={onBack}>← Kembali</button><Logo /><div className="auth-quote"><Sparkles size={23} /><h2>Setiap anak tumbuh dengan caranya sendiri.</h2><p>Aman, privat, dan dibuat untuk keluarga Indonesia.</p></div></div><div className="auth-panel"><div className="auth-form"><Logo /><div className="auth-title"><h1>{isAdmin ? 'Login Admin' : isRegister ? 'Mulai perjalanan tumbuh' : isForgot ? 'Pulihkan akses akun' : 'Selamat datang kembali'}</h1><p>{isAdmin ? 'Masuk ke panel administrasi Tumbuh Ceria.' : isRegister ? 'Buat akun orang tua gratis.' : isForgot ? 'Masukkan email untuk memulai pemulihan.' : 'Masuk ke ruang tumbuh keluarga Anda.'}</p></div>{error && <div className="error-box">{error}</div>}{sent ? <div className="success-box"><div className="success-icon"><Check /></div><h2>{isForgot ? 'Email terkirim' : 'Akun berhasil dibuat'}</h2><p>{isForgot ? 'Instruksi pemulihan sudah dikirim.' : 'Silakan lanjutkan ke halaman login orang tua.'}</p><Button onClick={onBack}>Lanjutkan</Button></div> : <form onSubmit={submit}>{isRegister && <><label>Nama Lengkap<input name="name" placeholder="Contoh: Anisa Putri" required /></label><label>Nomor WhatsApp<input name="phone" placeholder="08xx xxxx xxxx" required /></label></>}{!isForgot && <>{isAdmin ? <label>Username<input name="username" placeholder="Username" autoComplete="username" required /></label> : <label>Email<input name="email" type="email" placeholder={isRegister ? 'nama@email.com' : 'Email orang tua'} autoComplete="email" required /></label>}<PasswordInput name="password" label="Password" placeholder="Minimal 8 karakter" value={password} onChange={setPassword} />{isRegister && <PasswordInput name="confirmation" label="Konfirmasi Password" placeholder="Masukkan kembali password" value={confirmation} onChange={setConfirmation} />}</>}{isForgot && <label>Email<input name="email" type="email" placeholder="nama@email.com" required /></label>}{mode === 'parent-login' && <div className="form-inline"><label className="check-label"><input type="checkbox" /> Ingat saya</label><button type="button" className="text-button" onClick={onForgot || onBack}>Lupa password?</button></div>}<Button type="submit">{isAdmin ? 'Masuk sebagai Admin' : isRegister ? 'Buat akun orang tua' : isForgot ? 'Kirim instruksi pemulihan' : 'Masuk'}</Button>{mode === 'parent-login' && <button type="button" className="text-button auth-link" onClick={onRegister || onBack}>Belum punya akun? Daftar sebagai Orang Tua</button>}</form>}</div></div></main>
}

function Button({ children, onClick, type = 'button' }: { children: React.ReactNode; onClick?: () => void; type?: 'button' | 'submit' }) { return <button type={type} className="btn btn-primary" onClick={onClick}>{children}</button> }

export type { Account, Mode, Role }
export { adminAccount }
