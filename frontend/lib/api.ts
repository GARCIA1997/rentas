const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface RequestOptions extends RequestInit {
  token?: string;
}

export async function apiCall(
  endpoint: string,
  options: RequestOptions = {}
): Promise<any> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.errors?.[0]?.msg || `API error: ${response.statusText}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function login(phone: string, password: string) {
  return apiCall('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  });
}

export async function register(
  phone: string,
  password: string,
  firstName: string,
  lastName: string,
  email?: string
) {
  return apiCall('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      phone,
      password,
      firstName,
      lastName,
      email,
    }),
  });
}

export async function refreshToken() {
  return apiCall('/api/auth/refresh', {
    method: 'POST',
  });
}

// ---- Properties ----

export interface Property {
  id: string;
  ownerId: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  propertyType: 'HOUSE' | 'LOCAL';
  status: 'OCUPADA' | 'LIBRE' | 'MANTENIMIENTO';
  rentalPrice: string;
  waterIncluded: boolean;
  maintenanceNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { tenants: number };
}

export type PropertyInput = Omit<Property, 'id' | 'ownerId' | 'createdAt' | 'updatedAt' | '_count'>;

export const propertiesApi = {
  list: (token: string) => apiCall('/api/properties', { token }) as Promise<Property[]>,
  get: (id: string, token: string) => apiCall(`/api/properties/${id}`, { token }),
  create: (data: PropertyInput, token: string) =>
    apiCall('/api/properties', { method: 'POST', body: JSON.stringify(data), token }),
  update: (id: string, data: Partial<PropertyInput>, token: string) =>
    apiCall(`/api/properties/${id}`, { method: 'PUT', body: JSON.stringify(data), token }),
  remove: (id: string, token: string) => apiCall(`/api/properties/${id}`, { method: 'DELETE', token }),
};

// ---- Tenants ----

export interface Tenant {
  id: string;
  propertyId: string;
  userId?: string | null;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  idDocument?: string | null;
  moveInDate: string;
  status: 'ACTIVE' | 'EVICTED' | 'MOVED_OUT';
  createdAt: string;
  updatedAt: string;
  property?: { id: string; name: string; city: string };
}

export type TenantInput = Omit<
  Tenant,
  'id' | 'userId' | 'createdAt' | 'updatedAt' | 'property'
>;

export const tenantsApi = {
  list: (token: string) => apiCall('/api/tenants', { token }) as Promise<Tenant[]>,
  get: (id: string, token: string) => apiCall(`/api/tenants/${id}`, { token }),
  create: (data: TenantInput, token: string) =>
    apiCall('/api/tenants', { method: 'POST', body: JSON.stringify(data), token }),
  update: (id: string, data: Partial<TenantInput>, token: string) =>
    apiCall(`/api/tenants/${id}`, { method: 'PUT', body: JSON.stringify(data), token }),
  remove: (id: string, token: string) => apiCall(`/api/tenants/${id}`, { method: 'DELETE', token }),
};

// ---- Representatives ----

export interface Representative {
  id: string;
  fullName: string;
  position?: string | null;
  idDocument?: string | null;
  phone?: string | null;
  email?: string | null;
  signatureImageUrl?: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type RepresentativeInput = Omit<Representative, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>;

export const representativesApi = {
  list: (token: string) => apiCall('/api/representatives', { token }) as Promise<Representative[]>,
  get: (id: string, token: string) => apiCall(`/api/representatives/${id}`, { token }),
  create: (data: RepresentativeInput, token: string) =>
    apiCall('/api/representatives', { method: 'POST', body: JSON.stringify(data), token }),
  update: (id: string, data: Partial<RepresentativeInput>, token: string) =>
    apiCall(`/api/representatives/${id}`, { method: 'PUT', body: JSON.stringify(data), token }),
  remove: (id: string, token: string) => apiCall(`/api/representatives/${id}`, { method: 'DELETE', token }),
};

// ---- Contract Templates ----

export interface ContractTemplateSummary {
  id: string;
  name: string;
  isDefault: boolean;
}

export const contractTemplatesApi = {
  list: (token: string) => apiCall('/api/contract-templates', { token }) as Promise<ContractTemplateSummary[]>,
};

// ---- Contracts ----

export interface PenaltyRules {
  latePaymentPercentage?: number;
  maxDamageCharge?: number;
}

export interface DepositReturnPolicy {
  description?: string;
}

export interface Contract {
  id: string;
  tenantId: string;
  propertyId: string;
  representativeId?: string | null;
  startDate: string;
  endDate: string;
  monthlyRent: string;
  depositAmount: string;
  waterIncluded: boolean;
  depositReturnPolicy?: DepositReturnPolicy | null;
  penaltyRules?: PenaltyRules | null;
  templateUsed?: string | null;
  signedAt?: string | null;
  signedDigitallyPhone: boolean;
  documentUrl?: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'AUTO_RENEWAL_PENDING';
  autoRenewal: boolean;
  createdAt: string;
  updatedAt: string;
  tenant?: { id: string; fullName: string; idDocument?: string | null };
  property?: { id: string; name: string; address: string; city: string };
  representative?: { id: string; fullName: string; position?: string | null } | null;
}

export interface ContractInput {
  tenantId: string;
  representativeId?: string;
  templateId?: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  depositAmount: number;
  waterIncluded: boolean;
  autoRenewal: boolean;
  penaltyRules?: PenaltyRules;
  depositReturnPolicy?: DepositReturnPolicy;
}

export const contractsApi = {
  list: (token: string) => apiCall('/api/contracts', { token }) as Promise<Contract[]>,
  get: (id: string, token: string) => apiCall(`/api/contracts/${id}`, { token }) as Promise<Contract>,
  create: (data: ContractInput, token: string) =>
    apiCall('/api/contracts', { method: 'POST', body: JSON.stringify(data), token }) as Promise<Contract>,
  update: (id: string, data: Partial<ContractInput>, token: string) =>
    apiCall(`/api/contracts/${id}`, { method: 'PUT', body: JSON.stringify(data), token }) as Promise<Contract>,
  remove: (id: string, token: string) => apiCall(`/api/contracts/${id}`, { method: 'DELETE', token }),
  generatePdf: (id: string, token: string) =>
    apiCall(`/api/contracts/${id}/generate-pdf`, { method: 'POST', token }) as Promise<Contract>,
  markSigned: (id: string, signedDigitallyPhone: boolean, token: string) =>
    apiCall(`/api/contracts/${id}/mark-signed`, {
      method: 'POST',
      body: JSON.stringify({ signedDigitallyPhone }),
      token,
    }) as Promise<Contract>,
  downloadPdf: async (id: string, token: string) => {
    const response = await fetch(`${API_URL}/api/contracts/${id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error('No se pudo descargar el PDF');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contrato-${id}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  },
};

