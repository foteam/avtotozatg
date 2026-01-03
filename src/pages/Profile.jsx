import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faWallet, faClock, faEdit, faTimes } from "@fortawesome/free-solid-svg-icons";
import { motion, AnimatePresence } from "framer-motion"

/*import Eruda from "eruda";

Eruda.init();*/

const API_URL = "https://114-29-236-86.cloud-xip.com/api/user";
const BOOKINGS_API_URL = "https://114-29-236-86.cloud-xip.com/api/booking";

export default function UserPage({ user_id }) {
    const [selectedBooking, setSelectedBooking] = useState(null);

    // ================== USER ==================
    const {data: user, isLoading, error} = useQuery({
        queryKey: ["user", user_id?.id || user_id],
        queryFn: async () => {
            const id = typeof user_id === "object" ? user_id.id : user_id;
            const res = await axios.get(`${API_URL}/check/${id}`);
            return res.data.user;
        },
        enabled: !!user_id,
        refetchInterval: 5000,
    });

    // ================== BOOKINGS ==================
    const {data: bookings, isLoading: loadingBookings} = useQuery({
        queryKey: ["bookings", user_id],
        queryFn: async () => {
            const id = typeof user_id === "object" ? user_id.id : user_id;
            const res = await axios.get(`${BOOKINGS_API_URL}/user/${id}`);
            return res.data;
        },
        enabled: !!user_id,
        refetchInterval: 5000,
    });

    // Loading state
    if (!user_id || isLoading) {
        return (
            <div className="flex items-center justify-center w-screen h-screen bg-[#EEEEEE]">
                <p className="text-gray-700 text-lg font-medium">Ma’lumotlar yuklanmoqda...</p>
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="flex items-center justify-center w-screen h-screen bg-[#EEEEEE]">
                <p className="text-red-600 text-lg">Xatolik! Ma'lumot topilmadi.</p>
            </div>
        );
    }

    return (
        <div className="bg-[#EEEEEE] min-h-screen w-screen p-4">

            {/* ========= PROFILE HEADER ========= */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="relative bg-white shadow-md rounded-3xl p-6 mt-16"
            >
                <div className="flex items-center gap-5">

                    <motion.img
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.15 }}
                        src={user.avatar || "https://i.pravatar.cc/100?img=12"}
                        alt={user.name}
                        className="w-20 h-20 rounded-2xl object-cover shadow-md border border-gray-100"
                    />

                    <div className="flex-1">
                        <motion.h2
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-2xl font-bold text-gray-900 leading-tight"
                        >
                            {user.name}
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.28 }}
                            className="text-gray-500 text-sm mt-1"
                        >
                            {user.phone}
                        </motion.p>
                    </div>

                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 180 }}
                        className="p-3 bg-[#4D77FF] text-white rounded-xl hover:bg-[#3b64e0] transition shadow-md"
                    >
                        <FontAwesomeIcon icon={faEdit} />
                    </motion.button>
                </div>
            </motion.div>

            {/* ========= BOOKINGS ========= */}
            <div className="mt-7 mb-24">
                <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2"
                >
                    <FontAwesomeIcon icon={faClock} />
                    Tashriflar tarixi
                </motion.h2>

                {loadingBookings ? (
                    <p className="text-center text-gray-500 py-6">Yuklanmoqda...</p>
                ) : bookings?.length > 0 ? (
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={{
                            hidden: { opacity: 1 },
                            visible: {
                                opacity: 1,
                                transition: {
                                    staggerChildren: 0.09,
                                }
                            }
                        }}
                        className="flex flex-col gap-4"
                    >
                        {bookings.filter(b => ["pending", "completed"].includes(b.status)).map((b) => {
                            const [tariffName, tariffPrice] = b.priceType.split(" – ");

                            return (
                                <motion.div
                                    key={b._id}
                                    variants={{
                                        hidden: { opacity: 0, y: 20 },
                                        visible: { opacity: 1, y: 0 }
                                    }}
                                    whileHover={{ scale: 1.02 }}
                                    transition={{ duration: 0.25 }}
                                    onClick={() => setSelectedBooking(b)}
                                    className="p-5 bg-white rounded-3xl shadow hover:shadow-lg transition cursor-pointer border border-gray-50"
                                >
                                    <div className="flex justify-between items-center">

                                        <div>
                                            <p className="font-semibold text-gray-900 text-lg">
                                                {b.wash?.name}
                                            </p>

                                            <p className="text-gray-500 text-sm mt-1">
                                                {new Date(b.createdAt).toLocaleDateString()} • {b.slot}
                                            </p>

                                            <p className="text-gray-600 text-sm mt-2">
                                                <span className="font-medium text-gray-800">{tariffName}</span>
                                                — {Number(tariffPrice)?.toLocaleString()} so'm
                                            </p>
                                        </div>

                                        <div className="text-right">
                                            <p className="font-bold text-gray-900 text-lg">
                                                {Number(tariffPrice)?.toLocaleString()} so'm
                                            </p>

                                            <p className={`text-xs mt-1 font-medium ${
                                                b.status === "completed"
                                                    ? "text-green-600"
                                                    : b.status === "pending"
                                                        ? "text-gray-600"
                                                        : "text-red-600"
                                            }`}>
                                                {b.status === "pending" ? "Kutilmoqda" : b.status === "completed" ? "Bajarilgan" : "" }
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                ) : (
                    <p className="text-center text-gray-500 py-6">Hali tashriflar yo'q 😔</p>
                )}
            </div>

            {/* ========= MODAL (ANIMATED) ========= */}

            <AnimatePresence>
                {selectedBooking && (
                    <motion.div
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end justify-center z-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15, ease: "linear" }}
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ duration: 0.18, ease: "easeOut" }}  // строгая анимация
                            className="
                    bg-white
                    w-full
                    max-w-md
                    rounded-t-3xl
                    shadow-xl
                    p-7
                    relative
                    pb-10
                    min-h-[55vh]
                "
                        >
                            {/* CLOSE BUTTON */}
                            <button
                                onClick={() => setSelectedBooking(null)}
                                className="absolute top-5 right-5 text-gray-500 hover:text-gray-700"
                            >
                                <FontAwesomeIcon icon={faTimes} className="text-xl" />
                            </button>

                            <h2 className="text-2xl font-bold text-gray-900 mb-5">
                                Buyurtma tafsilotlari
                            </h2>

                            <div className="space-y-3 text-gray-900 text-base">
                                <p><strong>Moyka:</strong> {selectedBooking.wash?.name}</p>
                                <p><strong>Sana:</strong> {new Date(selectedBooking.createdAt).toLocaleDateString()} • {selectedBooking.slot}</p>
                                <p><strong>Tarif:</strong> {selectedBooking.priceType.split(" – ")[0]}</p>
                                <p><strong>Narx:</strong> {Number(selectedBooking.priceType.split(" – ")[1]).toLocaleString()} so'm</p>

                                <p>
                                    <strong>Holat:</strong>{" "}
                                    <span className={
                                        selectedBooking.status === "completed"
                                            ? "text-green-600"
                                            : selectedBooking.status === "pending"
                                                ? "text-gray-800"
                                                : "text-red-600"
                                    }>
                            {selectedBooking.status === "pending" ? "Kutilmoqda" : selectedBooking.status === "completed" ? "Bajarilgan" : "" }
                        </span>
                                </p>
                            </div>

                            {/* YOPISH */}
                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                transition={{ duration: 0.08 }}
                                onClick={() => setSelectedBooking(null)}
                                className="
                        mt-8
                        w-full
                        bg-[#4D77FF]
                        text-white
                        py-3
                        rounded-2xl
                        font-semibold
                        shadow
                        hover:bg-[#3b64e0]
                        transition
                        mb-4
                    "
                            >
                                Yopish
                            </motion.button>

                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );

}
