import express from "express";
import { uploadAttachments, getAttachment, deleteAttachment } from "../controllers/attachmentController.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload, MAX_FILES_PER_REQUEST } from "../middleware/uploadMiddleware.js";

const router = express.Router();

// Require authentication for all attachment endpoints
router.use(protect);

// Upload files route
router.post(
    "/upload",
    (req, res, next) => {
        upload.array("files", MAX_FILES_PER_REQUEST)(req, res, (err) => {
            if (err) {
                if (err.code === "LIMIT_FILE_SIZE") {
                    return res.status(400).json({
                        success: false,
                        message: "One or more files exceed the maximum allowed size limit."
                    });
                }
                if (err.code === "LIMIT_FILE_COUNT") {
                    return res.status(400).json({
                        success: false,
                        message: `Cannot upload more than ${MAX_FILES_PER_REQUEST} files at once.`
                    });
                }
                return res.status(400).json({
                    success: false,
                    message: err.message || "File upload failed."
                });
            }
            next();
        });
    },
    uploadAttachments
);

// Stream / preview attachment
router.get("/:id", getAttachment);

// Delete attachment
router.delete("/:id", deleteAttachment);

export default router;
