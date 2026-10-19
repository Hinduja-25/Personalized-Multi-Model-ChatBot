import React, { useState, useEffect } from "react";

export const PersonalizationModal = ({
    isOpen,
    onClose,
    session,
    onSave
}) => {
    const [systemPrompt, setSystemPrompt] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Sync state when session changes
    useEffect(() => {
        if (session) {
            setSystemPrompt(session.systemPrompt || "");
        }
    }, [session, isOpen]);

    if (!isOpen) return null;

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave({
                systemPrompt: systemPrompt.trim()
            });
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        setSystemPrompt("");
    };

    return (
        <div
            className="modal-backdrop"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="personalization-modal-title"
        >
            <div className="modal-card personalization-modal-card" onClick={(e) => e.stopPropagation()}>
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
                    Customize instructions and style guidance for <strong>"{session?.title || "this chat"}"</strong>.
                </p>

                {/* Adaptive Style Info Banner */}
                <div className="adaptive-info-banner">
                    <span className="adaptive-info-icon">✨</span>
                    <div className="adaptive-info-text">
                        <strong>Dynamic Style Adaptation:</strong> OmniChat dynamically infers tone, formality, sentence structure, and response length from your conversation context, recipient, and task.
                    </div>
                </div>

                <form onSubmit={handleSave} className="modal-form">
                    {/* Custom System Instructions & Writing Examples */}
                    <div className="form-group flex-1">
                        <div className="label-with-counter">
                            <label htmlFor="custom-instructions">
                                Custom System Instructions <span className="label-optional">(Optional)</span>
                            </label>
                            <span className="char-counter">
                                {systemPrompt.length} / 3000
                            </span>
                        </div>
                        <textarea
                            id="custom-instructions"
                            className="custom-instructions-textarea"
                            rows={8}
                            maxLength={3000}
                            placeholder="Add role or task instructions, or paste examples of your own writing for the assistant to naturally match your style..."
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                        />
                        <span className="form-hint">
                            Provide session-specific instructions, persona guidance, or paste your own writing samples. Writing examples serve as the strongest reference for matching your voice.
                        </span>
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
