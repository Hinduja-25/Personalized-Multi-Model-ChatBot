import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "userId is required"],
            index: true
        },
        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ChatSession",
            required: [true, "sessionId is required"],
            index: true
        },
        messageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
            default: null,
            index: true
        },
        originalName: {
            type: String,
            required: [true, "Original filename is required"],
            trim: true
        },
        mimeType: {
            type: String,
            required: [true, "MIME type is required"],
            trim: true
        },
        size: {
            type: Number,
            required: [true, "File size in bytes is required"]
        },
        storageKey: {
            type: String,
            required: [true, "Storage key is required"],
            unique: true
        },
        processingStatus: {
            type: String,
            enum: ["pending", "processed", "failed"],
            default: "pending"
        },
        extractedText: {
            type: String,
            default: ""
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        error: {
            type: String,
            default: null
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

// Indexes for fast lookup by user and session
attachmentSchema.index({ userId: 1, createdAt: -1 });
attachmentSchema.index({ sessionId: 1, createdAt: 1 });

const Attachment = mongoose.model("Attachment", attachmentSchema);

export default Attachment;
