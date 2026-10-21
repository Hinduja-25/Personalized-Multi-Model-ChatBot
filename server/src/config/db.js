import mongoose from "mongoose";

let isConnecting = false;

const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) {
        return mongoose.connection;
    }

    if (isConnecting) {
        while (isConnecting) {
            await new Promise((resolve) => setTimeout(resolve, 50));
        }
        return mongoose.connection;
    }

    try {
        isConnecting = true;
        const conn = await mongoose.connect(process.env.DATABASE_URL);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        isConnecting = false;
        return conn;
    } catch (error) {
        isConnecting = false;
        console.error(`MongoDB Connection Error: ${error.message}`);
        if (!process.env.VERCEL) {
            process.exit(1);
        }
        throw error;
    }
};

export default connectDB;
