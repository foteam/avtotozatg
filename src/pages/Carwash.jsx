import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams , useNavigate} from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faLocationArrow } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = "https://114-29-236-86.cloud-xip.com/api/admin/carwash";
const BOOKING_API_URL = "https://114-29-236-86.cloud-xip.com/api/booking";
const USER_API_URL = "https://114-29-236-86.cloud-xip.com/api/user";
import {
    faCreditCard,
    faMoneyBillWave,
    faTriangleExclamation
} from "@fortawesome/free-solid-svg-icons";
import { motion, AnimatePresence } from "framer-motion";
import WebApp from "@twa-dev/sdk";

// Общий preset анимации
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
        duration: 0.25,
        ease: "easeOut",
        scale: {
            type: "spring",
            stiffness: 160,
            damping: 18
        }
    }
});

export default function WashPage() {
    const {id, user_id} = useParams();
    const mapRef = useRef(null);
    const navigate = useNavigate();

    const [selectedPrice, setSelectedPrice] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);

    const [selectedCar, setSelectedCar] = useState(null);
    const [showCarSelect, setShowCarSelect] = useState(false);

    const [carNumber, setCarNumber] = useState('');
    const [error, setError] = useState("");
    const uzFormat1 = /^\d{2}\s[A-Z]\s\d{3}\s[A-Z]{2}$/;   // 00 A 000 AA
    const uzFormat2 = /^\d{2}\s\d{3}\s[A-Z]{3}$/;          // 00 000 AAA

    const [bookings, setBookings] = useState([]);

    const [activeImage, setActiveImage] = useState(null);

    const queryClient = useQueryClient();

    const [paymentMethod, setPaymentMethod] = useState("card"); // card | cash
    const [showCashWarning, setShowCashWarning] = useState(false);

    useEffect(() => {
        WebApp.BackButton.show();

        const onBack = () => {
            navigate(-1); // react-router
        };

        WebApp.onEvent("backButtonClicked", onBack);

        return () => {
            WebApp.BackButton.hide();
            WebApp.offEvent("backButtonClicked", onBack);
        };
    }, [navigate]);

    // ================== ЗАГРУЗКА МОЙКИ ==================
    const {data: washData, isLoading: washLoading} = useQuery({
        queryKey: ['wash', id],
        queryFn: async () => {
            const res = await axios.get(`${API_URL}/get/wash/${id}`);
            return res.data.wash;
        }
    });

    // ================== ЗАГРУЗКА ПОЛЬЗОВАТЕЛЯ ==================
    const {data: user, isLoading: userLoading} = useQuery({
        queryKey: ['user', user_id],
        queryFn: async () => {
            const res = await axios.get(`${USER_API_URL}/check/${user_id}`);
            return res.data.user;
        }
    });

// Автоматическая выдача промокодов
    useEffect(() => {
        if (!user) return;

        const applyPromo = async (code) => {
            try {
                await axios.post(`${USER_API_URL}/promo/set/${user.user_id}`, {
                    promoCode: code
                });

                const resBookings = await axios.get(
                    `${USER_API_URL}/bookings/get/${user.user_id}`
                );
                setBookings(resBookings.data.bookings);

                queryClient.invalidateQueries(['user', user_id]);
            } catch (err) {
                console.log("Promo error:", err);
            }
        };

        // 🔥 ОБЩАЯ СКИДКА ДЛЯ ВСЕХ
        if (!user.promoCode) {
            applyPromo("2026");
        }

        // JUMA
        const today = new Date();
        const isFriday = today.getDay() === 5;
        if (isFriday && !user.promoCode) {
            applyPromo("JUMA");
        }

        // 10WASH
        const count = bookings.length;
        if (count > 0 && count % 10 === 0 && !user.promoCode) {
            applyPromo("10WASH");
        }

    }, [user, bookings]);

