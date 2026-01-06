import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import WebApp from "@twa-dev/sdk";

/* ================= CONFIG ================= */

const USER_API_URL = "https://114-29-236-86.cloud-xip.com/api/user";
const IMGBB_API_KEY = "01074699432b7e4645f98fe66efebec3";

/* ================= DATA ================= */
const DEFAULT_CAR_IMAGES = {
    Chevrolet: {
        Matiz: "https://i.3dmodels.org/uploads/Daewoo/004_Daewoo_Matiz_M150_2011/Daewoo_Matiz_M150_2011_600_0005.jpg",
        Onix: "https://i.3dmodels.org/uploads/Chevrolet/300_Chevrolet_Onix_Mk2_sedan_Plus_Premier_2019/Chevrolet_Onix_Mk2_sedan_Plus_Premier_2019_1000_0005.jpg",
        Cobalt: "https://i.3dmodels.org/uploads/Chevrolet/062_Chevrolet_Cobalt_2012/Chevrolet_Cobalt_2012_600_0005.jpg",
        Gentra: "https://i.3dmodels.org/uploads/Daewoo/011_Daewoo_Gentra_2013/Daewoo_Gentra_2013_600_0005.jpg",
        Spark: "https://i.3dmodels.org/uploads/Chevrolet/004_Chevrolet_Beat_2010/Chevrolet_Beat_2010_600_0005.jpg",
        Nexia: "https://i.3dmodels.org/uploads/Daewoo/001_Daewoo_Nexia_Sedan_1996/Daewoo_Nexia_Sedan_1996_600_0005.jpg",
        Nexia_2: "https://i.3dmodels.org/uploads/Daewoo/002_Daewoo_Nexia_2012/Daewoo_Nexia_2012_600_0005.jpg",
        Nexia_3: "https://i.3dmodels.org/uploads/Ravon/003_Ravon_Nexia_2015/Ravon_Nexia_2015_600_0005.jpg",
        Malibu: "https://i.3dmodels.org/uploads/Chevrolet/083_Chevrolet_Malibu_HQinterior_2013/Chevrolet_Malibu_HQinterior_2013_600_0005.jpg",
        Malibu_2: "https://i.3dmodels.org/uploads/Chevrolet/146_Chevrolet_Malibu_Mk9_2016/Chevrolet_Malibu_Mk9_2016_600_0005.jpg",
        Tracker: "https://i.ibb.co/pF7nt5F/Chat-GPT-Image-6-2026-04-09-12.png",
        Tracker_2: "https://i.ibb.co/MDZ248nR/8fa61a35-b798-4eb4-8dea-d4ab0184d16a.png",
        Equinox: "https://i.3dmodels.org/uploads/Chevrolet/201_Chevrolet_Equinox_Mk3_CN-spec_2018/Chevrolet_Equinox_Mk3_CN-spec_2018_600_0005.jpg",
        Damas: "https://i.3dmodels.org/uploads/Daewoo/006_Daewoo_Damas_Mk2_2012/Daewoo_Damas_Mk2_2012_600_0005.jpg",
        Monza: "https://i.3dmodels.org/uploads/Chevrolet/301_Chevrolet_Monza_Mk2_RS_2020/Chevrolet_Monza_Mk2_RS_2020_1000_0005.jpg",
        Tahoe: "https://i.3dmodels.org/uploads/Chevrolet/386_Chevrolet_Tahoe_Mk5_GMT1YC_RST_HQinterior_2025/Chevrolet_Tahoe_Mk5_GMT1YC_RST_HQinterior_2025_1000_0005.jpg",

    },
    Kia: {
        K5: "https://i.3dmodels.org/uploads/Kia/141_Kia_K5_Mk3_2019/Kia_K5_Mk3_2019_600_0005.jpg",
        K7: "https://i.3dmodels.org/uploads/Kia/043_Kia_Cadenza_2014/Kia_Cadenza_2014_600_0005.jpg",
        K8: "https://i.3dmodels.org/uploads/Kia/164_Kia_K8_2021/Kia_K8_2021_1000_0005.jpg",
        K9: "https://i.3dmodels.org/uploads/Kia/197_Kia_K9_Mk2f_RJ_2021/Kia_K9_Mk2f_RJ_2021_1000_0005.jpg",
        Sportage: "https://i.3dmodels.org/uploads/Kia/165_Kia_Sportage_Mk5_NQ5_2022/Kia_Sportage_Mk5_NQ5_2022_1000_0005.jpg",
        Rio: "https://i.3dmodels.org/uploads/Kia/152_Kia_Rio_Mk4f_YB_hatchback_2020/Kia_Rio_Mk4f_YB_hatchback_2020_1000_0005.jpg",
        Sorento: "https://i.3dmodels.org/uploads/Kia/192_Kia_Sorento_Mk4f_MQ4_2024/Kia_Sorento_Mk4f_MQ4_2024_1000_0005.jpg",
        Sonet: "https://i.3dmodels.org/uploads/Kia/222_Kia_Sonet_2024/Kia_Sonet_2024_1000_0005.jpg",
    },
    Hyundai: {
        Elantra: "https://i.3dmodels.org/uploads/Hyundai/269_Hyundai_Elantra_Mk7_CN7_US-spec_HQinterior_2020/Hyundai_Elantra_Mk7_CN7_US-spec_HQinterior_2020_1000_0005.jpg",
        Sonata: "https://i.3dmodels.org/uploads/Hyundai/193_Hyundai_Sonata_Mk8_DN8_2020/Hyundai_Sonata_Mk8_DN8_2020_600_0005.jpg",
        Tucson: "https://i.3dmodels.org/uploads/Hyundai/233_Hyundai_Tucson_Mk4_NX4_2021/Hyundai_Tucson_Mk4_NX4_2021_1000_0005.jpg",
        Santa_Fe: "https://i.3dmodels.org/uploads/Hyundai/226_Hyundai_Santa_Fe_Mk4f_TM_2021/Hyundai_Santa_Fe_Mk4f_TM_2021_1000_0005.jpg"
    },
    Toyota: {
        Camry: "https://i.3dmodels.org/uploads/Toyota/319_Toyota_Camry_XV60_XLE_hybrid_2017/Toyota_Camry_XV60_XLE_hybrid_2017_600_0005.jpg",
        Land_Cruiser_200: "https://i.3dmodels.org/uploads/Toyota/150_Toyota_Land_Cruiser_Mk8f_J200_HQinterior_2012/Toyota_Land_Cruiser_Mk8f_J200_HQinterior_2012_600_0005.jpg",
        Land_Cruiser_300: "https://i.3dmodels.org/uploads/Toyota/528_Toyota_Land_Cruiser_Mk9_J300_2021/Toyota_Land_Cruiser_Mk9_J300_2021_1000_0005.jpg"
    },
    BYD: {
        Han: "https://i.3dmodels.org/uploads/BYD/027_BYD_Han_EV_2020/BYD_Han_EV_2020_1000_0005.jpg",
        Song_Plus: "https://i.3dmodels.org/uploads/BYD/046_BYD_Song_Mk2f_Plus_HQinterior_2020/BYD_Song_Mk2f_Plus_HQinterior_2020_1000_0005.jpg",
        Chazor: "https://i.3dmodels.org/uploads/BYD/043_BYD_E3_HQinterior_2020/BYD_E3_HQinterior_2020_1000_0005.jpg",
    },
    Lada: {
        Granta: "https://i.3dmodels.org/uploads/VAZ/002_VAZ_Lada_Granta_sedan_2012/VAZ_Lada_Granta_sedan_2012_600_0005.jpg",
        Vesta: "https://i.3dmodels.org/uploads/VAZ/003_VAZ_Lada_Niva_4x4_2131_2012/VAZ_Lada_Niva_4x4_2131_2012_600_0005.jpg",
        Niva: "https://i.3dmodels.org/uploads/VAZ/003_VAZ_Lada_Niva_4x4_2131_2012/VAZ_Lada_Niva_4x4_2131_2012_600_0005.jpg",
    },
    Lexus: {
        RX_Hybrid: "https://i.3dmodels.org/uploads/Lexus/057_Lexus_RX_Mk4_hybrid_2016/Lexus_RX_Mk4_hybrid_2016_600_0005.jpg",
        NX_Hybrid: "https://i.3dmodels.org/uploads/Lexus/132_Lexus_NX_Mk2_AZ20_hybrid_2022/Lexus_NX_Mk2_AZ20_hybrid_2022_1000_0005.jpg",
        LX: "https://i.3dmodels.org/uploads/Lexus/065_Lexus_LX_Mk3f_J200_2016/Lexus_LX_Mk3f_J200_2016_600_0005.jpg"
    },
    Jetour: {
        X70: "https://i.3dmodels.org/uploads/Jetour/003_Jetour_X70_2020/Jetour_X70_2020_1000_0005.jpg",
        X70_Plus: "https://i.3dmodels.org/uploads/Jetour/005_Jetour_X70_plus_2022/Jetour_X70_plus_2022_1000_0005.jpg",
        X90: "https://i.3dmodels.org/uploads/Jetour/002_Jetour_X90_2018/Jetour_X90_2018_600_0005.jpg",
        Dashing: "https://i.3dmodels.org/uploads/Jetour/005_Jetour_Dashing_2024/Jetour_Dashing_2024_1000_0005.jpg"
    }
};

