import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import {Telegraf} from 'telegraf';

import carWashRoutes from './routes/carWash.js';
import bookingRoutes from './routes/booking.js';
import reviewRoutes from './routes/review.js';
import userRoutes from './routes/user.js';
import carwashAdminRoutes from './routes/carwash_admin.js';
import authRoutes from "./routes/auth.js";

import User from './models/user_model.js';
import Booking from './models/booking_model.js';
import Wash from './models/carwash_model.js'
import WashOwner from './models/carwash_owner_model.js';

import config from "./config.json" with {type: "json"};

import {sendSMS} from './eskiz.js'

const app = express();
app.use(cors());
app.use(express.json());

const PORT = config.PORT|| 5000;

// Подключение к MongoDB
mongoose.connect(config.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

const bot = new Telegraf(config.BOT_API)
let regions = ["Namangan"]
let webappURL = "https://114-29-236-86.cloud-xip.com"

let broadcastState = {};
let ADMIN_ID = 6727732536;

async function startBroadcast(ctx) {
    broadcastState[ctx.from.id] = { step: "wait_message" };
    await ctx.reply("✍️ Yubormoqchi bo'lgan xabaringizni kiriting.");
}

async function catchBroadcastMessage(ctx) {
    const state = broadcastState[ctx.from.id];
    if (!state || state.step !== "wait_message") return;

    let content = {};

    if (ctx.message.photo) {
        content = {
            type: "photo",
            file_id: ctx.message.photo.at(-1).file_id,
            caption: ctx.message.caption || ""
        };
    } else if (ctx.message.video) {
        content = {
            type: "video",
            file_id: ctx.message.video.file_id,
            caption: ctx.message.caption || ""
        };
    } else if (ctx.message.text) {
        content = {
            type: "text",
            text: ctx.message.text
        };
    }

    broadcastState[ctx.from.id] = {
        step: "confirm",
        content
    };

    await ctx.reply(
        "📤 Yuborilsinmi?",
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "✅ Ha", callback_data: "broadcast_yes" }],
                    [{ text: "❌ Yo‘q", callback_data: "broadcast_no" }]
                ]
            }
        }
    );
}

async function cancelBroadcast(ctx) {
    delete broadcastState[ctx.from.id];
    await ctx.editMessageText("❌ Bekor qilindi.");
}

async function runBroadcast(ctx, bot) {
    const state = broadcastState[ctx.from.id];
    if (!state) return;

    delete broadcastState[ctx.from.id];

    await ctx.editMessageText("📣 Yuborilmoqda...");

    const users = await User.find({}, { user_id: 1 }).lean();

    for (const u of users) {
        try {
            if (state.content.type === "text") {
                await bot.telegram.sendMessage(u.user_id, state.content.text, {parse_mode: "Markdown"});
            } else if (state.content.type === "photo") {
                await bot.telegram.sendPhoto(u.user_id, state.content.file_id, {
                    caption: state.content.caption,
                    parse_mode: "Markdown"
                });
            } else if (state.content.type === "video") {
                await bot.telegram.sendVideo(u.user_id, state.content.file_id, {
                    caption: state.content.caption,
                    parse_mode: "Markdown"
                });
            }
        } catch {}

        await new Promise((r) => setTimeout(r, 40));
    }

    await ctx.reply("🎉 Rassilka tugadi!");
}

bot.command("start", async (ctx) => {
    const user_id = ctx.message.from.id;
    const user = await User.findOne({user_id: user_id});
    if (!user) {
        let startText = `Salom *${ctx.message.from.first_name}!*\n\nSiz *AvtoToza* avtomobillarga yuvish xizmatini ko'rsatish servisining rasmiy botidasiz! Iltimos botimizdan to'liq foydalanish uchun pastorqdagi tugmacha ustiga bosing!`;
        ctx.replyWithMarkdown(startText, {reply_markup: {inline_keyboard: [[{text: "Boshlash", web_app: {url: webappURL}}]]}});
    } else {
        let defaultText = `Salom *${user.name}*! Qachon avtomobilingizni yuvamiz?`
        ctx.replyWithMarkdown(defaultText, {reply_markup: {inline_keyboard: [[{text: "Boshlash", web_app: {url: webappURL}}]]}});
    }
})
bot.on('pre_checkout_query', async (ctx) => {
    try {
        await ctx.answerPreCheckoutQuery(true); // ✅ подтверждаем, что всё ок
    } catch (err) {
        console.error("Ошибка подтверждения pre_checkout:", err);
    }
});
bot.command("get", async (ctx) => {
    const chat = ctx.chat;
    if (chat.type === 'group' || chat.type === 'supergroup') {
        ctx.replyWithMarkdown("Gruppaning ID manzili: `" + chat.id + "` buni adminga ko'rsating!");
    }
})

