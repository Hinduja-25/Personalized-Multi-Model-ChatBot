import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "./context/AuthContext.jsx";
import AuthView from "./components/AuthView.jsx";
import Sidebar from "./components/Sidebar.jsx";
import ChatArea from "./components/ChatArea.jsx";
import PersonalizationModal from "./components/PersonalizationModal.jsx";
import api from "./api/client.js";

export function AppContent() {
    const { isAuthenticated, isLoading: authLoading } = useAuth();

    // Models & Configuration
    const [models, setModels] = useState([]);
    const [defaultModelKey, setDefaultModelKey] = useState("gemini-3-1-pro");

    // Sessions & Messages
    const [sessions, setSessions] = useState([]);
    const [activeSessionId, setActiveSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const [lastFailedMessage, setLastFailedMessage] = useState(null);

    // UI Controls
    const [isPersonalizationOpen, setIsPersonalizationOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // 1. Fetch available models
    const loadModels = useCallback(async () => {
        try {
            const res = await api.models.getAll();
            if (res.success && res.models) {
                setModels(res.models);
                if (res.defaultModel) {
                    setDefaultModelKey(res.defaultModel);
                }
            }
        } catch (err) {
            console.error("Failed to load models:", err);
        }
    }, []);

    // 2. Fetch user's sessions
    const loadSessions = useCallback(async () => {
        try {
            const res = await api.sessions.list();
            if (res.success && res.sessions) {
                setSessions(res.sessions);
                if (res.sessions.length > 0 && !activeSessionId) {
                    setActiveSessionId(res.sessions[0]._id);
                }
            }
        } catch (err) {
            console.error("Failed to load sessions:", err);
        }
    }, [activeSessionId]);

    // Initial load when user is authenticated
    useEffect(() => {
        if (isAuthenticated) {
            loadModels();
            loadSessions();
        }
    }, [isAuthenticated, loadModels, loadSessions]);

    // 3. Load messages when active session changes
    useEffect(() => {
        if (!activeSessionId) {
            setMessages([]);
            return;
        }

        const fetchMessages = async () => {
            setIsLoadingMessages(true);
            setErrorMessage(null);
            try {
                const res = await api.messages.list(activeSessionId);
                if (res.success && res.messages) {
                    setMessages(res.messages);
                }
            } catch (err) {
                console.error("Failed to load messages:", err);
                setErrorMessage("Failed to load conversation history.");
            } finally {
                setIsLoadingMessages(false);
            }
        };

        fetchMessages();
    }, [activeSessionId]);

    // Active session object
    const activeSession = sessions.find((s) => s._id === activeSessionId) || null;

    // Create a new session
    const handleCreateSession = async () => {
        try {
            const res = await api.sessions.create({
                title: "New Chat",
                selectedModel: defaultModelKey
            });
            if (res.success && res.session) {
                setSessions((prev) => [res.session, ...prev]);
                setActiveSessionId(res.session._id);
                setMessages([]);
                setErrorMessage(null);
                setIsSidebarOpen(false); // Close on mobile
            }
        } catch (err) {
            console.error("Failed to create session:", err);
        }
    };

    // Rename a session
    const handleRenameSession = async (sessionId, newTitle) => {
        try {
            const res = await api.sessions.update(sessionId, { title: newTitle });
            if (res.success && res.session) {
                setSessions((prev) =>
                    prev.map((s) => (s._id === sessionId ? { ...s, title: newTitle } : s))
                );
            }
        } catch (err) {
            console.error("Failed to rename session:", err);
        }
    };

    // Delete a session
    const handleDeleteSession = async (sessionId) => {
        try {
            const res = await api.sessions.delete(sessionId);
            if (res.success) {
                const updated = sessions.filter((s) => s._id !== sessionId);
                setSessions(updated);
                if (activeSessionId === sessionId) {
                    setActiveSessionId(updated.length > 0 ? updated[0]._id : null);
                }
            }
        } catch (err) {
            console.error("Failed to delete session:", err);
        }
    };

    // Change model on active session
    const handleModelChange = async (newModelKey) => {
        if (!activeSessionId) return;

        // Optimistically update
        setSessions((prev) =>
            prev.map((s) => (s._id === activeSessionId ? { ...s, selectedModel: newModelKey } : s))
        );

        try {
            await api.sessions.update(activeSessionId, { selectedModel: newModelKey });
        } catch (err) {
            console.error("Failed to persist model selection:", err);
        }
    };

    // Save personalization settings
    const handleSavePersonalization = async (personalizationData) => {
        if (!activeSessionId) return;

        try {
            const res = await api.sessions.update(activeSessionId, personalizationData);
            if (res.success && res.session) {
                setSessions((prev) =>
                    prev.map((s) => (s._id === activeSessionId ? { ...s, ...res.session } : s))
                );
            }
        } catch (err) {
            console.error("Failed to save personalization:", err);
        }
    };

    // Send a message
    const handleSendMessage = async (content, stagedAttachments = []) => {
        const hasText = content && content.trim();
        const hasAttachments = stagedAttachments && stagedAttachments.length > 0;
        if (!activeSessionId || (!hasText && !hasAttachments)) return;

        setErrorMessage(null);
        setLastFailedMessage(null);

        const attachmentIds = stagedAttachments.map((a) => a._id || a.id);
        const finalContent = hasText ? content.trim() : "Please review and analyze the attached file(s).";

        // Optimistically append user message to UI
        const tempUserMessage = {
            _id: `temp-${Date.now()}`,
            role: "user",
            content: finalContent,
            attachments: stagedAttachments,
            createdAt: new Date().toISOString()
        };
        setMessages((prev) => [...prev, tempUserMessage]);
        setIsSending(true);

        try {
            const res = await api.messages.send(activeSessionId, {
                content: finalContent,
                modelKey: activeSession?.selectedModel,
                attachmentIds
            });

            if (res.success && res.assistantMessage) {
                // Replace temp user message with persisted doc & add assistant reply
                setMessages((prev) => [
                    ...prev.filter((m) => m._id !== tempUserMessage._id),
                    res.userMessage,
                    res.assistantMessage
                ]);

                // Update session title in sidebar if auto-generated
                if (activeSession?.title === "New Chat") {
                    const newTitle = finalContent.length > 35 ? `${finalContent.substring(0, 32)}...` : finalContent;
                    setSessions((prev) =>
                        prev.map((s) => (s._id === activeSessionId ? { ...s, title: newTitle } : s))
                    );
                }
            }
        } catch (err) {
            console.error("Message send failed:", err);
            const msg = err.data?.message || err.message || "Failed to get AI response.";
            setErrorMessage(msg);
            setLastFailedMessage({ content: finalContent, stagedAttachments });
        } finally {
            setIsSending(false);
        }
    };

    const handleRetry = () => {
        if (lastFailedMessage) {
            if (typeof lastFailedMessage === "object") {
                handleSendMessage(lastFailedMessage.content, lastFailedMessage.stagedAttachments);
            } else {
                handleSendMessage(lastFailedMessage);
            }
        }
    };

    if (authLoading) {
        return (
            <div className="app-loading-screen">
                <div className="spinner"></div>
                <p>Connecting to OmniChat...</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <AuthView />;
    }

    return (
        <div className="app-layout">
            <Sidebar
                sessions={sessions}
                activeSessionId={activeSessionId}
                onSelectSession={(id) => {
                    setActiveSessionId(id);
                    setIsSidebarOpen(false);
                }}
                onCreateSession={handleCreateSession}
                onRenameSession={handleRenameSession}
                onDeleteSession={handleDeleteSession}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            {/* Mobile backdrop */}
            {isSidebarOpen && (
                <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)}></div>
            )}

            <ChatArea
                session={activeSession}
                messages={messages}
                isLoadingMessages={isLoadingMessages}
                isSending={isSending}
                errorMessage={errorMessage}
                models={models}
                defaultModelKey={defaultModelKey}
                onSendMessage={handleSendMessage}
                onModelChange={handleModelChange}
                onOpenPersonalization={() => setIsPersonalizationOpen(true)}
                onRetry={lastFailedMessage ? handleRetry : null}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            />

            <PersonalizationModal
                isOpen={isPersonalizationOpen}
                onClose={() => setIsPersonalizationOpen(false)}
                session={activeSession}
                onSave={handleSavePersonalization}
            />
        </div>
    );
}

export default function App() {
    return <AppContent />;
}
