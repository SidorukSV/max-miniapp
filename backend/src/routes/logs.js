export async function logsRoutes(app) {
    app.get("/api/v1/send-log",
        async (req) => {
            const { log } = req.body;

            console.log(log);

            return { ok: true };
        });

    
}