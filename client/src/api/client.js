/**
 * API Client for interacting with the Express backend
 */

const BASE_URL = import.meta.env.VITE_API_URL || "";

const getAuthToken = () => localStorage.getItem("omnichat_token");

const request = async (endpoint, options = {}) => {
    const token = getAuthToken();
    const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
    };

    const config = {
        ...options,
        headers
    };

    const res = await fetch(`${BASE_URL}${endpoint}`, config);

    let data;
    try {
        data = await res.json();
    } catch {
        data = { message: res.statusText || "Network error" };
    }

    if (!res.ok) {
        const error = new Error(data.message || `Request failed with status ${res.status}`);
        error.status = res.status;
        error.data = data;
        throw error;
    }

    return data;
};

export const api = {
    // Auth endpoints
    auth: {
        register: (userData) =>
            request("/api/auth/register", {
                method: "POST",
                body: JSON.stringify(userData)
            }),
        login: (credentials) =>
            request("/api/auth/login", {
                method: "POST",
                body: JSON.stringify(credentials)
            }),
        getMe: () => request("/api/auth/me")
    },

    // Models endpoint
    models: {
        getAll: () => request("/api/models")
    },

    // Sessions endpoints
    sessions: {
        list: () => request("/api/sessions"),
        create: (sessionData = {}) =>
            request("/api/sessions", {
                method: "POST",
                body: JSON.stringify(sessionData)
            }),
        getById: (sessionId) => request(`/api/sessions/${sessionId}`),
        update: (sessionId, updateData) =>
            request(`/api/sessions/${sessionId}`, {
                method: "PATCH",
                body: JSON.stringify(updateData)
            }),
        delete: (sessionId) =>
            request(`/api/sessions/${sessionId}`, {
                method: "DELETE"
            })
    },

    // Messages endpoints
    messages: {
        list: (sessionId) => request(`/api/sessions/${sessionId}/messages`),
        send: (sessionId, { content, modelKey, attachmentIds = [] }) =>
            request(`/api/sessions/${sessionId}/messages`, {
                method: "POST",
                body: JSON.stringify({ content, modelKey, attachmentIds })
            })
    },

    // Attachments endpoints
    attachments: {
        upload: (sessionId, files, onProgress) => {
            return new Promise((resolve, reject) => {
                const token = getAuthToken();
                const formData = new FormData();
                formData.append("sessionId", sessionId);
                for (const file of files) {
                    formData.append("files", file);
                }

                const xhr = new XMLHttpRequest();
                xhr.open("POST", `${BASE_URL}/api/attachments/upload`);
                if (token) {
                    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
                }

                if (xhr.upload && onProgress) {
                    xhr.upload.onprogress = (e) => {
                        if (e.lengthComputable) {
                            const percent = Math.round((e.loaded / e.total) * 100);
                            onProgress(percent);
                        }
                    };
                }

                xhr.onload = () => {
                    let data;
                    try {
                        data = JSON.parse(xhr.responseText);
                    } catch {
                        data = { message: xhr.statusText };
                    }

                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(data);
                    } else {
                        const error = new Error(data.message || `Upload failed with status ${xhr.status}`);
                        error.status = xhr.status;
                        error.data = data;
                        reject(error);
                    }
                };

                xhr.onerror = () => reject(new Error("Network error during file upload"));
                xhr.send(formData);
            });
        },
        delete: (attachmentId) =>
            request(`/api/attachments/${attachmentId}`, {
                method: "DELETE"
            }),
        getUrl: (attachmentId) => `${BASE_URL}/api/attachments/${attachmentId}`
    }
};

export default api;
