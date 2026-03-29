import { config } from "../config.js";

const ibSessionCookies = new Map();

function resolveOneCConfigByUrl(path) {
    return config.oneCConfigs.find((cityConfig) => path.startsWith(cityConfig.url));
}

function parseIbSessionCookie(setCookieHeader) {
    if (!setCookieHeader) {
        return null;
    }

    const match = setCookieHeader.match(/ibsession=([^;,\s]+)/i);
    if (!match?.[1]) {
        return null;
    }

    return `ibsession=${match[1]}`;
}

export async function onecFetch(path, options = {}) {
    const cityConfig = resolveOneCConfigByUrl(path);
    const { headers: optionHeaders, ...restOptions } = options;
    const hasBody = options.body !== undefined;
    const initialHeaders = new Headers(optionHeaders || {});
    const hasCookieHeader = initialHeaders.has("Cookie");

    const requestWithCookie = async (cookie) => {
        const headers = new Headers(optionHeaders || {});

        if (hasBody && !headers.has("Content-Type")) {
            headers.set("Content-Type", "application/json");
        }

        if (cookie && !hasCookieHeader) {
            headers.set("Cookie", cookie);
        }

        return fetch(path, {
            ...restOptions,
            headers,
        });
    };

    let storedCookie = cityConfig ? ibSessionCookies.get(cityConfig.cityId) : null;
    if (cityConfig && !storedCookie && !hasCookieHeader) {
        storedCookie = await startOneCSession(cityConfig);
    }

    let res = await requestWithCookie(storedCookie);

    // 1C can invalidate IB sessions unexpectedly.
    // If the cookie became stale, recreate the session and retry once.
    if (res.status >= 400 && cityConfig && !hasCookieHeader) {
        ibSessionCookies.delete(cityConfig.cityId);
        const refreshedCookie = await startOneCSession(cityConfig);
        res = await requestWithCookie(refreshedCookie);
        storedCookie = refreshedCookie;
    }

    const data = await res.json().
        catch(async () => { return await res.text().catch(() => "") });
    
    let isJsonResponse = true;
    if (typeof(data) === typeof(String)) {
        isJsonResponse = false;
    }

    if (!res.ok) {
        if (!isJsonResponse && typeof data === "string" && data.trim()) {
            console.error("1C XML error response:", data);
        }
        console.log(res);
        console.log(data);
        const reason = data.error
            || data.message
            || (!isJsonResponse ? `api_error_${res.status}` : null)
            || "api_error";
        throw new Error(reason);
    }

    return isJsonResponse ? data : {};
}

export function getOneCConfig(cityId) {
    const resolvedCityId = cityId || config.defaultCityId;

    console.log(resolvedCityId);

    if(!resolvedCityId) {
        throw new Error("city_id_not_resolved");
    }

    const { oneCConfigs }  = config;

    return oneCConfigs.find((cityConfig) => cityConfig.cityId === resolvedCityId );

}

export async function startOneCSessions() {
    await Promise.all(config.oneCConfigs.map(startOneCSession));
}

export async function finishOneCSessions() {
    await Promise.all(config.oneCConfigs.map(finishOneCSession));
}

async function startOneCSession(oneCConfig) {
    const startUrl = oneCConfig.url.concat("startIBSession");

    try {
        const res = await fetch(startUrl, {
            method: "HEAD",
            headers: {
                Authorization: `Basic ${oneCConfig.basicAuth}`,
                IBSession: "start",
            },
        });

        if (!res.ok) {
            console.warn(`Failed to start 1C IB session for ${oneCConfig.cityId}: ${res.status}`);
            return;
        }

        const cookie = parseIbSessionCookie(res.headers.get("set-cookie"));
        if (!cookie) {
            console.warn(`1C IB session cookie missing for ${oneCConfig.cityId}`);
            return null;
        }

        ibSessionCookies.set(oneCConfig.cityId, cookie);
        console.log(`1C IB session initialized for ${oneCConfig.cityId}`);
        return cookie;
    } catch (error) {
        console.warn(`1C IB session start error for ${oneCConfig.cityId}`, error);
        return null;
    }
}

async function finishOneCSession(oneCConfig) {
    const finishUrl = oneCConfig.url.concat("finishIBSession");
    const cookie = ibSessionCookies.get(oneCConfig.cityId);

    try {
        const res = await fetch(finishUrl, {
            method: "HEAD",
            headers: {
                Authorization: `Basic ${oneCConfig.basicAuth}`,
                IBSession: "finish",
                ...(cookie ? { Cookie: cookie } : {}),
            },
        });

        if (!res.ok) {
            console.warn(`Failed to finish 1C IB session for ${oneCConfig.cityId}: ${res.status}`);
        }
    } catch (error) {
        console.warn(`1C IB session finish error for ${oneCConfig.cityId}`, error);
    } finally {
        ibSessionCookies.delete(oneCConfig.cityId);
    }
}

