'use client';

import Link from 'next/link';
import Image from 'next/image';
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
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface rounded-lg shadow-xl p-8">
        <Image src="/logoksa.png" alt="KsaRed" width={112} height={112} className="mx-auto mb-2" priority />
        <p className="text-center text-muted mb-8">Sistema de Gestión de Propiedades</p>

        <LoginForm />

        <div className="mt-6 border-t border-black/10 pt-6">
          <p className="text-center text-sm text-muted">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
