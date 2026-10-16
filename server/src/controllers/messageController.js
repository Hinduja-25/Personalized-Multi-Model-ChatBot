import Message from "../models/Message.js";
import ChatSession from "../models/ChatSession.js";
import { buildSystemPrompt } from "../services/promptBuilder.js";
import { generateAIResponse } from "../services/aiService.js";
import { getDefaultModelKey, isValidModelKey } from "../config/modelRegistry.js";

/**
 * @desc    Get all messages for a session in chronological order
 * @route   GET /api/sessions/:sessionId/messages
 * @access  Private (protected)
 */
export const getMessages = async (req, res, next) => {
    try {
        const { sessionId } = req.params;

        // 1. Verify session exists and belongs to authenticated user
        const session = await ChatSession.findById(sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Chat session not found"
            });
        }

        if (session.userId.toString() !== req.userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to view messages in this chat session"
            });
        }

        // 2. Fetch messages in chronological order
        const messages = await Message.find({ sessionId })
            .sort({ createdAt: 1 })
            .select("-__v");

        return res.status(200).json({
            success: true,
            count: messages.length,
            messages
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Submit user message, generate AI reply, and persist both
 * @route   POST /api/sessions/:sessionId/messages
 * @access  Private (protected)
 */
export const sendMessage = async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const { content, modelKey } = req.body;

        // 1. Validate message content
        if (!content || typeof content !== "string" || !content.trim()) {
            return res.status(400).json({
                success: false,
                message: "Message content cannot be empty"
            });
        }

        const trimmedContent = content.trim();

        // 2. Verify session exists and user has ownership
        const session = await ChatSession.findById(sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Chat session not found"
            });
        }

        if (session.userId.toString() !== req.userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to post to this chat session"
            });
        }

        // 3. Resolve active model key
        let activeModelKey = modelKey || session.selectedModel || getDefaultModelKey();

        if (modelKey && !isValidModelKey(modelKey)) {
            return res.status(400).json({
                success: false,
                message: `Invalid model key: "${modelKey}". Please select a valid model.`
            });
        }

        // If client explicitly sent a valid modelKey, update the session model
        if (modelKey && modelKey !== session.selectedModel) {
            session.selectedModel = modelKey;
        }

        // 4. Retrieve bounded recent conversation history (last 16 messages)
        const recentMessages = await Message.find({ sessionId })
            .sort({ createdAt: -1 })
            .limit(16);

        // Reverse to maintain chronological order for the model
        const history = recentMessages.reverse().map((msg) => ({
            role: msg.role,
            content: msg.content
        }));

        // 5. Persist user message to MongoDB
        const userMessageDoc = await Message.create({
            sessionId,
            userId: req.userId,
            role: "user",
            content: trimmedContent,
            modelKey: activeModelKey
        });

        // 6. Build personalized system prompt
        const systemPrompt = buildSystemPrompt({
            systemPrompt: session.systemPrompt,
            tone: session.tone,
            responseLength: session.responseLength,
            writingStyle: session.writingStyle,
            language: session.language
        });

        // 7. Call AI Provider Adapter
        let aiResult;
        try {
            aiResult = await generateAIResponse({
                modelKey: activeModelKey,
                systemPrompt,
                conversationHistory: history,
                userMessage: trimmedContent
            });
        } catch (aiError) {
            // Record failure metadata on user message or return clean error
            return res.status(502).json({
                success: false,
                message: aiError.message || "Failed to generate AI response from provider.",
                userMessage: userMessageDoc
            });
        }

        // 8. Persist assistant response in MongoDB
        const assistantMessageDoc = await Message.create({
            sessionId,
            userId: req.userId,
            role: "assistant",
            content: aiResult.reply,
            modelKey: aiResult.modelKey
        });

        // 9. Update session title if still default "New Chat"
        if (session.title === "New Chat") {
            const autoTitle = trimmedContent.length > 35
                ? `${trimmedContent.substring(0, 32)}...`
                : trimmedContent;
            session.title = autoTitle;
        }

        // Update session timestamp
        session.updatedAt = new Date();
        await session.save();

        return res.status(201).json({
            success: true,
            userMessage: userMessageDoc,
            assistantMessage: assistantMessageDoc,
            metadata: {
                modelKey: aiResult.modelKey,
                displayName: aiResult.displayName,
                provider: aiResult.provider
            }
        });
    } catch (error) {
        next(error);
    }
};
