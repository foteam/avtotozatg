import cron from "node-cron";
import { updateCarsCleanlinessFromBookings } from "../services/carCleanlinessFromBooking.js";

export function startCarCleanlinessCron() {
    // ⏰ каждый день в 09:00
    cron.schedule("0 9 * * *", async () => {
        console.log("🔄 Updating car cleanliness from bookings...");
        await updateCarsCleanlinessFromBookings();
    });
}