bot.command("broadcast", async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    await startBroadcast(ctx);
});

bot.action("broadcast_yes", async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    await runBroadcast(ctx, bot);
});

bot.action("broadcast_no", async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    await cancelBroadcast(ctx);
});
// Слушаем новые сообщения
bot.on('message', async (ctx) => {
    const chat = ctx.chat;

    // Проверяем, что это группа или супергруппа
    if (ctx.message.text === "GET" && chat.type === 'group' || chat.type === 'supergroup') {
        ctx.replyWithMarkdown("Gruppaning ID manzili: `" + chat.id + "` buni adminga ko'rsating!");
    }

    const payment = ctx.message.successful_payment;

    if (payment) {
        let order_id = payment.invoice_payload;
        var booking = await Booking.findOne({ order_id: order_id });

        if (!booking) return;

        var carwash = await Wash.findOne({ _id: booking.wash });
        var washOwner = await WashOwner.findOne({ carwash: booking.wash });

        // --------- ВРЕМЯ СЛОТА ПРОВЕРКА ----------
        const now = new Date(
            new Date().toLocaleString("en-US", { timeZone: "Asia/Tashkent" })
        );

        const [h, m] = booking.slot.split(":").map(Number);

        const slotDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            h,
            m
        );

        if (slotDate.getTime() <= now.getTime()) {
            // ВРЕМЯ УЖЕ ПРОШЛО — СЧИТАЕМ БРОНЬ НЕДЕЙСТВИТЕЛЬНОЙ
            await ctx.reply(`⚠️ Mijoz #${booking.order_id} to'lovni vaqt o'tgandan keyin amalga oshirdi.\nBuyurtma avtomatik tarzda bekor qilindi, pullaringizni qaytarib olish uchun @avtotoza_support ga to'liq ma'lumot bilan murojaat qiling!`
            );

            await bot.telegram.sendMessage(config.ADMIN_GROUP, `⚠️ ID #${booking.order_id}\n\nSumma: *${Number(booking.priceType.split(" – ")[1]).toLocaleString()} so'm*\n\nTo'lov bekor qilindi, mijoz bron vaqti otib ketgandan so'ng to'lov qildi!`, {parse_mode: "Markdown"})

            // Удалить бронь
            await Booking.deleteOne({ order_id });

            return;
        }

        // ---------- ЕСЛИ ВРЕМЯ АКТУАЛЬНО ----------
        await bot.telegram.sendMessage(config.ADMIN_GROUP, `SUCCESS ID #${booking.order_id}\n\nSumma: *${Number(booking.priceType.split(" – ")[1]).toLocaleString()} so'm*\n\nTo'lov qabul qilindi!`, {parse_mode: "Markdown"})

        await ctx.reply(
            `*To'lovingiz qabul qilindi!*\n\nAvtomoyka: ${carwash.name}\nManzil: ${carwash.address}\nTel: ${washOwner.phone}`,
            { parse_mode: "Markdown" }
        );
        await sendSMS(booking.phoneNumber, `AvtoToza. To'lovingiz muvaffaqiyatli amalga oshirildi! Avtomoyka: ${carwash.name} , tel: ${washOwner.phone}`);
        await sendSMS(washOwner.phone, `AvtoToza. Sizning moykangizda yangi buyurtma! Avtomobil raqami: ${booking.carNumber} , tel: ${booking.phoneNumber} , vaqt: ${booking.slot}`);

        await ctx.replyWithLocation(carwash.location[0], carwash.location[1]);
        await booking.set("status", "paid")

        await bot.telegram.sendMessage(
            carwash.groupId,
            `🚘 *YANGI BUYURTMA* #${booking.order_id}\n\nAvtomobil raqami: *${booking.carNumber}*\nTel (mijoz): ${booking.phoneNumber}\nTarif: *${booking.priceType.split("–")[0]}*\nSumma: *${Number(booking.priceType.split(" – ")[1]).toLocaleString()} so'm*\n\nKelish vaqti (bugun): *${booking.slot}*`,
            {
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "Bajarildi", callback_data: "completed:" + booking.order_id }]
                    ]
                }
            }
        );
    }

    // 2. Если админ сейчас пишет сообщение для рассылки
    if (ctx.from.id === ADMIN_ID && broadcastState[ADMIN_ID]?.step === "wait_message") {
        await catchBroadcastMessage(ctx);
        return;
    }

});
bot.action(/^completed:(.+)$/, async (ctx) => {
    const order_id = ctx.match[1];
    const order = await Booking.findOne({order_id: order_id});
    if (!order) {return}
    if (order.status === "completed") {return ctx.replyWithMarkdown("Ushbu buyurtma bajarilgan!");}
    const user = await User.findOne({user_id: order.fromUser});
    const wash = await Wash.findOne({_id: order.wash});
    const washOwner = await WashOwner.findOne({carwash: order.wash})
    await ctx.answerCbQuery();

    const oldText = ctx.update.callback_query.message.text;

    if (order.status === "paid") {
        // inc owner balance
        let price = Number(order.priceType.split(" – ")[1]);
        let net = price - (price * wash.comission / 100)
        await wash.inc("balance", net)
    }

    // Обновляем статус заказа
    order.status = "completed";  // или "done", в зависимости от схемы
    await order.save();

    if (!order.phoneNumber.startsWith("admin")) {
        const washPhone = washOwner.phone.replace(/\D/g, "");
        const washName = wash.name
            .trim()
            .replace(/\s+/g, "_");
        await sendSMS(order.phoneNumber, `AvtoToza. Hurmatli mijoz, #${order_id} sonli moykangiz tayyor bo'ldi! Olib ketishni unutmang! Moyka: ${washName}, tel: +${washPhone}`)
    }
    await ctx.editMessageText(
        oldText + `\n\n🔔 O'zgarish: #${order_id} raqamli buyurtma bajarildi va avtomobil olib ketishga tayyor!`
    , {reply_markup: {inline_keyboard: []}, parse_mode: "Markdown"});
    await bot.telegram.sendMessage(user.user_id, `#${order_id} raqamli buyurtmangiz bajarildi va olib ketishga tayyor!\n\n*Avtomobil raqami:* ${order.carNumber}\n*Berilgan vaqt (bugun):* ${order.slot}\n*Avtomoyka:* ${wash.name}\n*Manzil:* ${wash.address}\n*Tel:* ${washOwner.phone}`,
        {parse_mode: "Markdown"})
});

