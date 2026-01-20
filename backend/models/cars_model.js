import mongoose from "mongoose";

const CarSchema = new mongoose.Schema(
    {
        // 🔗 Владелец
        user_id: {
            type: String,
            required: true
        },

        // ⭐ Основной автомобиль
        isPrimary: {
            type: Boolean,
            default: false,
        },

        // 🚘 Данные автомобиля
        brand: {
            type: String,
            required: true,
            trim: true,
        },

        model: {
            type: String,
            required: true,
            trim: true,
        },

        year: {
            type: Number,
            min: 2000,
            max: new Date().getFullYear() + 1,
        },

        color: {
            type: String,
            trim: true,
        },

        plateNumber: {
            type: String,
            // ❗ храним БЕЗ пробелов → форматируем на фронте
        },

        bodyType: {
            type: String,
        },

        fuelType: {
            type: String,
        },

        // 🖼 Фото авто
        image: {
            type: String, // URL
            default: null,
        },

        // 🧼 Состояние авто
        cleanliness: {
            type: Number,
            min: 0,
            max: 100,
            default: 100, // после добавления считаем «чистым»
        },

        lastWashAt: {
            type: Date,
            default: null,
        },
        isPremium: {
            type: Boolean,
        }
    },
    {
        timestamps: true, // createdAt / updatedAt
    }
);

export default mongoose.model("Car", CarSchema);
