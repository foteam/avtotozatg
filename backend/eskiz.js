import axios from "axios";

let token = null;

async function getToken() {
    if (token) return token;

    const res = await axios.post(
        "https://notify.eskiz.uz/api/auth/login",
        {
            email: "alqasos@icloud.com",
            password: "UD0AtMIrTB02MHgeLHcYpGCJ6BhnsQZxVP3WI8xu"
        }
    );

    token = res.data.data.token;
    return token;
}

export async function sendSMS(phone, text) {
    const t = await getToken();

    return axios.post(
        "https://notify.eskiz.uz/api/message/sms/send",
        {
            mobile_phone: phone,
            message: text,
            from: "4546"
        },
        {
            headers: { Authorization: `Bearer ${t}` }
        }
    );
}
