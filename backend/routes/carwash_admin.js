import express from 'express';
import Carwash from '../models/carwash_model.js';
import CarwashOwner from '../models/carwash_owner_model.js';
import User from "../models/user_model.js";
import Bookings from '../models/booking_model.js';
import Promo from '../models/promocode_model.js';
import Payouts from '../models/payout_model.js'
import {sendSMS} from "../eskiz.js";
import Wash from "../models/carwash_model.js";
import WashOwner from "../models/carwash_owner_model.js";

const router = express.Router();

// LOGIN OWNER (PLAIN PASSWORD - NOT SECURE)
router.post('/login', async (req, res) => {
    try {
        const { login, password, businessType, pushToken } = req.body;

        if (!login || !password) {
            return res.status(400).json({
                success: false,
                message: 'Login and password required',
            });
        }
        if (businessType === "car_wash"){
            // 1️⃣ ищем владельца
            const owner = await CarwashOwner.findOne({ login });

            if (!owner) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid login or password',
                });
            }

            // 2️⃣ проверяем пароль
            if (owner.password !== password) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid login or password',
                });
            }
            // push token
            await CarwashOwner.updateOne(
                { _id: owner._id },
                { $addToSet: { tokens:  [pushToken]  } }
            );
            // 3️⃣ получаем автомойку
            const carwash = await Carwash.findById(owner.carwash);

            return res.json({
                success: true,
                owner,
                carwash,
            });
        }
    } catch (err) {
        console.error('LOGIN ERROR:', err);
        res.status(500).json({
            success: false,
            message: 'Server error',
        });
    }
});

router.get('/me/:ownerId', async (req, res) => {

    const owner = await CarwashOwner.findById(req.params.ownerId);
    if (!owner) {
        return res.status(401).json({ success: false });
    }
    const carwash = await Carwash.findById(owner.carwash);
    res.json({ success: true, owner, carwash });
});

