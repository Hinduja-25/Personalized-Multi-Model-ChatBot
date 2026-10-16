import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../api/client.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem("omnichat_token"));
    const [isLoading, setIsLoading] = useState(true);
    const [authError, setAuthError] = useState(null);

    // Verify token on initial load
    useEffect(() => {
        const verifyAuth = async () => {
            const savedToken = localStorage.getItem("omnichat_token");
            if (!savedToken) {
                setIsLoading(false);
                return;
            }

            try {
                const res = await api.auth.getMe();
                if (res.success && res.user) {
                    setUser(res.user);
                    setToken(savedToken);
                } else {
                    logout();
                }
            } catch (err) {
                console.warn("Auth token validation failed:", err.message);
                logout();
            } finally {
                setIsLoading(false);
            }
        };

        verifyAuth();
    }, []);

    const login = async (email, password) => {
        setAuthError(null);
        try {
            const res = await api.auth.login({ email, password });
            if (res.token) {
                localStorage.setItem("omnichat_token", res.token);
                setToken(res.token);
                setUser(res.user);
                return { success: true };
            }
            return { success: false, message: res.message || "Login failed" };
        } catch (err) {
            const msg = err.data?.message || err.message || "Failed to log in";
            setAuthError(msg);
            return { success: false, message: msg };
        }
    };

    const register = async (name, email, password, confirmPassword) => {
        setAuthError(null);
        try {
            const res = await api.auth.register({ name, email, password, confirmPassword });
            if (res.token) {
                localStorage.setItem("omnichat_token", res.token);
                setToken(res.token);
                setUser(res.user);
                return { success: true };
            }
            return { success: false, message: res.message || "Registration failed" };
        } catch (err) {
            const msg = err.data?.message || err.message || "Registration failed";
            setAuthError(msg);
            return { success: false, message: msg };
        }
    };

    const logout = () => {
        localStorage.removeItem("omnichat_token");
        setToken(null);
        setUser(null);
        setAuthError(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isAuthenticated: Boolean(token && user),
                isLoading,
                authError,
                setAuthError,
                login,
                register,
                logout
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

export default AuthContext;
