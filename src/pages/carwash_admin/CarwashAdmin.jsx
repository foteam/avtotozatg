import { useState, useMemo } from "react";
import {
    Users,
    DollarSign,
    Calendar,
    Clock,
    Edit2,
    CheckCircle,
    XCircle,
    MapPin,
    ArrowUpCircle
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    Legend,
} from "recharts";

import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faCar} from "@fortawesome/free-solid-svg-icons";
import {motion} from "framer-motion";

const IMGBB_API_KEY = "01074699432b7e4645f98fe66efebec3";
const API_URL = "https://114-29-236-86.cloud-xip.com/api/admin/carwash";

export default function OwnerDashboard({ user_id }) {
    const queryClient = useQueryClient();

    const [editMode, setEditMode] = useState(false);
    const [tempWashInfo, setTempWashInfo] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [filterStatus, setFilterStatus] = useState("all");

    const [withdrawModal, setWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState("");

    const [error, setError] = useState(null);

    // --- Создание админ-броней ---
    const [createModal, setCreateModal] = useState(false);

    const [newOrder, setNewOrder] = useState({
        carNumber: "",
        slot: "",
        priceType: "",
        phoneNumber: "",
    });

    // ================== ЗАГРУЗКА МОЙКИ ==================
    const washQuery = useQuery({
        queryKey: ["wash", user_id],
        queryFn: async () => {
            const res = await axios.get(`${API_URL}/get/owner/${user_id}`);
            if (!res.data.exists) throw new Error("Вы не владелец мойки");

            const cw = {
                ...res.data.carwash,
                location: res.data.carwash.location || [0, 0]
            };

            setTempWashInfo(JSON.parse(JSON.stringify(cw))); // editor temp copy
            return cw;
        },
        refetchInterval: 5000,
    });

    const createAdminOrderMutation = useMutation({
        mutationFn: async () => {
            return axios.post(`${API_URL}/orders/admin-create`, {
                carwash_id: tempWashInfo._id,
                carNumber: newOrder.carNumber,
                slot: newOrder.slot,
                priceType: newOrder.priceType,
                phoneNumber: newOrder.phoneNumber
            });
        },
        onSuccess: () => {
            setCreateModal(false);

            // FIX: заменить washInfo._id → tempWashInfo._id
            queryClient.invalidateQueries(["orders", tempWashInfo._id]);

            setNewOrder({ carNumber: "", slot: "", priceType: "" });
        }
    });

    const createAdminOrder = () => {
        if (!newOrder.carNumber || !newOrder.slot || !newOrder.priceType) {
            return alert("Joylarni to'ldiring!");
        }
        createAdminOrderMutation.mutate();
    };

    // ================== ЗАКАЗЫ ==================
    const ordersQuery = useQuery({
        queryKey: ["orders", washQuery.data?._id],
        queryFn: async () => {
            if (!washQuery.data?._id) return [];

            const res = await axios.get(
                `${API_URL}/get/orders/${washQuery.data._id}`
            );

            if (!res.data.exists) return [];

            return res.data.orders.filter(o =>
                o.status === "pending" || o.status === "completed"
            );
        },
        enabled: !!washQuery.data?._id,
        refetchInterval: 3000,
    });

    const getPriceFromType = (priceType = "") => {
        const parts = priceType.split("–");
        const price = parseInt(parts[1]?.replace(/\s/g, ""));
        return isNaN(price) ? 0 : price;
    };

    const getTariffFromType = (priceType = "") => {
        return priceType.split("–")[0]?.trim() || "Boshqa";
    };

    // ============== CHARTS BOOKING =============
    const sales7DaysChart = useMemo(() => {
        const orders = ordersQuery.data || [];
        const now = new Date();

        const days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(now.getDate() - (6 - i));
            return {
                dateKey: d.toISOString().slice(0, 10),
                label: d.toLocaleDateString("ru-RU", {
                    day: "2-digit",
                    month: "2-digit",
                }),
                total: 0,
            };
        });

        orders.forEach(order => {
            const orderDate = new Date(order.createdAt)
                .toISOString()
                .slice(0, 10);

            const day = days.find(d => d.dateKey === orderDate);
            if (day) {
                day.total += getPriceFromType(order.priceType);
            }
        });

        return days.map(d => ({
            date: d.label,
            sales: d.total,
        }));
    }, [ordersQuery.data]);

    const bookings7DaysChart = useMemo(() => {
        const orders = ordersQuery.data || [];
        const now = new Date();

        // создаём 7 дней назад
        const days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(now.getDate() - (6 - i));
            return {
                dateKey: d.toISOString().slice(0, 10),
                label: d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
                count: 0,
            };
        });

        orders.forEach(order => {
            const orderDate = new Date(order.createdAt).toISOString().slice(0, 10);
            const day = days.find(d => d.dateKey === orderDate);
            if (day) day.count += 1;
        });

        return days.map(d => ({
            date: d.label,
            bookings: d.count,
        }));
    }, [ordersQuery.data]);

    // ================== ИСТОРИЯ ВЫВОДОВ ==================
    const withdrawsQuery = useQuery({
        queryKey: ["withdraws", washQuery.data?._id],
        queryFn: async () => {
            if (!washQuery.data?._id) return [];
            const res = await axios.get(`${API_URL}/withdraws/${washQuery.data._id}`);
            return res.data.withdraws || [];
        },
        enabled: !!washQuery.data?._id, // запрос реально будет выполняться только если есть _id
        refetchInterval: 5000,
    });

    // ================== ОБНОВЛЕНИЕ МОЙКИ ==================
    const updateWashMutation = useMutation({
        mutationFn: async (newData) => {
            return axios.put(`${API_URL}/update/${user_id}`, newData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["wash", user_id]);
            setEditMode(false);
        }
    });

    // ================== ОПТИМИСТИЧНОЕ ЗАВЕРШЕНИЕ ЗАКАЗА ==================
    const completeOrderMutation = useMutation({
        mutationFn: async (orderId) => {
            const ordersKey = ["orders", washQuery.data._id];
            const washKey = ["wash", user_id];

            // Завершаем заказ на сервере
            await axios.put(`${API_URL}/orders/${orderId}/complete`);

            // Берём актуальные данные
            const orders = queryClient.getQueryData(ordersKey) || [];
            const wash = queryClient.getQueryData(washKey) || {};

            const order = orders.find(o => o._id === orderId);
            if (!order) return;

            // Правильное вычисление цены и комиссии
            const price = parseInt(order.priceType?.split("–")?.[1]?.replace(/\s|so'm/g, "") || "0");
            const commission = (wash.comission || 0) / 100; // 10% = 0.1
            const netIncome = price * (1 - commission);

            if (!order.isAdmin){
                // Обновляем баланс на сервере
                await axios.put(`${API_URL}/update/${user_id}`, {
                    balance: (wash.balance || 0) + netIncome
                });
            }

            return { orderId, netIncome };
        },

        onMutate: async (orderId) => {
            const ordersKey = ["orders", washQuery.data._id];

            await queryClient.cancelQueries(ordersKey);
            const prevOrders = queryClient.getQueryData(ordersKey);

            if (prevOrders) {
                // Оптимистически обновляем только статус заказа
                queryClient.setQueryData(ordersKey, prevOrders.map(o =>
                    o._id === orderId ? { ...o, status: "completed" } : o
                ));
            }

            return { prevOrders };
        },

        onError: (_e, _d, ctx) => {
            const ordersKey = ["orders", washQuery.data._id];
            if (ctx?.prevOrders) queryClient.setQueryData(ordersKey, ctx.prevOrders);
        },

        onSettled: () => {
            const ordersKey = ["orders", washQuery.data._id];
            const washKey = ["wash", user_id];

            queryClient.invalidateQueries(ordersKey);
            queryClient.invalidateQueries(washKey);
        }
    });

    // ================== ЗАГРУЗКА БАННЕРА ==================
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("image", file);

        setUploading(true);

        try {
            const res = await axios.post(
                `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
                formData
            );
            const url = res.data.data.url;

            setTempWashInfo({ ...tempWashInfo, banner: url });
        } catch {
            alert("Ошибка загрузки изображения");
        } finally {
            setUploading(false);
        }
    };

    // ================== СТАТИСТИКА ==================
    const stats = useMemo(() => {
        const orders = ordersQuery.data || [];
        const now = new Date();

        let totalIncome = 0;
        let activeOrders = 0;
        let completed3Days = 0;
        let completed6Days = 0;
        let sum3Days = 0;

        const balance = tempWashInfo?.balance || 0; // ✅ безопасно

        orders.forEach((order) => {
            const created = new Date(order.createdAt);
            const price = parseInt(order.priceType?.split("–")[1]?.replace(/\s|so'm/g, "") || "0");

            if (order.status === "completed") {
                totalIncome += price;

                const diff = (now - created) / (1000 * 60 * 60 * 24);
                if (diff <= 3) {
                    completed3Days++;
                    sum3Days += price;
                }
                if (diff <= 6) completed6Days++;
            } else {
                activeOrders++;
            }
        });

        return {
            totalIncome,
            activeOrders,
            totalOrders: orders.length,
            completed3Days,
            completed6Days,
            sum3Days,
            balance, // ✅ возвращаем баланс
        };
    }, [ordersQuery.data, tempWashInfo]);


    if (washQuery.isLoading)
        return <div className="p-6 text-center text-gray-600 text-lg w-screen h-screen items-center justify-center">Загрузка...</div>;
    if (washQuery.isError)
        return (
            <div className="p-6 text-center text-red-600 w-screen h-screen items-center justify-center">Ошибка загрузки</div>
        );


    const washInfo = washQuery.data;
    const orders = ordersQuery.data || [];

    // ================== PAYOUT ========================
    const handleWithdraw = async () => {
        const amount = parseInt(withdrawAmount.replace(/\s/g, ""));
        if (!amount || amount <= 0) return alert("Iltimos, to'g'ri summa kiriting!");
        if (amount > stats.balance) return alert("Balans yetarli emas!");

        try {
            await axios.post(`${API_URL}/withdraw`, {
                carwash_id: washInfo._id,
                amount: amount
            });

            alert("Murojaat qabul qilindi! Pul chiqimi jarayonida.");
            setWithdrawModal(false);
            setWithdrawAmount("");
            queryClient.invalidateQueries({ queryKey: ["wash", user_id] }); // v5
            queryClient.invalidateQueries({ queryKey: ["withdraws", washInfo._id] }); // обновляем историю
        } catch (err) {
            console.error(err);
            alert("Xatolik yuz berdi, qayta urinib ko'ring!");
        }
    };


    // ================== ФИЛЬТРАЦИЯ ЗАКАЗОВ ==================
    const filteredOrders = orders.filter((o) => {
        if (filterStatus === "all") return true;
        return o.status === filterStatus;
    });


    const uzFormat1 = /^\d{2}\s[A-Z]\s\d{3}\s[A-Z]{2}$/;   // 00 A 000 AA
    const uzFormat2 = /^\d{2}\s\d{3}\s[A-Z]{3}$/;          // 00 000 AAA
    const handleInput = (value) => {
        const formatted = formatCarNumber(value);

        setNewOrder({ ...newOrder, carNumber: formatted });

        if (uzFormat1.test(formatted) || uzFormat2.test(formatted)) {
            setError("");
        } else {
            setError("Raqam noto‘g‘ri formatda. Misol: 01 A 234 BC yoki 01 234 ABC");
        }
    };
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

    const safePrices = Array.isArray(tempWashInfo?.prices)
        ? tempWashInfo.prices.map(p => `${p.type} – ${p.price}`)
        : [];
    const safeSlots = Array.isArray(tempWashInfo?.slots)
        ? tempWashInfo.slots
        : [];

    // ================== UI ==================
    return (
        <div className="p-4 bg-[#EEEEEE] w-screen min-h-screen space-y-6 pt-16">

            {/* Панель мойки */}
            <div className="bg-white rounded-2xl shadow overflow-hidden flex flex-col md:flex-row">
                <div className="w-full md:w-1/3 h-44 md:h-auto relative">
                    <img
                        src={tempWashInfo?.banner || "https://via.placeholder.com/800x400?text=No+Image"}
                        alt={tempWashInfo?.name || "Carwash banner"}
                        className="w-full h-full object-cover"
                    />
                    {editMode && (
                        <label className="absolute bottom-3 right-3 bg-white px-3 py-2 rounded-full shadow flex items-center gap-2 cursor-pointer text-sm">
                            {uploading ? "Загрузка..." : "Изменить баннер"}
                            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                        </label>
                    )}
                </div>

                <div className="p-4 flex-1">
                    {editMode ? (
                        <div className="space-y-3">
                            <input
                                className="w-full p-3 border rounded-md"
                                placeholder="Название"
                                value={tempWashInfo?.name || ""}
                                onChange={(e) => setTempWashInfo({ ...tempWashInfo, name: e.target.value })}
                            />
                            <textarea
                                className="w-full p-3 border rounded-md h-24"
                                placeholder="Описание"
                                value={tempWashInfo?.description || ""}
                                onChange={(e) => setTempWashInfo({ ...tempWashInfo, description: e.target.value })}
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => updateWashMutation.mutate(tempWashInfo)}
                                    className="flex-1 bg-[#4D77FF] text-white py-2 rounded-xl shadow"
                                >
                                    Сохранить
                                </button>
                                <button
                                    onClick={() => {
                                        setTempWashInfo(JSON.parse(JSON.stringify(washInfo)));
                                        setEditMode(false);
                                    }}
                                    className="flex-1 bg-[#EEEEEE] text-gray-700 py-2 rounded-xl"
                                >
                                    Отмена
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                            <div>
                                <h2 className="text-lg font-bold">{washInfo.name}</h2>
                                <p className="text-sm text-gray-600 mt-1">{washInfo.description}</p>
                                <p className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                                    <MapPin size={14} />
                                    Координаты:{" "}
                                    {washInfo.location?.length === 2
                                        ? `${Number(washInfo.location[0]).toFixed(5)}, ${Number(washInfo.location[1]).toFixed(5)}`
                                        : "не задано"}
                                </p>
                            </div>

                            <div className="flex items-center gap-3 mt-3 sm:mt-0">
                                <button
                                    onClick={() => setEditMode(true)}
                                    className="flex items-center gap-2 p-2 bg-[#4D77FF] rounded-full text-white shadow"
                                >
                                    <Edit2 size={16} />
                                    <span className="text-sm font-medium">Ozgartirish</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Баланс + кнопка вывода */}
            <div className="flex items-center gap-3">
                <p className="text-gray-700 font-semibold">
                    Balans: {(stats.balance || 0).toLocaleString()} so'm
                </p>
                <button
                    onClick={() => setWithdrawModal(true)}
                    className="flex items-center gap-2 bg-[#4D77FF] text-white px-3 py-1 rounded-xl shadow"
                >
                    <ArrowUpCircle size={16} /> Pul chiqarish
                </button>
            </div>
            {/* Модалка ДОЛЖНА БЫТЬ В КОНЦЕ КОМПОНЕНТА */}
            {createModal && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">

                        <h2 className="text-xl font-bold">Bron yaratish:</h2>

{/*                        <input
                            type="text"
                            placeholder="Avtomobil raqami"
                            className="w-full p-3 border rounded-xl"
                            value={newOrder.carNumber}
                            onChange={(e) =>
                                setNewOrder({ ...newOrder, carNumber: e.target.value })
                            }
                        />*/}
                        <input
                            type="text"
                            placeholder="Avtomobil raqamini kiriting"
                            value={newOrder.carNumber}
                            onChange={e => handleInput(e.target.value)}
                            className={`w-full p-3 rounded-2xl border ${
                                error ? "border-red-500" : "border-gray-300"
                            } focus:outline-none focus:ring-2 ${
                                error ? "focus:ring-red-500" : "focus:ring-[#4D77FF]"
                            } mb-2`}
                        />
                        <input
                            type="tel"
                            placeholder="+998 90 123 12 34 (tel)"
                            className="will-change-transform w-full p-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4D77FF] text-gray-700 shadow-sm placeholder-gray-400 transition duration-200"
                            value={newOrder.phoneNumber}
                            onChange={(e) => setNewOrder({ ...newOrder, phoneNumber: formatUzPhone(e.target.value) })}
                        />

                        <select
                            className="w-full p-3 border rounded-xl"
                            value={newOrder.priceType || ""}
                            onChange={(e) =>
                                setNewOrder({ ...newOrder, priceType: e.target.value })
                            }
                        >
                            <option value="">Tarifni tanlang</option>

                            {safePrices.map((t, i) => (
                                <option key={i} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>


                        <select
                            className="w-full p-3 border rounded-xl"
                            value={newOrder.slot || ""}
                            onChange={(e) =>
                                setNewOrder({ ...newOrder, slot: e.target.value })
                            }
                        >
                            <option value="">Vaqtni tanlang</option>
                            {safeSlots.map((s, i) => (
                                <option key={i} value={s}>{s}</option>
                            ))}
                        </select>

                        <div className="flex gap-2 pt-2">
                            <button
                                className="flex-1 bg-[#4D77FF] text-white py-3 rounded-xl"
                                onClick={createAdminOrder}
                            >
                                Yaratish
                            </button>

                            <button
                                className="flex-1 bg-gray-200 py-3 rounded-xl"
                                onClick={() => setCreateModal(false)}
                            >
                                Bekor qilish
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Модальное окно для вывода средств */}
            {withdrawModal && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 p-4">
                    <div className="bg-[#EEEEEE] rounded-3xl shadow-xl w-full max-w-md p-6 space-y-4">
                        <h3 className="text-xl font-bold text-gray-800">Pul chiqarish</h3>
                        <input
                            type="number"
                            placeholder="Summa so'm"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            className="w-full p-3 border rounded-xl"
                        />
                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={handleWithdraw}
                                className="flex-1 bg-[#4D77FF] text-white py-2 rounded-xl shadow"
                            >
                                Tasdiqlash
                            </button>
                            <button
                                onClick={() => setWithdrawModal(false)}
                                className="flex-1 bg-[#EEEEEE] text-gray-700 py-2 rounded-xl"
                            >
                                Bekor qilish
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Добавления брона */}
            <div className="mt-6">
                <button
                    onClick={() => setCreateModal(true)}
                    className="w-full py-4 rounded-2xl bg-[#4D77FF] text-white text-lg font-semibold shadow-lg hover:bg-[#3B5FE0] transition"
                >
                    + Bron yaratish
                </button>
            </div>

            {/* История выводов */}
            <div className="bg-white rounded-2xl shadow p-4 space-y-3 max-h-[44vh] overflow-y-auto">
                <h3 className="text-lg font-bold mb-3">Tarix: Pul chiqimlari</h3>

                {(!withdrawsQuery.data || withdrawsQuery.data.length === 0) ? (
                    <p className="text-gray-500 text-sm">Hech qanday murojaat yo'q</p>
                ) : (
                    <ul className="space-y-2">
                        {withdrawsQuery.data.map((w) => (
                            <li key={w._id} className="flex justify-between items-center p-2 border rounded-lg hover:shadow-sm transition">
                    <span>
                        {w.createdAt ? new Date(w.createdAt).toLocaleDateString() + " " + new Date(w.createdAt).toLocaleTimeString() : "-"}
                    </span>
                                <span className={`font-semibold ${w.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}`}>
                        {(w.amount || 0).toLocaleString()} so'm ({w.status || '-'})
                    </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Статистика */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard icon={<DollarSign size={20} />} label="Jami bajarilgan summa" value={stats.totalIncome.toLocaleString() + " so'm"} />
                <StatCard icon={<DollarSign size={20} />} label="Balans" value={stats.balance.toLocaleString() + " so'm"} />
                <StatCard icon={<Clock size={20} />} label="Faol buyurtmalar" value={stats.activeOrders} />
                <StatCard icon={<Users size={20} />} label="Jami buyurtmalar" value={stats.totalOrders} />
                <StatCard icon={<Calendar size={20} />} label="3-kunda bajarildi" value={stats.completed3Days} />
                <StatCard icon={<Calendar size={20} />} label="6-kunda bajarildi" value={stats.completed6Days} />
                <StatCard icon={<DollarSign size={20} />} label="3-kunda jami summa" value={stats.sum3Days.toLocaleString() + " so'm"} />
            </div>


            {/* Bar chart: бронь за 7 дней */}
            <div className="bg-white rounded-2xl shadow p-4">
                <h3 className="text-lg font-bold mb-4 text-gray-800">
                    So‘nggi 7 kun: bronlar faolligi
                </h3>

                {bookings7DaysChart.every(d => d.bookings === 0) ? (
                    <p className="text-gray-500 text-sm">So‘nggi 7 kunda bronlar yo‘q</p>
                ) : (
                    <div className="w-full h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={bookings7DaysChart}>
                                <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fill: "#6B7280", fontSize: 12 }}
                                />
                                <YAxis allowDecimals={false} />
                                <Tooltip
                                    formatter={(value) => [`${value}`, "Bronlar soni"]}
                                />
                                <Bar
                                    dataKey="bookings"
                                    fill="#4D77FF"
                                    radius={[8, 8, 0, 0]}
                                    maxBarSize={40}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {sales7DaysChart.length > 0 && (
                <div className="bg-white rounded-2xl shadow p-4 space-y-3">
                    <h3 className="text-sm font-bold text-gray-800">
                        So‘nggi 7 kun savdolari (tariflar bo‘yicha)
                    </h3>

                    <div className="w-full h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sales7DaysChart}>
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip
                                    formatter={(value) => [`${value.toLocaleString()} so'm`, "Savdo"]}
                                />
                                <Bar dataKey="sales" fill="#4D77FF" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}



            {/* Фильтры заказов */}
            <div className="flex gap-2 overflow-x-auto">
                {["all", "pending", "accepted", "completed"].map(status => (
                    <button
                        key={status}
                        className={`px-3 py-1 rounded-full flex-shrink-0 ${filterStatus === status ? "bg-[#4D77FF] text-white" : "bg-[#EEEEEE] text-gray-700"}`}
                        onClick={() => setFilterStatus(status)}
                    >
                        {status === "all" ? "Hammasi" : status === "pending" ? "Jarayonda" : status === "completed" ? "Qabul qilingan" : "Bajarilgan"}
                    </button>
                ))}
            </div>



            {/* Список заказов */}
            <div className="bg-[#EEEEEE] rounded-2xl shadow p-4 space-y-3 max-h-[44vh] overflow-y-auto">
                {filteredOrders.length === 0 ? (
                    <p className="text-gray-500 text-sm">Buyurtmalar yo'q</p>
                ) : (
                    <ul className="space-y-3">
                        {[...filteredOrders]
                            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                            .map(order => (
                                <li
                                    key={order._id}
                                    className="flex flex-col md:flex-row justify-between items-start md:items-center p-3 border rounded-lg hover:shadow-sm transition cursor-pointer"
                                    onClick={() => setSelectedOrder(order)}
                                >
                                <div className="flex items-start gap-3">
                                    <div className="w-12 h-12 rounded-md bg-[#EEEEEE] flex items-center justify-center text-sm font-semibold text-gray-700">
                                        <FontAwesomeIcon icon={faCar} size="lg" />
                                    </div>

                                    <div>
                                        <p className="font-medium">{order.carModel || order.carNumber}</p>
                                        <p className="text-xs text-gray-500">Vaqt (bugun): {order.slot || "—"} · {order.priceType?.split("–")[1] || "—"} so'm</p>
                                        <p className="text-xs text-gray-400 mt-1">#{order.order_id || order._id}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 mt-3 md:mt-0">
                  <span className={`text-sm font-semibold ${order.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}`}>
                    {order.status === 'completed' ? 'Bajarilgan' : order.status === 'pending' ? 'Qabul qilingan' : 'Jarayonda'}
                  </span>

                                    {order.status !== "completed" && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                completeOrderMutation.mutate(order._id);
                                            }}
                                            className="py-1 px-3 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white text-sm shadow"
                                        >
                                            <CheckCircle size={14} className="inline-block mr-1" /> Bajarildi
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Модальное окно */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 p-4">
                    <div className="bg-[#EEEEEE] rounded-3xl shadow-xl w-full max-w-md p-6 space-y-5 relative">
                        <button
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition"
                            onClick={() => setSelectedOrder(null)}
                        >
                            <XCircle size={28} />
                        </button>

                        <h3 className="text-2xl font-bold text-gray-800 border-b pb-2">Buyurtma tafsilotlari</h3>

                        <div className="space-y-2 text-gray-700">
                            <div className="flex justify-between"><span className="font-semibold">Buyurtma raqami:</span><span className="text-blue-600">#{selectedOrder.order_id || selectedOrder._id}</span></div>
                            <div className="flex justify-between"><span className="font-semibold">Avtomobil raqami:</span><span>{selectedOrder.carNumber || "-"}</span></div>
                            <div className="flex justify-between"><span className="font-semibold">Kelish vaqti:</span><span>{selectedOrder.slot || "-"}</span></div>
                            <div className="flex justify-between"><span className="font-semibold">Tarif:</span><span>{selectedOrder.priceType?.split("–")[0] || "-"}</span></div>
                            <div className="flex justify-between"><span className="font-semibold">Summasi:</span><span>{selectedOrder.priceType?.split("–")[1] || "0"} so'm</span></div>
                            <div className="flex justify-between"><span className="font-semibold">Telefon raqami:</span><span>{selectedOrder.phoneNumber || "ko'rsatilmagan"}</span></div>
                            <div className="flex justify-between"><span className="font-semibold">Status:</span><span className={`font-bold ${selectedOrder.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}`}>{selectedOrder.status === 'completed' ? 'Bajarildi' : 'Jarayonda'}</span></div>
                        </div>

                        {selectedOrder.status !== "completed" && (
                            <button
                                onClick={() => {
                                    completeOrderMutation.mutate(selectedOrder._id);
                                    setSelectedOrder(null);
                                }}
                                className="w-full mt-4 py-3 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold flex justify-center items-center gap-3 shadow hover:from-green-600 hover:to-green-700 transition"
                            >
                                <CheckCircle size={20} /> Bajarildi
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ icon, label, value }) {
    return (
        <div className="bg-white p-3 rounded-2xl shadow flex flex-col items-start">
            <div className="text-[#4D77FF] mb-1">{icon}</div>
            <p className="text-gray-500 text-xs">{label}</p>
            <p className="text-sm font-bold text-gray-900">{value}</p>
        </div>
    );
}
