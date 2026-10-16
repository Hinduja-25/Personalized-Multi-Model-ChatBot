import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

export const Sidebar = ({
    sessions = [],
    activeSessionId,
    onSelectSession,
    onCreateSession,
    onRenameSession,
    onDeleteSession,
    isOpen = true,
    onClose
}) => {
    const { user, logout } = useAuth();
    const [editingSessionId, setEditingSessionId] = useState(null);
    const [editTitle, setEditTitle] = useState("");
    const [deletingSessionId, setDeletingSessionId] = useState(null);

    const startEditing = (e, session) => {
        e.stopPropagation();
        setEditingSessionId(session._id);
        setEditTitle(session.title);
    };

    const handleSaveTitle = (sessionId) => {
        if (editTitle.trim()) {
            onRenameSession(sessionId, editTitle.trim());
        }
        setEditingSessionId(null);
    };

    const handleKeyDown = (e, sessionId) => {
        if (e.key === "Enter") {
            handleSaveTitle(sessionId);
        } else if (e.key === "Escape") {
            setEditingSessionId(null);
        }
    };

    const confirmDelete = (e, sessionId) => {
        e.stopPropagation();
        setDeletingSessionId(sessionId);
    };

    const executeDelete = (e, sessionId) => {
        e.stopPropagation();
        onDeleteSession(sessionId);
        setDeletingSessionId(null);
    };

    const cancelDelete = (e) => {
        e.stopPropagation();
        setDeletingSessionId(null);
    };

    return (
        <aside className={`sidebar ${isOpen ? "sidebar-open" : "sidebar-closed"}`}>
            <div className="sidebar-header">
                <div className="sidebar-brand">
                    <span className="brand-icon">✨</span>
                    <span className="brand-name">OmniChat</span>
                </div>
                {onClose && (
                    <button className="icon-btn mobile-close-btn" onClick={onClose} aria-label="Close Sidebar">
                        ✕
                    </button>
                )}
            </div>

            <div className="sidebar-actions">
                <button
                    id="new-chat-btn"
                    className="btn btn-primary new-chat-btn"
                    onClick={onCreateSession}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    <span>New Chat</span>
                </button>
            </div>

            <div className="sidebar-sessions-list">
                <div className="sessions-header">Conversations</div>
                {sessions.length === 0 ? (
                    <div className="sessions-empty">No previous chats. Start a new one!</div>
                ) : (
                    sessions.map((sess) => {
                        const isActive = sess._id === activeSessionId;
                        const isEditing = editingSessionId === sess._id;
                        const isDeleting = deletingSessionId === sess._id;

                        return (
                            <div
                                key={sess._id}
                                className={`session-item ${isActive ? "active" : ""}`}
                                onClick={() => !isEditing && onSelectSession(sess._id)}
                            >
                                <svg className="session-chat-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                </svg>

                                {isEditing ? (
                                    <input
                                        type="text"
                                        className="session-edit-input"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        onBlur={() => handleSaveTitle(sess._id)}
                                        onKeyDown={(e) => handleKeyDown(e, sess._id)}
                                        autoFocus
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <span className="session-title" title={sess.title}>
                                        {sess.title || "Untitled Chat"}
                                    </span>
                                )}

                                <div className="session-actions">
                                    {isDeleting ? (
                                        <div className="delete-confirm-group" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                className="btn-danger-tiny"
                                                onClick={(e) => executeDelete(e, sess._id)}
                                                title="Confirm Delete"
                                            >
                                                Delete
                                            </button>
                                            <button
                                                className="btn-cancel-tiny"
                                                onClick={cancelDelete}
                                                title="Cancel"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <button
                                                className="icon-btn-tiny"
                                                onClick={(e) => startEditing(e, sess)}
                                                title="Rename Chat"
                                            >
                                                ✎
                                            </button>
                                            <button
                                                className="icon-btn-tiny icon-btn-danger"
                                                onClick={(e) => confirmDelete(e, sess._id)}
                                                title="Delete Chat"
                                            >
                                                🗑
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <div className="sidebar-footer">
                <div className="user-profile">
                    <div className="user-avatar">{user?.name ? user.name.charAt(0).toUpperCase() : "U"}</div>
                    <div className="user-info">
                        <span className="user-name">{user?.name || "User"}</span>
                        <span className="user-email">{user?.email}</span>
                    </div>
                </div>
                <button className="btn-logout" onClick={logout} title="Sign Out">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
