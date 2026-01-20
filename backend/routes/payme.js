import express from 'express'
import base64 from 'base-64'
import BookingModel from '../models/booking_model.js';
import PaymeTransaction from "../models/paymeTransactions_model.js";
const router = express.Router()

const MERCHANT_ID = "694e7e29ccaf6835002a6dda"
const SECRET_KEY = "nVwfs#hjVWxs8R1UA1ex@GmkY4BJPW3QAD7z"

/* ---------- AUTH ---------- */
function authorize(req) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Basic ')) return false;

    const decoded = Buffer
        .from(auth.split(' ')[1], 'base64')
        .toString();

    return decoded === `Paycom:${MERCHANT_ID}:${SECRET_KEY}`;
}

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

export default router;
