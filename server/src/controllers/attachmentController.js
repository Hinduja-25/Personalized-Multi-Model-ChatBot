import ChatSession from "../models/ChatSession.js";
import Attachment from "../models/Attachment.js";
import Message from "../models/Message.js";
import storageService from "../services/storageService.js";
import { validateFileBuffer } from "../middleware/uploadMiddleware.js";

/**
 * @desc    Upload one or multiple attachments for a chat session
 * @route   POST /api/attachments/upload
 * @access  Private (protected)
 */
export const uploadAttachments = async (req, res, next) => {
    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: "sessionId is required to upload attachments"
            });
        }

        // 1. Verify chat session ownership
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
                message: "Unauthorized: You do not own this chat session"
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No files uploaded"
            });
        }

        const savedAttachments = [];

        // 2. Validate and save each uploaded file
        for (const file of req.files) {
            try {
                // Verify magic bytes
                validateFileBuffer(file.buffer, file.mimetype);

                // Persist file via storage service abstraction
                const { storageKey } = await storageService.saveFile({
                    buffer: file.buffer,
                    originalName: file.originalname
                });

                // Create Attachment document
                const attachmentDoc = await Attachment.create({
                    userId: req.userId,
                    sessionId: session._id,
                    originalName: file.originalname,
                    mimeType: file.mimetype,
                    size: file.size,
                    storageKey,
                    processingStatus: "pending"
                });

                savedAttachments.push({
                    id: attachmentDoc._id,
                    _id: attachmentDoc._id,
                    originalName: attachmentDoc.originalName,
                    mimeType: attachmentDoc.mimeType,
                    size: attachmentDoc.size,
                    processingStatus: attachmentDoc.processingStatus,
                    createdAt: attachmentDoc.createdAt
                });
            } catch (fileErr) {
                console.error(`Error processing file ${file.originalname}:`, fileErr.message);
                return res.status(400).json({
                    success: false,
                    message: `File validation failed for "${file.originalname}": ${fileErr.message}`
                });
            }
        }

        return res.status(201).json({
            success: true,
            count: savedAttachments.length,
            attachments: savedAttachments
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get or stream an attachment file
 * @route   GET /api/attachments/:id
 * @access  Private (protected)
 */
export const getAttachment = async (req, res, next) => {
    try {
        const { id } = req.params;

        const attachment = await Attachment.findById(id);
        if (!attachment) {
            return res.status(404).json({
                success: false,
                message: "Attachment not found"
            });
        }

        // Ownership check
        if (attachment.userId.toString() !== req.userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: You do not have permission to access this attachment"
            });
        }

        if (!storageService.fileExists(attachment.storageKey)) {
            return res.status(404).json({
                success: false,
                message: "Attachment file missing from storage"
            });
        }

        // Set safe headers
        res.setHeader("Content-Type", attachment.mimeType);
        res.setHeader(
            "Content-Disposition",
            `inline; filename="${encodeURIComponent(attachment.originalName)}"`
        );
        res.setHeader("Content-Length", attachment.size);
        res.setHeader("X-Content-Type-Options", "nosniff");

        const stream = storageService.getFileStream(attachment.storageKey);
        stream.pipe(res);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete an attachment before sending or cleanup
 * @route   DELETE /api/attachments/:id
 * @access  Private (protected)
 */
export const deleteAttachment = async (req, res, next) => {
    try {
        const { id } = req.params;

        const attachment = await Attachment.findById(id);
        if (!attachment) {
            return res.status(404).json({
                success: false,
                message: "Attachment not found"
            });
        }

        // Ownership check
        if (attachment.userId.toString() !== req.userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: You do not own this attachment"
            });
        }

        // Delete physical file
        await storageService.deleteFile(attachment.storageKey);

        // Remove from any associated message
        if (attachment.messageId) {
            await Message.findByIdAndUpdate(attachment.messageId, {
                $pull: { attachments: attachment._id }
            });
        }

        // Remove document
        await Attachment.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "Attachment deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};
