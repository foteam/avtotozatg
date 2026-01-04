import { NavLink } from 'react-router-dom';
import { Home, CreditCard, User, Newspaper, Shield, Car} from 'lucide-react';
import { useEffect, useState } from "react";
import axios from "axios";

import { motion } from "framer-motion";
const MotionNavLink = motion(NavLink);

const tabVariants = {
    active: { scale: 1.04, opacity: 1 },
    inactive: { scale: 1, opacity: 0.85 }
};

const iconVariants = {
    active: { scale: 1.08 },
    inactive: { scale: 1 }
};

const API_URL = "https://114-29-236-86.cloud-xip.com/api/admin/carwash";
const ADMIN_ID = 6727732536; // строка!

export default function Navbar({ user_id }) {

    const defaultTabs = [
        { name: 'Asosiy', to: '/', icon: <Home size={20} /> },
        { name: 'Yangiliklar', to: '/news', icon: <Newspaper size={20} /> },
        { name: 'Paketlar', to: '/packages', icon: <CreditCard size={20} /> },
        { name: 'Garaj', to: '/garage', icon: <Car size={20} /> },
        { name: 'Xisobim', to: '/profile', icon: <User size={20} /> },
    ];

    const [tabs, setTabs] = useState(defaultTabs);

    useEffect(() => {
        console.log("👉 user_id =", user_id, "type:", typeof user_id);

        // Если user_id ещё не подгрузился — ждём
        if (!user_id) return;

        async function checkOwner() {
            try {
                let updatedTabs = [...defaultTabs];

                // Проверяем владельца
                try {
                    const res = await axios.get(`${API_URL}/get/owner/${user_id}`);
                    if (res.data.exists) {
                        updatedTabs.push({
                            name: 'Moyka',
                            to: '/owner',
                            icon: <Shield size={20} />,
                        });
                        console.log("✔ Владелец найден");
                    }
                } catch (err) {
                    console.log("❌ Владелец не найден");
                }

                // Проверяем админа
                if (user_id === ADMIN_ID) {
                    updatedTabs.push({
                        name: 'Admin',
                        to: '/admin',
                        icon: <Shield size={20} />,
                    });
                    console.log("✔ Это админ");
                } else {
                    console.log("❌ Это не админ");
                }

                setTabs(updatedTabs);

            } catch (err) {
                console.error("Ошибка проверки:", err);
            }
        }

        checkOwner();
    }, [user_id]);

    return (
        <nav className="fixed bottom-0 left-0 w-full bg-[#EEEEEE] shadow-md border-t border-gray-200 p-6 pt-2 flex justify-around z-50">

            {tabs.map(tab => (
                <NavLink key={tab.to} to={tab.to}>
                    {({ isActive }) => (
                        <motion.div
                            className={`
                                flex flex-col items-center justify-center flex-1 py-2 rounded-2xl 
                                transition-colors duration-200
                                ${isActive ? "text-[#4D77FF]" : "text-gray-400"}
                            `}
                            variants={tabVariants}
                            animate={isActive ? "active" : "inactive"}
                            whileTap={{ scale: 0.94 }}
                            transition={{
                                type: "spring",
                                stiffness: 180,
                                damping: 20,
                                duration: 0.05
                            }}
                        >
                            <motion.div
                                variants={iconVariants}
                                animate={isActive ? "active" : "inactive"}
                                transition={{ duration: 0.05 }}
                            >
                                {tab.icon}
                            </motion.div>

                            <motion.span
                                className="text-xs mt-1"
                                animate={isActive ? { scale: 1.05 } : { scale: 1 }}
                                transition={{ duration: 0.05 }}
                            >
                                {tab.name}
                            </motion.span>

                        </motion.div>
                    )}
                </NavLink>
            ))}

        </nav>
    );
}