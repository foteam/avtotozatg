import express from "express";
import Otp from "../models/phoneOTP.js";
import { sendSMS } from "../eskiz.js";

const router = express.Router();

router.post("/send-code", async (req, res) => {
    let { phone } = req.body;

    phone = phone.replace(/\D/g, "");

    if (!phone.startsWith("998")) {
        return res.status(400).json({ error: "Noto‘g‘ri raqam" });
    }

    const code = Math.floor(1000 + Math.random() * 900);

    await Otp.deleteMany({ phone });

    await Otp.create({ phone, code });

    await sendSMS(
        phone,
        `AvtoToza ilovasidan ro'yxatdan otish uchun tasdiqlash kodi: ${code}`
    );

    res.json({ ok: true });
});

router.post("/verify-code", async (req, res) => {
    let { phone, code } = req.body;
    phone = phone.replace(/\D/g, "");

    const otp = await Otp.findOne({ phone, code });

    if (!otp) {
        return res.status(400).json({ error: "Kod noto‘g‘ri" });
    }

    await Otp.deleteMany({ phone });

    res.json({ verified: true });
});

export default router;
