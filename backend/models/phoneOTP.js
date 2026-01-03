import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
    phone: String,
    code: String,
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 180 // 3 минуты
    }
});

export default mongoose.model("Otp", otpSchema);