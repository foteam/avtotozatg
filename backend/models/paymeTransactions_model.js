import mongoose from 'mongoose';

const PaymeTransactionSchema = new mongoose.Schema({
    transactionId: { type: String, unique: true }, // Payme id
    orderId: { type: String, index: true },

    amount: Number,

    state: Number, // 1 created, 2 performed, -1 canceled

    create_time: Number,
    perform_time: Number,
    cancel_time: Number,

    reason: Number,
}, { timestamps: true });

export default mongoose.model(
    'PaymeTransaction',
    PaymeTransactionSchema
);
