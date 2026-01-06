export default function PackagesPage() {
    return (
        <div className="
            min-h-screen w-screen
            flex flex-col items-center justify-center
            bg-[#EEEEEE]
            p-4 sm:p-6 md:p-8
            text-center
        ">
            {/* IMAGE */}
            <img
                src="https://i.ibb.co/8LNJZMKp/e04b3465-0950-433a-990f-da73e9da3c82.png"
                alt="In development"
                className="w-56 max-w-full mb-6"
            />

            {/* TITLE */}
            <h1 className="text-xl font-semibold text-gray-800 mb-2">
                Ushbu bo‘lim ishlanmoqda
            </h1>

            {/* SUBTITLE */}
            <p className="text-sm text-gray-500 max-w-xs">
                Tez orada bu yerda yangi imkoniyatlar paydo bo‘ladi.
            </p>
        </div>
    );
}
