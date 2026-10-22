import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";
import storageService from "./storageService.js";
import Attachment from "../models/Attachment.js";

// Maximum characters of extracted text to prevent runaway context explosion
const MAX_EXTRACTED_TEXT_CHARS = parseInt(process.env.MAX_EXTRACTED_TEXT_CHARS, 10) || 200000;

/**
 * File Processing Service
 * Extracts text and prepares multimodal representations for images, PDFs, DOCX, and TXT files.
 */
class FileProcessingService {
    /**
     * Process an attachment by its document or ID
     */
    async processAttachment(attachmentOrId) {
        let attachment = typeof attachmentOrId === "string"
            ? await Attachment.findById(attachmentOrId)
            : attachmentOrId;

        if (!attachment) {
            throw new Error("Attachment not found for processing");
        }

        // Return immediately if already processed
        if (attachment.processingStatus === "processed" && (attachment.extractedText || attachment.mimeType.startsWith("image/"))) {
            return attachment;
        }

        try {
            const buffer = await storageService.getFileBuffer(attachment.storageKey);
            const mime = attachment.mimeType.toLowerCase();

            if (mime.startsWith("image/")) {
                await this.processImage(attachment, buffer);
            } else if (mime === "application/pdf") {
                await this.processPdf(attachment, buffer);
            } else if (
                mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
                attachment.originalName.endsWith(".docx")
            ) {
                await this.processDocx(attachment, buffer);
            } else if (mime.startsWith("text/plain") || attachment.originalName.endsWith(".txt")) {
                await this.processTxt(attachment, buffer);
            } else {
                throw new Error(`Unsupported file type for processing: ${attachment.mimeType}`);
            }

            attachment.processingStatus = "processed";
            attachment.error = null;
            await attachment.save();
            return attachment;
        } catch (err) {
            console.error(`Failed to process attachment ${attachment._id} (${attachment.originalName}):`, err.message);
            attachment.processingStatus = "failed";
            attachment.error = err.message;
            await attachment.save();
            throw err;
        }
    }

    /**
     * Process image attachments
     */
    async processImage(attachment, buffer) {
        attachment.metadata = {
            ...attachment.metadata,
            byteLength: buffer.length,
            isImage: true
        };
        // We do not require text extraction for images when models have vision capabilities.
        // If image description or OCR is needed for text-only models, metadata flags it.
    }

    /**
     * Process PDF documents using serverless-friendly unpdf
     */
    async processPdf(attachment, buffer) {
        try {
            const pdf = await getDocumentProxy(new Uint8Array(buffer));
            const { totalPages, text } = await extractText(pdf, { mergePages: false });

            let fullText = "";
            const pageCount = totalPages || 0;

            if (Array.isArray(text) && text.length > 0) {
                fullText = text
                    .map((pageText, idx) => `[Page ${idx + 1}]\n${(pageText || "").trim()}`)
                    .filter((p) => p.length > 0)
                    .join("\n\n");
            } else if (typeof text === "string") {
                fullText = text.trim();
            }

            if (!fullText || fullText.trim().length === 0) {
                fullText = "[Note: This PDF appears to be a scanned document or contains no extractable text layer.]";
            } else if (fullText.length > MAX_EXTRACTED_TEXT_CHARS) {
                fullText = `${fullText.substring(0, MAX_EXTRACTED_TEXT_CHARS)}\n\n[Warning: Document text truncated to ${MAX_EXTRACTED_TEXT_CHARS} characters limit]`;
            }

            attachment.extractedText = fullText;
            attachment.metadata = {
                ...attachment.metadata,
                pageCount,
                charCount: fullText.length
            };
        } catch (err) {
            if (err.name === "PasswordException") {
                throw new Error("Password-protected or encrypted PDF files are not supported.");
            }
            throw new Error(`Failed to extract text from PDF: ${err.message}`);
        }
    }

    /**
     * Process DOCX documents
     */
    async processDocx(attachment, buffer) {
        try {
            const result = await mammoth.extractRawText({ buffer });
            let extracted = (result.value || "").trim();

            if (!extracted || extracted.length === 0) {
                extracted = "[Note: DOCX file contains no readable text.]";
            } else if (extracted.length > MAX_EXTRACTED_TEXT_CHARS) {
                extracted = `${extracted.substring(0, MAX_EXTRACTED_TEXT_CHARS)}\n\n[Warning: DOCX text truncated to ${MAX_EXTRACTED_TEXT_CHARS} characters limit]`;
            }

            attachment.extractedText = extracted;
            attachment.metadata = {
                ...attachment.metadata,
                warnings: result.messages?.map((m) => m.message) || [],
                charCount: extracted.length
            };
        } catch (err) {
            throw new Error(`Failed to extract text from DOCX document: ${err.message}`);
        }
    }

    /**
     * Process TXT files
     */
    async processTxt(attachment, buffer) {
        try {
            let text = buffer.toString("utf-8").replace(/\0/g, "").trim();

            if (text.length > MAX_EXTRACTED_TEXT_CHARS) {
                text = `${text.substring(0, MAX_EXTRACTED_TEXT_CHARS)}\n\n[Warning: Text file truncated to ${MAX_EXTRACTED_TEXT_CHARS} characters limit]`;
            }

            attachment.extractedText = text;
            attachment.metadata = {
                ...attachment.metadata,
                charCount: text.length
            };
        } catch (err) {
            throw new Error(`Failed to read TXT file: ${err.message}`);
        }
    }

    /**
     * Get multimodal payload prepared for provider adapters
     */
    async getAttachmentPayload(attachment) {
        // Ensure processed
        if (attachment.processingStatus !== "processed") {
            await this.processAttachment(attachment);
        }

        const mime = attachment.mimeType.toLowerCase();

        if (mime.startsWith("image/")) {
            const buffer = await storageService.getFileBuffer(attachment.storageKey);
            return {
                id: attachment._id.toString(),
                type: "image",
                mimeType: attachment.mimeType,
                originalName: attachment.originalName,
                base64: buffer.toString("base64"),
                size: attachment.size
            };
        }

        return {
            id: attachment._id.toString(),
            type: "document",
            mimeType: attachment.mimeType,
            originalName: attachment.originalName,
            text: attachment.extractedText || "",
            size: attachment.size
        };
    }
}

export const fileProcessingService = new FileProcessingService();
export default fileProcessingService;
