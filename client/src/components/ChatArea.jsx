import React, { useState, useEffect, useRef } from "react";
import ModelSelector from "./ModelSelector.jsx";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import api from "../api/client.js";

const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".pdf", ".docx", ".txt"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_ATTACHMENTS = 5;

const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const getFileBadge = (mimeType = "", name = "") => {
    const lowerMime = mimeType.toLowerCase();
    const lowerName = name.toLowerCase();

    if (lowerMime.startsWith("image/") || /\.(png|jpg|jpeg|webp)$/.test(lowerName)) {
        return { icon: "🖼️", label: "IMAGE", isImage: true };
    }
    if (lowerMime === "application/pdf" || lowerName.endsWith(".pdf")) {
        return { icon: "📕", label: "PDF", isImage: false };
    }
    if (
        lowerMime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        lowerName.endsWith(".docx")
    ) {
        return { icon: "📄", label: "DOCX", isImage: false };
    }
    return { icon: "📝", label: "TXT", isImage: false };
};

export const ChatArea = ({
    session,
    messages = [],
    isLoadingMessages = false,
    isSending = false,
    errorMessage = null,
    models = [],
    defaultModelKey = "gemini-3-1-pro",
    onSendMessage,
    onModelChange,
    onOpenPersonalization,
    onRetry,
    onToggleSidebar
}) => {
    const [inputValue, setInputValue] = useState("");
    const [stagedFiles, setStagedFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadError, setUploadError] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [copiedId, setCopiedId] = useState(null);

    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const dragCounterRef = useRef(0);

    // Auto-scroll to bottom whenever messages or sending state changes
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isSending, stagedFiles]);

    // Clear staged files when switching session
    useEffect(() => {
        setStagedFiles([]);
        setUploadError(null);
        textareaRef.current?.focus();
    }, [session?._id]);

    const getAttachmentUrl = (attachment) => {
        if (attachment.previewUrl) return attachment.previewUrl;
        const id = attachment._id || attachment.id;
        const token = localStorage.getItem("omnichat_token");
        return `/api/attachments/${id}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    };

    const validateAndUploadFiles = async (files) => {
        if (!files || files.length === 0 || !session?._id) return;

        setUploadError(null);

        if (stagedFiles.length + files.length > MAX_ATTACHMENTS) {
            setUploadError(`You can attach up to ${MAX_ATTACHMENTS} files per message.`);
            return;
        }

        const validFiles = [];
        for (const file of files) {
            const ext = `.${file.name.split(".").pop().toLowerCase()}`;
            if (!ALLOWED_EXTENSIONS.includes(ext)) {
                setUploadError(`Unsupported file format: "${file.name}". Supported: PNG, JPG, JPEG, WEBP, PDF, DOCX, TXT.`);
                return;
            }

            if (file.size > MAX_FILE_SIZE_BYTES) {
                setUploadError(`File "${file.name}" exceeds the 10 MB size limit (${formatBytes(file.size)}).`);
                return;
            }

            validFiles.push(file);
        }

        setIsUploading(true);
        setUploadProgress(10);

        try {
            // Local preview URLs for instant display
            const localPreviews = validFiles.map((file) => {
                const isImg = file.type.startsWith("image/");
                return {
                    file,
                    localUrl: isImg ? URL.createObjectURL(file) : null
                };
            });

            const res = await api.attachments.upload(session._id, validFiles, (percent) => {
                setUploadProgress(percent);
            });

            if (res.success && res.attachments) {
                const newStaged = res.attachments.map((att, idx) => ({
                    ...att,
                    previewUrl: localPreviews[idx]?.localUrl
                }));
                setStagedFiles((prev) => [...prev, ...newStaged]);
            }
        } catch (err) {
            console.error("Upload failed:", err);
            setUploadError(err.message || "Failed to upload file(s).");
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleFileInputChange = (e) => {
        const files = Array.from(e.target.files || []);
        validateAndUploadFiles(files);
    };

    const handleRemoveStaged = async (attachmentId) => {
        setStagedFiles((prev) => prev.filter((a) => (a._id || a.id) !== attachmentId));
        try {
            await api.attachments.delete(attachmentId);
        } catch (e) {
            console.warn("Failed to delete attachment on server:", e.message);
        }
    };

    // Drag and drop handlers
    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current += 1;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current -= 1;
        if (dragCounterRef.current === 0) {
            setIsDragging(false);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        dragCounterRef.current = 0;

        const files = Array.from(e.dataTransfer.files || []);
        if (files.length > 0) {
            validateAndUploadFiles(files);
        }
    };

    const handleSend = (e) => {
        e?.preventDefault();
        const hasText = inputValue && inputValue.trim().length > 0;
        const hasAttachments = stagedFiles.length > 0;

        if ((!hasText && !hasAttachments) || isSending || isUploading) return;

        const text = inputValue.trim();
        const filesToSend = [...stagedFiles];

        setInputValue("");
        setStagedFiles([]);
        if (textareaRef.current) textareaRef.current.style.height = "auto";

        onSendMessage(text, filesToSend);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Auto-grow textarea
    const handleInputChange = (e) => {
        setInputValue(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
        }
    };

    if (!session) {
        return (
            <div className="chat-empty-view">
                <div className="empty-content">
                    <div className="empty-logo">✨</div>
                    <h2>No Chat Selected</h2>
                    <p>Select a conversation from the sidebar or start a new chat to begin.</p>
                </div>
            </div>
        );
    }

    const canSubmit = (inputValue.trim().length > 0 || stagedFiles.length > 0) && !isSending && !isUploading;

    return (
        <main
            className={`chat-area ${isDragging ? "dragging-active" : ""}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {/* Drag and Drop Overlay */}
            {isDragging && (
                <div className="drag-drop-overlay">
                    <div className="drag-drop-modal">
                        <div className="drag-icon">📁</div>
                        <h3>Drop files here to attach</h3>
                        <p>Images (PNG, JPG, WEBP), PDF, DOCX, TXT (up to 10 MB)</p>
                    </div>
                </div>
            )}

            {/* Chat Header */}
            <header className="chat-header">
                <div className="chat-header-left">
                    <button
                        className="icon-btn mobile-menu-btn"
                        onClick={onToggleSidebar}
                        aria-label="Toggle navigation menu"
                    >
                        ☰
                    </button>
                    <div className="header-session-info">
                        <h2 className="header-session-title">{session.title || "Untitled Chat"}</h2>
                        <div className="session-meta-chips">
                            <span className="meta-chip">Tone: {session.tone || "natural"}</span>
                            <span className="meta-chip">Length: {session.responseLength || "medium"}</span>
                            <span className="meta-chip">Style: {session.writingStyle || "conversational"}</span>
                        </div>
                    </div>
                </div>

                <div className="chat-header-right">
                    <ModelSelector
                        models={models}
                        selectedModelKey={session.selectedModel}
                        defaultModelKey={defaultModelKey}
                        onModelChange={onModelChange}
                        disabled={isSending}
                    />

                    <button
                        className="btn btn-secondary personalize-btn"
                        onClick={onOpenPersonalization}
                        title="Configure session personalization settings"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                        <span>Personalize</span>
                    </button>
                </div>
            </header>

            {/* Messages Body */}
            <div className="chat-messages-container">
                {isLoadingMessages ? (
                    <div className="messages-loading">
                        <div className="spinner"></div>
                        <p>Loading messages...</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="chat-starter-view">
                        <div className="starter-badge">✨ Multi-Model AI Assistant</div>
                        <h3>How can I help you today?</h3>
                        <p>
                            This conversation is configured with the <strong>{session.selectedModel || defaultModelKey}</strong> model.
                            Upload documents, screenshots, or code to analyze them multimodally.
                        </p>
                        <div className="starter-suggestions">
                            <button
                                className="suggestion-pill"
                                onClick={() => setInputValue("Analyze this document and summarize the key takeaways.")}
                            >
                                📄 "Analyze document and summarize"
                            </button>
                            <button
                                className="suggestion-pill"
                                onClick={() => setInputValue("Examine this screenshot and explain what it depicts.")}
                            >
                                🖼️ "Explain attached screenshot"
                            </button>
                            <button
                                className="suggestion-pill"
                                onClick={() => setInputValue("Compare Gemini 3.1 Pro Preview and GPT-6.1 Sol for architectural reasoning.")}
                            >
                                💡 "Compare Gemini 3.1 Pro and GPT-6.1 Sol"
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="messages-list">
                        {messages.map((msg, index) => {
                            const isUser = msg.role === "user";
                            const isAssistant = !isUser;
                            const hasAttachments = Array.isArray(msg.attachments) && msg.attachments.length > 0;

                            return (
                                <div
                                    key={msg._id || index}
                                    className={`message-row ${isUser ? "message-user" : "message-assistant"}`}
                                >
                                    <div className="message-avatar">
                                        {isUser ? "👤" : "🤖"}
                                    </div>
                                    <div className="message-bubble-wrapper" style={{ position: "relative" }}>
                                        <div className="message-meta">
                                            <span className="message-sender">
                                                {isUser ? "You" : (msg.modelKey || session.selectedModel || "Assistant")}
                                            </span>
                                            {msg.createdAt && (
                                                <span className="message-time">
                                                    {new Date(msg.createdAt).toLocaleTimeString([], {
                                                        hour: "2-digit",
                                                        minute: "2-digit"
                                                    })}
                                                </span>
                                            )}
                                        </div>

                                        {/* Render attachments in message */}
                                        {hasAttachments && (
                                            <div className="message-attachments-container">
                                                {msg.attachments.map((att) => {
                                                    const attId = att._id || att.id;
                                                    const badge = getFileBadge(att.mimeType, att.originalName);
                                                    const fileUrl = getAttachmentUrl(att);

                                                    if (badge.isImage) {
                                                        return (
                                                            <div
                                                                key={attId}
                                                                className="message-image-card"
                                                                onClick={() => setPreviewImage({ url: fileUrl, name: att.originalName })}
                                                                title={`Click to view full image: ${att.originalName}`}
                                                            >
                                                                <img
                                                                    src={fileUrl}
                                                                    alt={att.originalName}
                                                                    className="message-attachment-thumb"
                                                                    loading="lazy"
                                                                />
                                                                <div className="image-card-caption">
                                                                    <span className="file-name">{att.originalName}</span>
                                                                    <span className="file-size">{formatBytes(att.size)}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <a
                                                            key={attId}
                                                            href={fileUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="message-doc-card"
                                                            title={`Open ${att.originalName}`}
                                                        >
                                                            <span className="doc-icon">{badge.icon}</span>
                                                            <div className="doc-info">
                                                                <span className="doc-name">{att.originalName}</span>
                                                                <span className="doc-meta">
                                                                    {badge.label} • {formatBytes(att.size)}
                                                                </span>
                                                            </div>
                                                            <span className="doc-arrow">↗</span>
                                                        </a>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        <div className="message-bubble">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                        </div>

                                        {isAssistant && (
                                            <button
                                                className="copy-btn"
                                                onClick={async () => {
                                                    try {
                                                        await navigator.clipboard.writeText(msg.content);
                                                        setCopiedId(msg._id || index);
                                                        setTimeout(() => setCopiedId(null), 2000);
                                                    } catch (err) {
                                                        console.error("Copy failed", err);
                                                        alert("Failed to copy text");
                                                    }
                                                }}
                                                aria-label="Copy assistant response"
                                                title="Copy assistant response"
                                            >
                                                {copiedId === (msg._id || index) ? (
                                                    "Copied!"
                                                ) : (
                                                    <span className="copy-icon">📋</span>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Sending indicator */}
                        {isSending && (
                            <div className="message-row message-assistant message-thinking">
                                <div className="message-avatar">🤖</div>
                                <div className="message-bubble-wrapper">
                                    <div className="message-meta">
                                        <span className="message-sender">
                                            {session.selectedModel || defaultModelKey} is thinking...
                                        </span>
                                    </div>
                                    <div className="message-bubble thinking-bubble">
                                        <span className="typing-dot"></span>
                                        <span className="typing-dot"></span>
                                        <span className="typing-dot"></span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                )}

                {/* Error Banner */}
                {errorMessage && (
                    <div className="chat-error-banner" role="alert">
                        <div className="error-text">
                            <span className="error-icon">⚠️</span>
                            <span>{errorMessage}</span>
                        </div>
                        {onRetry && (
                            <button className="btn-retry" onClick={onRetry}>
                                Retry
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Input Bar */}
            <footer className="chat-input-area">
                {/* Upload Error Banner */}
                {uploadError && (
                    <div className="upload-error-alert" role="alert">
                        <span>⚠️ {uploadError}</span>
                        <button className="close-alert-btn" onClick={() => setUploadError(null)}>×</button>
                    </div>
                )}

                {/* Staged Attachments Tray */}
                {(stagedFiles.length > 0 || isUploading) && (
                    <div className="staged-attachments-tray">
                        {stagedFiles.map((att) => {
                            const attId = att._id || att.id;
                            const badge = getFileBadge(att.mimeType, att.originalName);
                            const preview = att.previewUrl;

                            return (
                                <div key={attId} className="staged-chip">
                                    {badge.isImage && preview ? (
                                        <img src={preview} alt={att.originalName} className="staged-thumb" />
                                    ) : (
                                        <span className="staged-icon">{badge.icon}</span>
                                    )}
                                    <div className="staged-meta">
                                        <span className="staged-name" title={att.originalName}>
                                            {att.originalName}
                                        </span>
                                        <span className="staged-size">{formatBytes(att.size)}</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="staged-remove-btn"
                                        onClick={() => handleRemoveStaged(attId)}
                                        aria-label={`Remove ${att.originalName}`}
                                        title="Remove attachment"
                                    >
                                        ×
                                    </button>
                                </div>
                            );
                        })}

                        {isUploading && (
                            <div className="uploading-chip">
                                <div className="mini-spinner"></div>
                                <span className="uploading-text">Uploading ({uploadProgress}%)...</span>
                            </div>
                        )}
                    </div>
                )}

                <form onSubmit={handleSend} className="input-form">
                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".png,.jpg,.jpeg,.webp,.pdf,.docx,.txt,image/png,image/jpeg,image/webp,application/pdf,.docx,text/plain"
                        style={{ display: "none" }}
                        onChange={handleFileInputChange}
                    />

                    {/* Paperclip Attachment Button */}
                    <button
                        type="button"
                        className="btn-attach"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSending || isUploading}
                        aria-label="Attach files (images, PDF, DOCX, TXT)"
                        title="Attach files (Images, PDF, DOCX, TXT)"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                        </svg>
                    </button>

                    <textarea
                        ref={textareaRef}
                        id="chat-input"
                        rows={1}
                        placeholder={
                            stagedFiles.length > 0
                                ? "Add instructions for attached file(s), or press Enter to send..."
                                : `Message ${session.selectedModel || defaultModelKey}... (or drop files here)`
                        }
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        disabled={isSending}
                    />

                    <button
                        type="submit"
                        className="btn-send"
                        disabled={!canSubmit}
                        aria-label="Send message"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </form>

                <div className="input-footer-note">
                    Supported attachments: PNG, JPG, WEBP, PDF, DOCX, TXT (up to 10 MB per file, max 5 files).
                </div>
            </footer>

            {/* Image Full-view Modal */}
            {previewImage && (
                <div className="image-preview-modal" onClick={() => setPreviewImage(null)}>
                    <div className="modal-inner" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">{previewImage.name}</span>
                            <button className="modal-close" onClick={() => setPreviewImage(null)}>✕</button>
                        </div>
                        <img src={previewImage.url} alt={previewImage.name} className="modal-full-img" />
                    </div>
                </div>
            )}
        </main>
    );
};

export default ChatArea;
