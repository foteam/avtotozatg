import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Car } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {useEffect} from "react";
import WebApp from "@twa-dev/sdk";

const USER_API_URL = "https://114-29-236-86.cloud-xip.com/api/user";

/* ---------- Skeletons ---------- */

function Skeleton({ className = "" }) {
    return (
        <div className={`bg-gray-200/80 rounded-xl animate-pulse ${className}`} />
    );
}

function GarageSkeleton() {
    return (
        <div className="min-h-screen w-screen bg-[#EEEEEE] p-4 sm:p-6 md:p-8">
            <div className="space-y-4 mt-20">
                {[1, 2].map(i => (
                    <div
                        key={i}
                        className="
                            h-48
                            rounded-3xl
                            bg-gray-300
                            animate-pulse
                        "
                    />
                ))}
            </div>
        </div>
    );
}

function formatPlate(plate = "") {
    if (plate.length === 8) {
        return `${plate.slice(0,2)} ${plate.slice(2,3)} ${plate.slice(3,6)} ${plate.slice(6)}`;
    }
    if (plate.length === 7) {
        return `${plate.slice(0,2)} ${plate.slice(2,5)} ${plate.slice(5)}`;
    }
    return plate;
}

function getCarImage(car) {
    return car.image || "https://i.ibb.co/R4cLCjgX/Chevrolet-Equinox-Mk3f-Premier-2020-1000-0005.jpg";
}
/* ---------- Page ---------- */

export default function Garage({ user_id }) {

    const { data, isLoading, isError } = useQuery({
        queryKey: ["garage", user_id],
        queryFn: async () => {
            const res = await axios.get(
                `${USER_API_URL}/garage/cars/${user_id}`
            );
            return res.data.cars || [];
        },
        enabled: !!user_id
    });
    useEffect(() => {
        WebApp.BackButton.hide();
    }, []);

    if (isLoading) {
        return <GarageSkeleton />;
    }

    if (isError) {
        return (
            <div className="h-screen w-screen bg-[#EEEEEE] flex items-center justify-center text-red-500">
                Xatolik yuz berdi
            </div>
        );
    }

    return (
        <div className="min-h-screen w-screen bg-[#EEEEEE] p-4 sm:p-6 md:p-8 pb-32">

            <h1 className="mt-20 mb-6 text-xl font-bold">
                Sizning avtomobillaringiz
            </h1>

            {/* LIST */}
            <div className="space-y-4">

                {data.length === 0 && (
                    <div className="text-center text-gray-500 mt-12">
                        <Car className="mx-auto mb-2" />
                        Avtomobil yo‘q
                    </div>
                )}

                {data.map(car => (
                    <Link
                        key={car._id}
                        to={`/garage/${car._id}`}
                        className="
            relative
            block
            h-48
            rounded-3xl
            overflow-hidden
            shadow-lg
            active:scale-[0.97]
            transition-transform
        "
                    >
                        {/* BACKGROUND IMAGE */}
                        <img
                            src={getCarImage(car)}
                            alt={`${car.brand} ${car.model}`}
                            className="
                absolute inset-0
                w-full h-full
                object-cover
            "
                        />

                        {/* DARK OVERLAY */}
                        <div className="absolute inset-0 bg-black/35" />

                        {/* CONTENT */}
                        <div className="relative z-10 h-full flex flex-col justify-between p-4">

                            {/* TOP */}
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs text-white/80">
                                        Mening avtomobilim
                                    </p>
                                    <p className="text-lg font-semibold text-white leading-tight">
                                        {car.brand} {car.model}
                                    </p>
                                </div>
                            </div>

                            {/* BOTTOM */}
                            <div className="flex items-center justify-between">
                                <div className="
                    bg-white/90 backdrop-blur
                    font-plate
                    text-black
                    px-3 py-1
                    rounded-lg
                    text-sm font-medium
                ">
                                    {formatPlate(car.plateNumber)} <span className="text-lg">🇺🇿</span>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}



            </div>


            {/* FAB */}
            {/* BOTTOM ACTION */}
            <div className="sticky bottom-0 bg-[#EEEEEE] pt-4 pb-4">
                <Link
                    to="/garage/add"
                    className="
      w-full
      h-14
      rounded-2xl
      bg-[#4D77FF]
      text-white
      flex items-center justify-center
      font-semibold
      shadow-lg
      active:scale-[0.98]
      transition-transform
    "
                >
                    + Avtomobil qo‘shish
                </Link>
            </div>
        </div>
    );
}
