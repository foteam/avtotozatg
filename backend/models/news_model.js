import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const newsSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    banner: {
        type: String,
        required: true
    },
    views: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

export default model('News', newsSchema);
