'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Rentas</h1>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {user?.firstName} {user?.lastName}
                </span>
                <button
                  onClick={logout}
                  className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Bienvenido, {user?.firstName}
          </h2>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-gray-600 dark:text-gray-300">
              Rol: <span className="font-medium">{user?.role}</span>
            </p>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Sistema de gestión de rentas en construcción.
            </p>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
