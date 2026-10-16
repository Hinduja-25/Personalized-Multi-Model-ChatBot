import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Helper to generate JWT token
const generateToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );
};

// Password security validator: minimum 8 chars, at least one letter and one number
const validatePasswordSecurity = (password) => {
    if (!password || typeof password !== "string") {
        return { valid: false, message: "Password is required" };
    }
    if (password.length < 8) {
        return { valid: false, message: "Password must be at least 8 characters long" };
    }
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasLetter || !hasNumber) {
        return { valid: false, message: "Password must contain at least one letter and one number" };
    }
    return { valid: true };
};

// Email format validator
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return typeof email === "string" && emailRegex.test(email.trim());
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req, res, next) => {
    try {
        const { name, email, password, confirmPassword } = req.body;

        // 1. Validate required fields
        if (!name || !email || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields: name, email, password, and confirmPassword"
            });
        }

        // 2. Validate email format
        if (!validateEmail(email)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address"
            });
        }

        // 3. Validate password security requirements
        const passwordCheck = validatePasswordSecurity(password);
        if (!passwordCheck.valid) {
            return res.status(400).json({
                success: false,
                message: passwordCheck.message
            });
        }

        // 4. Validate password confirmation
        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Passwords do not match"
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // 5. Check if email is already registered
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "An account with this email address already exists"
            });
        }

        // 6. Create user (password is automatically hashed by pre-save hook)
        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password
        });

        // 7. Generate JWT
        const token = generateToken(user._id);

        // 8. Return response (never returns password)
        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Authenticate user & get token (login)
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // 1. Validate input presence
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide both email and password"
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // 2. Find user by email, explicitly including password field for verification
        const user = await User.findOne({ email: normalizedEmail }).select("+password");

        // 3. Verify user exists and password is correct
        // Use generic error message to avoid revealing whether the email exists
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // 4. Generate JWT
        const token = generateToken(user._id);

        // 5. Return basic user info and token (never returning password)
        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get currently authenticated user profile
 * @route   GET /api/auth/me
 * @access  Private (protected by authMiddleware)
 */
export const getMe = async (req, res, next) => {
    try {
        return res.status(200).json({
            success: true,
            user: req.user
        });
    } catch (error) {
        next(error);
    }
};
