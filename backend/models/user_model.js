import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const userSchema = new Schema({
    user_id: { type: String, required: true, unique: true }, // user_id из Telegram
    name: { type: String, required: true },
    phone: { type: String },
    balance: { type: Number, default: 0 },
    city: { type: String, required: true },
    promoCode: { type: String, default: "" },
    promoCodeDiscount: { type: Number, default: 0 },
    blocked: { type: Boolean, default: false },
    bookings: [{ type: Schema.Types.ObjectId, ref: 'Booking' }], // Список бронирований пользователя
}, { timestamps: true });

export default model('User', userSchema);