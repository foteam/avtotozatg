import { sendSMS } from "./eskiz.js";

(async () => {
    try {
        const res = await sendSMS(
            "+998 90 077 75 75",
            "AvtoToza. Hurmatli mijoz, #00000 sonli moykangiz tayyor bo'ldi! Olib ketishni unutmang! Moyka: BOONKER_CARWASH , tel: +998 90 077 75 75"
        );
        console.log("OK:", res.data);
    } catch (e) {
        console.error("ERROR:", e.response?.data || e.message);
    }
})();
