import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Authentication middleware to protect routes.
 * Verifies JWT token, fetches user, and attaches user & userId to req.
 */
export const protect = async (req, res, next) => {
    let token;

    // 1. Extract JWT from Authorization header (Bearer <token>) or query parameter
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer ")
    ) {
        token = req.headers.authorization.split(" ")[1];
    } else if (req.query && req.query.token) {
        token = req.query.token;
    }

    // 2. Reject if no token is provided
    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Not authorized. No authentication token provided."
        });
    }

    try {
        // 3. Verify token signature and expiration
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 4. Identify authenticated user in database
        const user = await User.findById(decoded.id).select("-password");
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Not authorized. User account no longer exists."
            });
        }

        // 5. Attach user document and ID to request object for downstream controllers
        req.user = user;
        req.userId = user._id;

        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Authentication token has expired. Please log in again."
            });
        }

        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication token. Authorization denied."
            });
        }

        return res.status(401).json({
            success: false,
            message: "Not authorized. Token verification failed."
        });
    }
};

export default protect;
