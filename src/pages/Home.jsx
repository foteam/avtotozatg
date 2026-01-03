import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from "axios";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faLocationArrow,
    faLocationCrosshairs,
    faMagnifyingGlass,
    faNewspaper,
    faStar
} from "@fortawesome/free-solid-svg-icons";
import { useQuery } from '@tanstack/react-query';
import Logo from '../assets/logo.png';
import VideoCover from '../assets/thumblain.png'
import VideoInstruction from '../../public/IMG_3846.MP4'

import { motion } from "framer-motion";
const MotionLink = motion(Link);
import WebApp from "@twa-dev/sdk";

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
        duration: 0.15,
        ease: "easeOut",
        scale: {
            type: "spring",
            stiffness: 160,
            damping: 18
        }
    }
});

const API_URL = "https://114-29-236-86.cloud-xip.com/api/admin/carwash";

export default function Home({ user_id }) {
    const [userCoords, setUserCoords] = useState(null);
    const [search, setSearch] = useState("");
    const [playVideo, setPlayVideo] = useState(false);
    // ================== ЗАПРОС ГЕОЛОКАЦИИ ==================
    useEffect(() => {
        if (!navigator.geolocation) {
            console.log("Geolocation not supported");
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                setUserCoords({
                    lat: pos.coords.latitude,
                    lon: pos.coords.longitude,
                });
            },
            (err) => {
                console.log("Geolocation error:", err.message);
            },
            {
                enableHighAccuracy: true, // 🔥 важно для Android
                maximumAge: 0,             // не использовать кэш
                timeout: 15000,             // Android иногда долго думает
            }
        );

        return () => {
            navigator.geolocation.clearWatch(watchId);
        };
    }, []);
    useEffect(() => {
        WebApp.BackButton.hide();
    }, []);

    // ================== ЗАГРУЗКА МОЕК ЧЕРЕЗ REACT QUERY ==================
    const { data: carwashes = [], isLoading, isError } = useQuery({
        queryKey: ['carwashes'],
        queryFn: async () => {
            const res = await axios.get(`${API_URL}/washes`);
            return res.data.carwashes || [];
        },
        staleTime: 1000 * 60 * 2, // 2 минуты кэш
        refetchInterval: 1000 * 60, // авто обновление каждую минуту
    });

    // ================== ФИЛЬТРАЦИЯ И СОРТИРОВКА ==================
    const filteredCarwashes = useMemo(() => {
        let filtered = carwashes;

        // Поиск
        if (search) {
            filtered = filtered.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
        }

        // Сортировка по расстоянию
        if (userCoords && filtered.length > 0) {
            filtered = [...filtered].sort((a, b) => {
                const d1 = getDistance(userCoords, { lat: a.location[0], lon: a.location[1] });
                const d2 = getDistance(userCoords, { lat: b.location[0], lon: b.location[1] });
                return d1 - d2;
            });
        }

        return filtered;
    }, [carwashes, search, userCoords]);

    // ================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==================
    function getDistance(coord1, coord2) {
        const R = 6371;
        const dLat = deg2rad(coord2.lat - coord1.lat);
        const dLon = deg2rad(coord2.lon - coord1.lon);
        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(deg2rad(coord1.lat)) *
            Math.cos(deg2rad(coord2.lat)) *
            Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function deg2rad(deg) {
        return deg * (Math.PI / 180);
    }

    // ================== UI ==================
    if (isLoading)
        return (
            <motion.div
                className="p-4 text-center text-gray-600 w-screen h-screen flex items-center justify-center"
                {...fade(0.05)}
            >
                Avtomoykalar yuklanmoqda...
            </motion.div>
        );

    if (isError)
        return (
            <motion.div
                className="p-4 text-center text-red-600 w-screen h-screen flex items-center justify-center"
                {...fade(0.05)}
            >
                Yuklashda xatolik!
            </motion.div>
        );

    return (
        <div className="p-4">

            {/* Логотип */}
            <motion.div
                className="flex justify-center mb-6 mt-20"
                {...fade(0.05)}
            >
                <img src={Logo} alt="AvtoToza" className="h-16 object-contain" />
            </motion.div>

            {/* Поиск */}
            <motion.div
                className="relative mb-6"
                {...fade(0.1)}
            >
                <FontAwesomeIcon
                    icon={faMagnifyingGlass}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                    type="text"
                    placeholder="Qidirish"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 p-3 rounded-2xl bg-white shadow focus:outline-none focus:ring-2 focus:ring-[#4D77FF]"
                />
            </motion.div>

            {/* Кнопка подписки на канал */}
            <motion.a
                href="https://t.me/avtotoza"   // ← ссылка на канал
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full mb-6 p-3 rounded-2xl
               bg-gradient-to-r from-[#4D77FF] to-[#6A8DFF]
               text-white font-semibold shadow-md
               active:scale-95"
                {...fade(0.15)}
            >
                <FontAwesomeIcon icon={faNewspaper} />
                Kanalga obuna bo‘lish
            </motion.a>

            {/* Видео инструкция */}
            <motion.div
                className="h-48 rounded-2xl overflow-hidden shadow-lg mb-6"
                {...fade(0.03)}
            >
                {!playVideo ? (
                    <div
                        onClick={() => setPlayVideo(true)}
                        className="w-full h-full cursor-pointer relative"
                    >
                        {/* Обложка */}
                        <img
                            src="https://i.ibb.co/Sp5tf4h/thumblain.png"   // положи в public/
                            alt="Видео инструкция"
                            className="w-full h-full object-cover"
                        />

                        {/* Play */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center text-black text-xl shadow">
                                ▶
                            </div>
                        </div>
                    </div>
                ) : (
                    <video
                        src={VideoInstruction}
                        className="w-full h-full bg-black"
                        controls
                        autoPlay
                        playsInline
                    />
                )}
            </motion.div>

            {/* Список автомоек */}
            <div className="grid grid-cols-1 gap-6">
                {filteredCarwashes.map((c, i) => (
                    <MotionLink
                        to={`/wash/${c.carwash_id}/${user_id}`}
                        key={c._id}
                        className="relative h-48 rounded-2xl overflow-hidden shadow-lg hover:scale-105 transition-transform duration-300"
                        {...fade(0.15 + i * 0.1)}
                    >
                        <img
                            src={c.banner || "https://via.placeholder.com/500"}
                            alt={c.name}
                            className="w-full h-full object-cover"
                        />

                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                            <h2 className="text-white font-semibold text-lg">{c.name}</h2>

                            <p className="text-gray-300 text-sm mt-1 flex items-center gap-1">
                                <span className="truncate max-w-[265px] inline-block">
                                <FontAwesomeIcon icon={faLocationArrow} /> {c.address}
                                </span>

                                {userCoords && (
                                    <>
                                        <span className="opacity-70">•</span>

                                        <span className="whitespace-nowrap">
                                        <FontAwesomeIcon icon={faLocationCrosshairs} />{" "}
                                            {getDistance(userCoords, {
                                                lat: c.location[0],
                                                lon: c.location[1],
                                            }).toFixed(1)}{" "}
                                            km
                                        </span>
                                    </>
                                )}
                            </p>

                            <p className="text-yellow-400 font-medium mt-1">
                                <FontAwesomeIcon icon={faStar} /> {c.rating || "—"}
                            </p>
                        </div>
                    </MotionLink>
                ))}
            </div>

            {/* Текст снизу */}
            <motion.p
                className="text-[#9e9e9e] text-center mt-4 text-sm"
                {...fade(0.2 + filteredCarwashes.length * 0.1)}
            >
                Agarda sizham avtomobillar yuvish shaxobchasiga ega bo'lsangiz
                biz bilan hamkorlik qilishingiz mumkin!
            </motion.p>
            {/* Текст снизу */}
{/*            <motion.p
                className="text-[#9e9e9e] text-center mt-4 text-sm"
                {...fade(0.2 + filteredCarwashes.length * 0.1)}
            >
                "BEST XON LOGISTIC" MChJ - Alpha version.
            </motion.p>*/}
        </div>
    );
}
