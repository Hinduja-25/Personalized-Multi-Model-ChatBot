import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ChatSession",
            required: [true, "sessionId is required"],
            index: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "userId is required"],
            index: true
        },
        role: {
            type: String,
            required: [true, "Message role is required"],
            enum: {
                values: ["user", "assistant", "system"],
                message: "{VALUE} is not a valid message role"
            }
        },
        content: {
            type: String,
            required: [true, "Message content is required"]
        },
        modelKey: {
            type: String,
            trim: true,
            default: null
        },
        status: {
            type: String,
            enum: ["sent", "error"],
            default: "sent"
        },
        errorMetadata: {
            type: String,
            default: null
        },
        attachments: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Attachment"
            }
        ]
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

// Compound index for chronological message retrieval within a session
messageSchema.index({ sessionId: 1, createdAt: 1 });
// Compound index for user message lookups
messageSchema.index({ userId: 1, createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
