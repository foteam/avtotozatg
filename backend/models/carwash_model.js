import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const carWashSchema = new Schema({
    carwash_id: String,
    name: { type: String, required: true },
    groupId: { type: String, required: true },
    balance: { type: Number, required: true },
    comission: { type: Number, required: true },
    rating: { type: Number, default: 0 },
    address: { type: String, required: true },
    location: [{type: String}],
    city: { type: String, required: true },
    description: { type: String },
    banner: { type: String },
    images: [{ type: String }],
    slots: [{ type: String }], // Пример: ['10:00', '11:00']
    prices: [
        {
            type: { type: String, required: true }, // Econom, Standart, Premium
            price: { type: String, required: true },
        },
    ],
    reviews: [{ type: Schema.Types.ObjectId, ref: 'Review' }],
    isOpen: { type: Boolean, default: true },
}, { timestamps: true });

export default model('CarWash', carWashSchema);