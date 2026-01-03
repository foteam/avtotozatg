import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import axios from 'axios';
import Logo from '../assets/logo.png';
import WebApp from "@twa-dev/sdk";
import { useMutation } from '@tanstack/react-query';
import {motion} from "framer-motion";

/*import Eruda from "eruda";
Eruda.init();*/

const fade = (delay = 0) => ({
    initial: {
        opacity: 0,
        y: 14,
        scale: 0.96
    },
    animate: {
        opacity: 1,
        y: 0,
        scale: 1
    },
    transition: {
        delay,
        duration: 0.5,
        ease: "easeOut",
        scale: {
            type: "spring",
            stiffness: 160,
            damping: 18
        }
    }
});


export default function Register() {
    const navigate = useNavigate();
    const [user_id, setUserId] = useState(null);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [city, setCity] = useState('Namangan');
    const [promoCode, setPromoCode] = useState('');
    const [promoValid, setPromoValid] = useState(null); // null = не проверен, true = валидный, false = невалидный
    const [promoDiscount, setPromoDiscount] = useState(0);
    const [message, setMessage] = useState('');

    const cities = ['Namangan'];

    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otp, setOtp] = useState("");
    const [otpLoading, setOtpLoading] = useState(false);

    const [otpError, setOtpError] = useState("");
    const [smsSending, setSmsSending] = useState(false);

    // Получаем Telegram user_id
    useEffect(() => {
        WebApp.ready();
        const initDataUnsafe = WebApp.initDataUnsafe;
        setUserId(initDataUnsafe.user.id);
    }, []);

    useEffect(() => {
        if (!promoCode.trim()) {
            setPromoValid(null);
            setPromoDiscount(0);
            return;
        }

        const timeout = setTimeout(async () => {
            try {
                const res = await axios.post('https://114-29-236-86.cloud-xip.com/api/user/promo/check', {
                    code: promoCode.trim()
                });
                if (res.data.valid) {
                    setPromoValid(true);
                    setPromoDiscount(res.data.discount);
                } else {
                    setPromoValid(false);
                    setPromoDiscount(0);
                }
            } catch (err) {
                console.error(err);
                setPromoValid(false);
                setPromoDiscount(0);
            }
        }, 500);

        return () => clearTimeout(timeout);
    }, [promoCode]);

    const confirmOtpAndRegister = async () => {
        if (!otp) {
            setOtpError("Kodni kiriting");
            return;
        }

        try {
            setOtpLoading(true);
            setOtpError("");

            await axios.post(
                "https://114-29-236-86.cloud-xip.com/api/auth/verify-code",
                { phone, code: otp }
            );

            const promoToSend = promoCode.trim() && promoValid ? promoCode.trim() : null;

            registerMutation.mutate({
                name,
                phone,
                user_id,
                city,
                promoCode: promoToSend
            });

            setShowOtpModal(false);

        } catch (e) {
            setOtpError("Kod noto‘g‘ri yoki eskirgan");
        } finally {
            setOtpLoading(false);
        }
    };
    const sendOtpInBackground = async () => {
        try {
            setSmsSending(true);

            await axios.post(
                "https://114-29-236-86.cloud-xip.com/api/auth/send-code",
                { phone }
            );

        } catch (e) {
            setOtpError("SMS yuborilmadi. Qayta urinib ko‘ring");
        } finally {
            setSmsSending(false);
        }
    };

    const handleRegister = () => {
        if (!name || !phone || !city) {
            setMessage('Iltimos, barcha maydonlarni to‘ldiring!');
            return;
        }

        // UI сначала
        setShowOtpModal(true);
        setOtp("");
        setOtpError("");
        setMessage("");

        // SMS отправляем в фоне
        sendOtpInBackground();
    };

    // Мутация регистрации
    const registerMutation = useMutation({
        mutationFn: async ({ name, phone, user_id, city, promoCode }) => {
            const res = await axios.post(
                'https://114-29-236-86.cloud-xip.com/api/user/register',
                { name, phone, user_id, city, promoCode }
            );
            return res.data;
        },
        onSuccess: (data) => {
            setMessage(`Salom, ${data.name}! Ro‘yxatdan o‘tish muvaffaqiyatli.`)
            navigate('/');
        },
        onError: (err) => {
            console.error(err);
            if (err.response?.status === 700) {
                setMessage("Ushbu foydalanuvchi ro'yxatdan otgan!");
            } else {
                setMessage("Xatolik yuz berdi. Qayta urinib ko‘ring.");
            }
        }
    });
    const formatUzPhone = (value) => {
        let digits = value.replace(/\D/g, ""); // только цифры

        // если начали не с 998 — принудительно добавляем
        if (!digits.startsWith("998")) {
            digits = "998" + digits;
        }

        digits = digits.slice(0, 12);

        const part1 = digits.slice(0, 3); // 998
        const part2 = digits.slice(3, 5); // XX
        const part3 = digits.slice(5, 8); // XXX
        const part4 = digits.slice(8, 10); // XX
        const part5 = digits.slice(10, 12); // XX

        let result = "+" + part1;

        if (part2) result += " " + part2;
        if (part3) result += " " + part3;
        if (part4) result += " " + part4;
        if (part5) result += " " + part5;

        return result;
    };

