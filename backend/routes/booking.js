import express from 'express';
import Booking from '../models/booking_model.js';
import Carwash from '../models/carwash_model.js';
import User from '../models/user_model.js';
import Promo from '../models/promocode_model.js'

import {sendSMS} from '../eskiz.js'
import config from "../config.json" with {type: "json"};
import WashOwner from "../models/carwash_owner_model.js";

export default (bot) => {
    const router = express.Router();

    // Создать бронирование
    router.post('/create', async (req, res) => {
        try {
            const {
                paymentMethod = "card",
                priceType,
                fromUser,
                wash,
                order_id,
                slot,
                carNumber
            } = req.body;

            console.log("CREATE BOOKING:", req.body);

            // 1️⃣ Получаем пользователя и мойку
            const user = await User.findOne({ user_id: fromUser });
            const carwash = await Carwash.findById(wash);
            const washOwner = await WashOwner.findOne({ carwash: carwash });

            // 2️⃣ Парсим цену
            const originalPrice = Number(priceType.split(" – ")[1]);
            let finalPrice = originalPrice;

            // ❗ СКИДКИ ТОЛЬКО ПРИ ОПЛАТЕ КАРТОЙ
            if (
                paymentMethod === "card" &&
                user?.promoCodeDiscount > 0
            ) {
                finalPrice = Math.round(
                    originalPrice * (1 - user.promoCodeDiscount / 100)
                );
            }

            // 3️⃣ Создаём бронирование
            const booking = new Booking({
                ...req.body,
                price: originalPrice,
                status: paymentMethod === "cash"
                    ? "pending"
                    : "created"
            });

            await booking.save();

            // =========================
            // 💵 НАЛИЧНЫЕ
            // =========================
            if (paymentMethod === "cash") {
                // ---------- ЕСЛИ ВРЕМЯ АКТУАЛЬНО ----------
                await bot.telegram.sendMessage(config.ADMIN_GROUP, `SUCCESS ID #${booking.order_id}\n\nSumma: *${Number(booking.priceType.split(" – ")[1]).toLocaleString()} so'm*\n\nNaqd pul bilan to'lov!`, {parse_mode: "Markdown"})

                await bot.telegram.sendMessage(user.user_id,
                    `*Bron yaratildi! Vaqtida kelishni unutmang!*\n\nAvtomoyka: ${carwash.name}\nManzil: ${carwash.address}\nTel: ${washOwner.phone}`,
                    { parse_mode: "Markdown" }
                );
                await bot.telegram.sendLocation(user.user_id, carwash.location[0], carwash.location[1]);

                await sendSMS(washOwner.phone, `AvtoToza. Sizning moykangizda yangi buyurtma! Avtomobil raqami: ${booking.carNumber} , tel: ${booking.phoneNumber} , vaqt: ${booking.slot}`);
                await bot.telegram.sendMessage(
                    carwash.groupId,
                    `🚘 *YANGI BUYURTMA* #${booking.order_id}\n\nAvtomobil raqami: *${booking.carNumber}*\nTel (mijoz): ${booking.phoneNumber}\nTarif: *${booking.priceType.split("–")[0]}*\nSumma: *${Number(booking.priceType.split(" – ")[1]).toLocaleString()} so'm*\n\nKelish vaqti (bugun): *${booking.slot}*\n\n*Naqd pul bilan to'lov!*`,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: "Bajarildi", callback_data: "completed:" + booking.order_id }],
                                [{ text: "Bekor qilish", callback_data: "cancel:" + booking.order_id }]
                            ]
                        }
                    }
                );
                return res.json({
                    success: true,
                    cash: true,
                    message: "Buyurtma qabul qilindi. To‘lov joyida amalga oshiriladi."
                });
            }

            // =========================
            // 💳 КАРТА (ИНВОЙС)
            // =========================
            const invoiceTitle =
                `#${order_id} buyurtma — ${finalPrice.toLocaleString()} so'm`;

            const invoiceDescription =
                `📄 Tarif: ${priceType.split(" – ")[0].toUpperCase()}\n` +
                `🕒 Vaqt: bugun ${slot}\n` +
                `🚗 Avto raqami: ${carNumber}\n\n` +
                `To'lovni amalga oshiring`;

            const providerToken = '387026696:LIVE:692ab585efaea1fc197857f0';

            const invoiceLink = await bot.telegram.createInvoiceLink({
                title: invoiceTitle,
                description: invoiceDescription,
                payload: order_id,
                provider_token: providerToken,
                currency: 'UZS',
                prices: [
                    {
                        label: "Moyka xizmati",
                        amount: finalPrice * 100 // тийины
                    }
                ],
            });

            // 4️⃣ Сбрасываем промокод ТОЛЬКО если была карта
            if (user) {
                user.promoCode = "";
                user.promoCodeDiscount = 0;
                await user.save();
            }

            // 5️⃣ Отдаём ссылку Mini App
            res.json({
                success: true,
                invoiceLink
            });

        } catch (err) {
            console.error(err);
            res.status(500).json({
                success: false,
                error: err.message
            });
        }
    });
// Получить бронирования по мойке и слоту, учитывая текущую дату
    router.get('/get/bookings/:washid/slot/:slot', async (req, res) => {
        try {
            const { washid, slot } = req.params;
            const now = new Date();

            // Разделяем слот на часы и минуты
            const [hour, minute] = slot.split(':').map(Number);

            // Находим все бронирования на сегодня с этим слотом
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

            const bookings = await Booking.find({
                wash: washid,
                slot: slot,
                status: 'pending' // только активные брони
            }).populate('wash');

            res.json({ orders: bookings || [] });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // Получить все бронирования
    router.get('/all', async (req, res) => {
        try {
            const bookings = await Booking.find().populate('wash');
            res.json(bookings);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // Получить все бронирования пользователя
    router.get('/user/:userId', async (req, res) => {
        try {
            const bookings = await Booking.find({ fromUser: req.params.userId }).populate('wash');
            res.json(bookings);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Обновить статус бронирования
    router.patch('/:id', async (req, res) => {
        try {
            const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
            res.json(booking);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};


//User utilits
User.prototype.inc = function(field, value = 1) {
    this[field] += value;
    return this.save();
};

User.prototype.dec = function(field, value = 1) {
    this[field] -= value;
    return this.save();
};

User.prototype.set = function(field, value) {
    this[field] = value;
    return this.save();
};

//Promo utilits
Promo.prototype.inc = function(field, value = 1) {
    this[field] += value;
    return this.save();
};

Promo.prototype.dec = function(field, value = 1) {
    this[field] -= value;
    return this.save();
};

Promo.prototype.set = function(field, value) {
    this[field] = value;
    return this.save();
};