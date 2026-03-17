import { config } from "../config.js";

export function getOneCConfig(cityId) {
    const resolvedCityId = cityId || config.defaultCityId;

    if(!resolvedCityId) {
        throw new Error("city_id_not_resolved");
    }

    return {
        cityId: resolvedCityId,
        baseUrl: `mock://1c/${resolvedCityId}`,
    };
}

export async function getPatientsByPhone({ cityId, phone}) {
    const oneCConfig = getOneCConfig(cityId);

    return [
        {
            id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
            fullName: "Семён Сидорук",
            birthDate: "1998-05-16"
        },
        {
            id: "6e7f8a9b-0c1d-4e2f-3a4b-5c6d7e8f9a0b",
            fullName: "Виктор Сидорук",
            birthDate: "1973-04-14"
        },
        {
            id: "6e7f8a9b-0c1d-4e2f-3a4b-5c6d7e8f9a0b",
            fullName: "Людмила Сидорук",
            birthDate: "1962-08-15"
        }
    ]
}