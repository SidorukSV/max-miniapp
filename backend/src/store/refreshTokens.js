const refreshTokens = new Map();

export function saveRefreshToken(jti, data) {
    refreshTokens.set(jti, data);
}

export function getRefreshToken(jti) {
    return refreshTokens.get(jti);
}

export function deleteRefreshToken(jti) {
    return refreshTokens.delete(jti);
}

export function deleteAllExpiredRefreshTokens() {
    const now = Date.now();

    for (const [jti, token] of refreshTokens.entries()) {
        if (token.expiresAt <= now) {
            deleteRefreshToken(jti);
        }
    }
}