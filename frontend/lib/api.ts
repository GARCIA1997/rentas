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
