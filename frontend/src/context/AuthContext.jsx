import { createContext, useContext, useEffect, useState } from "react";
import { authRefresh, getMe, getStoredAccessToken, getStoredRefreshtoken, storeTokens, clearTokens } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [me, setMe] = useState(null);
    const [loading, setLoading] = useState(true);

    async function bootstrap() {
        try {
            const access = getStoredAccessToken();

            if (access) {
                const meData = await getMe(access);
                setMe(meData);
                setLoading(false);
                return;
            }

            const refresh = getStoredRefreshtoken();

            if (refresh) {
                const refreshed = await authRefresh(refresh);
                storeTokens(refresh);

                const meData = await getMe(refreshed.access_token);
                setMe(meData);
            }
        } catch {
            clearTokens();
            setMe(null);
        } finally {
            setLoading(false);
        }
    }

    function logout() {
        clearTokens();
        setMe(null);
    }

    useEffect(() => {
        bootstrap();
    }, []);

    return (
        <AuthContext.Provider
            value={{
                me,
                setMe,
                loading,
                isAuthorized: Boolean(me),
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}