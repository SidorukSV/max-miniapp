const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000/api/v1";

export async function apiFetch(path, options = {}) {
    const hasBody = options.body !== undefined;

    const res = await fetch(`${API_BASE}${path}`, {
        headers: {
            ...(hasBody ? { "Content-Type": "application/json" } : {}),
            ...(options.headers || {}),
        },
        ...options,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(data.error || "api_error");
    }

    return data;
}

export function getStoredAccessToken() {
    return localStorage.getItem("access_token");
}

export function getStoredRefreshtoken(){
    return localStorage.getItem("refresh_token");
}

export function storeTokens({ access_token, refresh_token }) {
    if (access_token) localStorage.setItem("access_token", access_token);
    if (refresh_token) localStorage.setItem("refresh_token", refresh_token);
}

export function clearTokens() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
}

export async function authStart() {
    return apiFetch("/auth/start", {
        method: "POST",
    });
}

export async function authSetCity({ auth_session_id, city_id }) {
    return apiFetch("/api/set-city", {
        method: "POST",
        body: JSON.stringify({ auth_session_id, city_id }),
    });
}

export async function authPhone({ auth_session_id, phone, channel, proof, init_data }) {
    return apiFetch("/auth/phone", {
        method: "POST",
        body: JSON.stringify({ auth_session_id, phone, channel, proof, init_data }),
    });
}

export async function authSelectPatient({ auth_session_id, patient_id }) {
    return apiFetch("/auth/select-patient", {
        method: "POST",
        body: JSON.stringify({ auth_session_id, patient_id }),
    });
}

export async function authRefresh(refresh_token) {
    return apiFetch("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refresh_token }),
    });
}

export async function authLogout(refresh_token) {
    return apiFetch("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refresh_token }),
    });
}

export async function getMe(access_token) {
    return apiFetch("/me", {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    });
}

export async function getBonusTransactions(access_token) {
    return apiFetch("/me/bonus-transactions", {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    });
}

export async function getAppointments(access_token) {
    return apiFetch("/documents/appointments", {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    });
}

export async function updateAppointment(access_token, payload) {
    return apiFetch("/documents/appointments", {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify(payload),
    });
}

export async function createAppointment(access_token, payload) {
    return apiFetch("/documents/appointments", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify(payload),
    });
}

export async function getAppointmentsSchedule(access_token, specializationId) {
    const params = new URLSearchParams();
    if (specializationId) {
        params.set("specializationId", specializationId);
    }

    return apiFetch(`/documents/appointments/schedule${params.toString() ? `?${params}` : ""}`, {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    });
}

export async function getCatalogSpecializationsBySchedule(access_token) {
    const params = new URLSearchParams({
        search_type: "BySchedule",
    });
    return apiFetch(`/catalogs/specializations?${params}`, {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    });
}

export async function getCatalogEmployeesBySpec(access_token, specializationId) {
    const params = new URLSearchParams({
        search_type: "BySpec",
        specializationId,
    });

    return apiFetch(`/catalogs/employees?${params}`, {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    });
}

export async function getDoctorSchedule(access_token, { doctorId, branchId, date, format }) {
    const params = new URLSearchParams({
        doctorId,
        branchId,
    });

    if (date) params.set("date", date);
    if (format) params.set("format", format);

    return apiFetch(`/documents/schedule?${params}`, {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    });
}

export async function getCatalogsCities() {
    return apiFetch("/catalogs/cities");
}

export async function sendLogs(log) {
    return apiFetch("/send-log", {
        method: "POST",
        body: JSON.stringify( { log }),
    });
}
