import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const bookingSchema = new Schema({
    order_id: String,
    wash: { type: Schema.Types.ObjectId, ref: 'CarWash', required: true },

    fromUser: { type: String, default: null }, // если не пользователь – null

    isAdmin: { type: Boolean, default: false }, // 🔥 добавили

    carNumber: { type: String, required: true },
    priceType: { type: String, required: true },
    phoneNumber: { type: String, default: "admin" }, // админская бронь не требует телефона
    slot: { type: String, required: true },
    paymentLink: { type: String },

    status: { type: String, default: 'pending' }, // pending, paid, canceled, completed

}, { timestamps: true });

export default model('Booking', bookingSchema);