import { config } from "../config.js";

export async function onecFetch(path, options = {}) {
    const hasBody = options.body !== undefined;

    const res = await fetch(path, {
        headers: {
            ...(hasBody ? { "Content-Type": "application/json" } : {}),
            ...(options.headers || {}),
        },
        ...options,
    })

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.error || "api_error");
    }

    return data;
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
