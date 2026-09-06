import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const errorMsg = await signIn(email, password);
    setBusy(false);
    if (errorMsg) { setErr('Email atau password salah. Coba lagi.'); return; }
    navigate('/');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <img src="/icons/icon-192.png" alt="FTL" className="w-16 h-16 mb-4 rounded-2xl" />
      <h1 className="font-display text-2xl tracking-wide mb-1">FTL FITNESS MANAGER</h1>
      <p className="text-ink-muted text-sm mb-8">Masuk untuk mengakses dashboard outlet Anda</p>

      <form onSubmit={handleSubmit} className="card w-full max-w-sm p-6 space-y-4">
        <div>
          <label className="text-xs text-ink-muted uppercase tracking-wide mb-1 block">Email</label>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="input-field" placeholder="nama@ftlgym.com"
          />
        </div>
        <div>
          <label className="text-xs text-ink-muted uppercase tracking-wide mb-1 block">Password</label>
          <input
            type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="input-field" placeholder="••••••••"
          />
        </div>
        {err && <p className="text-danger text-sm">{err}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full font-display tracking-wide uppercase">
          {busy ? 'Memproses...' : 'Masuk'}
        </button>
      </form>

      <p className="text-ink-dim text-xs mt-8 text-center max-w-xs">
        Akun dibuatkan oleh Admin. Hubungi Admin bila lupa password atau belum punya akses.
      </p>
    </div>
  );
}
