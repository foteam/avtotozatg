import express from 'express'
import axios from 'axios'
import base64 from 'base-64'
const router = express.Router()

const PAYCOM_URL = 'https://checkout.test.paycom.uz/api'
const MERCHANT_ID = "694e94145e5e2ee72acc96e9"
const SUBSCRIBE_SECRET = "1uZpCmR23qRHEvMP4TsB1kmu&0ModsHSA97K"
const PAYME_CHECKOUT_API = 'https://checkout.paycom.uz/api'
async function createPaymeReceipt({
                                      amount,
                                      orderId,
                                  }) {
    const auth =
        'Basic ' +
        base64.encode(
            `${MERCHANT_ID}:${SUBSCRIBE_SECRET}`
        )

    const response = await axios.post(
        PAYCOM_URL,
        {
            method: 'receipts.create',
            params: {
                amount: amount * 100, // тийин
                account: {
                    order_id: String(orderId),
                },
                detail: {
                    receipt_type: 0,
                    shipping: {
                        title: "Доставка до ттз-4 28/23",
                        price: 500000
                    }
                }
            },
        },
        {
            headers: {
                Authorization: "100fe486b33784292111b7dc:Rw712wMJspZBczFvrG09?bHkSNxnD4PY0n1C",
                'Content-Type': 'application/json',
            },
        }
    )

    if (!response.data?.result?.receipt) {
        throw new Error(
            JSON.stringify(response.data)
        )
    }

    return response.data.result.receipt
}
router.post('/create-receipt', async (req, res) => {
    try {
        const { amount, orderId } = req.body

        const receipt = await createPaymeReceipt({
            amount,
            orderId,
        })

        res.json({
            success: true,
            receiptId: receipt._id,
            checkoutUrl: `https://payme.uz/checkout/${receipt._id}`,
        })
    } catch (e) {
        console.error(e.message)
        res.status(500).json({
            success: false,
            error: 'Payme receipt error',
        })
    }
})
export default router
