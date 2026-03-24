import dotenv from "dotenv";

dotenv.config();

export const config = {
    port: Number(process.env.PORT || 3000),
    jwtSecret: process.env.JWT_SECRET || "dev-super-secret-jwt-key",
    citySelectionEnabled: process.env.CITY_SELECTION_ENABLED === "true",
    defaultCityId: process.env.DEFAULT_CITY_ID || null,
    maxBotToken: process.env.MAX_BOT_TOKEN || "",
    maxInitDataMaxAgeSeconds: Number(process.env.MAX_INIT_DATA_MAX_AGE_SECONDS || 300),
    oneCConfigs: [
        {
            cityId: "RU-KJA",
            url: "http://localhost:4545/UMC_MAX/hs/omni/v1/",
        } 
    ],
};
