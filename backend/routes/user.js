import express from 'express';
import User from '../models/user_model.js';
import Booking from '../models/booking_model.js';
import Promo from '../models/promocode_model.js'
import Car from '../models/cars_model.js';
const router = express.Router();

// Создать/зарегистрировать по льзователя
router.post('/register', async (req, res) => {
    try {
        const { user_id, name, phone, city, promoCode } = req.body;
        let user = await User.findOne({ user_id: user_id });
        let promocode = await Promo.findOne({promoCode: promoCode})
        console.log(`Promocode: ${promoCode}`)
        if (!user || !phone) {
            if (promoCode != null) {
                promocode.inc('uses', 1)
            }
            user = new User({ user_id, name, phone, city, promoCode, promoCodeDiscount: promocode?.discount || null });
            await user.save();
            res.json(user);
        } else {
            res.status(700).json({error: 'User already exists'});
        }
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message });
    }
});
// 📋 Получить список автомобилей пользователя (Гараж)
router.get('/garage/cars/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;

        // 1️⃣ Проверяем пользователя
        const user = await User.findOne({ user_id });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }

        // 2️⃣ Получаем автомобили
        const cars = await Car.find({ userId: user._id })
            .sort({ isPrimary: -1, createdAt: -1 }) // основной сверху
            .lean();

        res.json({
            success: true,
            count: cars.length,
            cars
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});
// 🚙 Получить данные автомобиля по ID
router.get('/garage/car/:carId', async (req, res) => {
    try {
        const { carId } = req.params;

        // 1️⃣ Находим автомобиль
        const car = await Car.findById(carId).lean();

        if (!car) {
            return res.status(404).json({
                success: false,
                message: 'Автомобиль не найден'
            });
        }

        res.json({
            success: true,
            car
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// ➕ Добавить автомобиль в гараж
router.post('/garage/car/add', async (req, res) => {
    try {
        const {
            user_id,
            brand,
            model,
            year,
            color,
            plateNumber,
            bodyType,
            fuelType,
            image,
            isPrimary
        } = req.body;

        if (!user_id || !brand || !model || !plateNumber) {
            return res.status(400).json({
                success: false,
                message: 'Не хватает обязательных полей'
            });
        }

        // 1️⃣ Проверяем пользователя
        const user = await User.findOne({ user_id });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }

        // 2️⃣ Нормализуем номер (без пробелов)
        const normalizedPlate = plateNumber.replace(/\s+/g, '').toUpperCase();

        // 3️⃣ Проверка: есть ли уже такое авто у пользователя
        const exists = await Car.findOne({
            userId: user._id,
            plateNumber: normalizedPlate
        });

        if (exists) {
            return res.status(409).json({
                success: false,
                message: 'Автомобиль с таким номером уже добавлен'
            });
        }

        // 4️⃣ Если авто делаем основным — снимаем флаг с других
        if (isPrimary === true) {
            await Car.updateMany(
                { userId: user._id },
                { $set: { isPrimary: false } }
            );
        }

        // 5️⃣ Создаём автомобиль
        const car = await Car.create({
            userId: user._id,
            brand,
            model,
            year,
            color,
            plateNumber: normalizedPlate,
            bodyType,
            fuelType,
            image: image || null,
            isPrimary: !!isPrimary,
            cleanliness: 100,
            lastWashAt: null
        });

        res.json({
            success: true,
            car
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// Добавление промокода к пользователю по пятницам и по 10 мойке
router.post('/promo/set/:user', async (req, res) => {
    const { promoCode } = req.body;
    if (!promoCode) return res.status(400).json({ valid: false, error: "Промокод не указан" });

    try {
        const user = await User.findOne({ user_id: req.params.user });
        const promo = await Promo.findOne({ promoCode: promoCode.trim() });
        if (!user) return res.json({valid: false})
        if (!promo) return res.json({ valid: false });

        // Проверка лимита использования и срока действия
        if ((promo.uses >= promo.maxUses)) {
            await Promo.deleteOne({ promoCode: promoCode.trim() });
            return res.json({ valid: false });
        }

        // Всё ок, возвращаем скидку
        user.promoCode = promoCode;
        user.promoCodeDiscount = promo.discount;
        await user.save();
        res.json({ valid: true, message: "GOOD" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ valid: false, error: err.message });
    }
});
// Проверка промокода
router.post('/promo/check', async (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ valid: false, error: "Промокод не указан" });

    try {
        const promo = await Promo.findOne({ promoCode: code.trim() });
        if (!promo) return res.json({ valid: false });

        // Проверка лимита использования и срока действия
        if ((promo.uses >= promo.maxUses)) {
            await Promo.deleteOne({ promoCode: code.trim() });
            return res.json({ valid: false });
        }

        // Всё ок, возвращаем скидку
        res.json({ valid: true, discount: promo.discount });
    } catch (err) {
        console.error(err);
        res.status(500).json({ valid: false, error: err.message });
    }
});
// Получить пользователя
router.get('/check/:user_id', async (req, res) => {
    console.log("Checking and sending user data for: " + req.params.user_id);
    try {
        const user = await User.findOne({ user_id: req.params.user_id });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({exists: true, user});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Получить пользователя
router.get('/phone/check/:phone', async (req, res) => {
    console.log("Checking and sending user data for: " + req.params.phone);
    try {
        const user = await User.findOne({ phone: req.params.phone });
        if (!user) {
            console.log("User not found");
            res.json({ exists: false })
            return
        }
        res.json({exists: true, user});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Получить bookings пользователя
router.get('/bookings/get/:user_id', async (req, res) => {
    console.log("Checking and sending user bookings data for: " + req.params.user_id);
    try {
        const user = await User.findOne({ user_id: req.params.user_id });
        const bookings = await Booking.find({fromUser: user.user_id})
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (!bookings) return res.status(404).json({ error: 'Bookings not found' });
        res.json({exists: true, bookings: bookings});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Заблокировать/разблокировать пользователя
router.patch('block/:user_id', async (req, res) => {
    try {
        const user = await User.findOneAndUpdate(
            { telegramId: req.params.telegramId },
            { blocked: req.body.blocked },
            { new: true }
        );
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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

export default router;
