import mongoose from "mongoose";

const chatSessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Session owner userId is required"],
            index: true
        },
        title: {
            type: String,
            default: "New Chat",
            trim: true,
            maxlength: [120, "Title cannot exceed 120 characters"]
        },
        selectedModel: {
            type: String,
            default: process.env.DEFAULT_MODEL || "gemini-3-1-pro",
            trim: true
        },
        systemPrompt: {
            type: String,
            default: "",
            trim: true,
            maxlength: [3000, "System prompt cannot exceed 3000 characters"]
        },
        tone: {
            type: String,
            default: "natural",
            trim: true,
            maxlength: [50, "Tone cannot exceed 50 characters"]
        },
        responseLength: {
            type: String,
            default: "medium",
            trim: true,
            enum: {
                values: ["short", "medium", "detailed"],
                message: "{VALUE} is not a supported response length (must be short, medium, or detailed)"
            }
        },
        writingStyle: {
            type: String,
            default: "conversational",
            trim: true,
            maxlength: [50, "Writing style cannot exceed 50 characters"]
        },
        language: {
            type: String,
            default: "English",
            trim: true,
            maxlength: [50, "Language cannot exceed 50 characters"]
        }
    },
    {
        timestamps: true,
        toJSON: {
            transform(doc, ret) {
                ret.id = ret._id;
                delete ret.__v;
                return ret;
            }
        }
    }
);

// Compound index for fast retrieval of a user's sessions ordered by recency
chatSessionSchema.index({ userId: 1, updatedAt: -1 });

const ChatSession = mongoose.model("ChatSession", chatSessionSchema);

export default ChatSession;