// ================== ЗАГРУЗКА БРОНИРОВАНИЙ ПО СЛОТУ ==================
    const bookingsQuery = useQuery({
        queryKey: ['bookings', washData?._id, selectedSlot],
        queryFn: async () => {
            if (!washData?._id || !selectedSlot) return [];

            // Получаем все бронирования на мойку и слот
            const res = await axios.get(`${BOOKING_API_URL}/get/bookings/${washData._id}/slot/${selectedSlot}`);
            const allBookings = res.data.orders || [];

            const now = new Date();

            // Фильтруем только будущие или текущие бронирования
            const activeBookings = allBookings.filter(b => {
                const [hour, minute] = b.slot.split(':').map(Number);
                const bookingDate = new Date();
                bookingDate.setHours(hour, minute, 0, 0);

                return bookingDate.getTime() > now.getTime() && b.status === 'pending';
            });

            return activeBookings;
        },
        enabled: !!washData && !!selectedSlot,
        refetchInterval: 3000
    });

    // ================== МУТАЦИЯ БРОНИРОВАНИЯ ==================
    const bookingMutation = useMutation({
        mutationFn: async ({
                               washId,
                               carNumber,
                               userId,
                               priceType,
                               phone,
                               slot,
                               paymentMethod
                           }) => {
            const order_id = Math.floor(100000 + Math.random() * 900000);

            const res = await axios.post(`${BOOKING_API_URL}/create`, {
                order_id,
                wash: washId,
                carNumber,
                fromUser: userId,
                priceType,
                phoneNumber: phone,
                slot,
                paymentMethod,
                status: paymentMethod === "cash" ? "cash_pending" : "created"
            });

            return {
                order_id,
                invoiceLink: res.data.invoiceLink,
                paymentMethod
            };
        },

        onMutate: async (newBooking) => {
            const key = ['bookings', washData._id];

            await queryClient.cancelQueries(key);

            const prevBookings = queryClient.getQueryData(key) || [];

            queryClient.setQueryData(key, [
                ...prevBookings,
                {
                    ...newBooking,
                    status: 'created',
                    _id: Math.random().toString()
                }
            ]);

            return { prevBookings };
        },

        onError: (_err, _newBooking, ctx) => {
            const key = ['bookings', washData._id];
            if (ctx?.prevBookings) {
                queryClient.setQueryData(key, ctx.prevBookings);
            }
            alert("Xatolik yuz berdi. Qayta urinib ko‘ring.");
        },

        onSuccess: ({ invoiceLink, paymentMethod }) => {
            if (paymentMethod === "card") {
                if (window.Telegram?.WebApp?.openInvoice) {
                    window.Telegram.WebApp.openInvoice(invoiceLink);
                } else {
                    window.location.href = invoiceLink;
                }
            } else {
                alert("✅ Buyurtma qabul qilindi. To‘lovni joyida amalga oshirasiz. Kelishni unutmang!");
                navigate(-1);
            }

            queryClient.invalidateQueries(['bookings', washData._id]);
        }
    });
    // ================== ЗАГРУЗКА АВТО ИЗ ГАРАЖА ==================
    const { data: userCars = [], isLoading: carsLoading } = useQuery({
        queryKey: ["userCars", user_id],
        queryFn: async () => {
            const res = await axios.get(
                `${USER_API_URL}/garage/cars/${user_id}`
            );
            return res.data.cars || [];
        },
        enabled: !!user_id
    });

    useEffect(() => {
        if (selectedCar) {
            setCarNumber(formatCarNumber(selectedCar.plateNumber));
            setError("");
        }
    }, [selectedCar]);
    // ================== ФУНКЦИИ ==================
