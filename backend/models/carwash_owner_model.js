import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const OwnerSchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    name: String,
    phone: String,
    carwash: { type: mongoose.Schema.Types.ObjectId, ref: "CarWash" },
}, { timestamps: true });

export default model('carwashowner', OwnerSchema);