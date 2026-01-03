import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Home from "./pages/Home";
import WashPage from "./pages/Carwash";
import Navbar from './components/Navbar';
import Profile from "./pages/Profile";
import Register from "./pages/Register";
import MainAdmin from "./pages/admin/MainAdmin";
import OwnerAdmin from "./pages/carwash_admin/CarwashAdmin";
import Packages from './pages/Packages';
import News from './pages/News';
import Eruda from 'eruda'

import WebApp from "@twa-dev/sdk";
import { postEvent } from "@tma.js/sdk-react";
import axios from "axios";
import { useEffect, useState } from "react";

import { AnimatePresence } from "framer-motion";

let BASE_URL = "https://114-29-236-86.cloud-xip.com";

import {motion} from "framer-motion";

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

function AppWrapper() {
    const location = useLocation();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const preventZoom = (e) => {
            if (e.ctrlKey || e.touches?.length > 1) {
                e.preventDefault();
            }
        };

        document.addEventListener("wheel", preventZoom, { passive: false });
        document.addEventListener("gesturestart", preventZoom);
        document.addEventListener("touchmove", preventZoom, { passive: false });

        return () => {
            document.removeEventListener("wheel", preventZoom);
            document.removeEventListener("gesturestart", preventZoom);
            document.removeEventListener("touchmove", preventZoom);
        };
    }, []);

    useEffect(() => {
        async function initTelegram() {
            try {
                WebApp.ready();
                window.Telegram.WebApp.setBackgroundColor("#EEEEEE");
                window.Telegram.WebApp.setHeaderColor("#EEEEEE");

                const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
                if (isMobile) {
                    postEvent("web_app_request_fullscreen");
                    postEvent("web_app_setup_swipe_behavior", {allow_vertical_swipe: false})
                }

                const initDataUnsafe = WebApp.initDataUnsafe;
                if (!initDataUnsafe?.user) {
                    navigate("/register", { replace: true });
                    return;
                }

                setUser(initDataUnsafe.user);

                const res = await axios.get(`${BASE_URL}/api/user/check/${initDataUnsafe.user.id}`);

                if (res.data.exists) {
                    if (res.data.user.blocked) {
                        return navigate("/blocked");
                    }
                } else {
                    navigate(`/register`, { replace: true });
                }
            } catch (err) {
                navigate(`/register`, { replace: true });
            } finally {
                setIsLoading(false);
            }
        }

        initTelegram();
    }, []);

    if (isLoading && location.pathname !== "/register") {
        return (
            <motion.div
                className="flex items-center justify-center w-screen h-screen bg-[#EEEE] text-black"
                {...fade(0.05)}
            >
                <div className="text-center space-y-2">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-300 border-t-transparent mx-auto"></div>
                    <p>Foydalanuvchini tekshirilmoqda...</p>
                </div>
            </motion.div>
        );
    }

    const hideNavbar = location.pathname === '/register';

    return (
        <div className="min-h-screen pb-20 bg-[#EEEEEE]">

            {/* === АНИМАЦИЯ ПЕРЕХОДОВ === */}
            <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                    <Route path='/' element={<Home user_id={user?.id} />} />
                    <Route path='/wash/:id/:user_id' element={<WashPage />} />
                    <Route path='/profile' element={<Profile user_id={user} />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/admin" element={<MainAdmin />} />
                    <Route path="/packages" element={<Packages />} />
                    <Route path="/news" element={<News />} />
                    <Route path="/owner" element={<OwnerAdmin user_id={user?.id} />} />
                </Routes>
            </AnimatePresence>

            {!hideNavbar && <Navbar user_id={user?.id} />}
        </div>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AppWrapper />
        </BrowserRouter>
    );
}
