import React, { useState, useEffect } from "react";

const TONE_OPTIONS = ["natural", "casual", "formal", "friendly", "professional"];
const LENGTH_OPTIONS = [
    { value: "short", label: "Short (1-2 paragraphs / concise)" },
    { value: "medium", label: "Medium (Standard balanced depth)" },
    { value: "detailed", label: "Detailed (Thorough breakdown & code)" }
];
const STYLE_OPTIONS = ["conversational", "simple English", "technical", "bullet-point"];

export const PersonalizationModal = ({
    isOpen,
    onClose,
    session,
    onSave
}) => {
    const [systemPrompt, setSystemPrompt] = useState("");
    const [tone, setTone] = useState("natural");
    const [responseLength, setResponseLength] = useState("medium");
    const [writingStyle, setWritingStyle] = useState("conversational");

    const [isSaving, setIsSaving] = useState(false);

    // Sync state when session changes
    useEffect(() => {
        if (session) {
            setSystemPrompt(session.systemPrompt || "");
            setTone(session.tone || "natural");
            setResponseLength(session.responseLength || "medium");
            setWritingStyle(session.writingStyle || "conversational");

        }
    }, [session, isOpen]);

    if (!isOpen) return null;

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave({
                systemPrompt: systemPrompt.trim(),
                tone,
                responseLength,
                writingStyle,
            });
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        setSystemPrompt("");
        setTone("natural");
        setResponseLength("medium");
        setWritingStyle("conversational");
    };

    return (
        <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="personalization-modal-title">
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title-group">
                        <span className="modal-icon">⚙️</span>
                        <h3 id="personalization-modal-title">Per-Chat Personalization</h3>
                    </div>
                    <button className="icon-btn close-modal-btn" onClick={onClose} aria-label="Close settings">
                        ✕
                    </button>
                </div>

                <p className="modal-subtitle">
                    Customize how the AI responds in <strong>"{session?.title || "this chat"}"</strong>.
                    Settings are saved specifically to this conversation.
                </p>

                <form onSubmit={handleSave} className="modal-form">
                    {/* System Prompt */}
                    <div className="form-group">
                        <label htmlFor="custom-instructions">
                            Custom System Instructions <span className="label-optional">(Optional)</span>
                        </label>
                        <textarea
                            id="custom-instructions"
                            rows={3}
                            placeholder="e.g. Act as a senior full-stack engineer. Review code for performance and security vulnerabilities."
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                        />
                        <span className="form-hint">Session-specific instructions combined with system guidelines.</span>
                    </div>

                    <div className="form-row">
                        {/* Tone */}
                        <div className="form-group flex-1">
                            <label htmlFor="tone-select">Tone</label>
                            <select
                                id="tone-select"
                                value={tone}
                                onChange={(e) => setTone(e.target.value)}
                            >
                                {TONE_OPTIONS.map((t) => (
                                    <option key={t} value={t}>
                                        {t.charAt(0).toUpperCase() + t.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Writing Style */}
                        <div className="form-group flex-1">
                            <label htmlFor="style-select">Writing Style</label>
                            <select
                                id="style-select"
                                value={writingStyle}
                                onChange={(e) => setWritingStyle(e.target.value)}
                            >
                                {STYLE_OPTIONS.map((s) => (
                                    <option key={s} value={s}>
                                        {s.charAt(0).toUpperCase() + s.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        {/* Response Length */}
                        <div className="form-group flex-1">
                            <label htmlFor="length-select">Response Length</label>
                            <select
                                id="length-select"
                                value={responseLength}
                                onChange={(e) => setResponseLength(e.target.value)}
                            >
                                {LENGTH_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>


                    </div>

                    <div className="modal-actions">
                        <button
                            type="button"
                            className="btn btn-secondary reset-btn"
                            onClick={handleReset}
                        >
                            Reset Defaults
                        </button>

                        <div className="modal-right-actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={onClose}
                                disabled={isSaving}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={isSaving}
                            >
                                {isSaving ? "Saving..." : "Save Preferences"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PersonalizationModal;
