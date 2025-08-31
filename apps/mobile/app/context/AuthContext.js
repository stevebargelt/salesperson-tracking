import { createContext, useCallback, useContext, useMemo } from "react";
import { useMMKVString } from "react-native-mmkv";
export const AuthContext = createContext(null);
export const AuthProvider = ({ children }) => {
    const [authToken, setAuthToken] = useMMKVString("AuthProvider.authToken");
    const [authEmail, setAuthEmail] = useMMKVString("AuthProvider.authEmail");
    const logout = useCallback(() => {
        setAuthToken(undefined);
        setAuthEmail("");
    }, [setAuthEmail, setAuthToken]);
    const validationError = useMemo(() => {
        if (!authEmail || authEmail.length === 0)
            return "can't be blank";
        if (authEmail.length < 6)
            return "must be at least 6 characters";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authEmail))
            return "must be a valid email address";
        return "";
    }, [authEmail]);
    const value = {
        isAuthenticated: !!authToken,
        authToken,
        authEmail,
        setAuthToken,
        setAuthEmail,
        logout,
        validationError,
    };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context)
        throw new Error("useAuth must be used within an AuthProvider");
    return context;
};
//# sourceMappingURL=AuthContext.js.map