/*    const handleRegister = () => {
        if (!name || !phone || !city) {
            setMessage('Iltimos, barcha maydonlarni to‘ldiring!');
            return;
        }

        // Отправляем промокод только если поле не пустое и валидное
        const promoToSend = promoCode.trim() && promoValid ? promoCode.trim() : null;

        registerMutation.mutate({ name, phone, user_id, city, promoCode: promoToSend });
    };*/

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#EEEEEE] to-[#EEEEEE] px-4">

            <motion.div
                className="will-change-transform w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 space-y-6 border border-gray-100"
                {...fade(0.05)}
            >

                {/* Логотип */}
                <motion.div className=" will-change-transform flex justify-center" {...fade(0.1)}>
                    <img src={Logo} alt="AvtoToza" className="h-20 object-contain" />
                </motion.div>

                {/* Заголовок */}
                <motion.h2
                    className="will-change-transform text-center text-3xl font-extrabold text-[#4D77FF] tracking-wide"
                    {...fade(0.07)}
                >
                    Ro'yxatdan o'tish
                </motion.h2>

                {/* Поля */}
                <motion.div className="space-y-4" {...fade(0.2)}>

                    <motion.input
                        type="text"
                        placeholder="Ismingiz"
                        className="will-change-transform w-full p-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4D77FF] text-gray-700 shadow-sm placeholder-gray-400 transition duration-200"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        {...fade(0.10)}
                    />

                    <motion.input
                        type="tel"
                        placeholder="+998 90 123 12 34 (tel)"
                        className="will-change-transform w-full p-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4D77FF] text-gray-700 shadow-sm placeholder-gray-400 transition duration-200"
                        value={phone}
                        onChange={(e) => setPhone(formatUzPhone(e.target.value))}
                        {...fade(0.11)}
                    />

                    <motion.select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="will-change-transform w-full p-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4D77FF] text-gray-700 shadow-sm transition duration-200"
                        {...fade(0.12)}
                    >
                        {cities.map((c, idx) => (
                            <option key={idx} value={c}>{c}</option>
                        ))}
                    </motion.select>

                    <motion.input
                        type="text"
                        placeholder="Promokod (agar bo'lsa)"
                        className={`w-full p-4 rounded-xl border ${
                            promoValid === true
                                ? "border-green-500"
                                : promoValid === false
                                    ? "border-red-500"
                                    : "border-gray-300"
                        } focus:outline-none focus:ring-2 focus:ring-[#4D77FF] text-gray-700 shadow-sm transition duration-200 will-change-transform`}
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        {...fade(0.14)}
                    />

                    {promoValid === true && (
                        <motion.p className="text-green-600 text-sm will-change-transform" {...fade(0.43)}>
                            Tabriklaymiz! Sizning promokod chegirmangiz: {promoDiscount}%
                        </motion.p>
                    )}

                    {promoValid === false && (
                        <motion.p className="text-red-600 text-sm will-change-transform" {...fade(0.43)}>
                            Ushbu promokod yo'q yoki ishlatib bo'lingan!
                        </motion.p>
                    )}
                </motion.div>

                {/* Кнопка */}
                <motion.button
                    onClick={handleRegister}
                    disabled={registerMutation.isLoading || !city}
                    className="will-change-transform w-full py-4 bg-gradient-to-r from-[#4D77FF] to-[#335EEA] text-white font-semibold rounded-xl shadow-lg hover:scale-105 hover:shadow-xl transition transform disabled:opacity-50 disabled:cursor-not-allowed"
                    {...fade(0.15)}
                >
                    {registerMutation.isLoading ? 'Yuklanmoqda...' : "Ro'yxatdan o'tish"}
                </motion.button>

                {showOtpModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/10">
                        <motion.div
                            className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                        >
                            <h3 className="text-xl font-bold text-center text-[#4D77FF]">
                                Telefonni tasdiqlash
                            </h3>

                            <p className="text-sm text-gray-500 text-center mt-2">
                                {smsSending
                                    ? "Tasdiqlash kodi yuborilmoqda..."
                                    : <>Tasdiqlash kodi yuborildi:<br /><b>{phone}</b></>
                                }
                            </p>

                            <input
                                type="text"
                                placeholder="Kodni kiriting"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full mt-4 p-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#4D77FF]"
                            />
                            {otpError && (
                                <p className="mt-2 text-sm text-red-500 text-center">
                                    {otpError}
                                </p>
                            )}

                            <button
                                onClick={confirmOtpAndRegister}
                                disabled={otpLoading}
                                className="w-full mt-4 py-3 bg-gradient-to-r from-[#4D77FF] to-[#335EEA] text-white font-semibold rounded-xl"
                            >
                                {otpLoading ? "Tekshirilmoqda..." : "Tasdiqlash"}
                            </button>

                            <button
                                onClick={() => setShowOtpModal(false)}
                                className="w-full mt-3 text-sm text-gray-400"
                            >
                                Bekor qilish
                            </button>
                        </motion.div>
                    </div>
                )}

                {/* Сообщение */}
                {message && (
                    <motion.p
                        className="mt-2 text-center text-gray-700 font-medium will-change-transform"
                        {...fade(0.16)}
                    >
                        {message}
                    </motion.p>
                )}

                {/* Доп. текст */}
                <motion.p
                    className="text-center text-gray-400 text-sm mt-4 will-change-transform"
                    {...fade(0.17)}
                >
                    Ro'yxatdan o'tish davomida Telegram ID avtomatik olinadi.
                </motion.p>

            </motion.div>
        </div>
    );
}
