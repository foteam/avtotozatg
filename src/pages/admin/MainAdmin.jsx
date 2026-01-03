import { useState, useEffect } from "react";
import axios from "axios";
import { Users, Building2, DollarSign, Calendar, X, Plus } from "lucide-react";

// -------------------- CONFIG --------------------
const IMGBB_API_KEY = "01074699432b7e4645f98fe66efebec3";

const OWNERS_BASE_URL = "https://114-29-236-86.cloud-xip.com/api/admin/carwash";
const BOOKING_API_URL = "https://114-29-236-86.cloud-xip.com/api/booking";

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState("stats");

    // -------------------- STATE --------------------
    const [owners, setOwners] = useState([]);
    const [withdraws, setWithdraws] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [promocodes, setPromocodes] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [uploading, setUploading] = useState(false);

    const [withdrawPage, setWithdrawPage] = useState(1);
    const [withdrawFilter, setWithdrawFilter] = useState("all");
    const withdrawPageSize = 5;

    const [bookingPage, setBookingPage] = useState(1);
    const [bookingFilter, setBookingFilter] = useState("all");
    const bookingPageSize = 5;

    const [transactionPage, setTransactionPage] = useState(1);
    const [transactionPageSize] = useState(10); // можно 5, но 10 лучше

    const [selectedWash, setSelectedWash] = useState(null);

    const [stats, setStats] = useState({
        users: 0,
        washes: 0,
        totalIncome: 0,
        bookings: 0,
    });

    const [promoForm, setPromoForm] = useState({
        code: "",
        discount: "",
        usageLimit: ""
    });

    const [ownerForm, setOwnerForm] = useState({
        user_id: "",
        name: "",
        groupId: "",
        phone: "",
        carwashName: "",
        description: "",
        address: "",
        city: "",
        banner: "",
        images: [],
        comission: 25,
        balance: 0,

        location: [41.311081, 69.240562],

        prices: [],
        fromHour: "09:00",
        toHour: "18:00",
        slots: []
    });

    // -------------------- LOAD DATA --------------------
    useEffect(() => {
        fetchOwners();
        fetchWithdraws();
        fetchBookings();
        fetchTransactions();
        fetchStats();
        fetchPromocodes();
    }, []);

    const fetchPromocodes = async () => {
        try {
            const res = await axios.get(OWNERS_BASE_URL + "/promocodes");
            setPromocodes(res.data.promocodes || []);
        } catch (err) {
            console.error(err);
            alert("Ошибка загрузки промокодов");
        }
    };

    const fetchStats = async () => {
        try {
            const resOwners = await axios.get(OWNERS_BASE_URL + "/owners");
            const resUsers = await axios.get(OWNERS_BASE_URL + "/users");
            const resBookings = await axios.get(BOOKING_API_URL + "/all");

            setStats({
                users: resUsers.data.users?.length || 0,
                washes: resOwners.data.owners?.length || 0,
                totalIncome: 0,
                bookings: resBookings.data?.length || 0
            });
        } catch {}
    };

    const fetchOwners = async () => {
        try {
            const res = await axios.get(OWNERS_BASE_URL + "/owners");
            setOwners(res.data.owners);
        } catch (err) {}
    };

    const fetchWithdraws = async () => {
        try {
            const res = await axios.get(OWNERS_BASE_URL + "/payouts");
            setWithdraws(res.data.withdraws);
        } catch {}
    };

    const fetchBookings = async () => {
        try {
            const res = await axios.get(BOOKING_API_URL + "/all");
            setBookings(res.data || []);
        } catch {}
    };

    const fetchTransactions = async () => {
        try {
            const res = await axios.get(OWNERS_BASE_URL + "/transactions");
            setTransactions(res.data.transactions || []);
        } catch {}
    };
    console.log(bookings)
    // -------------------- WITHDRAW ACTION --------------------
    const handleWithdrawAction = async (id, action) => {
        try {
            await axios.post(`${OWNERS_BASE_URL}/payout/${id}`, { action });
            fetchWithdraws();
        } catch {}
    };

    // -------------------- ADD OWNER --------------------
    const handleAddOwner = async (e) => {
        e.preventDefault();

        await axios.post(OWNERS_BASE_URL + "/owner", {
            user_id: ownerForm.user_id,
            name: ownerForm.name,
            phone: ownerForm.phone,

            carwashData: {
                carwash_id: Math.floor(100000 + Math.random() * 900000),
                name: ownerForm.carwashName,
                groupId: ownerForm.groupId,
                description: ownerForm.description,
                banner: ownerForm.banner,
                images: ownerForm.images,
                location: ownerForm.location,
                city: ownerForm.city,
                address: ownerForm.address,
                balance: ownerForm.balance,
                comission: ownerForm.comission,
                prices: ownerForm.prices,
                slots: ownerForm.slots,
            }
        });

        alert("Владелец добавлен!");

        setOwnerForm({
            user_id: "",
            name: "",
            phone: "",
            groupId: "",
            carwashName: "",
            description: "",
            address: "",
            city: "",
            banner: "",
            images: [],
            comission: 25,
            balance: 0,
            location: [41.311081, 69.240562],
            prices: [],
            fromHour: "09:00",
            toHour: "18:00",
            slots: []
        });

        fetchOwners();
    };

    // -------------------- ADD PROMO --------------------
    const handleAddPromo = async (e) => {
        e.preventDefault();

        await axios.post(OWNERS_BASE_URL + "/promocode", promoForm);

        alert("Промокод создан!");
        setPromoForm({ code: "", discount: "", usageLimit: "" });
        fetchPromocodes()
    };

    // -------------------- UPLOAD IMAGE --------------------
    const handleFileChange = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("image", file);

        try {
            const res = await axios.post(
                `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
                formData
            );

            const url = res.data.data.url;

            if (type === "banner") {
                setOwnerForm({ ...ownerForm, banner: url });
            } else {
                setOwnerForm({ ...ownerForm, images: [...ownerForm.images, url] });
            }
        } finally {
            setUploading(false);
        }
    };

    const removeImage = (index) => {
        setOwnerForm({
            ...ownerForm,
            images: ownerForm.images.filter((_, i) => i !== index)
        });
    };

    // -------------------- PRICES --------------------
    const addPrice = () => {
        setOwnerForm({ ...ownerForm, prices: [...ownerForm.prices, { type: "", price: "" }] });
    };

    const removePrice = (index) => {
        setOwnerForm({ ...ownerForm, prices: ownerForm.prices.filter((_, i) => i !== index) });
    };

    const updatePrice = (index, field, value) => {
        const updated = [...ownerForm.prices];
        updated[index][field] = value;
        setOwnerForm({ ...ownerForm, prices: updated });
    };

    // ------------------ FILTER AND PAGES BOOKINGS -----------------------
    const filteredBookings = bookings
        .filter(b => bookingFilter === "all" ? true : b.status === bookingFilter)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // новые сверху

    const bookingTotalPages = Math.ceil(filteredBookings.length / bookingPageSize);
    const visibleBookings = filteredBookings.slice(
        (bookingPage - 1) * bookingPageSize,
        bookingPage * bookingPageSize
    );

    // ------------------- FILTER AND PAGES TRANSACTIONS -------------------
    const paidTransactions = bookings.filter(b =>
        ["pending", "accepted", "completed"].includes(b.status)
    ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const transactionTotalPages = Math.ceil(paidTransactions.length / transactionPageSize);

    const visibleTransactions = paidTransactions.slice(
        (transactionPage - 1) * transactionPageSize,
        transactionPage * transactionPageSize
    );


    // ------------------ FILTER AND PAGES WITHDRAW -----------------------
    const filteredWithdraws = withdraws
        .filter(w => withdrawFilter === "all" ? true : w.status === withdrawFilter)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // новые сверху

    const totalPages = Math.ceil(filteredWithdraws.length / withdrawPageSize);
    const visibleWithdraws = filteredWithdraws.slice(
        (withdrawPage - 1) * withdrawPageSize,
        withdrawPage * withdrawPageSize
    );

    // -------------------- GENERATE SLOTS --------------------
    const generateSlots = () => {
        const { fromHour, toHour } = ownerForm;
        const slots = [];

        let [sH, sM] = fromHour.split(":").map(Number);
        let [eH, eM] = toHour.split(":").map(Number);

        let start = sH * 60 + sM;
        const end = eH * 60 + eM;

        while (start <= end) {
            const h = Math.floor(start / 60).toString().padStart(2, "0");
            const m = (start % 60).toString().padStart(2, "0");

            slots.push(`${h}:${m}`);
            start += 30; // шаг 30 минут
        }

        setOwnerForm({ ...ownerForm, slots });
    };

    // -------------------- TABS --------------------
    const tabs = [
        { key: "stats", label: "Статистика" },
        { key: "owners", label: "Владельцы" },
        { key: "addOwner", label: "Добавить владельца" },
        { key: "promo", label: "Промокоды" },
        { key: "withdraws", label: "Выводы" },
        { key: "bookings", label: "Брони" },
        { key: "transactions", label: "Транзакции" },
    ];

    return (
        <div className="p-4 bg-[#EEEEEE] min-h-screen w-screen">

            <h1 className="text-3xl font-bold text-gray-900 mb-4 mt-20">Admin Dashboard</h1>

            {/* TABS */}
            <div className="flex justify-center gap-2 mb-6 flex-wrap w-full text-center">
                {tabs.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        className={`px-4 py-2 rounded text-sm ${
                            activeTab === t.key
                                ? "bg-blue-600 text-white"
                                : "bg-white text-gray-700 shadow"
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* -------------------- CONTENT -------------------- */}
            <div className="space-y-4 w-full max-w-full">

                {/* --- STATS --- */}
                {activeTab === "stats" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard icon={<Users size={24} />} label="Пользователи" value={stats.users} />
                        <StatCard icon={<Building2 size={24} />} label="Мойки" value={stats.washes} />
                        <StatCard icon={<DollarSign size={24} />} label="Доход" value={stats.totalIncome.toLocaleString()} />
                        <StatCard icon={<Calendar size={24} />} label="Броней" value={stats.bookings} />
                    </div>
                )}

                {/* --- OWNERS LIST --- */}
                {activeTab === "owners" && (
                    <div className="bg-white p-4 rounded-xl shadow">
                        <h2 className="text-xl font-semibold mb-3">Список владельцев</h2>

                        {owners.length === 0 ? (
                            <p>Нет владельцев</p>
                        ) : (
                            owners.map(o => (
                                <div
                                    key={o.user_id}
                                    className="p-3 border rounded mb-2 bg-gray-50 hover:bg-gray-100 transition cursor-pointer active:scale-[0.98]"
                                    onClick={() =>
                                        setSelectedWash({
                                            ownerName: o.name,
                                            ownerPhone: o.phone,
                                            ...o.carwash,   // populate данные
                                        })
                                    }
                                >
                                    <p className="font-semibold">{o.carwash?.name || "Без названия"}</p>
                                    <p className="text-gray-600">{o.name} — {o.phone}</p>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {selectedWash && (
                    <div className="fixed inset-0 z-[999] bg-black/45 flex items-end justify-center animate-fadeIn">

                        <div
                            className="
                w-full
                max-w-md
                bg-white
                rounded-t-2xl
                shadow-[0_-6px_20px_rgba(0,0,0,0.15)]
                overflow-hidden
                animate-slideUp
                max-h-[90vh]
                flex flex-col
            "
                        >
                            {/* Drag handle */}
                            <div className="w-full py-3 flex justify-center">
                                <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
                            </div>

                            {/* Title + Close */}
                            <div className="px-4 pb-2 flex items-center justify-between">
                                <h2 className="text-xl font-bold leading-tight">
                                    {selectedWash.name}
                                </h2>

                                <button
                                    onClick={() => setSelectedWash(null)}
                                    className="bg-gray-200 hover:bg-gray-300 p-1.5 rounded-full transition"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* CONTENT SCROLL */}
                            <div className="px-4 pb-4 overflow-y-auto custom-scroll flex-1">

                                {/* Banner */}
                                {selectedWash.banner && (
                                    <img
                                        src={selectedWash.banner}
                                        className="w-full h-36 object-cover rounded-lg mb-3 shadow-sm"
                                    />
                                )}

                                {/* Info */}
                                <div className="space-y-1 text-[13px]">
                                    <p><span className="font-semibold">Владелец:</span> {selectedWash.ownerName}</p>
                                    <p><span className="font-semibold">Телефон:</span> {selectedWash.ownerPhone}</p>
                                    <p><span className="font-semibold">Город:</span> {selectedWash.city}</p>
                                    <p><span className="font-semibold">Адрес:</span> {selectedWash.address}</p>
                                </div>

                                {/* Description */}
                                {selectedWash.description && (
                                    <>
                                        <h3 className="font-semibold mt-4 mb-1 text-sm">Описание</h3>
                                        <p className="text-gray-700 text-[13px] leading-snug">
                                            {selectedWash.description}
                                        </p>
                                    </>
                                )}

                                {/* Gallery */}
                                {selectedWash.images?.length > 0 && (
                                    <>
                                        <h3 className="font-semibold mt-4 mb-2 text-sm">Галерея</h3>

                                        <div className="grid grid-cols-3 gap-2">
                                            {selectedWash.images.map((img, i) => (
                                                <img
                                                    key={i}
                                                    src={img}
                                                    className="w-full h-20 object-cover rounded-md shadow-sm"
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}

                                {/* Prices */}
                                {selectedWash.prices?.length > 0 && (
                                    <>
                                        <h3 className="font-semibold mt-4 mb-1 text-sm">Тарифы</h3>

                                        <ul className="text-[13px] text-gray-800">
                                            {selectedWash.prices.map((p, i) => (
                                                <li
                                                    key={i}
                                                    className="flex justify-between border-b py-1 last:border-none"
                                                >
                                                    <span>{p.type}</span>
                                                    <span className="font-semibold">{p.price} сум</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}

                                {/* Slots */}
                                {selectedWash.slots?.length > 0 && (
                                    <>
                                        <h3 className="font-semibold mt-4 mb-2 text-sm">Слоты</h3>

                                        <div className="flex flex-wrap gap-1.5">
                                            {selectedWash.slots.map((s, i) => (
                                                <span
                                                    key={i}
                                                    className="
                                        px-2 py-[3px]
                                        bg-gray-100
                                        rounded-lg
                                        text-[11px]
                                        shadow-sm
                                    "
                                                >
                                    {s}
                                </span>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {/* Map */}
                                {selectedWash.location && (
                                    <>
                                        <h3 className="font-semibold mt-4 mb-2 text-sm">Локация</h3>

                                        <iframe
                                            width="100%"
                                            height="180"
                                            className="rounded-xl shadow-sm"
                                            src={`https://yandex.ru/map-widget/v1/?ll=${selectedWash.location[1]},${selectedWash.location[0]}&z=14`}
                                        />
                                    </>
                                )}

                            </div>
                        </div>
                    </div>
                )}



                {/* --- ADD OWNER FORM --- */}
                {activeTab === "addOwner" && (
                    <div className="w-full max-w-[480px] mx-auto overflow-x-hidden">
                        <AddOwnerForm
                            ownerForm={ownerForm}
                            setOwnerForm={setOwnerForm}
                            handleAddOwner={handleAddOwner}
                            handleFileChange={handleFileChange}
                            removeImage={removeImage}
                            addPrice={addPrice}
                            removePrice={removePrice}
                            updatePrice={updatePrice}
                            generateSlots={generateSlots}
                            uploading={uploading}
                        />
                    </div>
                )}

                {activeTab === "promo" && (
                    <div className="bg-white p-4 rounded-xl shadow space-y-6">

                        {/* --- Форма создания промокода --- */}
                        <div>
                            <h2 className="text-xl font-semibold mb-3">Создать промокод</h2>

                            <form className="flex flex-col gap-3" onSubmit={handleAddPromo}>
                                <input
                                    placeholder="Промокод"
                                    value={promoForm.code}
                                    onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value })}
                                    className="p-2 border rounded"
                                />
                                <input
                                    type="number"
                                    placeholder="Скидка %"
                                    value={promoForm.discount}
                                    onChange={(e) => setPromoForm({ ...promoForm, discount: e.target.value })}
                                    className="p-2 border rounded"
                                />
                                <input
                                    type="number"
                                    placeholder="Лимит использования"
                                    value={promoForm.usageLimit}
                                    onChange={(e) => setPromoForm({ ...promoForm, usageLimit: e.target.value })}
                                    className="p-2 border rounded"
                                />

                                <button type="submit" className="bg-green-600 text-white py-2 rounded-lg">
                                    Создать
                                </button>
                            </form>
                        </div>

                        {/* --- СПИСОК ПРОМОКОДОВ --- */}
                        <div>
                            <h2 className="text-xl font-semibold mb-3">Список промокодов</h2>

                            {promocodes.length === 0 ? (
                                <p className="text-gray-500">Промокодов нет</p>
                            ) : (
                                <div className="space-y-2">
                                    {promocodes.map((p) => (
                                        <div
                                            key={p._id}
                                            className="p-3 border rounded-lg flex justify-between items-center bg-gray-50"
                                        >
                                            <div>
                                                <p className="font-semibold text-lg">{p.promoCode}</p>
                                                <p className="text-gray-600">
                                                    Скидка: {p.discount}% — Использований: {p.uses}
                                                </p>
                                                <p className="text-gray-600">
                                                    Максимальное кол-во: {p.maxUses}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- WITHDRAWS --- */}
                {activeTab === "withdraws" && (
                    <div className="p-3 bg-white min-h-screen w-full max-w-[480px] mx-auto overflow-x-hidden rounded-sm">

                        {/* ФИЛЬТРЫ */}
                        <div className="flex flex-wrap gap-2 mb-3">
                            {["all", "pending", "approved", "cancelled"].map(s => (
                                <button
                                    key={s}
                                    onClick={() => { setWithdrawFilter(s); setWithdrawPage(1); }}
                                    className={`px-3 py-1 rounded text-sm ${
                                        withdrawFilter === s
                                            ? "bg-blue-600 text-white"
                                            : "bg-white shadow text-gray-700"
                                    }`}
                                >
                                    {s === "all" ? "Все" :
                                        s === "pending" ? "В ожидании" :
                                            s === "approved" ? "Подтверждено" :
                                                s === "cancelled" ? "Отменено" : s}
                                </button>
                            ))}
                        </div>

                        {/* СПИСОК */}
                        {visibleWithdraws.length === 0 ? (
                            <p className="text-gray-500">Нет заявок</p>
                        ) : (
                            <div className="space-y-2">
                                {visibleWithdraws.map(w => (
                                    <div
                                        key={w._id}
                                        className="p-3 border rounded bg-white flex justify-between items-start"
                                    >
                                        <div className="text-sm">
                                            <p className="font-semibold">{w.wash[0].name}</p>
                                            <p className="text-gray-600">
                                                Сумма: {w.amount.toLocaleString()} сум
                                            </p>
                                            <p className="text-gray-600">
                                                Статус:
                                                <span
                                                    className={
                                                        w.status === "pending"
                                                            ? "text-yellow-600 ml-1"
                                                            : w.status === "approved"
                                                                ? "text-green-600 ml-1"
                                                                : "text-red-600 ml-1"
                                                    }
                                                >
                                    {w.status}
                                </span>
                                            </p>
                                        </div>

                                        {w.status === "pending" && (
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={() => handleWithdrawAction(w._id, "approve")}
                                                    className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                                                >
                                                    Принять
                                                </button>

                                                <button
                                                    onClick={() => handleWithdrawAction(w._id, "cancel")}
                                                    className="bg-red-600 text-white px-3 py-1 rounded text-sm"
                                                >
                                                    Отклонить
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ПАГИНАЦИЯ */}
                        {totalPages > 1 && (
                            <div className="flex gap-3 items-center justify-center pt-3 text-sm">
                                <button
                                    disabled={withdrawPage === 1}
                                    onClick={() => setWithdrawPage(p => p - 1)}
                                    className={`px-3 py-1 rounded ${
                                        withdrawPage === 1
                                            ? "bg-gray-200 text-gray-400"
                                            : "bg-white shadow"
                                    }`}
                                >
                                    ← Назад
                                </button>

                                <span className="font-semibold">
                    {withdrawPage} / {totalPages}
                </span>

                                <button
                                    disabled={withdrawPage === totalPages}
                                    onClick={() => setWithdrawPage(p => p + 1)}
                                    className={`px-3 py-1 rounded ${
                                        withdrawPage === totalPages
                                            ? "bg-gray-200 text-gray-400"
                                            : "bg-white shadow"
                                    }`}
                                >
                                    Вперёд →
                                </button>
                            </div>
                        )}

                    </div>
                )}


                {/* --- BOOKINGS --- */}
                {activeTab === "bookings" && (
                    <div className="p-3 bg-white min-h-screen w-full max-w-[480px] mx-auto overflow-x-hidden rounded-sm">

                        {/* FILTERS */}
                        <div className="flex flex-wrap gap-2 mb-3">
                            {["all", "pending", "accepted", "completed", "cancelled"].map(s => (
                                <button
                                    key={s}
                                    onClick={() => { setBookingFilter(s); setBookingPage(1); }}
                                    className={`px-3 py-1 rounded text-sm ${
                                        bookingFilter === s
                                            ? "bg-blue-600 text-white"
                                            : "bg-white shadow text-gray-700"
                                    }`}
                                >
                                    {s === "all" ? "Все" :
                                        s === "pending" ? "Ожидание" :
                                            s === "accepted" ? "Принято" :
                                                s === "completed" ? "Завершено" :
                                                    s === "cancelled" ? "Отменено" : s}
                                </button>
                            ))}
                        </div>

                        {/* LIST */}
                        {visibleBookings.length === 0 ? (
                            <p className="text-gray-500">Нет броней</p>
                        ) : (
                            <div className="space-y-2">
                                {visibleBookings.map(b => (
                                    <div
                                        key={b._id}
                                        className="p-3 border rounded bg-white flex justify-between items-center"
                                    >
                                        <div className="text-sm">
                                            <p className="font-semibold">{b.carNumber}</p>
                                            <p className="text-gray-600">{b.wash?.name}</p>
                                            <p className="text-gray-500">{b.phoneNumber}</p>
                                        </div>

                                        <span
                                            className={
                                                b.status === "pending"
                                                    ? "text-yellow-600 text-sm"
                                                    : b.status === "accepted"
                                                        ? "text-blue-600 text-sm"
                                                        : b.status === "completed"
                                                            ? "text-green-600 text-sm"
                                                            : "text-red-600 text-sm"
                                            }
                                        >
                            {b.status}
                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* PAGINATION */}
                        {bookingTotalPages > 1 && (
                            <div className="flex gap-3 items-center justify-center pt-3 text-sm">
                                <button
                                    disabled={bookingPage === 1}
                                    onClick={() => setBookingPage(p => p - 1)}
                                    className={`px-3 py-1 rounded ${
                                        bookingPage === 1
                                            ? "bg-gray-200 text-gray-400"
                                            : "bg-white shadow"
                                    }`}
                                >
                                    ← Назад
                                </button>

                                <span className="font-semibold">
                    {bookingPage} / {bookingTotalPages}
                </span>

                                <button
                                    disabled={bookingPage === bookingTotalPages}
                                    onClick={() => setBookingPage(p => p + 1)}
                                    className={`px-3 py-1 rounded ${
                                        bookingPage === bookingTotalPages
                                            ? "bg-gray-200 text-gray-400"
                                            : "bg-white shadow"
                                    }`}
                                >
                                    Вперёд →
                                </button>
                            </div>
                        )}

                    </div>
                )}


                {/* --- TRANSACTIONS --- */}
                {activeTab === "transactions" && (
                    <div className="p-4 bg-white min-h-screen w-full max-w-full overflow-x-hidden rounded-sm">

                        {/* TRANSACTIONS LIST */}
                        {visibleTransactions.length === 0 ? (
                            <p>Нет транзакций</p>
                        ) : (
                            visibleTransactions.map(t => (
                                <div
                                    key={t._id}
                                    className="p-3 border rounded flex justify-between items-center bg-white"
                                >
                                    <div>
                                        <p className="font-semibold">
                                            #{t.order_id} — {t.wash?.name}
                                        </p>
                                        <p className="text-gray-600">
                                            {Number(t.priceType.split(" – ")[1]).toLocaleString()} сум
                                        </p>
                                    </div>

                                    <span className={
                                        t.status === "pending"
                                            ? "text-green-600"
                                            : t.status === "accepted"
                                                ? "text-blue-600"
                                                : t.status === "completed"
                                                    ? "text-gray-600"
                                                    : "text-red-600"
                                    }>
                        {t.status}
                    </span>
                                </div>
                            ))
                        )}

                        {/* PAGINATION */}
                        {transactionTotalPages > 1 && (
                            <div className="flex gap-4 items-center justify-center pt-2">

                                <button
                                    disabled={transactionPage === 1}
                                    onClick={() => setTransactionPage(p => p - 1)}
                                    className={`px-3 py-1 rounded ${
                                        transactionPage === 1 ? "bg-gray-200 text-gray-400" : "bg-white shadow"
                                    }`}
                                >
                                    ← Назад
                                </button>

                                <span className="font-semibold">
                    {transactionPage} / {transactionTotalPages}
                </span>

                                <button
                                    disabled={transactionPage === transactionTotalPages}
                                    onClick={() => setTransactionPage(p => p + 1)}
                                    className={`px-3 py-1 rounded ${
                                        transactionTotalPages === transactionPage ? "bg-gray-200 text-gray-400" : "bg-white shadow"
                                    }`}
                                >
                                    Вперёд →
                                </button>

                            </div>
                        )}
                    </div>
                )}


            </div>
        </div>
    );
}

// -------------------- STAT CARD --------------------
function StatCard({ icon, label, value }) {
    return (
        <div className="bg-white p-4 rounded-xl shadow flex items-center gap-3">
            <div className="text-blue-600">{icon}</div>
            <div>
                <p className="text-gray-500 text-sm">{label}</p>
                <p className="text-lg font-bold">{value}</p>
            </div>
        </div>
    );
}

// -------------------- ADD OWNER FORM COMPONENT --------------------
function AddOwnerForm({
                          ownerForm,
                          setOwnerForm,
                          handleAddOwner,
                          handleFileChange,
                          removeImage,
                          addPrice,
                          removePrice,
                          updatePrice,
                          generateSlots,
                          uploading
                      }) {
    return (
        <div className="bg-white p-3 rounded-xl shadow space-y-4 w-full max-w-[480px] mx-auto">

            <h2 className="text-xl font-semibold mb-2">Регистрация автомойки</h2>

            <form className="flex flex-col gap-3 w-full" onSubmit={handleAddOwner}>

                {/* TELEGRAM FIELDS */}
                <input
                    className="p-2 border rounded text-sm"
                    placeholder="Telegram Group ID"
                    value={ownerForm.groupId}
                    onChange={(e) => setOwnerForm({ ...ownerForm, groupId: e.target.value })}
                />

                <input
                    className="p-2 border rounded text-sm"
                    placeholder="Telegram User ID"
                    value={ownerForm.user_id}
                    onChange={(e) => setOwnerForm({ ...ownerForm, user_id: e.target.value })}
                />

                <input
                    className="p-2 border rounded text-sm"
                    placeholder="Имя владельца"
                    value={ownerForm.name}
                    onChange={(e) => setOwnerForm({ ...ownerForm, name: e.target.value })}
                />

                <input
                    className="p-2 border rounded text-sm"
                    placeholder="Телефон"
                    value={ownerForm.phone}
                    onChange={(e) => setOwnerForm({ ...ownerForm, phone: e.target.value })}
                />

                <input
                    className="p-2 border rounded text-sm"
                    placeholder="Название автомойки"
                    value={ownerForm.carwashName}
                    onChange={(e) => setOwnerForm({ ...ownerForm, carwashName: e.target.value })}
                />
                <input
                    className="p-2 border rounded text-sm"
                    placeholder="Комиссия автомойки %"
                    value={ownerForm.comission}
                    onChange={(e) => setOwnerForm({ ...ownerForm, comission: e.target.value })}
                />

                <textarea
                    className="p-2 border rounded text-sm"
                    placeholder="Описание"
                    value={ownerForm.description}
                    onChange={(e) => setOwnerForm({ ...ownerForm, description: e.target.value })}
                />

                {/* ADDRESS */}
                <input
                    className="p-2 border rounded text-sm"
                    placeholder="Город"
                    value={ownerForm.city}
                    onChange={(e) => setOwnerForm({ ...ownerForm, city: e.target.value })}
                />

                <input
                    className="p-2 border rounded text-sm"
                    placeholder="Адрес"
                    value={ownerForm.address}
                    onChange={(e) => setOwnerForm({ ...ownerForm, address: e.target.value })}
                />

                {/* BANNER */}
                <label className="font-semibold text-sm">Баннер</label>
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "banner")} />

                {ownerForm.banner && (
                    <img
                        src={ownerForm.banner}
                        className="w-full h-32 object-cover mt-2 rounded"
                    />
                )}

                {/* GALLERY */}
                <label className="font-semibold text-sm">Галерея</label>
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "images")} />

                {uploading && <p className="text-sm text-gray-500">Загрузка...</p>}

                <div className="flex gap-2 flex-wrap mt-2">
                    {ownerForm.images.map((img, i) => (
                        <div key={i} className="relative">
                            <img src={img} className="w-20 h-20 object-cover rounded" />
                            <button
                                type="button"
                                onClick={() => removeImage(i)}
                                className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* PRICES */}
                <div className="bg-gray-50 p-3 rounded-xl">
                    <h3 className="font-semibold mb-2 text-sm">Тарифы</h3>

                    {ownerForm.prices.map((p, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                            <input
                                className="p-2 border rounded w-1/2 text-sm"
                                placeholder="Тип"
                                value={p.type}
                                onChange={(e) => updatePrice(index, "type", e.target.value)}
                            />
                            <input
                                className="p-2 border rounded w-1/2 text-sm"
                                placeholder="Цена"
                                value={p.price}
                                onChange={(e) => updatePrice(index, "price", e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => removePrice(index)}
                                className="bg-red-500 text-white px-2 rounded"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={addPrice}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                    >
                        <Plus size={14} /> Добавить
                    </button>
                </div>

                {/* WORKING HOURS */}
                <div className="bg-gray-50 p-3 rounded-xl">
                    <h3 className="font-semibold mb-2 text-sm">Часы работы</h3>

                    <div className="flex gap-2">
                        <input
                            type="time"
                            className="p-2 border rounded w-1/2 text-sm"
                            value={ownerForm.fromHour}
                            onChange={(e) => setOwnerForm({ ...ownerForm, fromHour: e.target.value })}
                        />

                        <input
                            type="time"
                            className="p-2 border rounded w-1/2 text-sm"
                            value={ownerForm.toHour}
                            onChange={(e) => setOwnerForm({ ...ownerForm, toHour: e.target.value })}
                        />
                    </div>

                    <button
                        type="button"
                        onClick={generateSlots}
                        className="mt-2 bg-green-600 text-white px-3 py-1 rounded text-sm"
                    >
                        Генерировать слоты
                    </button>

                    <div className="mt-3 flex flex-wrap gap-2">
                        {ownerForm.slots.map((t, i) => (
                            <span key={i} className="px-3 py-1 bg-white rounded shadow text-xs">
                                {t}
                            </span>
                        ))}
                    </div>
                </div>

                {/* LOCATION */}
                <div>
                    <label className="font-semibold text-sm">Координаты</label>

                    <div className="flex gap-2">
                        <input
                            type="number"
                            step="0.00001"
                            className="p-2 border rounded w-1/2 text-sm"
                            value={ownerForm.location[0]}
                            onChange={(e) =>
                                setOwnerForm({
                                    ...ownerForm,
                                    location: [parseFloat(e.target.value), ownerForm.location[1]]
                                })
                            }
                        />

                        <input
                            type="number"
                            step="0.00001"
                            className="p-2 border rounded w-1/2 text-sm"
                            value={ownerForm.location[1]}
                            onChange={(e) =>
                                setOwnerForm({
                                    ...ownerForm,
                                    location: [ownerForm.location[0], parseFloat(e.target.value)]
                                })
                            }
                        />
                    </div>

                    <iframe
                        width="100%"
                        height="180"
                        className="mt-2 rounded"
                        src={`https://yandex.ru/map-widget/v1/?ll=${ownerForm.location[1]},${ownerForm.location[0]}&z=14`}
                    />
                </div>

                <button className="bg-blue-600 text-white py-2 rounded-lg text-lg mt-2">
                    Добавить владельца
                </button>
            </form>
        </div>
    );
}

