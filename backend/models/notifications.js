import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const NotificationSchema = new Schema({
    userId: { type: String, required: true },

    title: { type: String, required: true },
    body: { type: String, required: true },

    data: { type: Object, default: {} }, // deep-link, screen, bookingId
    badge: { type: Number, default: 0 },

    checked: { type: Boolean, default: false }
}, { timestamps: true });

export default model('Notification', NotificationSchema);
