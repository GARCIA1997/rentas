'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { meApi, MyTenant, Contract } from '@/lib/api';
import { formatDate } from '@/lib/formatDate';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-black/5 dark:border-white/10 last:border-0 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-heading font-medium text-right">{value}</span>
    </div>
  );
}

function AdminProfile() {
  const { user } = useAuth();
  return (
    <div className="bg-surface rounded-2xl shadow-sm p-5">
      <Row label="Nombre" value={`${user?.firstName} ${user?.lastName}`} />
      <Row label="Teléfono" value={user?.phone} />
      <Row label="Rol" value="Administrador" />
    </div>
  );
}

function TenantProfile() {
  const { token, user } = useAuth();
  const [tenant, setTenant] = useState<MyTenant | null | undefined>(undefined);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    Promise.all([meApi.getTenant(token), meApi.getContracts(token)])
      .then(([tenantData, contractsData]) => {
        setTenant(tenantData);
        setContracts(contractsData);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const handleDownloadContract = async (id: string) => {
    if (!token) return;
    setDownloadingId(id);
    try {
      await meApi.downloadContractPdf(id, token);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al descargar el contrato');
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) {
    return <p className="text-muted">Cargando...</p>;
  }

  if (!tenant) {
    return (
      <div className="bg-surface rounded-2xl shadow-sm p-6">
        <p className="text-muted">
          Tu cuenta aún no está vinculada a ningún contrato. Contacta al administrador si crees que esto es un
          error.
        </p>
      </div>
    );
  }

  const activeContract = contracts.find((c) => c.status === 'ACTIVE') ?? contracts[0];

  return (
    <div className="space-y-6">
      <div className="bg-surface rounded-2xl shadow-sm p-5">
        <h3 className="text-heading font-semibold mb-2">Datos personales</h3>
        <Row label="Nombre" value={tenant.fullName} />
        <Row label="Teléfono" value={tenant.phone ?? '—'} />
        <Row label="Email" value={tenant.email ?? '—'} />
        <Row label="Identificación" value={tenant.idDocument ?? '—'} />
      </div>

      {tenant.currentProperty && (
        <div className="bg-surface rounded-2xl shadow-sm p-5">
          <h3 className="text-heading font-semibold mb-2">Propiedad</h3>
          <Row label="Nombre" value={tenant.currentProperty.name} />
          <Row label="Dirección" value={`${tenant.currentProperty.address}, ${tenant.currentProperty.city}`} />
          <Row label="Tipo" value={tenant.currentProperty.propertyType === 'HOUSE' ? 'Casa' : 'Local'} />
        </div>
      )}

      <div className="bg-surface rounded-2xl shadow-sm p-5">
        <h3 className="text-heading font-semibold mb-2">Mi contrato</h3>
        {activeContract ? (
          <>
            <Row label="Vigencia" value={`${formatDate(activeContract.startDate)} — ${activeContract.endDate ? formatDate(activeContract.endDate) : '—'}`} />
            <Row label="Renta mensual" value={`$${Number(activeContract.monthlyRent).toLocaleString('es-MX')}`} />
            <Row label="Depósito" value={`$${Number(activeContract.depositAmount).toLocaleString('es-MX')}`} />
            <Row label="Agua incluida" value={activeContract.waterIncluded ? 'Sí' : 'No'} />
            <Row label="Representante" value={activeContract.representative?.fullName ?? '—'} />
            <Row label="Firmado" value={activeContract.signedAt ? formatDate(activeContract.signedAt) : 'Pendiente'} />
            {activeContract.documentUrl && (
              <button
                onClick={() => handleDownloadContract(activeContract.id)}
                disabled={downloadingId === activeContract.id}
                className="mt-4 w-full bg-primary hover:bg-primary-pressed text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {downloadingId === activeContract.id ? 'Descargando...' : 'Descargar contrato PDF'}
              </button>
            )}
          </>
        ) : (
          <p className="text-muted text-sm">Aún no tienes un contrato registrado.</p>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold text-heading mb-6">Mi perfil</h1>
      {user?.role === 'ADMIN' ? <AdminProfile /> : <TenantProfile />}
    </div>
  );
}
