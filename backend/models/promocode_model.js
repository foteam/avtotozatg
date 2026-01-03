import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const promocodeScheme = new Schema({
    promoCode: String,
    uses: Number,
    maxUses: Number,
    discount: Number,
    status: String
}, { timestamps: true });

export default model('Promocode', promocodeScheme);