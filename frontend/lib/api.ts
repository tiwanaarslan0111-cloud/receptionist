export function getApiBase(): string {
  if (typeof window !== "undefined" && window.location.hostname) {
    const host = window.location.hostname;
    const proto = window.location.protocol;
    // When running in browser on production domain or any reverse-proxied host
    if (host !== "localhost" && host !== "127.0.0.1") {
      const envUrl = process.env.NEXT_PUBLIC_API_URL;
      if (envUrl && !envUrl.includes("127.0.0.1") && !envUrl.includes("localhost")) {
        return envUrl.replace(/\/+$/, "");
      }
      return `${proto}//${host}`;
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || "https://receptionist.helpexai.com";
}

export const API_BASE =
  typeof window !== "undefined"
    ? getApiBase()
    : (process.env.NEXT_PUBLIC_API_URL || "https://receptionist.helpexai.com");

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

// ==================== AUTH STORAGE HELPERS ====================

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function setAuth(token: string, profile: {
  id?: string;
  name: string;
  business_type: string;
  username?: string;
  admin_secret?: string;
  widget_token?: string;
}): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("access_token", token);
  if (profile.id) localStorage.setItem("business_id", profile.id);
  localStorage.setItem("business_name", profile.name);
  localStorage.setItem("business_type", profile.business_type);
  if (profile.username) localStorage.setItem("business_username", profile.username);
  if (profile.admin_secret) localStorage.setItem("admin_secret_key", profile.admin_secret);
  if (profile.widget_token) localStorage.setItem("business_widget_token", profile.widget_token);
}

export function getAuth(): {
  token: string | null;
  id: string | null;
  name: string | null;
  business_type: string | null;
  username: string | null;
  admin_secret: string | null;
  widget_token: string | null;
} {
  if (typeof window === "undefined") {
    return { token: null, id: null, name: null, business_type: null, username: null, admin_secret: null, widget_token: null };
  }
  return {
    token: localStorage.getItem("access_token"),
    id: localStorage.getItem("business_id"),
    name: localStorage.getItem("business_name"),
    business_type: localStorage.getItem("business_type"),
    username: localStorage.getItem("business_username"),
    admin_secret: localStorage.getItem("admin_secret_key"),
    widget_token: localStorage.getItem("business_widget_token"),
  };
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("access_token");
  localStorage.removeItem("business_id");
  localStorage.removeItem("business_name");
  localStorage.removeItem("business_type");
  localStorage.removeItem("business_username");
  localStorage.removeItem("admin_secret_key");
  localStorage.removeItem("business_widget_token");
}

// ==================== CORE API FETCH WRAPPER ====================

export async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit & { token?: string | null; customHeaders?: Record<string, string> } = {}
): Promise<T> {
  const { token, customHeaders, ...fetchOptions } = options;
  const activeToken = token !== undefined ? token : getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...customHeaders,
  };

  if (activeToken) {
    headers["Authorization"] = `Bearer ${activeToken}`;
  }

  const base = typeof window !== "undefined" ? getApiBase() : API_BASE;
  const url = `${base}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    let errMessage = `HTTP ${response.status} ${response.statusText}`;
    let errData: any = null;
    try {
      errData = await response.json();
      if (errData && errData.detail) {
        errMessage = typeof errData.detail === "string" ? errData.detail : JSON.stringify(errData.detail);
      }
    } catch {
      // ignore json parse error
    }
    throw new ApiError(response.status, errMessage, errData);
  }

  return response.json();
}

// ==================== ADMIN API ====================

export interface CreateBusinessPayload {
  name: string;
  business_type: "clinic" | "restaurant";
  username: string;
  password: string;
}

export interface ProvisionBusinessPayload {
  name: string;
  slug: string;
  type: "clinic" | "restaurant";
  inbound_phone_id?: string;
  display_phone_number?: string;
  waba_id?: string;
  owner_email: string;
  owner_password: string;
}

export interface BusinessResponse {
  id: string;
  name: string;
  slug?: string;
  type?: "clinic" | "restaurant";
  business_type: "clinic" | "restaurant";
  username: string;
  inbound_phone_id?: string;
  display_phone_number?: string;
  waba_id?: string;
  widget_token: string;
  is_widget_enabled: boolean;
  created_at: string;
  embed_snippet: string;
  owner_email?: string;
}

export interface ProvisionBusinessResponse extends BusinessResponse {
  owner_role: string;
  owner_user_id: string;
}

export interface DemoLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  business_name: string;
  business_type: string;
  notes?: string;
  status: string;
  created_at: string;
}

export async function createBusiness(payload: CreateBusinessPayload, adminSecret: string): Promise<BusinessResponse> {
  return fetchApi<BusinessResponse>("/api/admin/create-business", {
    method: "POST",
    body: JSON.stringify(payload),
    customHeaders: {
      "x-admin-secret": adminSecret,
    },
  });
}

export async function provisionBusiness(payload: ProvisionBusinessPayload, adminSecret: string): Promise<ProvisionBusinessResponse> {
  return fetchApi<ProvisionBusinessResponse>("/api/admin/businesses", {
    method: "POST",
    body: JSON.stringify(payload),
    customHeaders: {
      "x-admin-secret": adminSecret,
    },
  });
}

export async function getBusinesses(adminSecret: string): Promise<BusinessResponse[]> {
  return fetchApi<BusinessResponse[]>("/api/admin/businesses", {
    method: "GET",
    customHeaders: {
      "x-admin-secret": adminSecret,
    },
  });
}

export async function toggleBusinessWidget(businessId: string, adminSecret: string): Promise<BusinessResponse> {
  return fetchApi<BusinessResponse>(`/api/admin/businesses/${businessId}/toggle-widget`, {
    method: "PATCH",
    customHeaders: {
      "x-admin-secret": adminSecret,
    },
  });
}

export async function deleteBusiness(businessId: string, adminSecret: string): Promise<{ message: string; id: string }> {
  return fetchApi<{ message: string; id: string }>(`/api/admin/businesses/${businessId}`, {
    method: "DELETE",
    customHeaders: {
      "x-admin-secret": adminSecret,
    },
  });
}

export async function getDemoLeads(adminSecret: string): Promise<DemoLead[]> {
  return fetchApi<DemoLead[]>("/api/admin/leads", {
    method: "GET",
    customHeaders: {
      "x-admin-secret": adminSecret,
    },
  });
}

export async function updateDemoLeadStatus(leadId: string, status: string, adminSecret: string): Promise<DemoLead> {
  return fetchApi<DemoLead>(`/api/admin/leads/${leadId}/status?status_val=${encodeURIComponent(status)}`, {
    method: "PATCH",
    customHeaders: {
      "x-admin-secret": adminSecret,
    },
  });
}

export async function submitDemoLead(payload: {
  name: string;
  email: string;
  phone: string;
  business_name: string;
  business_type: string;
  notes?: string;
}): Promise<DemoLead> {
  return fetchApi<DemoLead>("/api/leads/demo", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ==================== AUTH API ====================

export interface LoginResponse {
  access_token: string;
  token_type: string;
  business_id?: string;
  business_name: string;
  business_type: "clinic" | "restaurant" | "admin";
  admin_secret?: string;
}

export async function loginBusiness(username: string, password: string): Promise<LoginResponse> {
  return fetchApi<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function changePassword(current_password: string, new_password: string): Promise<{ message: string }> {
  return fetchApi<{ message: string }>("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ current_password, new_password }),
  });
}

export async function getProfile(): Promise<any> {
  return fetchApi("/api/auth/me");
}

// ==================== CLINIC API ====================

export interface Doctor {
  id: string;
  business_id: string;
  name: string;
  specialty: string;
  symptoms_treated: string[];
  fee: number;
  is_available_today?: boolean;
}

export interface DoctorSlot {
  id: string;
  business_id: string;
  doctor_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
  is_disabled?: boolean;
}

export interface ClinicAppointment {
  id: string;
  business_id: string;
  doctor_id: string;
  slot_id: string;
  patient_name: string;
  patient_phone: string;
  symptoms_reported?: string;
  created_at: string;
}

export async function getClinicDoctors(): Promise<Doctor[]> {
  return fetchApi<Doctor[]>("/api/clinic/doctors");
}

export async function createClinicDoctor(payload: {
  name: string;
  specialty: string;
  symptoms_treated: string[];
  fee: number;
}): Promise<Doctor> {
  return fetchApi<Doctor>("/api/clinic/doctors", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateClinicDoctor(
  doctorId: string,
  payload: Partial<{ name: string; specialty: string; symptoms_treated: string[]; fee: number; is_available_today: boolean }>
): Promise<Doctor> {
  return fetchApi<Doctor>(`/api/clinic/doctors/${doctorId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function toggleDoctorAvailabilityToday(doctorId: string): Promise<Doctor> {
  return fetchApi<Doctor>(`/api/clinic/doctors/${doctorId}/toggle-availability`, {
    method: "PATCH",
  });
}

export async function getClinicSlots(params?: { doctor_id?: string; slot_date?: string }): Promise<DoctorSlot[]> {
  const query = new URLSearchParams();
  if (params?.doctor_id) query.set("doctor_id", params.doctor_id);
  if (params?.slot_date) query.set("slot_date", params.slot_date);
  const qStr = query.toString();
  return fetchApi<DoctorSlot[]>(`/api/clinic/slots${qStr ? `?${qStr}` : ""}`);
}

export async function createClinicSlots(
  slots: { doctor_id: string; slot_date: string; start_time: string; end_time: string }[]
): Promise<DoctorSlot[]> {
  return fetchApi<DoctorSlot[]>("/api/clinic/slots", {
    method: "POST",
    body: JSON.stringify(slots),
  });
}

export async function deleteClinicSlot(slotId: string): Promise<void> {
  return fetchApi<void>(`/api/clinic/slots/${slotId}`, {
    method: "DELETE",
  });
}

export async function toggleSlotDisabled(slotId: string): Promise<DoctorSlot> {
  return fetchApi<DoctorSlot>(`/api/clinic/slots/${slotId}/toggle-disable`, {
    method: "PATCH",
  });
}

export interface ManualBookSlotPayload {
  patient_name: string;
  patient_phone: string;
  symptoms_reported?: string;
}

export async function manualBookClinicSlot(
  slotId: string,
  payload: ManualBookSlotPayload
): Promise<DoctorSlot> {
  return fetchApi<DoctorSlot>(`/api/clinic/slots/${slotId}/book`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function manualUnbookClinicSlot(slotId: string): Promise<DoctorSlot> {
  return fetchApi<DoctorSlot>(`/api/clinic/slots/${slotId}/unbook`, {
    method: "POST",
  });
}

export async function getClinicAppointments(): Promise<ClinicAppointment[]> {
  return fetchApi<ClinicAppointment[]>("/api/clinic/appointments");
}

// ==================== RESTAURANT API ====================

export interface MenuItem {
  id: string;
  business_id: string;
  name: string;
  category: string;
  price: number;
  is_available: boolean;
}

export interface RestaurantTable {
  id: string;
  business_id: string;
  table_number: string;
  capacity: number;
}

export interface RestaurantReservation {
  id: string;
  business_id: string;
  customer_name: string;
  customer_phone: string;
  booking_date: string;
  booking_time: string;
  party_size: number;
  order_items: {
    item_id?: string;
    name: string;
    price?: number;
    quantity: number;
    subtotal?: number;
  }[];
  created_at: string;
}

export async function getRestaurantMenu(): Promise<MenuItem[]> {
  return fetchApi<MenuItem[]>("/api/restaurant/menu");
}

export async function createRestaurantMenuItem(payload: {
  name: string;
  category: string;
  price: number;
  is_available?: boolean;
}): Promise<MenuItem> {
  return fetchApi<MenuItem>("/api/restaurant/menu", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function toggleMenuItemAvailability(itemId: string, isAvailable?: boolean): Promise<MenuItem> {
  return fetchApi<MenuItem>(`/api/restaurant/menu/${itemId}/availability`, {
    method: "PUT",
    body: JSON.stringify(isAvailable !== undefined ? { is_available: isAvailable } : {}),
  });
}

export async function getRestaurantTables(): Promise<RestaurantTable[]> {
  return fetchApi<RestaurantTable[]>("/api/restaurant/tables");
}

export async function createRestaurantTable(payload: {
  table_number: string;
  capacity: number;
}): Promise<RestaurantTable> {
  return fetchApi<RestaurantTable>("/api/restaurant/tables", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getRestaurantReservations(): Promise<RestaurantReservation[]> {
  return fetchApi<RestaurantReservation[]>("/api/restaurant/reservations");
}

// ==================== BUSINESS WHATSAPP (WAHA) API ====================

export interface WhatsAppStatusResponse {
  session: string;
  status: string;
  connected: boolean;
}

export interface WhatsAppQRResponse {
  connected: boolean;
  qr: string | null;
  status: string;
}

export interface WhatsAppDisconnectResponse {
  success: boolean;
}

export async function getWhatsAppStatus(): Promise<WhatsAppStatusResponse> {
  return fetchApi<WhatsAppStatusResponse>("/api/business/whatsapp/status");
}

export async function getWhatsAppQR(): Promise<WhatsAppQRResponse> {
  return fetchApi<WhatsAppQRResponse>("/api/business/whatsapp/qr");
}

export async function disconnectWhatsApp(): Promise<WhatsAppDisconnectResponse> {
  return fetchApi<WhatsAppDisconnectResponse>("/api/business/whatsapp/disconnect", {
    method: "POST",
  });
}

export interface WhatsAppResetResponse {
  status: string;
}

export async function resetWhatsApp(): Promise<WhatsAppResetResponse> {
  return fetchApi<WhatsAppResetResponse>("/api/business/whatsapp/reset", {
    method: "POST",
  });
}
