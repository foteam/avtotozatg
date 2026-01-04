import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import WebApp from "@twa-dev/sdk";
import { ArrowLeft, Droplet } from "lucide-react";

const USER_API_URL = "https://114-29-236-86.cloud-xip.com/api/user";

// 🔹 тот же fade
const fade = (delay = 0) => ({
    initial: { opacity: 0, y: 14, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: {
        delay,
        duration: 0.15,
        ease: "easeOut",
        scale: { type: "spring", stiffness: 160, damping: 18 }
    }
});

export default function CarDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        WebApp.BackButton.show();
        WebApp.onEvent("backButtonClicked", () => navigate(-1));

        return () => {
            WebApp.BackButton.hide();
            WebApp.offEvent("backButtonClicked");
        };
    }, [navigate]);

    // 🚗 загрузка авто
    const { data, isLoading } = useQuery({
        queryKey: ["car", id],
        queryFn: async () => {
            const res = await axios.get(
                `${USER_API_URL}/garage/car/${id}`
            );
            return res.data.car;
        }
    });

    // 🦴 Skeleton
    if (isLoading) {
        return (
            <div className="p-4 mt-16 space-y-4">
                <div className="h-6 bg-gray-200 rounded-full w-2/3 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded-full w-1/3 animate-pulse" />
                <div className="h-20 bg-gray-200 rounded-2xl animate-pulse" />
                <div className="h-12 bg-gray-200 rounded-2xl animate-pulse" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="p-4 mt-24 text-center text-gray-500">
                Avtomobil topilmadi
            </div>
        );
    }

    return (
        <div className="p-4 pb-28">

            {/* HEADER */}
            <motion.div
                className="flex items-center gap-3 mt-16 mb-6"
                {...fade(0.05)}
            >
                <button
                    onClick={() => navigate(-1)}
                    className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
                >
                    <ArrowLeft size={18} />
                </button>

                <div>
                    <h1 className="text-xl font-bold text-gray-800">
                        {data.brand} {data.model}
                    </h1>
                    <p className="text-sm text-gray-500">
                        {formatPlate(data.plateNumber)}
                    </p>
                </div>
            </motion.div>

            {/* INFO CARD */}
            <motion.div
                className="bg-white rounded-2xl shadow p-4 mb-6"
                {...fade(0.1)}
            >
                <div className="flex justify-between items-center mb-3">
                    <p className="font-semibold text-gray-700">
                        Avtomobil holati
                    </p>

                    <span
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: colorMap[data.color] }}
                    />
                </div>

                {/* CLEANLINESS */}
                <div className="mb-2 flex justify-between text-sm text-gray-500">
                    <span>Tozaligi</span>
                    <span>{data.cleanliness}%</span>
                </div>

                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className={`h-full ${
                            data.cleanliness > 70
                                ? "bg-green-500"
                                : data.cleanliness > 40
                                    ? "bg-yellow-400"
                                    : "bg-red-500"
                        }`}
                        style={{ width: `${data.cleanliness}%` }}
                    />
                </div>

                {data.lastWashAt && (
                    <p className="text-xs text-gray-500 mt-3">
                        Oxirgi yuvish:{" "}
                        {new Date(data.lastWashAt).toLocaleDateString()}
                    </p>
                )}
            </motion.div>

            {/* ACTION */}
            <motion.button
                onClick={() =>
                    navigate(`/`, {
                        state: { carNumber: formatPlate(data.plateNumber) }
                    })
                }
                className="w-full py-4 rounded-2xl bg-[#4D77FF] text-white font-semibold shadow-lg flex items-center justify-center gap-2"
                {...fade(0.15)}
            >
                <Droplet size={18} />
                Moykaga bron qilish
            </motion.button>
        </div>
    );
}

// 🔹 формат номера
function formatPlate(value = "") {
    if (value.length === 8) {
        return `${value.slice(0,2)} ${value.slice(2,3)} ${value.slice(3,6)} ${value.slice(6)}`;
    }
    return value;
}

// 🎨 цвета авто
const colorMap = {
    white: "#ffffff",
    black: "#000000",
    silver: "#d1d5db",
    gray: "#6b7280",
    blue: "#3b82f6"
};