export async function getPatientsByPhone({ cityId, phone}) {
    const oneCConfig = getOneCConfig(cityId);
    const data = onecFetch(oneCConfig.url.concat(`/catalogs/clients/?search_type=ByPhone&phone=${phone}`), {
        method: "GET",
        headers: {
            Authorization: `Basic ${oneCConfig.basicAuth}`, // TODO: hardcode
        },
    });

    if (data?.error) {
        return [];
    }
    else { 
        return data; 
    }

}

export async function getPatientById({ cityId, patient_id}) {
    const oneCConfig = getOneCConfig(cityId);
    const data = onecFetch(oneCConfig.url.concat(`/catalogs/clients/?search_type=ByID&patient_id=${patient_id}`), {
        method: "GET",
        headers: {
            Authorization: `Basic d2ViOjEyMzQ1`, // TODO: hardcode
        },
    });

    if (data?.error) {
        return [];
    }
    else { 
        return data; 
    }

}

export async function getBonusTransactions({ cityId, patient_id }) {
    const oneCConfig = getOneCConfig(cityId);
    const data = await onecFetch(oneCConfig.url.concat(`/transactions/bonus`), {
        method: "POST",
        headers: {
            Authorization: `Basic d2ViOjEyMzQ1`, // TODO: hardcode
        },
        body: JSON.stringify({ patient_id }),
    });

    if (!Array.isArray(data)) {
        return [];
    }

    return data.map((transaction) => {
        const normalizedOperation = String(transaction?.operation || "").toLowerCase();
        const operation = normalizedOperation === "расход" || normalizedOperation === "debit"
            ? "debit"
            : "credit";

        return {
            operation,
            sum: Number(transaction?.sum || 0),
            description: transaction?.description || "",
            date: transaction?.date || transaction?.Date || transaction?.date_time || null,
            operation_sum: transaction?.operation_sum !== undefined
                ? Number(transaction.operation_sum)
                : undefined,
        };
    });
}

export async function getAppointmentsDocuments({ cityId, patient_id }) {
    const oneCConfig = getOneCConfig(cityId);
    const data = await onecFetch(oneCConfig.url.concat(`/documents/appointments?search_type=ByPatient&patient_id=${patient_id}`), {
        method: "GET",
        headers: {
            Authorization: `Basic d2ViOjEyMzQ1`, // TODO: hardcode
        },
    });

    if (!Array.isArray(data)) {
        return [];
    }

    return data;
}

export async function getAppointmentsSchedule({ cityId, specializationId }) {
    const oneCConfig = getOneCConfig(cityId);
    const params = new URLSearchParams();
    if (specializationId) {
        params.set("specializationId", specializationId);
    }

    const data = await onecFetch(oneCConfig.url.concat(`/documents/schedule${params.toString() ? `?${params}` : ""}`), {
        method: "GET",
        headers: {
            Authorization: "Basic d2ViOjEyMzQ1",
        },
    });

    if (!Array.isArray(data)) {
        return [];
    }

    return data;
}

export async function getCatalogSpecializationsBySchedule({ cityId }) {
    const oneCConfig = getOneCConfig(cityId);
    const data = await onecFetch(oneCConfig.url.concat("/catalogs/specializations?search_type=BySchedule"), {
        method: "GET",
        headers: {
            Authorization: "Basic d2ViOjEyMzQ1",
        },
    });

    if (!Array.isArray(data)) {
        return [];
    }

    return data;
}

export async function getCatalogEmployeesBySpec({ cityId, specializationId }) {
    const oneCConfig = getOneCConfig(cityId);
    const params = new URLSearchParams({
        search_type: "BySpec",
        specializationId,
    });
    const data = await onecFetch(oneCConfig.url.concat(`/catalogs/employees?${params}`), {
        method: "GET",
        headers: {
            Authorization: "Basic d2ViOjEyMzQ1",
        },
    });

    if (!Array.isArray(data)) {
        return [];
    }

    return data;
}

export async function getDoctorSchedule({ cityId, doctorId, branchId, date, format }) {
    const oneCConfig = getOneCConfig(cityId);
    const params = new URLSearchParams({
        doctorId,
        branchId,
    });

    if (date) {
        params.set("date", date);
    }

    if (format) {
        params.set("format", format);
    }

    const data = await onecFetch(oneCConfig.url.concat(`/documents/schedule?${params}`), {
        method: "GET",
        headers: {
            Authorization: "Basic d2ViOjEyMzQ1",
        },
    });

    if (!Array.isArray(data)) {
        return [];
    }

    return data;
}

export async function createAppointmentDocument({ cityId, payload }) {
    const oneCConfig = getOneCConfig(cityId);
    return onecFetch(oneCConfig.url.concat("/documents/appointments"), {
        method: "POST",
        headers: {
            Authorization: "Basic d2ViOjEyMzQ1",
        },
        body: JSON.stringify(payload),
    });
}

export async function updateAppointmentDocument({ cityId, payload }) {
    const oneCConfig = getOneCConfig(cityId);
    return onecFetch(oneCConfig.url.concat("/documents/appointments"), {
        method: "PUT",
        headers: {
            Authorization: "Basic d2ViOjEyMzQ1",
        },
        body: JSON.stringify(payload),
    });
}
