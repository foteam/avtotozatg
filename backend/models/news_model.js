import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const newsSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    banner: { type: String, required: true },
    views: Number
}, { timestamps: true });

export default model('news', newsSchema);