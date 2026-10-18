'use client';

import { BrandLogo } from '@/components/BrandLogo';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getInvite, InviteDetails } from '@/lib/api';

// No hay registro público: esta pantalla sólo funciona con un ?token= válido, generado
// por un admin desde Configuración (invitación de admin) o desde el perfil de un
// inquilino (invitación ligada a ese Tenant). Sin token, o con uno inválido/usado/vencido,
// no se muestra ningún formulario — sólo un mensaje de bloqueo.
function RegisterContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();
  const { acceptInvite } = useAuth();

  const [status, setStatus] = useState<'loading' | 'invalid' | 'ready'>('loading');
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [invalidReason, setInvalidReason] = useState('');

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }
    getInvite(token)
      .then((data) => {
        setInvite(data);
        setStatus('ready');
      })
      .catch((err) => {
        setInvalidReason(err instanceof Error ? err.message : '');
        setStatus('invalid');
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !invite) return;
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setError('');
    setIsSubmitting(true);

    try {
      if (invite.role === 'ADMIN') {
        await acceptInvite(token, { phone, password, firstName, lastName, email: email || undefined });
      } else {
        await acceptInvite(token, { password });
      }
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la cuenta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const strength = [password.length >= 8, /[a-zA-Z]/.test(password) && /\d/.test(password), /[^a-zA-Z0-9]/.test(password), password.length >= 12].filter(Boolean).length;
  const strengthLabel = ['Muy débil', 'Débil', 'Aceptable', 'Segura', 'Muy segura'][strength];
  const mismatch = confirm.length > 0 && confirm !== password;
  const fieldRo = 'flex items-center justify-between px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E2E6EA] rounded-lg';
  const input =
    'w-full px-3.5 py-2.5 bg-[#ffffff] border border-[#A7B0BB]/60 rounded-lg font-sans text-body-md text-[#173a5f] focus:outline-none focus:ring-1 focus:ring-[#2D9E6B] focus:border-[#2D9E6B] tracking-wide';
  const label = 'font-sans text-label-sm font-semibold text-[#173a5f]';

  if (status === 'loading') {
    return <p className="text-center text-body-sm text-[#73777f] py-6">Verificando invitación...</p>;
  }

  if (status === 'invalid') {
    return (
      <div className="text-center space-y-2 py-2">
        <div className="w-12 h-12 mx-auto rounded-full bg-red-50 flex items-center justify-center">
          <span className="material-symbols-outlined text-red-600 text-[26px]">link_off</span>
        </div>
        <h1 className="font-sans text-headline-sm font-bold text-[#173a5f]">Este enlace no es válido</h1>
        <p className="font-sans text-body-sm text-[#73777f]">
          {invalidReason === 'This invitation has already been used'
            ? 'Ya fue utilizado — cada invitación sirve para crear una sola cuenta.'
            : invalidReason === 'This invitation has expired'
              ? 'Ya venció. Pide al administrador que genere uno nuevo.'
              : 'Pide al administrador que te comparta un nuevo enlace de registro.'}
        </p>
        <Link
          href="/login"
          className="mt-3 w-full h-11 rounded-lg bg-[#173A5F] text-white font-semibold text-body-md flex items-center justify-center gap-2"
        >
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#2D9E6B]/15 text-[#2D9E6B] font-sans text-label-sm font-bold tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2D9E6B]"></span>
            INVITACIÓN ACTIVA
          </span>
          <span className="font-sans text-label-sm text-[#73777f] flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">schedule</span> Un solo uso
          </span>
        </div>
        <h1 className="font-sans text-headline-md font-bold text-[#173a5f] mt-1">
          {invite?.role === 'ADMIN' ? 'Crea tu cuenta de administrador' : 'Activa tu cuenta'}
        </h1>
        <p className="font-sans text-body-sm text-[#73777f]">
          {invite?.role === 'ADMIN' ? 'Tendrás acceso completo al panel de KsaRed.' : 'Te invitó tu administrador a tu portal de inquilino.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {invite?.role === 'ADMIN' ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className={label}>Nombre</label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className={input} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={label}>Apellido</label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required className={input} />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className={label}>Teléfono (10 dígitos)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="5551234567"
                maxLength={10}
                required
                className={input}
              />
              <span className="text-xs text-[#73777f]">Con este número iniciarás sesión.</span>
            </div>
            <div className="flex flex-col gap-1">
              <label className={label}>Email (opcional)</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F5F1E8] border border-[#E2E6EA] text-[#173a5f]">
              <span className="material-symbols-outlined text-[#2D9E6B] text-[18px]">verified_user</span>
              <span className="font-sans text-label-sm font-medium text-[#173a5f]">Datos verificados por tu administrador</span>
            </div>
            <div className="flex flex-col gap-1">
              <label className={`${label} flex items-center justify-between`}>
                <span>Nombre completo</span>
                <span className="text-xs text-[#73777f] font-normal">Solo lectura</span>
              </label>
              <div className={fieldRo}>
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[#73777f] text-[18px]">lock</span>
                  <span className="font-sans text-body-md font-bold text-[#173a5f]">{invite?.tenant?.fullName}</span>
                </div>
                <span className="material-symbols-outlined fill text-[#2D9E6B] text-[20px]">check_circle</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className={`${label} flex items-center justify-between`}>
                <span>Teléfono registrado</span>
                <span className="text-xs text-[#73777f] font-normal">Solo lectura</span>
              </label>
              <div className={fieldRo}>
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1.5 pr-2 border-r border-[#E2E6EA]">
                    <span className="text-xs font-bold text-[#173a5f]">🇲🇽 +52</span>
                  </div>
                  <span className="font-sans text-body-md font-bold text-[#173a5f] tracking-wide">{invite?.tenant?.phone}</span>
                </div>
                <span className="material-symbols-outlined text-[#73777f] text-[18px]">lock</span>
              </div>
            </div>
            <div className="border-t border-[#E2E6EA] my-0.5"></div>
          </>
        )}

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className={label} htmlFor="password">
              Crea una contraseña
            </label>
            {password && <span className={`text-xs font-semibold ${strength >= 3 ? 'text-[#2D9E6B]' : 'text-[#D9822B]'}`}>{strengthLabel}</span>}
          </div>
          <div className="relative flex items-center">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
              placeholder="Mínimo 6 caracteres"
              className={`${input} pr-10`}
            />
            <button
              aria-label="Mostrar contraseña"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 text-[#73777f] hover:text-[#173a5f] transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>
          <div className="flex flex-col gap-1 mt-1">
            <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`rounded-full h-full ${i < strength ? (strength >= 3 ? 'bg-[#2D9E6B]' : 'bg-[#D9822B]') : 'bg-[#E2E6EA]'}`}></div>
              ))}
            </div>
            <span className="text-xs text-[#73777f]">Incluye letras, números y símbolo</span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className={label} htmlFor="confirm-password">
            Confirmar contraseña
          </label>
          <div className="relative flex items-center">
            <input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              placeholder="Repite tu contraseña"
              className={`${input} pr-10 ${mismatch ? 'border-red-400' : confirm && !mismatch ? 'border-[#2D9E6B]' : ''}`}
            />
            {confirm && !mismatch && (
              <span className="material-symbols-outlined fill absolute right-3 text-[#2D9E6B] text-[18px]">check_circle</span>
            )}
          </div>
          {mismatch && <span className="text-xs text-red-600">Las contraseñas no coinciden.</span>}
        </div>

        {error && <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">{error}</div>}

        <button
          type="submit"
          disabled={isSubmitting || mismatch || !confirm}
          className="w-full h-12 rounded-lg bg-[#2D9E6B] hover:bg-[#25855A] text-white font-sans text-label-lg font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isSubmitting ? 'Creando cuenta...' : 'Activar mi cuenta'}
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </button>
      </form>

      <p className="text-center font-sans text-body-sm text-[#73777f]">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-[#2D9E6B] hover:underline font-semibold">
          Inicia sesión
        </Link>
      </p>
    </>
  );
}

// Markup portado de Stitch: design/stitch/register.html
export default function RegisterPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#173A5F] flex flex-col items-center px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-8">
      <div aria-hidden className="pointer-events-none absolute -top-24 -left-32 h-96 w-96 rotate-45 bg-white/[0.04]" />
      <div aria-hidden className="pointer-events-none absolute top-1/3 -right-40 h-[28rem] w-[28rem] rotate-45 bg-[#2D9E6B]/10" />
      <div className="relative w-full max-w-md">
        <header className="flex justify-between items-center w-full px-1 py-2">
          <Link
            href="/login"
            aria-label="Regresar"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white"
          >
            <span className="material-symbols-outlined text-white text-[22px]">arrow_back</span>
          </Link>
          <span className="font-sans text-label-sm tracking-widest text-[#F5F1E8]/90 font-bold uppercase">Registro por invitación</span>
          <span className="w-10 h-10" />
        </header>
        <div className="flex flex-col items-center justify-center pt-3 pb-5 text-center">
          <BrandLogo size="lg" onDark />
          <p className="font-sans text-body-sm text-[#F5F1E8]/85 font-medium mt-1.5">Gestión inteligente de propiedades</p>
        </div>
        <main className="w-full bg-[#ffffff] rounded-2xl shadow-[0_4px_20px_rgba(23,58,95,0.08)] border border-[#E2E6EA] p-5 flex flex-col gap-4">
          <Suspense fallback={<p className="text-center text-body-sm text-[#73777f]">Cargando...</p>}>
            <RegisterContent />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
