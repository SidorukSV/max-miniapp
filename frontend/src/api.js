const API_BASE = "http://localhost:3000/api/v1";

export async function apiFetch(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: {
            "Content-Type": "application/json",
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

export async function authPhone({ auth_session_id, phone, channel, proof }) {
    return apiFetch("/auth/phone", {
        method: "POST",
        body: JSON.stringify({ auth_session_id, phone, channel, proof }),
    });
}

export async function authSelectPatient({ auth_session_id, patient_id }) {
    return apiFetch("/auth/select-patient", {
        method: "POST",
        body: JSON.stringify({ auth_session_id, patient_id }),
    });
}

export async function authRefresh(refresh_token) {
    return apiFetch("/api/refresh", {
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