bot.action(/^cancel:(.+)$/, async (ctx) => {
    const order_id = ctx.match[1];
    const order = await Booking.findOne({order_id: order_id});
    if (!order) {return}
    if (order.status === "completed") {return ctx.replyWithMarkdown("Ushbu buyurtma bajarilgan!");}
    const user = await User.findOne({user_id: order.fromUser});
    const wash = await Wash.findOne({_id: order.wash});
    const washOwner = await WashOwner.findOne({carwash: order.wash})
    await ctx.answerCbQuery();

    const oldText = ctx.update.callback_query.message.text;

    // Обновляем статус заказа
    order.status = "canceled";  // или "done", в зависимости от схемы
    await order.save();

    await ctx.editMessageText(
        oldText + `\n\n🔔 O'zgarish: #${order_id} raqamli buyurtma bekor qilindi!`
        , {reply_markup: {inline_keyboard: []}, parse_mode: "Markdown"});
});

bot.launch();

app.get("/test", (req, res) => {
    res.json({test: "SUCCESS"})
})

// Роуты
app.use('/api/carwash', carWashRoutes);
app.use("/api/auth", authRoutes);
app.use('/api/booking', bookingRoutes(bot));
app.use('/api/review', reviewRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin/carwash', carwashAdminRoutes); // CARWASH AND OWNERS

app.get('/', (req, res) => res.send('Server is running...'));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

Wash.prototype.inc = function(field, value = 1) {
    this[field] += value;
    return this.save();
};

Wash.prototype.dec = function(field, value = 1) {
    this[field] -= value;
    return this.save();
};

Wash.prototype.set = function(field, value) {
    this[field] = value;
    return this.save();
};

Booking.prototype.inc = function(field, value = 1) {
    this[field] += value;
    return this.save();
};

Booking.prototype.dec = function(field, value = 1) {
    this[field] -= value;
    return this.save();
};

Booking.prototype.set = function(field, value) {
    this[field] = value;
    return this.save();
};