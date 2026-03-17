import dotenv from "dotenv";

dotenv.config();

export const config = {
    port: Number(process.env.PORT || 3000),
    jwtSecret: process.env.JWT_SECRET || "dev-super-secret-jwt-key",
    citySelectionEnabled: process.env.CITY_SELECTION_ENABLED === "true",
    defaultCityId: process.env.DEFAULT_CITY_ID || null,
};