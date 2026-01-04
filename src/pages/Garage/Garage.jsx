import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
    useQuery,
    useMutation,
    useQueryClient
} from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import WebApp from "@twa-dev/sdk";
import { Car, Plus, X } from "lucide-react";

const USER_API_URL = "https://114-29-236-86.cloud-xip.com/api/user";

/* ================= ANIMATIONS ================= */

const fadeUp = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.18, ease: "easeOut" }
};

const slideFromRight = {
    initial: { x: "100%" },
    animate: { x: 0 },
    exit: { x: "100%" },
    transition: { type: "spring", stiffness: 220, damping: 26 }
};

/* ================= COMPONENT ================= */

export default function Garage({ user_id }) {
    const queryClient = useQueryClient();

    const [openAdd, setOpenAdd] = useState(false);

    const [form, setForm] = useState({
        plateNumber: "",
        brand: "",
        model: "",
        color: "white",
        isPrimary: true
    });

    /* ========== TELEGRAM ========== */
    useEffect(() => {
        WebApp.expand();
        WebApp.BackButton.hide();
    }, []);

    /* ========== LOAD CARS ========== */
    const { data: cars = [], isLoading } = useQuery({
        queryKey: ["garage", user_id],
        queryFn: async () => {
            const res = await axios.get(
                `${USER_API_URL}/garage/cars/${user_id}`
            );
            return res.data.cars || [];
        },
        enabled: !!user_id
    });

    /* ========== ADD CAR ========== */
    const addCarMutation = useMutation({
        mutationFn: async () => {
            if (!form.plateNumber || !form.brand || !form.model) {
                throw new Error("Majburiy maydonlarni to‘ldiring");
            }

            return axios.post(`${USER_API_URL}/garage/car/add`, {
                user_id,
                ...form,
                plateNumber: form.plateNumber.replace(/\s+/g, "").toUpperCase()
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["garage", user_id]);
            setOpenAdd(false);
            setForm({
                plateNumber: "",
                brand: "",
                model: "",
                color: "white",
                isPrimary: true
            });
        },
        onError: (err) => {
            alert(err.message || "Xatolik yuz berdi");
        }
    });

    /* ================= UI ================= */

    return (
        <div className="w-screen min-h-screen bg-[#EEEEEE] pb-32 overflow-x-hidden">

            {/* ===== HEADER ===== */}
            <div className="fixed top-0 left-0 w-screen z-40 bg-[#EEEEEE] px-4 pt-24 pb-4">
                <h1 className="text-xl font-bold text-gray-800">Sizning avtomobillaringiz:</h1>
            </div>

            {/* ===== CONTENT ===== */}
            <div className="px-4 pt-20 space-y-4">

                {/* SKELETON */}
                {isLoading && (
                    <>
                        {[1, 2, 3].map(i => (
                            <div
                                key={i}
                                className="bg-white rounded-2xl p-4 shadow animate-pulse space-y-3"
                            >
                                <div className="h-4 bg-gray-200 rounded w-1/2" />
                                <div className="h-3 bg-gray-200 rounded w-1/3" />
                                <div className="h-2 bg-gray-200 rounded" />
                            </div>
                        ))}
                    </>
                )}

                {/* EMPTY */}
                {!isLoading && cars.length === 0 && (
                    <motion.div
                        {...fadeUp}
                        className="flex flex-col items-center text-center text-gray-500 mt-20"
                    >
                        <div className="w-16 h-16 rounded-full bg-white shadow flex items-center justify-center mb-4">
                            <Car size={26} className="text-gray-400" />
                        </div>
                        <p className="font-semibold text-gray-700">
                            Avtomobil yo‘q
                        </p>
                        <p className="text-sm mt-1">
                            Avtomobil qo‘shib tezroq bron qiling
                        </p>
                    </motion.div>
                )}

                {/* LIST */}
                {cars.map((car, i) => (
                    <motion.div
                        key={car._id}
                        {...fadeUp}
                        transition={{ delay: i * 0.04 }}
                    >
                        <Link
                            to={`/garage/${car._id}`}
                            className="block bg-white rounded-2xl p-4 shadow active:scale-[0.98]"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold text-gray-800">
                                        {car.brand} {car.model}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {formatPlate(car.plateNumber)}
                                    </p>
                                </div>

                                {car.isPrimary && (
                                    <span className="text-xs px-2 py-1 rounded-full bg-[#4D77FF]/10 text-[#4D77FF]">
                    Asosiy
                  </span>
                                )}
                            </div>

                            <div className="mt-4">
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                    <span>Holati</span>
                                    <span>{car.cleanliness}%</span>
                                </div>

                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${
                                            car.cleanliness > 70
                                                ? "bg-green-500"
                                                : car.cleanliness > 40
                                                    ? "bg-yellow-400"
                                                    : "bg-red-500"
                                        }`}
                                        style={{ width: `${car.cleanliness}%` }}
                                    />
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>

            {/* ===== FAB ===== */}
            <button
                onClick={() => setOpenAdd(true)}
                className="
          fixed bottom-24 right-4 z-40
          w-14 h-14 rounded-full
          bg-[#4D77FF] text-white
          flex items-center justify-center
          shadow-xl active:scale-95
        "
            >
                <Plus size={24} />
            </button>

            {/* ===== ADD CAR FLOW (FULLSCREEN) ===== */}
            <AnimatePresence>
                {openAdd && (
                    <motion.div
                        {...slideFromRight}
                        className="fixed inset-0 z-50 bg-[#EEEEEE]"
                    >
                        {/* HEADER */}
                        <div className="px-4 pt-12 pb-4 flex items-center gap-3">
                            <button
                                onClick={() => setOpenAdd(false)}
                                className="w-9 h-9 rounded-full bg-white shadow flex items-center justify-center"
                            >
                                <X size={18} />
                            </button>
                            <p className="font-semibold text-lg">
                                Avtomobil qo‘shish
                            </p>
                        </div>

                        {/* FORM */}
                        <div className="px-4 pt-6 space-y-8">

                            {/* NUMBER */}
                            <div>
                                <p className="text-sm text-gray-500 mb-2">
                                    Avtomobil raqami
                                </p>
                                <input
                                    placeholder="01 A 777 AA"
                                    value={form.plateNumber}
                                    onChange={e =>
                                        setForm({ ...form, plateNumber: e.target.value })
                                    }
                                    className="
                    w-full p-4 rounded-2xl
                    bg-white shadow
                    text-lg font-semibold tracking-wider
                    focus:outline-none focus:ring-2 focus:ring-[#4D77FF]
                  "
                                />
                            </div>

                            {/* BRAND / MODEL */}
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    placeholder="Marka"
                                    value={form.brand}
                                    onChange={e =>
                                        setForm({ ...form, brand: e.target.value })
                                    }
                                    className="p-4 rounded-2xl bg-white shadow focus:ring-2 focus:ring-[#4D77FF]"
                                />
                                <input
                                    placeholder="Model"
                                    value={form.model}
                                    onChange={e =>
                                        setForm({ ...form, model: e.target.value })
                                    }
                                    className="p-4 rounded-2xl bg-white shadow focus:ring-2 focus:ring-[#4D77FF]"
                                />
                            </div>

                            {/* COLORS */}
                            <div>
                                <p className="text-sm text-gray-500 mb-2">
                                    Avtomobil rangi
                                </p>
                                <div className="flex gap-4">
                                    {COLORS.map(c => (
                                        <button
                                            key={c.key}
                                            onClick={() =>
                                                setForm({ ...form, color: c.key })
                                            }
                                            className={`
                        w-11 h-11 rounded-full
                        ${c.bg}
                        ${
                                                form.color === c.key
                                                    ? `ring-2 ${c.ring}`
                                                    : "border border-gray-300"
                                            }
                      `}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* FOOTER */}
                        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#EEEEEE]">
                            <button
                                onClick={() => addCarMutation.mutate()}
                                disabled={addCarMutation.isPending}
                                className="
                  w-full py-4 rounded-2xl
                  bg-[#4D77FF] text-white
                  font-semibold text-lg
                  shadow-lg disabled:opacity-40
                "
                            >
                                {addCarMutation.isPending
                                    ? "Saqlanmoqda..."
                                    : "Saqlash"}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ================= HELPERS ================= */

function formatPlate(value = "") {
    if (value.length === 8) {
        return `${value.slice(0, 2)} ${value.slice(
            2,
            3
        )} ${value.slice(3, 6)} ${value.slice(6)}`;
    }
    return value;
}

const COLORS = [
    { key: "white", bg: "bg-white", ring: "ring-gray-300" },
    { key: "black", bg: "bg-black", ring: "ring-black" },
    { key: "silver", bg: "bg-gray-200", ring: "ring-gray-400" },
    { key: "gray", bg: "bg-gray-500", ring: "ring-gray-600" },
    { key: "blue", bg: "bg-blue-500", ring: "ring-blue-600" }
];