// ---- Rent Payments ----

export interface RentPayment {
  id: string;
  contractId: string;
  tenantId: string;
  propertyId: string;
  amountDue: string;
  amountPaid: string;
  dueDate: string;
  paidDate?: string | null;
  paymentMethod: 'MANUAL' | 'TRANSFERENCIA' | 'EFECTIVO' | 'CHEQUE';
  notes?: string | null;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  createdAt: string;
  updatedAt: string;
  tenant?: { id: string; fullName: string; phone?: string | null };
  property?: { id: string; name: string; address: string; city: string };
  contract?: { id: string; penaltyRules?: PenaltyRules | null };
}

export interface RentPaymentInput {
  contractId: string;
  dueDate: string;
  amountDue: number;
  amountPaid?: number;
  paidDate?: string;
  paymentMethod: RentPayment['paymentMethod'];
  notes?: string;
}

export const rentPaymentsApi = {
  list: (token: string) => apiCall('/api/rent-payments', { token }) as Promise<RentPayment[]>,
  get: (id: string, token: string) => apiCall(`/api/rent-payments/${id}`, { token }) as Promise<RentPayment>,
  create: (data: RentPaymentInput, token: string) =>
    apiCall('/api/rent-payments', { method: 'POST', body: JSON.stringify(data), token }) as Promise<RentPayment>,
  update: (id: string, data: Partial<RentPaymentInput>, token: string) =>
    apiCall(`/api/rent-payments/${id}`, { method: 'PUT', body: JSON.stringify(data), token }) as Promise<RentPayment>,
  remove: (id: string, token: string) => apiCall(`/api/rent-payments/${id}`, { method: 'DELETE', token }),
  markPaid: (id: string, paymentMethod: RentPayment['paymentMethod'], token: string) =>
    apiCall(`/api/rent-payments/${id}/mark-paid`, {
      method: 'POST',
      body: JSON.stringify({ paymentMethod }),
      token,
    }) as Promise<RentPayment>,
  downloadReceipt: async (id: string, token: string) => {
    const response = await fetch(`${API_URL}/api/rent-payments/${id}/receipt`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error('No se pudo descargar el recibo');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `recibo-${id}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  },
};

export function buildWhatsAppReminderUrl(payment: RentPayment): string {
  const phone = payment.tenant?.phone?.replace(/\D/g, '') ?? '';
  const dueDate = new Date(payment.dueDate).toLocaleDateString('es-MX', { timeZone: 'UTC' });
  const isOverdue = payment.status === 'OVERDUE';
  const message = isOverdue
    ? `Hola ${payment.tenant?.fullName}, te recordamos que tu pago de renta de $${Number(payment.amountDue).toLocaleString('es-MX')} correspondiente a ${payment.property?.name} venció el ${dueDate}. Por favor realiza tu pago a la brevedad. ¡Gracias!`
    : `Hola ${payment.tenant?.fullName}, te recordamos que tu pago de renta de $${Number(payment.amountDue).toLocaleString('es-MX')} correspondiente a ${payment.property?.name} vence el ${dueDate}. ¡Gracias!`;
  return `https://wa.me/52${phone}?text=${encodeURIComponent(message)}`;
}

// ---- Dashboard ----

export interface DashboardStats {
  properties: {
    total: number;
    ocupada: number;
    libre: number;
    mantenimiento: number;
  };
  activeTenants: number;
  activeRepresentatives: number;
}

export const dashboardApi = {
  stats: (token: string) => apiCall('/api/dashboard/stats', { token }) as Promise<DashboardStats>,
};