/*    const getDiscountedPrice = (price) => {
        if (user?.promoCode && user?.promoCodeDiscount) {
            return Math.round(price * (1 - user.promoCodeDiscount / 100));
        }
        return price;
    };*/

    const formatCarNumber = (input) => {
        let v = input.toUpperCase().replace(/[^A-Z0-9]/g, "");

        if (v.length <= 2) return v;

        // Определение формата:
        // После первых 2 цифр → буква => ФОРМАТ 1
        // После первых 2 цифр → цифра => ФОРМАТ 2
        const isFormat1 = /^[0-9]{2}[A-Z]/.test(v);
        const isFormat2 = /^[0-9]{2}[0-9]/.test(v);

        // ---------------------------
        // Формат 1: 00 A 000 AA
        // ---------------------------
        if (isFormat1) {
            if (v.length <= 3) return `${v.slice(0, 2)} ${v.slice(2)}`;
            if (v.length <= 6) return `${v.slice(0, 2)} ${v.slice(2, 3)} ${v.slice(3)}`;
            if (v.length <= 8) return `${v.slice(0, 2)} ${v.slice(2, 3)} ${v.slice(3, 6)} ${v.slice(6)}`;
            return `${v.slice(0, 2)} ${v.slice(2, 3)} ${v.slice(3, 6)} ${v.slice(6, 8)}`;
        }

        // ---------------------------
        // Формат 2: 00 000 AAA
        // ---------------------------
        if (isFormat2) {
            if (v.length <= 5) return `${v.slice(0, 2)} ${v.slice(2)}`;
            if (v.length <= 8) return `${v.slice(0, 2)} ${v.slice(2, 5)} ${v.slice(5)}`;
            return `${v.slice(0, 2)} ${v.slice(2, 5)} ${v.slice(5, 8)}`;
        }

        return v;
    };

    const handleInput = (value) => {
        const formatted = formatCarNumber(value);

        setCarNumber(formatted);

        if (uzFormat1.test(formatted) || uzFormat2.test(formatted)) {
            setError("");
        } else {
            setError("Raqam noto‘g‘ri formatda. Misol: 01 A 234 BC yoki 01 234 ABC");
        }
    };
    const getDiscountedPrice = (price) => {
        if (
            paymentMethod === "card" &&
            user?.promoCode &&
            user?.promoCodeDiscount
        ) {
            return Math.round(price * (1 - user.promoCodeDiscount / 100));
        }
        return price;
    };
    const submitBooking = () => {
        const now = new Date();
        const MIN_DIFF = 20 * 60 * 1000; // 20 минут

        // Преобразуем выбранный слот в дату
        const [slotHour, slotMinute] = selectedSlot.split(':').map(Number);
        const slotDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), slotHour, slotMinute);

        // Проверка разницы (если слишком близко — ищем другое время)
        if (slotDate.getTime() - now.getTime() < MIN_DIFF) {

            // Преобразовать ВСЕ слоты мойки в массив с датами
            const allSlots = washData.slots.map(time => {
                const [h, m] = time.split(':').map(Number);
                return {
                    raw: time,
                    date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m)
                };
            });

            // Найти следующий доступный слот
            const nextAvailableSlot = allSlots.find(s => s.date.getTime() - now.getTime() >= MIN_DIFF);

            if (nextAvailableSlot) {
                return alert(
                    `Bu vaqtda buyurtma berib bo'lmaydi. ` +
                    `Tavsiya etilgan vaqt: ${nextAvailableSlot.raw}`
                );
            }

            return alert("Bugungi kun uchun boshqa bo'sh vaqtlar yo'q!");
        }

        // Проверка максимума бронирований на слот
        const pendingCount = bookingsQuery.data?.length || 0;
        if (pendingCount >= 3) {
            return alert("Ushbu vaqtda allaqachon 3 ta buyurtma mavjud. Iltimos, boshqa vaqtni tanlang!");
        }

        const finalPrice = getDiscountedPrice(Number(selectedPrice.price));

        bookingMutation.mutate({
            washId: washData._id,
            carNumber,
            userId: user_id,
            priceType: `${selectedPrice.type} – ${selectedPrice.price}`,
            phone: user.phone,
            slot: selectedSlot,
            paymentMethod // 👈 ВАЖНО
        });
    }
    const handleBooking = async () => {
        if (error !== "") return alert("Iltimos, avtomobil raqamini kiriting!");
        if (!selectedPrice) return alert("Iltimos, turini tanlang!");
        if (!selectedSlot) return alert("Iltimos, vaqtni tanlang!");

        // ⛔️ если наличка — сначала предупреждение
        if (paymentMethod === "cash") {
            setShowCashWarning(true);
            return;
        }
        submitBooking();
    };

    // ================== КАРТА ==================
    useEffect(() => {
        if (!washData?.location || !window.ymaps) return;
        const [lat, lon] = washData.location;
        const container = mapRef.current;
        if (!container) return;

        window.ymaps.ready(() => {
            const map = new window.ymaps.Map(container, {
                center: [lat, lon],
                zoom: 15,
                controls: ["zoomControl", "fullscreenControl"]
            });
            const placemark = new window.ymaps.Placemark([lat, lon], {balloonContent: washData.name}, {preset: "islands#blueDotIcon"});
            map.geoObjects.add(placemark);
        });
    }, [washData]);
    function Skeleton({ className = "" }) {
        return (
            <div
                className={`bg-gray-200/80 rounded-xl animate-pulse ${className}`}
            />
        );
    }
    function WashPageSkeleton() {
        return (
            <div className="min-h-screen w-screen bg-[#EEEEEE] p-4 sm:p-6 md:p-8">

                {/* Banner */}
                <Skeleton className="w-full h-64 rounded-3xl mb-6" />

                {/* Title */}
                <Skeleton className="h-6 w-2/3 mb-3" />
                <Skeleton className="h-4 w-1/3 mb-6" />

                {/* Description */}
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-5/6 mb-2" />
                <Skeleton className="h-4 w-4/6 mb-6" />

                {/* Prices */}
                <Skeleton className="h-5 w-40 mb-4" />

                <div className="space-y-4 mb-6">
                    <Skeleton className="h-14 w-full rounded-2xl" />
                    <Skeleton className="h-14 w-full rounded-2xl" />
                    <Skeleton className="h-14 w-full rounded-2xl" />
                </div>

                {/* Slots */}
                <Skeleton className="h-5 w-32 mb-3" />
                <div className="flex gap-3 mb-6">
                    <Skeleton className="h-10 w-20 rounded-2xl" />
                    <Skeleton className="h-10 w-20 rounded-2xl" />
                    <Skeleton className="h-10 w-20 rounded-2xl" />
                </div>

                {/* Button */}
                <Skeleton className="h-12 w-full rounded-2xl mt-8" />
            </div>
        );
    }


    if (washLoading || userLoading) {
        return <WashPageSkeleton />;
    }
    if (!washData) return <div>Moyka topilmadi</div>;
    const basePrice = selectedPrice ? Number(selectedPrice.price) : 0;
    const discountedPrice = selectedPrice ? getDiscountedPrice(basePrice) : 0;
    const hasDiscount =
        paymentMethod === "card" &&
        user?.promoCodeDiscount > 0 &&
        discountedPrice < basePrice;
    // ================== UI ==================
    return (
        <div className="min-h-screen w-screen bg-[#EEEEEE] px-4 pb-32">

            {/* Баннер */}
            <motion.div
                className="relative w-screen -mx-4 h-72 mb-6 will-change-transform"
                {...fade(0.05)}
            >
                <img
                    src={washData.banner}
                    alt={washData.name}
                    className="w-full h-full object-cover rounded-b-3xl shadow-lg"
                />

                <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/70 to-transparent rounded-b-3xl">
                    <h1 className="text-white font-bold text-3xl">{washData.name}</h1>
                    <p className="flex items-center text-yellow-400 font-semibold mt-1">
                        <FontAwesomeIcon icon={faStar} className="mr-1" /> {washData.rating || 0}
                    </p>
                    <p className="flex items-center text-gray-300 text-sm mt-1">
                        <FontAwesomeIcon icon={faLocationArrow} className="mr-1" />
                        {washData.address}
                    </p>
                </div>
            </motion.div>

            {/* Описание */}
            <motion.p className="text-gray-700 mb-6 will-change-transform" {...fade(0.1)}>
                {washData.description || "Tavsif mavjud emas."}
            </motion.p>

            {/* Авто номер */}
            <motion.div {...fade(0.15)}>

                {/* Если есть авто — кнопка выбора */}
                {userCars.length > 0 && (
                    <button
                        onClick={() => setShowCarSelect(true)}
                        className="
                mb-2 w-full
                bg-white
                border border-gray-300
                rounded-2xl
                px-4 py-3
                text-left
                shadow-sm
                active:scale-[0.98]
                transition
            "
                    >
                        {selectedCar ? (
                            <div className="flex justify-between items-center">
                    <span className="font-medium">
                        {selectedCar.brand} {selectedCar.model}
                    </span>
                                <span className="font-plate tracking-widest">
                        {formatCarNumber(selectedCar.plateNumber)}
                    </span>
                            </div>
                        ) : (
                            <span className="text-gray-500">
                    🚗 Avtomobilni tanlash
                </span>
                        )}
                    </button>
                )}

                {/* Ручной ввод */}
                <input
                    type="text"
                    placeholder="Avtomobil raqamini kiriting"
                    value={carNumber}
                    onChange={e => handleInput(e.target.value)}
                    disabled={!!selectedCar}
                    className={`w-full p-3 plate-input rounded-2xl border ${
                        error ? "border-red-500" : "border-gray-300"
                    } focus:outline-none focus:ring-2 ${
                        error ? "focus:ring-red-500" : "focus:ring-[#4D77FF]"
                    } disabled:bg-gray-100 mb-2`}
                />

                {error && <p className="text-red-500 text-sm">{error}</p>}
            </motion.div>
            {/* Тарифы */}
            <motion.h2 className="font-semibold text-gray-800 mb-2 will-change-transform" {...fade(0.2)}>
                Avtomobil yuvish narxlari:
            </motion.h2>

            <motion.div className="flex flex-col gap-4 mb-6 will-change-transform" {...fade(0.25)}>
                {washData.prices?.map((p, i) => {
                    const discounted = getDiscountedPrice(Number(p.price));
                    return (
                        <motion.div
                            key={i}
                            onClick={() => setSelectedPrice(p)}
                            className={`flex justify-between p-4 rounded-2xl shadow cursor-pointer transition-all
                            ${selectedPrice?.type === p.type ? 'bg-[#4D77FF] text-white' : 'bg-white text-gray-800'}`}
                            {...fade(0.25 + i * 0.05)}
                        >
                            <p className="font-medium">{p.type}</p>
                            <p className="font-semibold">
                                {discounted.toLocaleString()} so'm
                                {user?.promoCode && user?.promoCodeDiscount ? (
                                    <span className="text-green-600 text-sm ml-2">
                                    ({user.promoCodeDiscount}% chegirma)
                                </span>
                                ) : null}
                            </p>
                        </motion.div>
                    );
                })}
            </motion.div>

            {/* Слоты */}
            <motion.h2 className="font-semibold text-gray-800 mb-2 will-change-transform" {...fade(0.3)}>
                Bo'sh vaqtlar:
            </motion.h2>

            <motion.div className="flex flex-wrap gap-3 mb-6 will-change-transform" {...fade(0.35)}>
                {washData.slots?.map((slot, i) => (
                    <motion.button
                        key={i}
                        onClick={() => setSelectedSlot(slot)}
                        className={`flex-1 min-w-[80px] px-4 py-2 rounded-2xl shadow font-medium transition
                        ${selectedSlot === slot ? 'bg-[#4D77FF] text-white' : 'bg-white text-gray-800 hover:bg-blue-100 will-change-transform'}`}
                        {...fade(0.35 + i * 0.04)}
                    >
                        {slot}
                    </motion.button>
                ))}
            </motion.div>

            {/* Галерея */}
            <motion.div
                className="flex gap-3 overflow-x-auto mb-6 w-full px-1"
                {...fade(0.4)}
            >
                {washData.images?.map((img, i) => (
                    <motion.img
                        key={img}
                        src={img}
                        layoutId={`image-${img}`}
                        onClick={() => setActiveImage(img)}
                        alt={`wash-${i}`}
                        className="flex-none w-64 h-36 object-cover rounded-xl shadow cursor-pointer"
                        {...fade(0.4 + i * 0.04)}
                    />
                ))}
            </motion.div>
            <AnimatePresence>
                {activeImage && (
                    <motion.div
                        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
                        onClick={() => setActiveImage(null)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.img
                            src={activeImage}
                            layoutId={`image-${activeImage}`}
                            className="max-w-[95vw] max-h-[90vh] rounded-2xl shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Карта */}
            {washData.location && (
                <motion.div className="mb-6 w-full h-64 rounded-2xl shadow will-change-transform" ref={mapRef} {...fade(0.45)} />
            )}

            {/* Отзывы */}
            <motion.h2 className="font-semibold text-gray-800 mb-2 will-change-transform" {...fade(0.5)}>
                Izohlar:
            </motion.h2>

            <motion.div className="flex flex-col gap-4 mb-6 will-change-transform" {...fade(0.55)}>
                {(washData.reviews || []).map((rev, i) => (
                    <motion.div
                        key={i}
                        className="p-3 bg-white rounded-2xl shadow w-full will-change-transform"
                        {...fade(0.55 + i * 0.05)}
                    >
                        <p className="font-semibold">{rev.name}</p>
                        <p className="text-gray-600 text-sm mt-1">{rev.comment}</p>
                        <p className="text-yellow-400 font-medium mt-1">
                            {Array(rev.rating || 0).fill(0).map((_, idx) => (
                                <FontAwesomeIcon key={idx} icon={faStar}/>
                            ))}
                        </p>
                    </motion.div>
                ))}
            </motion.div>

            {showCashWarning && (
                <motion.div
                    className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", damping: 18 }}
                        className="bg-white rounded-3xl p-5 w-full max-w-md shadow-xl"
                    >
                        <div className="flex items-center gap-2 mb-3 text-orange-600">
                            <FontAwesomeIcon icon={faTriangleExclamation} />
                            <h3 className="font-bold text-lg">Diqqat!</h3>
                        </div>

                        <p className="text-gray-700 text-sm mb-4 leading-relaxed">
                            Siz <b>naqd pul</b> orqali bron qilmoqdasiz.
                            Agar belgilangan vaqtda kelmasangiz, avtomoyka sizni keyingi bronlardan
                            <b> vaqtincha bloklashi</b> mumkin.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCashWarning(false)}
                                className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold"
                            >
                                Bekor qilish
                            </button>

                            <button
                                onClick={() => {
                                    setShowCashWarning(false);
                                    submitBooking();
                                }}
                                className="flex-1 py-3 rounded-2xl bg-[#4D77FF] text-white font-semibold"
                            >
                                Tasdiqlayman
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* Способ оплаты */}
            <motion.div className="flex gap-3 mb-6" {...fade(0.6)}>
                <button
                    onClick={() => setPaymentMethod("card")}
                    className={`flex-1 py-3 rounded-2xl font-semibold shadow flex items-center justify-center gap-2
        ${paymentMethod === "card"
                        ? "bg-[#4D77FF] text-white"
                        : "bg-white text-gray-800"
                    }`}
                >
                    <FontAwesomeIcon icon={faCreditCard} />
                    Karta orqali
                </button>

                <button
                    onClick={() => setPaymentMethod("cash")}
                    className={`flex-1 py-3 rounded-2xl font-semibold shadow flex items-center justify-center gap-2
        ${paymentMethod === "cash"
                        ? "bg-[#4D77FF] text-white"
                        : "bg-white text-gray-800"
                    }`}
                >
                    <FontAwesomeIcon icon={faMoneyBillWave} />
                    Naqd pul
                </button>
            </motion.div>

            {paymentMethod === "cash" && (
                <p className="text-sm text-orange-600 mb-4">
                    ⚠️ Chegirmalar va promokodlar faqat karta orqali to‘lovda amal qiladi
                </p>
            )}

            {/* Кнопка */}
            <motion.button
                onClick={handleBooking}
                disabled={bookingMutation.isPending}
                className="will-change-transform w-full py-3 bg-[#4D77FF] text-white rounded-2xl shadow-lg font-semibold hover:bg-blue-600 transition disabled:opacity-30 disabled:cursor-not-allowed"
                {...fade(0.6)}
            >
                {bookingMutation.isPending ? (
                    "Yuklanmoqda..."
                ) : !selectedPrice ? (
                    "Tarifni tanlang"
                ) : hasDiscount ? (
                    <div className="flex flex-col items-center leading-tight">
            <span className="text-sm line-through opacity-80">
                {basePrice.toLocaleString()} so'm
            </span>
                        <span className="text-lg font-bold">
                To‘lov qilish — {discountedPrice.toLocaleString()} so'm
            </span>
                    </div>
                ) : (
                    `To‘lov qilish — ${basePrice.toLocaleString()} so'm`
                )}
            </motion.button>
            <AnimatePresence>
                {showCarSelect && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: "spring", damping: 20 }}
                            className="
                    w-full max-w-md
                    bg-white
                    rounded-3xl
                    shadow-2xl
                    overflow-hidden
                "
                        >
                            {/* HEADER */}
                            <div className="p-5 border-b">
                                <h3 className="text-lg font-semibold">
                                    Avtomobilni tanlang
                                </h3>
                                <p className="text-sm text-gray-500">
                                    Bron qilish uchun avtomobilni tanlang
                                </p>
                            </div>

                            {/* LIST */}
                            <div className="p-4 grid grid-cols-1 gap-4 max-h-[60vh] overflow-y-auto">

                                {userCars.map(car => (
                                    <button
                                        key={car._id}
                                        onClick={() => {
                                            setSelectedCar(car);
                                            setShowCarSelect(false);
                                        }}
                                        className="
                                relative
                                h-32
                                rounded-2xl
                                overflow-hidden
                                shadow
                                active:scale-[0.98]
                                transition
                                text-left
                            "
                                    >
                                        {/* BACKGROUND */}
                                        <img
                                            src={car.image || 'https://i.ibb.co/R4cLCjgX/Chevrolet-Equinox-Mk3f-Premier-2020-1000-0005.jpg'}
                                            alt=""
                                            className="absolute inset-0 w-full h-full object-cover"
                                        />

                                        {/* OVERLAY */}
                                        <div className="absolute inset-0 bg-black/40" />

                                        {/* CONTENT */}
                                        <div className="relative z-10 h-full flex flex-col justify-between p-4 text-white">

                                            <div>
                                                <p className="text-sm opacity-80">
                                                    {car.brand}
                                                </p>
                                                <p className="text-lg font-semibold leading-tight">
                                                    {car.model}
                                                </p>
                                            </div>

                                            <div className="
                                    self-start
                                    bg-white/90
                                    text-black
                                    font-plate
                                    tracking-widest
                                    px-3 py-1
                                    rounded-lg
                                ">
                                                {formatCarNumber(car.plateNumber)}
                                            </div>
                                        </div>
                                    </button>
                                ))}

                                {/* ADD NEW CAR */}
                                <button
                                    onClick={() => {
                                        setShowCarSelect(false);
                                        navigate("/garage/add");
                                    }}
                                    className="
                            h-20
                            rounded-2xl
                            border-2 border-dashed
                            border-gray-300
                            flex items-center justify-center
                            text-gray-500
                            font-medium
                            hover:bg-gray-50
                        "
                                >
                                    + Yangi avtomobil qo‘shish
                                </button>
                            </div>

                            {/* FOOTER */}
                            <div className="p-4 border-t">
                                <button
                                    onClick={() => setShowCarSelect(false)}
                                    className="
                            w-full py-3
                            rounded-2xl
                            bg-gray-100
                            font-semibold
                        "
                                >
                                    Bekor qilish
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
