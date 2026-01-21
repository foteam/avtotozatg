import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const payoutScheme = new Schema({
    trans_id: { type: String, required: true },
    wash: [{ type: Schema.Types.ObjectId, ref: 'CarWash' }],
    amount: { type: Number, default: 0 },
    card: {type: String },
    status: { type: String, default: "pending" },
}, { timestamps: true });

export default model('Payout', payoutScheme);