export function trackPage(path) {
    try {
        if (!window.gtag) return;

        window.gtag("event", "page_view", {
            page_path: path,
        });
    } catch (e) {
        // ❗ НИЧЕГО НЕ ДЕЛАЕМ
        // analytics не должен ломать приложение
    }
}
export function trackEvent(name, params = {}) {
    try {
        if (!window.gtag) return;

        window.gtag("event", name, {
            ...params
        });
    } catch (e) {
        // analytics не должен ломать приложение
    }
}