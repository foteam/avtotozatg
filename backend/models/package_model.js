import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const packageSchema = new Schema({
    user_id: String,
    washesLeft: Number,
    totalWashes: Number,
    order_id: Number,
    price: Number,
    status: { type: String, default: "pending" }, // pending → paid
    createdAt: { type: Date, default: Date.now }, // дата покупки
    expiresAt: { type: Date } // дата окончания (30 дней)
});

// Перед сохранением пакета, если нет expiresAt, ставим +30 дней
packageSchema.pre('save', function(next) {
    if (!this.expiresAt) {
        const expire = new Date(this.createdAt);
        expire.setDate(expire.getDate() + 30);
        this.expiresAt = expire;
    }
    next();
});

export default model('package', packageSchema);