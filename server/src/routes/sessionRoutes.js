import express from "express";
import {
    createSession,
    getSessions,
    getSessionById,
    updateSession,
    deleteSession
} from "../controllers/sessionController.js";
import { getMessages, sendMessage } from "../controllers/messageController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All session and message operations require authentication
router.use(protect);

// Session CRUD
router.post("/", createSession);
router.get("/", getSessions);
router.get("/:sessionId", getSessionById);
router.patch("/:sessionId", updateSession);
router.delete("/:sessionId", deleteSession);

// Session Messages
router.get("/:sessionId/messages", getMessages);
router.post("/:sessionId/messages", sendMessage);

export default router;
