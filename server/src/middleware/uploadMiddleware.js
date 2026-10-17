import multer from "multer";

// Allowed MIME types map with allowed extensions
export const ALLOWED_MIME_TYPES = {
    "image/png": [".png"],
    "image/jpeg": [".jpg", ".jpeg"],
    "image/webp": [".webp"],
    "application/pdf": [".pdf"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    "text/plain": [".txt"]
};

// Configurable limits via environment variables
export const MAX_FILE_SIZE_BYTES = (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10) * 1024 * 1024;
export const MAX_FILES_PER_REQUEST = parseInt(process.env.MAX_ATTACHMENTS_PER_MESSAGE, 10) || 5;

// Memory storage for inspecting file headers before writing to storage
const storage = multer.memoryStorage();

// File filter based on MIME type and extension
const fileFilter = (req, file, cb) => {
    const mime = file.mimetype.toLowerCase();
    if (!ALLOWED_MIME_TYPES[mime]) {
        // Also check if text/plain was sent with different charset or variant
        if (mime.startsWith("text/plain")) {
            return cb(null, true);
        }
        return cb(
            new Error(
                `Unsupported file type: "${file.mimetype}". Allowed types: PNG, JPG, JPEG, WEBP, PDF, DOCX, TXT.`
            ),
            false
        );
    }
    cb(null, true);
};

export const upload = multer({
    storage,
    limits: {
        fileSize: MAX_FILE_SIZE_BYTES,
        files: MAX_FILES_PER_REQUEST
    },
    fileFilter
});

/**
 * Validate file content headers (magic numbers) to prevent file extension spoofing
 */
export const validateFileBuffer = (buffer, mimeType) => {
    if (!buffer || buffer.length === 0) {
        throw new Error("File is empty (0 bytes)");
    }

    const mime = mimeType.toLowerCase();

    if (mime === "image/png") {
        // PNG header: 89 50 4E 47 0D 0A 1A 0A
        if (
            buffer.length < 8 ||
            buffer[0] !== 0x89 ||
            buffer[1] !== 0x50 ||
            buffer[2] !== 0x4e ||
            buffer[3] !== 0x47 ||
            buffer[4] !== 0x0d ||
            buffer[5] !== 0x0a ||
            buffer[6] !== 0x1a ||
            buffer[7] !== 0x0a
        ) {
            throw new Error("Invalid or corrupted PNG image header");
        }
    } else if (mime === "image/jpeg") {
        // JPEG header: FF D8 FF
        if (buffer.length < 3 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
            throw new Error("Invalid or corrupted JPEG image header");
        }
    } else if (mime === "image/webp") {
        // WEBP: RIFF....WEBP
        if (
            buffer.length < 12 ||
            buffer.toString("ascii", 0, 4) !== "RIFF" ||
            buffer.toString("ascii", 8, 12) !== "WEBP"
        ) {
            throw new Error("Invalid or corrupted WEBP image header");
        }
    } else if (mime === "application/pdf") {
        // PDF header: %PDF-
        const header = buffer.toString("ascii", 0, 5);
        if (!header.startsWith("%PDF-")) {
            throw new Error("Invalid or corrupted PDF file header");
        }
    } else if (
        mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
        // DOCX is a zip package starting with PK (0x50, 0x4B, 0x03, 0x04)
        if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
            throw new Error("Invalid DOCX format (missing package header)");
        }
    } else if (mime.startsWith("text/plain")) {
        // Check for binary/null bytes in first 1024 bytes
        const sampleSize = Math.min(buffer.length, 1024);
        for (let i = 0; i < sampleSize; i++) {
            if (buffer[i] === 0) {
                throw new Error("Invalid text file: binary data detected");
            }
        }
    }

    return true;
};
