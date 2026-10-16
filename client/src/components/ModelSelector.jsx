import React from "react";

export const ModelSelector = ({
    models = [],
    selectedModelKey,
    defaultModelKey,
    onModelChange,
    disabled = false
}) => {
    const activeModelKey = selectedModelKey || defaultModelKey || "gemini-3-1-pro";
    const currentModel = models.find((m) => m.key === activeModelKey);

    return (
        <div className="model-selector-wrapper">
            <label htmlFor="model-select" className="model-select-label">
                <span className="model-label-icon">🧠</span>
                <span className="model-label-text">Model:</span>
            </label>

            <div className="select-container">
                <select
                    id="model-select"
                    className="model-select"
                    value={activeModelKey}
                    onChange={(e) => onModelChange(e.target.value)}
                    disabled={disabled}
                >
                    {models.map((model) => {
                        const isConfigured = model.enabled;
                        const label = `${model.displayName}${!isConfigured ? " (Config required)" : ""}${model.isDefault ? " [Default]" : ""}`;
                        return (
                            <option
                                key={model.key}
                                value={model.key}
                            >
                                {label}
                            </option>
                        );
                    })}
                </select>

                <div className="model-badge-row">
                    <span className={`status-dot ${currentModel?.enabled ? "dot-online" : "dot-offline"}`}></span>
                    <span className="status-text">
                        {currentModel?.enabled ? "Ready" : "Needs API Key"}
                    </span>
                    <span className="provider-tag">{currentModel?.provider || "AI"}</span>
                </div>
            </div>
        </div>
    );
};

export default ModelSelector;
