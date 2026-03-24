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
    console.log(data);
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