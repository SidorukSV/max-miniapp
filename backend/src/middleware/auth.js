import { verifyToken } from "../auth/jwt.js";

export async function authMiddleware(req, reply) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return reply.code(401).send({ error: "no_token" });
        }

        const token = authHeader.replace("Bearer ", "");

        const decoded = verifyToken(token);
        if (decoded.token_type === "refresh") {
            return reply.code(401).send({ error: "invalid_token_type" })
        }

        req.user = decoded;
    } catch(err) {
        return reply.code(401).send({ error: "invalid_token" });
    }
}