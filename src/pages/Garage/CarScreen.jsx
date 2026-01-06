import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import WebApp from "@twa-dev/sdk";
import { motion } from "framer-motion";
import { Droplet } from "lucide-react";

/* ================= CONFIG ================= */

const USER_API_URL = "https://114-29-236-86.cloud-xip.com/api/user";

/* ================= HELPERS ================= */

function formatPlate(plate = "") {
    if (plate.length === 8) {
        return `${plate.slice(0,2)} ${plate.slice(2,3)} ${plate.slice(3,6)} ${plate.slice(6)}`;
    }
    if (plate.length === 7) {
        return `${plate.slice(0,2)} ${plate.slice(2,5)} ${plate.slice(5)}`;
    }
    return plate;
}

const fade = (delay = 0) => ({
    initial: { opacity: 0, y: 14, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: {
        delay,
        duration: 0.25,
        ease: "easeOut",
        scale: { type: "spring", stiffness: 160, damping: 18 }
    }
});

/* ================= COMPONENT ================= */

export default function CarScreen() {
    const { id } = useParams();
    const navigate = useNavigate();

    const { data, isLoading } = useQuery({
        queryKey: ["car", id],
        queryFn: async () => {
            const res = await axios.get(
                `${USER_API_URL}/garage/car/${id}`
            );
            return res.data.car;
        }
    });

    useEffect(() => {
        WebApp.BackButton.show();
        const onBack = () => navigate(-1);
        WebApp.onEvent("backButtonClicked", onBack);

        return () => {
            WebApp.BackButton.hide();
            WebApp.offEvent("backButtonClicked", onBack);
        };
    }, [navigate]);

    /* ================= LOADING ================= */

    if (isLoading) {
        return (
            <div className="min-h-screen w-screen bg-[#EEEEEE] p-4">
                <div className="animate-pulse">
                    <div className="w-screen -mx-4 h-72 bg-gray-300 rounded-b-3xl mb-6" />
                    <div className="h-6 w-2/3 bg-gray-300 rounded mb-4" />
                    <div className="bg-white rounded-2xl p-4 space-y-3">
                        <div className="h-4 bg-gray-300 rounded" />
                        <div className="h-4 bg-gray-300 rounded" />
                        <div className="h-4 bg-gray-300 rounded" />
                    </div>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen w-screen flex items-center justify-center">
                Avtomobil topilmadi
            </div>
        );
    }

    /* ================= UI ================= */

    return (
        <div className="min-h-screen w-screen bg-[#EEEEEE] px-4 pb-32">

            {/* ===== HERO (как в Carwash) ===== */}
            <motion.div
                className="relative w-screen -mx-4 h-72 mb-6 will-change-transform"
                {...fade(0.05)}
            >
                <img
                    src={
                        data.image ||
                        "https://i.ibb.co/R4cLCjgX/Chevrolet-Equinox-Mk3f-Premier-2020-1000-0005.jpg"
                    }
                    alt={`${data.brand} ${data.model}`}
                    className="w-full h-full object-cover rounded-b-3xl shadow-lg"
                />

                {/* Gradient */}
                <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/70 to-transparent rounded-b-3xl">

                    {/* Plate */}
                    <div className="inline-block bg-white/90 backdrop-blur font-plate px-4 py-1 rounded-full text-sm font-semibold mb-2">
                        {formatPlate(data.plateNumber)}
                    </div>

                    {/* Title */}
                    <h1 className="text-white font-bold text-2xl leading-tight">
                        {data.brand} {data.model}
                        {data.year && (
                            <span className="text-gray-300 font-medium">
                                {" "}({data.year})
                            </span>
                        )}
                    </h1>

                    {/* Primary badge */}
                    {data.isPrimary && (
                        <div className="mt-2 inline-block bg-[#4D77FF] text-white text-xs px-3 py-1 rounded-full">
                            Asosiy avtomobil
                        </div>
                    )}
                </div>
            </motion.div>

            {/* ===== INFO ===== */}
            <motion.div
                className="bg-white rounded-2xl shadow p-4 mb-6"
                {...fade(0.1)}
            >
                <p className="font-semibold text-gray-700 mb-4">
                    Avtomobil maʼlumotlari
                </p>

                <div className="grid grid-cols-2 gap-4 text-sm">
                    {data.color && (
                        <div>
                            <p className="text-gray-400">Rangi</p>
                            <p className="font-medium">{data.color}</p>
                        </div>
                    )}

                    {data.bodyType && (
                        <div>
                            <p className="text-gray-400">Kuzov</p>
                            <p className="font-medium">{data.bodyType}</p>
                        </div>
                    )}

                    {data.fuelType && (
                        <div>
                            <p className="text-gray-400">Yoqilg‘i</p>
                            <p className="font-medium">{data.fuelType}</p>
                        </div>
                    )}
                </div>

                {/* CLEANLINESS */}
                <div className="mt-5">
                    <div className="flex justify-between text-sm text-gray-500 mb-1">
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
                        <p className="text-xs text-gray-500 mt-2">
                            Oxirgi yuvish:{" "}
                            {new Date(data.lastWashAt).toLocaleDateString()}
                        </p>
                    )}
                </div>
            </motion.div>

            {/* ===== ACTION ===== */}
            <motion.button
                onClick={() =>
                    navigate(`/`, {
                        state: { carNumber: formatPlate(data.plateNumber) }
                    })
                }
                className="
                    w-full py-4 rounded-2xl
                    bg-[#4D77FF] text-white
                    font-semibold shadow-lg
                    flex items-center justify-center gap-2
                    active:scale-[0.98]
                    transition-transform
                "
                {...fade(0.15)}
            >
                <Droplet size={18} />
                Moykaga bron qilish
            </motion.button>
        </div>
    );
}
