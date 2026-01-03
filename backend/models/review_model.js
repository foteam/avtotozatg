import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const reviewSchema = new Schema({
    wash: { type: Schema.Types.ObjectId, ref: 'CarWash', required: true },
    name: { type: String, required: true },
    comment: { type: String, required: true },
    rating: { type: Number, required: true }, // 1-5
}, { timestamps: true });

export default model('Review', reviewSchema);