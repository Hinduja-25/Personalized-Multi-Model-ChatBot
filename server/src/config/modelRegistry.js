/**
 * Centralized AI Model Registry
 * Maps stable internal model keys to provider-specific configurations.
 */

// Helper to check Gemini configuration
export const isGeminiConfigured = () => {
    return Boolean((process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY)?.trim());
};

// Helper to check Sol 6.1 credentials
export const isSolConfigured = () => {
    if (process.env.AZURE_CLOUD_OPENAI_GPT61SOL_CREDENTIALS?.trim()) return true;
    return Boolean(process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT);
};

// Helper to check Luna 6 credentials
export const isLunaConfigured = () => {
    if (process.env.AZURE_CLOUD_OPENAI_GPT6LUNA_CREDENTIALS?.trim()) return true;
    return Boolean(process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT);
};

export const MODEL_REGISTRY = {
    "gemini-3-1-pro": {
        key: "gemini-3-1-pro",
        displayName: "Gemini 3.1 Pro Preview",
        provider: "gemini",
        providerModelId: "gemini-3.1-pro-preview",
        description: "Google frontier reasoning model with 1M context window and advanced problem solving.",
        requiredEnv: ["GOOGLE_GEMINI_API_KEY"],
        isConfigured: isGeminiConfigured
    },
    "gemini-3-8": {
        key: "gemini-3-8",
        displayName: "Gemini 3.8 Flash",
        provider: "gemini",
        providerModelId: "gemini-3.8-flash",
        description: "Google high-intelligence, high-speed multimodal workhorse model.",
        requiredEnv: ["GOOGLE_GEMINI_API_KEY"],
        isConfigured: isGeminiConfigured
    },
    "sol-6-1": {
        key: "sol-6-1",
        displayName: "Sol 6.1 (Azure OpenAI)",
        provider: "azure-openai",
        providerModelId: "gpt-6.1-sol",
        description: "OpenAI GPT-6.1 Sol on Azure Cloud for high-capability reasoning and coding.",
        requiredEnv: ["AZURE_CLOUD_OPENAI_GPT61SOL_CREDENTIALS"],
        isConfigured: isSolConfigured
    },
    "luna-6": {
        key: "luna-6",
        displayName: "Luna 6 (Azure OpenAI)",
        provider: "azure-openai",
        providerModelId: "gpt-6-luna",
        description: "OpenAI GPT-6 Luna on Azure Cloud for rapid, low-latency conversational intelligence.",
        requiredEnv: ["AZURE_CLOUD_OPENAI_GPT6LUNA_CREDENTIALS"],
        isConfigured: isLunaConfigured
    }
};

/**
 * Get the configured default model key
 */
export const getDefaultModelKey = () => {
    const configuredDefault = process.env.DEFAULT_MODEL;
    if (configuredDefault && MODEL_REGISTRY[configuredDefault]) {
        return configuredDefault;
    }
    // Default fallback to gemini-3-1-pro
    return "gemini-3-1-pro";
};

/**
 * Validate whether a model key is registered
 */
export const isValidModelKey = (modelKey) => {
    return Boolean(modelKey && MODEL_REGISTRY[modelKey]);
};

/**
 * Get model definition by internal key
 */
export const getModelDef = (modelKey) => {
    return MODEL_REGISTRY[modelKey] || null;
};

/**
 * Return list of all registered models with their availability status
 */
export const getModelList = () => {
    const defaultKey = getDefaultModelKey();
    return Object.values(MODEL_REGISTRY).map((model) => ({
        key: model.key,
        displayName: model.displayName,
        provider: model.provider,
        description: model.description,
        isDefault: model.key === defaultKey,
        enabled: model.isConfigured(),
        requiredEnv: model.requiredEnv
    }));
};
