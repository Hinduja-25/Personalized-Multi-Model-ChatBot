import ChatSession from "../models/ChatSession.js";
import Message from "../models/Message.js";
import { isValidModelKey, getDefaultModelKey } from "../config/modelRegistry.js";

/**
 * @desc    Create a new chat session
 * @route   POST /sessions
 * @access  Private (protected)
 */
export const createSession = async (req, res, next) => {
    try {
        const {
            title,
            selectedModel,
            systemPrompt,
            tone,
            responseLength,
            writingStyle,
            language
        } = req.body;

        const effectiveModel = selectedModel || getDefaultModelKey();

        if (selectedModel && !isValidModelKey(selectedModel)) {
            return res.status(400).json({
                success: false,
                message: `Invalid model key: "${selectedModel}". Please choose a valid model from the registry.`
            });
        }

        const session = await ChatSession.create({
            userId: req.userId,
            title: title ? title.trim() : "New Chat",
            selectedModel: effectiveModel,
            systemPrompt: systemPrompt ? systemPrompt.trim() : "",
            tone: tone || "natural",
            responseLength: responseLength || "medium",
            writingStyle: writingStyle || "conversational",
            language: language || "English"
        });

        return res.status(201).json({
            success: true,
            message: "Chat session created successfully",
            session
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all chat sessions for the authenticated user
 * @route   GET /sessions
 * @access  Private (protected)
 */
export const getSessions = async (req, res, next) => {
    try {
        const sessions = await ChatSession.find({ userId: req.userId })
            .sort({ updatedAt: -1 })
            .select("-__v");

        return res.status(200).json({
            success: true,
            count: sessions.length,
            sessions
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get details of a specific chat session
 * @route   GET /sessions/:sessionId
 * @access  Private (protected)
 */
export const getSessionById = async (req, res, next) => {
    try {
        const { sessionId } = req.params;

        const session = await ChatSession.findById(sessionId);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Chat session not found"
            });
        }

        // Ownership verification
        if (session.userId.toString() !== req.userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to access this chat session"
            });
        }

        return res.status(200).json({
            success: true,
            session
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update session title, selected model, or personalization settings
 * @route   PATCH /sessions/:sessionId
 * @access  Private (protected)
 */
export const updateSession = async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const {
            title,
            selectedModel,
            systemPrompt,
            tone,
            responseLength,
            writingStyle,
            language
        } = req.body;

        const session = await ChatSession.findById(sessionId);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Chat session not found"
            });
        }

        // Ownership verification
        if (session.userId.toString() !== req.userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to modify this chat session"
            });
        }

        // Validate model if changed
        if (selectedModel !== undefined) {
            if (!isValidModelKey(selectedModel)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid model key: "${selectedModel}". Please choose a valid model from the registry.`
                });
            }
            session.selectedModel = selectedModel;
        }

        if (title !== undefined) session.title = title.trim();
        if (systemPrompt !== undefined) session.systemPrompt = systemPrompt.trim();
        if (tone !== undefined) session.tone = tone;
        if (responseLength !== undefined) session.responseLength = responseLength;
        if (writingStyle !== undefined) session.writingStyle = writingStyle;
        if (language !== undefined) session.language = language.trim();

        await session.save();

        return res.status(200).json({
            success: true,
            message: "Chat session updated successfully",
            session
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete a session and all its messages
 * @route   DELETE /sessions/:sessionId
 * @access  Private (protected)
 */
export const deleteSession = async (req, res, next) => {
    try {
        const { sessionId } = req.params;

        const session = await ChatSession.findById(sessionId);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Chat session not found"
            });
        }

        // Ownership verification
        if (session.userId.toString() !== req.userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to delete this chat session"
            });
        }

        // Delete associated messages first
        await Message.deleteMany({ sessionId });

        // Delete the session
        await ChatSession.findByIdAndDelete(sessionId);

        return res.status(200).json({
            success: true,
            message: "Chat session and associated messages deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};