// Общий fallback (на крайний случай)
const FALLBACK_CAR_IMAGE =
    "https://i.3dmodels.org/uploads/Lexus/141_Lexus_RX_hybrid_F_Sport_2022/Lexus_RX_hybrid_F_Sport_2022_1000_0005.jpg";

const CAR_BRANDS = {
    Chevrolet: ["Cobalt","Gentra", "Nexia", "Nexia 2","Nexia 3","Malibu", "Malibu 2","Tahoe", "Tracker","Onix","Spark","Lacetti","Damas", "Equinox",
                "Labo", "Monza", "Matiz"],
    Kia: ["K5","K7","K8","K9","Sportage","Sorento","Seltos","Rio", "Sonet"],
    Hyundai: ["Elantra","Sonata","Tucson","Santa Fe","Accent"],
    Toyota: ["Camry", "Land Cruiser 200", "Land Cruiser 300"],
    BYD: ["Song Plus","Han","Chazor"],
    Jetour: ["X70", "X70 Plus", "X90", "Dashing"],
    Lada: ["Granta","Vesta","Niva"]
};

const COLORS = [
    "Oq", "Qora", "Kulrang", "Kumush",
    "Ko‘k", "Qizil", "Yashil", "Sariq"
];

const BODY_TYPES = [
    "Sedan",
    "Hatchback",
    "Universal",
    "SUV",
    "Crossover",
    "Pickup",
    "Minivan"
];

