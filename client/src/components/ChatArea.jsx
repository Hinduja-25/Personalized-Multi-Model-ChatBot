import React, { useState, useEffect, useRef } from "react";
import ModelSelector from "./ModelSelector.jsx";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    // Auto-scroll to bottom whenever messages or sending state changes
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isSending]);

    // Focus input on session load
    useEffect(() => {
        textareaRef.current?.focus();
    }, [session?._id]);

    const handleSend = (e) => {
        e?.preventDefault();
        if (!inputValue.trim() || isSending) return;
        const text = inputValue.trim();
        setInputValue("");
        onSendMessage(text);
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

    return (
        <main className="chat-area">
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
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
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
                            You can customize instructions, tone, and writing style anytime via Personalize.
                        </p>
                        <div className="starter-suggestions">
                            <button
                                className="suggestion-pill"
                                onClick={() => setInputValue("Compare Gemini 3.1 Pro Preview and GPT-6.1 Sol for architectural reasoning.")}
                            >
                                💡 "Compare Gemini 3.1 Pro Preview and GPT-6.1 Sol"
                            </button>
                            <button
                                className="suggestion-pill"
                                onClick={() => setInputValue("Help me write a concise bullet-point summary of microservice best practices.")}
                            >
                                📝 "Summarize microservice best practices"
                            </button>
                            <button
                                className="suggestion-pill"
                                onClick={() => setInputValue("Explain how token caching works in modern frontier AI models.")}
                            >
                                ⚡ "Explain prompt and token caching"
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="messages-list">
                        {messages.map((msg, index) => {
                            const isUser = msg.role === "user";
                            return (
                                <div
                                    key={msg._id || index}
                                    className={`message-row ${isUser ? "message-user" : "message-assistant"}`}
                                >
                                    <div className="message-avatar">
                                        {isUser ? "👤" : "🤖"}
                                    </div>
                                    <div className="message-bubble-wrapper">
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
                                        <div className="message-bubble">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                        </div>
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
                <form onSubmit={handleSend} className="input-form">
                    <textarea
                        ref={textareaRef}
                        id="chat-input"
                        rows={1}
                        placeholder={`Message ${session.selectedModel || defaultModelKey}... (Enter to send, Shift+Enter for newline)`}
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        disabled={isSending}
                    />
                    <button
                        type="submit"
                        className="btn-send"
                        disabled={!inputValue.trim() || isSending}
                        aria-label="Send message"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </form>
                <div className="input-footer-note">
                    AI responses are guided by this session's personalization settings.
                </div>
            </footer>
        </main>
    );
};

export default ChatArea;
