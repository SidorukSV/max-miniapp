export async function catalogsRoutes(app) {
    app.get("/api/v1/catalogs/cities",
        async (req) => {

            return [
                { id: "RU-CXT", name: "Чита" },
                { id: "RU-KJA", name: "Красноярск" },
            ];
        });

}