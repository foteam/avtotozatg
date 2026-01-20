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

let link = generatePaymeLink({merchantId: "694e7e29ccaf6835002a6dda", amount: 10000, orderId: "49875"})
console.log(link)