//get carwash orders
router.get('/get/orders/:_id', async (req, res) => {
    try {
        const orders = await Bookings.find({wash:  req.params._id});
        if (!orders) return res.status(404).json({ error: 'Orders not found' });
        res.json({exists: true, orders});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/orders/:id/cancel', async (req, res) => {
    try {
        const order = await Bookings.findByIdAndUpdate(
            req.params.id,
            { status: "cancelled" },
            { new: true }
        );

        if (!order) return res.status(404).json({ error: "Order not found" });

        res.json({ success: true, order });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.put('/orders/:id/complete', async (req, res) => {
    try {
        // 1. Находим заказ
        const order = await Bookings.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // ❗ Защита от повторного завершения
        if (order.status === 'completed') {
            return res.status(400).json({ error: "Order already completed" });
        }

        // 2. Находим мойку
        const wash = await Wash.findById(order.wash);
        if (!wash) {
            return res.status(404).json({ error: "Wash not found" });
        }

        // 3. Цена услуги
        const price = Number(order.priceType.split(' – ')[1]);
        const commissionPercent = wash.comission; // например 10
        const commissionAmount = price * commissionPercent / 100;

        // 4. ЛОГИКА БАЛАНСА
        if (order.status === 'paid') {
            // 💳 КАРТА
            // клиент заплатил приложению → начисляем мойке её долю
            const forOwner = price - commissionAmount;
            wash.balance += forOwner;
        }

        if (order.status === 'pending') {
            // 💵 НАЛИЧКА
            // клиент заплатил мойке → удерживаем комиссию
            wash.balance -= commissionAmount;
        }

        await wash.save();

        // 5. Завершаем заказ
        order.status = 'completed';
        await order.save();

        // 6. SMS
        try {
            const washOwner = await WashOwner.findOne({ carwash: wash._id });
            const washPhone = washOwner?.phone?.replace(/\D/g, "") || "";
            const washName = wash.name.trim().replace(/\s+/g, "_");

            await sendSMS(
                order.phoneNumber,
                `AvtoToza. Hurmatli mijoz, #${order.order_id} sonli moykangiz tayyor bo'ldi! Moyka: ${washName}, tel: +${washPhone}`
            );

            await sendSMS(
                order.phoneNumber,
                `AvtoToza ilovasi orqali har 10-chi moyka uchun 15% chegirma mavjud! Telegramda @avtotozabot`
            );
        } catch (smsErr) {
            console.error("SMS ERROR:", smsErr);
        }

        res.json({ success: true, order });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// UPDATE carwash
router.put('/update/:user_id', async (req, res) => {
    try {
        const owner = await CarwashOwner.findOne({ user_id: req.params.user_id });
        if (!owner) return res.status(404).json({ error: "Owner not found" });

        const updated = await Carwash.findByIdAndUpdate(
            owner.carwash,
            req.body,
            { new: true }
        );

        res.json({ success: true, carwash: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Accept payout for car wash
router.post("/payout/:washid", async (req, res) => {
    try {
        const { action } = req.body;
        const withdraw = await Payouts.findById(req.params.id).populate("wash");
        if (!withdraw) return res.status(404).json({ error: "Заявка не найдена" });

        if (withdraw.status !== "pending") return res.status(400).json({ error: "Заявка уже обработана" });

        if (action === "approve") {
            // Снимаем деньги с баланса
            withdraw.wash.balance -= withdraw.amount;
            await withdraw.wash.save();
            withdraw.status = "approved";
        } else if (action === "cancel") {
            withdraw.status = "cancelled";
        } else {
            return res.status(400).json({ error: "Неверное действие" });
        }

        await withdraw.save();
        res.json({ success: true, withdraw });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Ошибка при обновлении статуса" });
    }
});
// Create payout for car wash
router.post("/withdraw", async (req, res) => {
    try {
        const { carwash_id, amount, card } = req.body;

        if (!carwash_id || !amount || amount <= 0) {
            return res.status(400).json({ error: "Некорректные данные" });
        }

        // Получаем мойку
        const wash = await Carwash.findById({_id: carwash_id});
        if (!wash) return res.status(404).json({ error: "Мойка не найдена" });

        if (wash.balance < amount) {
            return res.status(400).json({ error: "Недостаточно средств на балансе" });
        }
        const trans_id = Math.floor(100000 + Math.random() * 900000);
        // Создаём запись вывода
        const withdraw = await Payouts.create({
            trans_id: trans_id,
            wash: wash._id,
            amount: amount,
            card: card,
            status: "pending", // сначала pending
        });

        // Снимаем сумму с баланса мойки (можно сделать после одобрения, если нужен ручной процесс)
        wash.balance -= amount;
        await wash.save();

        return res.json({ success: true, withdraw });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Ошибка сервера" });
    }
});

// =============================================
// CREATE ADMIN BOOKING (NO BALANCE ADDED)
// =============================================
router.post("/orders/admin-create", async (req, res) => {
    try {
        const { carwash_id, carNumber, slot, priceType, phoneNumber } = req.body;

        if (!carwash_id || !carNumber || !slot || !priceType) {
            return res.status(400).json({ success: false, error: "Missing fields" });
        }

        // Генерация order_id
        const orderId = Math.floor(100000 + Math.random() * 900000);

        // Создаём бронирование
        const booking = await Bookings.create({
            order_id: orderId,
            wash: carwash_id,
            carNumber,
            slot,
            priceType,
            isAdmin: true,        // 🔥 ключевое поле
            phoneNumber: phoneNumber, // обязательное поле в модели
            fromUser: null,       // так как это создание администратором
            status: "pending"
        });

        return res.json({
            success: true,
            booking
        });

    } catch (err) {
        console.error("ADMIN BOOKING ERROR:", err);
        return res.status(500).json({ success: false, error: "Server error" });
    }
});

// get all withdraws
router.get('/payouts', async (req, res) => {
    try {
        const withdraws = await Payouts.find().populate("wash");
        res.json({ exists: true, withdraws });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Получить историю выплат по мойке
router.get('/withdraws/:carwash_id', async (req, res) => {
    try {
        const withdraws = await Payouts.find({ wash: req.params.carwash_id });
        res.json({ exists: true, withdraws });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
//get carwash
router.get('/get/wash/:id', async (req, res) => {
    try {
        const wash = await Carwash.findOne({carwash_id:  req.params.id});
        if (!wash) return res.status(404).json({ error: 'Wash not found' });
        res.json({exists: true, wash});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Получение владельца и его автомойки
router.get('/get/owner/:user_id', async (req, res) => {
    try {
        const owner = await CarwashOwner.findOne({ user_id: req.params.user_id });
        if (!owner) return res.status(404).json({ error: 'Owner not found' });

        const carwash = await Carwash.findById(owner.carwash);
        if (!carwash) return res.status(404).json({ error: 'Carwash not found' });

        res.json({ exists: true, owner, carwash });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
// list of carwashes
router.get('/washes', async (req, res) => {
    try {
        const carwashes = await Carwash.find();
        if (!carwashes) return res.status(404).json({ error: 'Carwashes not found' });
        res.json({exists: true, carwashes});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// list users
router.get('/users', async (req, res) => {
    try {
        const users = await User.find();
        if (!users) return res.status(404).json({ error: 'users not found' });
        res.json({exists: true, users});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// list owners
router.get('/owners', async (req, res) => {
    try {
        const owners = await CarwashOwner.find().populate("carwash");
        if (!owners) return res.status(404).json({ error: 'Owners not found' });
        res.json({exists: true, owners});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// get all promocodes
router.get('/promocodes', async (req, res) => {
    try {
        const promocodes = await Promo.find();
        if (!promocodes) return res.status(404).json({ error: 'Promo not found' });
        res.json({exists: true, promocodes});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Создание промокода
router.post('/promocode', async (req, res) => {
    const { code, discount, usageLimit } = req.body;

    if (!code || !discount) {
        return res.status(400).json({ error: 'Необходимо указать код и скидку' });
    }

    try {
        // Проверяем, есть ли такой код
        const existing = await Promo.findOne({ promoCode: code.trim() });
        if (existing) {
            return res.status(400).json({ error: 'Такой промокод уже существует' });
        }

        const promo = new Promo({
            promoCode: code.trim(),
            uses: 0,
            maxUses: usageLimit,
            discount: discount,
            status: "active"
        });

        await promo.save();
        res.status(201).json({ success: true, promo });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера при создании промокода' });
    }
});
// Создать владельца
router.post('/owner', async (req, res) => {
    try {
        const { user_id, name, phone, carwashData } = req.body;


        // Проверка на существование владельца
        const existingOwner = await CarwashOwner.findOne({ user_id });
        if (existingOwner) {
            return res.status(400).json({ error: 'Owner already exists' });
        }

        // Создаем мойку
        const carwash = await Carwash.create({
            carwash_id: carwashData.carwash_id || '',
            name: carwashData.name,
            balance: carwashData.balance,
            groupId: carwashData.groupId,
            comission: carwashData.comission,
            description: carwashData.description || '',
            banner: carwashData.banner || '',
            images: carwashData.images || [],
            location: carwashData.location || [],
            address: carwashData.address || '',
            city: carwashData.city || '',
            slots: carwashData.slots || [],
            prices: carwashData.prices || [],
        });

        // Создаем владельца и привязываем к ObjectId мойки
        const owner = await CarwashOwner.create({
            user_id,
            name,
            phone,
            carwash: carwash._id,  // ✔ правильная связь
        });

        res.json({
            success: true,
            message: "Owner and carwash successfully created",
            owner,
            carwash
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});


// Создать автомойку
router.post('/create', async (req, res) => {
    try {
        const { carwash_id, name, phone, location, user_id, city, description, banner, images, address} = req.body;
        let user = await Carwash.findOne({ carwash_id: carwash_id });
        if (!user) {
            user = new Carwash({
                carwash_id: carwash_id,
                name: name,
                phone: phone,
                location: location,
                user_id: user_id,
            });
            await user.save();
            res.json(user);
        } else {
            res.status(700).json({error: 'User already exists'});
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