const FUEL_TYPES = [
    "Benzin",
    "Gaz",
    "Benzin + Gaz",
    "Dizel",
    "Elektr",
    "Gibrid"
];
function normalizeModelForImage(model = "") {
    return model
        .trim()
        .replace(/\s+/g, "_"); // Nexia 2 -> Nexia_2
}
function getDefaultCarImage(brand, model) {
    const normalizedModel = normalizeModelForImage(model);

    return (
        DEFAULT_CAR_IMAGES?.[brand]?.[normalizedModel] ||
        FALLBACK_CAR_IMAGE
    );
}
/* ================= PLATE FORMAT ================= */

const uzFormat1 = /^\d{2}\s[A-Z]\s\d{3}\s[A-Z]{2}$/;
const uzFormat2 = /^\d{2}\s\d{3}\s[A-Z]{3}$/;

function formatPlateInput(value = "") {
    let v = value.toUpperCase().replace(/[^A-Z0-9]/g, "");

    if (v.length <= 2) return v;

    const isType1 = /^[0-9]{2}[A-Z]/.test(v);
    const isType2 = /^[0-9]{2}[0-9]/.test(v);

    if (isType1) {
        if (v.length <= 3) return `${v.slice(0,2)} ${v.slice(2)}`;
        if (v.length <= 6) return `${v.slice(0,2)} ${v.slice(2,3)} ${v.slice(3)}`;
        return `${v.slice(0,2)} ${v.slice(2,3)} ${v.slice(3,6)} ${v.slice(6,8)}`;
    }

    if (isType2) {
        if (v.length <= 5) return `${v.slice(0,2)} ${v.slice(2)}`;
        return `${v.slice(0,2)} ${v.slice(2,5)} ${v.slice(5,8)}`;
    }

    return v;
}

/* ================= IMGBB ================= */

