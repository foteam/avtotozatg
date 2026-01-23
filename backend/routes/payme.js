import express from 'express'
/*import base64 from 'base-64'*/
import BookingModel from '../models/booking_model.js';
import PaymeTransaction from "../models/paymeTransactions_model.js";
import User from "../models/user_model.js";
import Carwash from "../models/carwash_model.js";
import WashOwner from "../models/carwash_owner_model.js";

import {sendSMS} from "../eskiz.js";
const router = express.Router()

import config from "../config.json" with {type: "json"};

const MERCHANT_ID = "694e7e29ccaf6835002a6dda"
const SECRET_KEY = "nVwfs#hjVWxs8R1UA1ex@GmkY4BJPW3QAD7z"

export default (bot) => {
    /* ---------- AUTH ---------- */
/*    function authorize(req) {
        const auth = req.headers.authorization;
        if (!auth || !auth.startsWith('Basic ')) return false;

        const decoded = Buffer
            .from(auth.split(' ')[1], 'base64')
            .toString();

        return decoded === `Paycom:${MERCHANT_ID}:${SECRET_KEY}`;
    }*/

    function generatePaymeLink({
                                   merchantId,
                                   orderId,
                                   amount,        // в сумах
                                   callbackUrl,   // опционально
                               }) {
        if (!merchantId) throw new Error('merchantId is required');
        if (!orderId) throw new Error('orderId is required');
        if (!amount || amount <= 0) throw new Error('amount must be > 0');

        const TIYIN = 100;

        let payload =
            `m=${merchantId}` +
            `;ac.order_id=${encodeURIComponent(orderId)}` +
            `;a=${Math.round(amount * TIYIN)}`;

        if (callbackUrl) {
            payload += `;c=${encodeURIComponent(callbackUrl)}`;
        }

        const base64 = Buffer.from(payload).toString('base64');

        return `https://checkout.paycom.uz/${base64}`;
    }

// ** CREATE LINK
    router.post('/create-link', async (req, res) => {
        try {
            const {amount, orderId} = req.body;
            const link = generatePaymeLink({
                merchantId: MERCHANT_ID,
                amount: amount,
                orderId: orderId,
            })
            res.json({checkoutUrl: link})
        } catch (error) {
            console.log(error);
            res.status(400).send({error: error.message});
        }
    })
    /* ---------- ENTRY ---------- */
    router.post('/', async (req, res) => {
        /*if (!authorize(req)) {
            return res.json({
                jsonrpc: '2.0',
                error: { code: -32504, message: 'Access denied' },
                id: null,
            });
        }*/

        const { method, params, id } = req.body;

        try {
            switch (method) {
                case 'CheckPerformTransaction':
                    return res.json(checkPerform(params, id));

                case 'CreateTransaction':
                    return res.json(await createTransaction(params, id));

                case 'PerformTransaction':
                    return res.json(await performTransaction(params, id));

                case 'CheckTransaction':
                    return res.json(await checkTransaction(params, id));

                case 'CancelTransaction':
                    return res.json(await cancelTransaction(params, id));

                default:
                    return res.json({
                        jsonrpc: '2.0',
                        error: { code: -32601, message: 'Method not found' },
                        id,
                    });
            }
        } catch (e) {
            console.error(e);
            return res.json({
                jsonrpc: '2.0',
                error: { code: -32603, message: 'Internal error' },
                id,
            });
        }
    });

    /* ---------- METHODS ---------- */

    function checkPerform(params, id) {
        if (!params.account?.order_id) {
            return {
                jsonrpc: '2.0',
                error: { code: -31001, message: 'Invalid account' },
                id,
            };
        }

        return {
            jsonrpc: '2.0',
            result: { allow: true },
            id,
        };
    }

    async function createTransaction(params, id) {
        const { id: paymeId, time, amount, account } = params;

        let trx = await PaymeTransaction.findOne({ transactionId: paymeId });

        if (trx) {
            return { jsonrpc: '2.0', result: trxResponse(trx), id };
        }

        trx = await PaymeTransaction.create({
            transactionId: paymeId,
            orderId: account.order_id,
            amount,
            state: 1,
            create_time: time,
        });

        return {
            jsonrpc: '2.0',
            result: trxResponse(trx),
            id,
        };
    }
    async function onPaymePaymentSuccess(trx) {
        // trx — PaymeTransaction из БД

        const booking = await BookingModel.findOne({
            order_id: trx.orderId, // order_id ты туда кладёшь
        });

        if (!booking) {
            throw new Error('Booking not found');
        }

        // 1️⃣ Получаем пользователя и мойку
        const carwash = await Carwash.findById(booking.wash);
        const washOwner = await WashOwner.findOne({ carwash: carwash });

        // если уже оплачено — ничего не делаем (idempotency)
        if (booking.status === 'paid' || booking.status === "pending" || booking.status === "completed" || booking.status === "canceled") return;

        booking.status = 'paid';
        await booking.save();

        // --- SEND PUSH TO OWNER ----
        if (washOwner.tokens.length > 0) {
            for (let i = 0 ;i < washOwner.tokens.length; i++) {
                await fetch('https://exp.host/--/api/v2/push/send', {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Accept-Encoding': 'gzip, deflate',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        to: washOwner.tokens[i],
                        sound: 'default',
                        title: 'Новая бронь! '+booking.carNumber,
                        body: `${booking.carNumber} - новая бронь, нажмите чтобы открыть`,
                        data: {
                            screen: 'bookings', // 👈 ВАЖНО
                        },
                    }),
                });
            }
        }

        // ---------- SEND TO TG INFO GROUP ----------
        await bot.telegram.sendMessage(config.ADMIN_GROUP, `FROM APP SUCCESS ID #${booking.order_id}\n\nSumma: *${Number(booking.priceType.split(" – ")[1]).toLocaleString()} so'm*\n\nNaqd pul bilan to'lov!`, {parse_mode: "Markdown"})
        await bot.telegram.sendMessage(
            carwash.groupId,
            `🚘 *YANGI BUYURTMA* #${booking.order_id}\n\nAvtomobil raqami: *${booking.carNumber}*\nTel (mijoz): ${booking.phoneNumber}\nTarif: *${booking.priceType.split("–")[0]}*\nSumma: *${Number(booking.priceType.split(" – ")[1]).toLocaleString()} so'm*\n\nKelish vaqti: *${booking.slot}*`,
        );

        // create new order booking to car wash admin app
        await sendSMS(washOwner.phone, `AvtoToza. Sizning moykangizda yangi buyurtma! Avtomobil raqami: ${booking.carNumber} , tel: ${booking.phoneNumber} , vaqt: ${booking.slot}`);
        // -------
        console.log('✅ Payme payment success:', booking._id);
    }
    async function performTransaction(params, id) {
        const trx = await PaymeTransaction.findOne({
            transactionId: params.id,
        });

        if (!trx) {
            return {
                jsonrpc: '2.0',
                error: { code: -31003, message: 'Transaction not found' },
                id,
            };
        }

        if (trx.state === 2) {
            return { jsonrpc: '2.0', result: trxResponse(trx), id };
        }

        trx.state = 2;
        trx.perform_time = Date.now();
        await trx.save();

        // 2️⃣ ВАЖНО: бизнес-логика при успешной оплате
        await onPaymePaymentSuccess(trx);

        return {
            jsonrpc: '2.0',
            result: trxResponse(trx),
            id,
        };
    }

    async function checkTransaction(params, id) {
        const trx = await PaymeTransaction.findOne({
            transactionId: params.id,
        });

        if (!trx) {
            return {
                jsonrpc: '2.0',
                error: { code: -31003, message: 'Transaction not found' },
                id,
            };
        }

        return {
            jsonrpc: '2.0',
            result: trxResponse(trx),
            id,
        };
    }

    async function cancelTransaction(params, id) {
        const trx = await PaymeTransaction.findOne({
            transactionId: params.id,
        });

        if (!trx) {
            return {
                jsonrpc: '2.0',
                error: { code: -31003, message: 'Transaction not found' },
                id,
            };
        }

        trx.state = -1;
        trx.cancel_time = Date.now();
        trx.reason = params.reason;
        await trx.save();

        return {
            jsonrpc: '2.0',
            result: trxResponse(trx),
            id,
        };
    }

    /* ---------- RESPONSE FORMAT ---------- */
    function trxResponse(trx) {
        return {
            transaction: trx.transactionId,
            state: trx.state,
            create_time: trx.create_time,
            perform_time: trx.perform_time || 0,
            cancel_time: trx.cancel_time || 0,
            reason: trx.reason || null,
        };
    }
    return router;
}
