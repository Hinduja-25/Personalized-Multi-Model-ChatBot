import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base directory for local file storage (configurable via env)
const UPLOAD_DIR = process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.resolve(__dirname, "../../uploads");

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Storage Service Abstraction
 * Handles saving, reading, and deleting stored attachment files.
 * Designed to be easily replaced by cloud object storage (e.g., AWS S3, Azure Blob) in production.
 */
class LocalStorageProvider {
    constructor(baseDir) {
        this.baseDir = baseDir;
    }

    /**
     * Generate safe, unique storage key
     */
    generateKey(originalName = "") {
        const ext = path.extname(originalName).toLowerCase();
        const safeExt = ext.replace(/[^a-z0-9.]/gi, "").substring(0, 10);
        return `${uuidv4()}${safeExt}`;
    }

    /**
     * Resolve and validate storage path against path traversal
     */
    getSafePath(storageKey) {
        if (!storageKey || typeof storageKey !== "string" || storageKey.includes("..") || storageKey.includes("/") || storageKey.includes("\\")) {
            throw new Error("Invalid or unsafe storage key");
        }
        const resolved = path.resolve(this.baseDir, storageKey);
        if (!resolved.startsWith(this.baseDir)) {
            throw new Error("Path traversal violation detected");
        }
        return resolved;
    }

    /**
     * Save a file buffer to disk
     */
    async saveFile({ buffer, originalName }) {
        const storageKey = this.generateKey(originalName);
        const destination = this.getSafePath(storageKey);
        await fs.promises.writeFile(destination, buffer);
        return {
            storageKey,
            size: buffer.length
        };
    }

    /**
     * Read file buffer
     */
    async getFileBuffer(storageKey) {
        const filePath = this.getSafePath(storageKey);
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found for key: ${storageKey}`);
        }
        return await fs.promises.readFile(filePath);
    }

    /**
     * Get read stream for downloading/serving
     */
    getFileStream(storageKey) {
        const filePath = this.getSafePath(storageKey);
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found for key: ${storageKey}`);
        }
        return fs.createReadStream(filePath);
    }

    /**
     * Delete stored file
     */
    async deleteFile(storageKey) {
        try {
            const filePath = this.getSafePath(storageKey);
            if (fs.existsSync(filePath)) {
                await fs.promises.unlink(filePath);
            }
        } catch (err) {
            console.warn(`Failed to delete storage file ${storageKey}:`, err.message);
        }
    }

    /**
     * Check if file exists
     */
    fileExists(storageKey) {
        try {
            const filePath = this.getSafePath(storageKey);
            return fs.existsSync(filePath);
        } catch {
            return false;
        }
    }
}

export const storageService = new LocalStorageProvider(UPLOAD_DIR);
export default storageService;
