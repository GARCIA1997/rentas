'use client';

import { BrandLogo } from '@/components/BrandLogo';
import { LoginForm } from '@/components/LoginForm';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  return (
    // Fondo institucional del kit: azul profundo con bloques diagonales a 45° derivados
    // de la geometría del isotipo.
    <div className="relative min-h-screen overflow-hidden bg-[#173A5F] flex flex-col items-center justify-center p-4">
      <div aria-hidden className="pointer-events-none absolute -top-24 -left-32 h-96 w-96 rotate-45 bg-white/[0.04]" />
      <div aria-hidden className="pointer-events-none absolute top-1/3 -right-40 h-[28rem] w-[28rem] rotate-45 bg-[#2D9E6B]/10" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 left-1/4 h-96 w-96 rotate-45 bg-white/[0.03]" />

      <div className="relative flex flex-col items-center mb-8">
        <BrandLogo size="lg" onDark />
        <p className="mt-3 text-sm tracking-wide text-[#F5F1E8]/80">Gestión inteligente de propiedades</p>
      </div>

      <div className="relative w-full max-w-md bg-surface rounded-xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-heading">Bienvenido de nuevo</h1>
        <p className="text-sm text-muted mt-1 mb-6">Ingresa tus credenciales para administrar tus propiedades.</p>
        <LoginForm />
      </div>
    </div>
  );
}
