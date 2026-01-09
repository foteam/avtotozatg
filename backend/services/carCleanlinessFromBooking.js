import Car from "../models/cars_model.js";
import Booking from "../models/booking_model.js";
import User from "../models/user_model.js";

function normalizePlate(plate = "") {
    return plate.replace(/\s+/g, "").toUpperCase();
}
function formatPlate(plate = "") {
    if (plate.length === 8) {
        return `${plate.slice(0,2)} ${plate.slice(2,3)} ${plate.slice(3,6)} ${plate.slice(6)}`;
    }
    if (plate.length === 7) {
        return `${plate.slice(0,2)} ${plate.slice(2,5)} ${plate.slice(5)}`;
    }
    return plate;
}
export async function updateCarsCleanlinessFromBookings(bot) {
    const cars = await Car.find();
    const now = Date.now();

    for (const car of cars) {

        const normalizedCarPlate = formatPlate(car.plateNumber);

        // 🔍 ищем последнюю завершённую мойку
        const lastBooking = await Booking.findOne({
            status: "completed",
            carNumber: car.plateNumber
        }).sort({ updatedAt: -1 });

        // ❌ если вообще не мыли — считаем грязным
        if (!lastBooking) {
            if (car.cleanliness !== 0) {
                car.cleanliness = 0;
                await car.save();
            }
            continue;
        }

        // 🧮 считаем дни после мойки
        const daysPassed = Math.floor(
            (now - new Date(lastBooking.updatedAt).getTime())
            / (1000 * 60 * 60 * 24)
        );

        // 📐 3 дня = 100 → 0
        const newCleanliness = Math.max(
            0,
            Math.round(100 - daysPassed * (100 / 3))
        );

        if (newCleanliness === car.cleanliness) continue;

        car.cleanliness = newCleanliness;
        car.lastWashAt = lastBooking.updatedAt;

        // 🔔 уведомление при 0%
        if (newCleanliness === 0) {
            const user = await User.findOne({ user_id: car.user_id });
            if (user) {
                await bot.telegram.sendMessage(
                    user.user_id,
                    `🚗 ${car.plateNumber} juda iflos 😬  
Avtomoykaga bron qiling!`
                );
            }
        }

        await car.save();
    }

    console.log("✅ Car cleanliness updated from bookings");
}
