import Message from "../models/Message.js";
import ChatSession from "../models/ChatSession.js";
import Attachment from "../models/Attachment.js";
import fileProcessingService from "../services/fileProcessingService.js";
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

        // 2. Fetch messages in chronological order with populated attachments
        const messages = await Message.find({ sessionId })
            .sort({ createdAt: 1 })
            .populate("attachments")
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
        const { content, modelKey, attachmentIds = [] } = req.body;

        const hasText = content && typeof content === "string" && content.trim().length > 0;
        const hasAttachments = Array.isArray(attachmentIds) && attachmentIds.length > 0;

        // 1. Validate message content or attachments
        if (!hasText && !hasAttachments) {
            return res.status(400).json({
                success: false,
                message: "Message must contain text content or at least one file attachment"
            });
        }

        const trimmedContent = hasText
            ? content.trim()
            : "Please review and analyze the attached file(s).";

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

        // 3. Validate attachments and verify ownership
        let validatedAttachments = [];
        let attachmentPayloads = [];

        if (hasAttachments) {
            validatedAttachments = await Attachment.find({
                _id: { $in: attachmentIds },
                sessionId,
                userId: req.userId
            });

            if (validatedAttachments.length !== attachmentIds.length) {
                return res.status(400).json({
                    success: false,
                    message: "One or more attachments are invalid, unauthorized, or not found"
                });
            }

            // Process files and retrieve payloads
            for (const att of validatedAttachments) {
                try {
                    const payload = await fileProcessingService.getAttachmentPayload(att);
                    attachmentPayloads.push(payload);
                } catch (procErr) {
                    return res.status(400).json({
                        success: false,
                        message: `Failed to process attachment "${att.originalName}": ${procErr.message}`
                    });
                }
            }
        }

        // 4. Resolve active model key
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

        // 5. Retrieve bounded recent conversation history (last 16 messages)
        const recentMessages = await Message.find({ sessionId })
            .sort({ createdAt: -1 })
            .limit(16);

        // Reverse to maintain chronological order for the model
        const history = recentMessages.reverse().map((msg) => ({
            role: msg.role,
            content: msg.content
        }));

        // 6. Persist user message to MongoDB
        const userMessageDoc = await Message.create({
            sessionId,
            userId: req.userId,
            role: "user",
            content: trimmedContent,
            modelKey: activeModelKey,
            attachments: validatedAttachments.map((a) => a._id)
        });

        // Link message ID to attachment records
        if (validatedAttachments.length > 0) {
            await Attachment.updateMany(
                { _id: { $in: validatedAttachments.map((a) => a._id) } },
                { $set: { messageId: userMessageDoc._id } }
            );
        }

        // 7. Build personalized system prompt with dynamic style adaptation
        const systemPrompt = buildSystemPrompt({
            systemPrompt: session.systemPrompt,
            language: session.language
        });

        // 8. Call AI Provider Adapter with multimodal attachments
        let aiResult;
        try {
            aiResult = await generateAIResponse({
                modelKey: activeModelKey,
                systemPrompt,
                conversationHistory: history,
                userMessage: trimmedContent,
                attachments: attachmentPayloads
            });
        } catch (aiError) {
            return res.status(502).json({
                success: false,
                message: aiError.message || "Failed to generate AI response from provider.",
                userMessage: await userMessageDoc.populate("attachments")
            });
        }

        // 9. Persist assistant response in MongoDB
        const assistantMessageDoc = await Message.create({
            sessionId,
            userId: req.userId,
            role: "assistant",
            content: aiResult.reply,
            modelKey: aiResult.modelKey
        });

        // 10. Update session title if still default "New Chat"
        if (session.title === "New Chat") {
            const autoTitle = trimmedContent.length > 35
                ? `${trimmedContent.substring(0, 32)}...`
                : trimmedContent;
            session.title = autoTitle;
        }

        // Update session timestamp
        session.updatedAt = new Date();
        await session.save();

        const populatedUserMessage = await userMessageDoc.populate("attachments");

        return res.status(201).json({
            success: true,
            userMessage: populatedUserMessage,
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

