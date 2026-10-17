import { getModelDef, isValidModelKey, getDefaultModelKey } from "../config/modelRegistry.js";
import { callGemini } from "./providers/geminiProvider.js";
import { callAzureOpenAi } from "./providers/azureOpenAiProvider.js";

/**
 * Centralized AI Service
 * Resolves model keys, verifies configuration, and routes to appropriate provider adapters.
 */
export const generateAIResponse = async ({
    modelKey,
    systemPrompt,
    conversationHistory = [],
    userMessage,
    attachments = []
}) => {
    // 1. Resolve model key or fallback to default
    const effectiveModelKey = modelKey || getDefaultModelKey();

    if (!isValidModelKey(effectiveModelKey)) {
        throw new Error(`Unsupported model key: "${effectiveModelKey}". Please choose an enabled model from the model registry.`);
    }

    const modelDef = getModelDef(effectiveModelKey);

    // 2. Check if the model is configured
    if (!modelDef.isConfigured()) {
        const missingVars = modelDef.requiredEnv.filter((v) => !process.env[v]);
        throw new Error(
            `Model "${modelDef.displayName}" is currently not configured on this server. Missing environment variables: ${missingVars.join(", ")}.`
        );
    }

    // 3. Dispatch to appropriate provider adapter
    let assistantReply = "";

    switch (modelDef.provider) {
        case "gemini":
            assistantReply = await callGemini({
                modelDef,
                systemPrompt,
                conversationHistory,
                userMessage,
                attachments
            });
            break;

        case "azure-openai":
            assistantReply = await callAzureOpenAi({
                modelDef,
                systemPrompt,
                conversationHistory,
                userMessage,
                attachments
            });
            break;

        default:
            throw new Error(`Provider "${modelDef.provider}" is not supported.`);
    }

    return {
        reply: assistantReply,
        modelKey: effectiveModelKey,
        displayName: modelDef.displayName,
        provider: modelDef.provider
    };
};

export default generateAIResponse;
