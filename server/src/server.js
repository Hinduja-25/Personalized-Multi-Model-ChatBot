import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import modelRoutes from "./routes/modelRoutes.js";
import attachmentRoutes from "./routes/attachmentRoutes.js";

dotenv.config();

const app = express();

// Body parser middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use(cors({
    origin: (origin, callback) => {
        // Allow same-origin, localhost, Vercel deployments, or custom CLIENT_URL
        if (
            !origin ||
            origin === process.env.CLIENT_URL ||
            origin.includes("localhost") ||
            origin.includes("127.0.0.1") ||
            origin.endsWith(".vercel.app")
        ) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    credentials: true
}));

// Database connection middleware (connects or reuses cached connection)
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        console.error("Database connection failure:", error);
        res.status(500).json({
            success: false,
            message: `Database connection failed: ${error.message}`
        });
    }
});

// Base health check route
app.get("/", (req, res) => {
    res.json({ status: "ok", message: "Personalized AI Chatbot API is running" });
});

// Authentication routes
app.use("/auth", authRoutes);

// Chat session & message routes
app.use("/sessions", sessionRoutes);

// AI Models registry routes
app.use("/models", modelRoutes);

// Attachment routes
app.use("/attachments", attachmentRoutes);

// 404 handler for undefined routes
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`
    });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);

    // Mongoose validation error
    if (err.name === "ValidationError") {
        const messages = Object.values(err.errors).map((val) => val.message);
        return res.status(400).json({
            success: false,
            message: messages.join(", ")
        });
    }

    // Mongoose duplicate key error (code 11000)
    if (err.code === 11000) {
        return res.status(400).json({
            success: false,
            message: "Duplicate field value entered"
        });
    }

    const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || "Internal Server Error"
    });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
    connectDB().catch(console.error);
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

export default app;