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

  if (status === 'loading') {
    return <p className="text-center text-[#586270]">Verificando invitación...</p>;
  }

  if (status === 'invalid') {
    return (
      <div className="text-center space-y-3">
        <p className="text-[#173A5F] font-medium">Este enlace de registro no es válido.</p>
        <p className="text-sm text-[#586270]">
          {invalidReason === 'This invitation has already been used'
            ? 'Ya fue utilizado — cada invitación sirve para crear una sola cuenta.'
            : invalidReason === 'This invitation has expired'
              ? 'Ya venció. Pide al administrador que genere uno nuevo.'
              : 'Pide al administrador que te comparta un nuevo enlace de registro.'}
        </p>
        <Link href="/login" className="text-[#2D9E6B] hover:underline font-medium text-sm inline-block mt-2">
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="text-center text-[#586270] mb-8">
        {invite?.role === 'ADMIN' ? 'Crear cuenta de administrador' : 'Crear cuenta de inquilino'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {invite?.role === 'ADMIN' ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-[#173A5F]">Nombre</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-[#A7B0BB]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#173A5F]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-[#173A5F]">Apellido</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-[#A7B0BB]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#173A5F]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-[#173A5F]">Teléfono (10 dígitos)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="5551234567"
                maxLength={10}
                required
                className="w-full px-4 py-2 border border-[#A7B0BB]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#173A5F]"
              />
              <p className="text-xs text-[#586270] mt-1">Con este número iniciarás sesión.</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-[#173A5F]">Email (opcional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-[#A7B0BB]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#173A5F]"
              />
            </div>
          </>
        ) : (
          <div className="bg-[#F5F1E8] rounded-lg p-4 space-y-1">
            <p className="text-sm text-[#586270]">Estás registrando la cuenta de</p>
            <p className="text-[#173A5F] font-semibold">{invite?.tenant?.fullName}</p>
            <p className="text-sm text-[#586270]">
              Iniciarás sesión con el teléfono <span className="font-medium text-[#173A5F]">{invite?.tenant?.phone}</span>
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2 text-[#173A5F]">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
            className="w-full px-4 py-2 border border-[#A7B0BB]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#173A5F]"
          />
        </div>

        {error && <div className="p-3 text-red-600 bg-red-50 rounded-lg text-sm">{error}</div>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#2D9E6B] text-white py-2 rounded-lg font-medium hover:bg-[#2D9E6B]-pressed disabled:opacity-50"
        >
          {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>

      <div className="mt-6 border-t border-[#A7B0BB]/30 pt-6">
        <p className="text-center text-sm text-[#586270]">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-[#2D9E6B] hover:underline font-medium">
            Inicia sesión
          </Link>
        </p>
      </div>
    </>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
        <div className="flex justify-center mb-3"><BrandLogo size="lg" /></div>
        <Suspense fallback={<p className="text-center text-[#586270]">Cargando...</p>}>
          <RegisterContent />
        </Suspense>
      </div>
    </div>
  );
}