async function uploadCarImage(file) {
    const formData = new FormData();
    formData.append("image", file);

    const res = await axios.post(
        `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
        formData
    );

    return res.data.data.url;
}

/* ================= COMPONENT ================= */

export default function AddCar({ user_id }) {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        plateNumber: "",
        brand: "",
        model: "",
        year: "",
        color: "",
        bodyType: "",
        fuelType: "",
        isPrimary: false
    });

    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        WebApp.BackButton.show();
        const onBack = () => navigate(-1);
        WebApp.onEvent("backButtonClicked", onBack);
        return () => {
            WebApp.BackButton.hide();
            WebApp.offEvent("backButtonClicked", onBack);
        };
    }, [navigate]);

    const canSave =
        (uzFormat1.test(form.plateNumber) || uzFormat2.test(form.plateNumber)) &&
        form.brand &&
        form.model;

    async function submit() {
        if (!canSave || loading) return;

        setLoading(true);
        try {
            let imageUrl = null;

            if (imageFile) {
                imageUrl = await uploadCarImage(imageFile);
            } else {
                imageUrl = getDefaultCarImage(form.brand, form.model);
            }

            await axios.post(`${USER_API_URL}/garage/car/add`, {
                user_id,
                brand: form.brand,
                model: form.model,
                year: form.year || null,
                color: form.color || null,
                plateNumber: form.plateNumber,
                bodyType: form.bodyType || null,
                fuelType: form.fuelType || null,
                image: imageUrl,
                isPrimary: form.isPrimary
            });

            navigate(-1);
        } catch (e) {
            alert(e?.response?.data?.message || "Xatolik yuz berdi");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen w-screen bg-[#EEEEEE] p-4 sm:p-6 md:p-8 pb-32">

            <div className="mt-20 mb-6">
                <h2 className="text-lg font-semibold">Avtomobil qo‘shish</h2>
            </div>

            {/* IMAGE */}
            <label className="block mb-4">
                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                        const f = e.target.files[0];
                        if (!f) return;
                        setImageFile(f);
                        setImagePreview(URL.createObjectURL(f));
                    }}
                />
                <div className="w-full h-44 rounded-2xl bg-gray-200 overflow-hidden shadow">
                    <img
                        src={
                            imagePreview ||
                            getDefaultCarImage(form.brand, form.model)
                        }
                        alt=""
                        className="w-full h-full object-cover"
                    />
                </div>
            </label>

            {/* PLATE */}
            <input
                placeholder="01 A 777 AA"
                value={form.plateNumber}
                onChange={e =>
                    setForm({ ...form, plateNumber: formatPlateInput(e.target.value) })
                }
                className="w-full p-4 font-plate rounded-2xl bg-white shadow mb-3 font-semibold"
            />

            {/* BRAND / MODEL */}
            <select
                className="w-full p-4 rounded-2xl bg-white shadow mb-3"
                value={form.brand}
                onChange={e => setForm({ ...form, brand: e.target.value, model: "" })}
            >
                <option value="">Marka</option>
                {Object.keys(CAR_BRANDS).map(b => (
                    <option key={b} value={b}>{b}</option>
                ))}
            </select>

            <select
                className="w-full p-4 rounded-2xl bg-white shadow mb-3"
                value={form.model}
                disabled={!form.brand}
                onChange={e => setForm({ ...form, model: e.target.value })}
            >
                <option value="">Model</option>
                {form.brand &&
                    CAR_BRANDS[form.brand].map(m => (
                        <option key={m} value={m}>{m}</option>
                    ))}
            </select>

            {/* EXTRA */}
            <input
                type="number"
                placeholder="Ishlab chiqarilgan yili"
                className="w-full p-4 rounded-2xl bg-white shadow mb-3"
                value={form.year}
                onChange={e => setForm({ ...form, year: e.target.value })}
            />

            <select
                className="w-full p-4 rounded-2xl bg-white shadow mb-3"
                value={form.color}
                onChange={e => setForm({ ...form, color: e.target.value })}
            >
                <option value="">Rangi</option>
                {COLORS.map(c => <option key={c}>{c}</option>)}
            </select>

            <select
                className="w-full p-4 rounded-2xl bg-white shadow mb-3"
                value={form.bodyType}
                onChange={e => setForm({ ...form, bodyType: e.target.value })}
            >
                <option value="">Kuzov turi</option>
                {BODY_TYPES.map(b => <option key={b}>{b}</option>)}
            </select>

            <select
                className="w-full p-4 rounded-2xl bg-white shadow mb-4"
                value={form.fuelType}
                onChange={e => setForm({ ...form, fuelType: e.target.value })}
            >
                <option value="">Yoqilg‘i turi</option>
                {FUEL_TYPES.map(f => <option key={f}>{f}</option>)}
            </select>

            {/* PRIMARY */}
            <label className="flex items-center gap-3 mb-6">
                <input
                    type="checkbox"
                    checked={form.isPrimary}
                    onChange={e => setForm({ ...form, isPrimary: e.target.checked })}
                />
                <span>Asosiy avtomobil</span>
            </label>

            {/* ACTION */}
            <div className="sticky bottom-0 bg-[#EEEEEE] pt-4">
                <button
                    onClick={submit}
                    disabled={!canSave || loading}
                    className="w-full h-14 rounded-2xl bg-[#4D77FF] text-white font-semibold shadow-lg disabled:opacity-40"
                >
                    {loading ? "Saqlanmoqda..." : "Avtomobil qo‘shish"}
                </button>
            </div>
        </div>
    );
}
