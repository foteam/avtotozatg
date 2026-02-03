import fetch from 'node-fetch';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export async function sendExpoPush({ to, title, body, data = {}, badge = 0 }) {
    const message = {
        to,
        sound: 'default',
        title,
        body,
        badge,       // 👈 iOS badge
        data
    };

    const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
    });

    return res.json();
}
