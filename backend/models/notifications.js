import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const notificationsScheme = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    banner: { type: String },
    checked: Boolean
}, { timestamps: true });

export default model('Notifications', notificationsScheme);