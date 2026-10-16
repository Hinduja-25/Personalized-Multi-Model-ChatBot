import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

export const AuthView = () => {
    const [isRegister, setIsRegister] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState("");

    const { login, register, authError, setAuthError } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError("");
        setAuthError(null);

        if (!email.trim() || !password) {
            setFormError("Please fill in all required fields.");
            return;
        }

        if (isRegister) {
            if (!name.trim()) {
                setFormError("Please enter your name.");
                return;
            }
            if (password !== confirmPassword) {
                setFormError("Passwords do not match.");
                return;
            }
            if (password.length < 8) {
                setFormError("Password must be at least 8 characters long.");
                return;
            }
        }

        setIsSubmitting(true);

        try {
            if (isRegister) {
                await register(name, email, password, confirmPassword);
            } else {
                await login(email, password);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleMode = () => {
        setIsRegister(!isRegister);
        setFormError("");
        setAuthError(null);
    };

    const displayError = formError || authError;

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-logo-badge">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10a9.96 9.96 0 0 1-4.89-1.28L2 22l1.28-5.11A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2z"></path>
                            <path d="M8 12h8"></path>
                            <path d="M12 8v8"></path>
                        </svg>
                    </div>
                    <h2>{isRegister ? "Create Your Account" : "Welcome Back"}</h2>
                    <p className="auth-subtitle">
                        {isRegister
                            ? "Sign up to start chatting with Google Gemini & Azure OpenAI models."
                            : "Log in to access your personalized multi-model chat sessions."}
                    </p>
                </div>

                {displayError && (
                    <div className="auth-error-alert" role="alert">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <span>{displayError}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                    {isRegister && (
                        <div className="form-group">
                            <label htmlFor="auth-name">Full Name</label>
                            <input
                                id="auth-name"
                                type="text"
                                placeholder="Jane Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={isSubmitting}
                                required
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="auth-email">Email Address</label>
                        <input
                            id="auth-email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isSubmitting}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="auth-password">Password</label>
                        <input
                            id="auth-password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isSubmitting}
                            required
                        />
                        {isRegister && (
                            <span className="form-hint">At least 8 characters with 1 letter & 1 number</span>
                        )}
                    </div>

                    {isRegister && (
                        <div className="form-group">
                            <label htmlFor="auth-confirm-password">Confirm Password</label>
                            <input
                                id="auth-confirm-password"
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={isSubmitting}
                                required
                            />
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <span className="spinner-inline"></span>
                        ) : isRegister ? (
                            "Sign Up"
                        ) : (
                            "Sign In"
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>
                        {isRegister ? "Already have an account?" : "Don't have an account yet?"}{" "}
                        <button type="button" className="link-button" onClick={toggleMode} disabled={isSubmitting}>
                            {isRegister ? "Sign In" : "Create one"}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AuthView;
