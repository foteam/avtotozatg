import Notification from '../../models/notifications.js';
import User from '../../models/user_model.js';
import { sendExpoPush } from './sendPush.js';

export async function notifyUser({
                                     userId,
                                     title,
                                     body,
                                     data = {}
                                 }) {
    const user = await User.findOne({user_id: userId});
    if (!user?.token) return;

    // 1️⃣ считаем badge (кол-во непрочитанных)
    const unreadCount = await Notification.countDocuments({
        userId,
        checked: false
    });

    const badge = unreadCount + 1;

    // 2️⃣ сохраняем в БД
    const notification = await Notification.create({
        userId,
        title,
        body,
        data,
        badge
    });

    // 3️⃣ отправляем push
    const result = await sendExpoPush({
        to: user.token,
        title,
        body,
        badge,
        data: {
            notificationId: notification._id,
            ...data
        }
    });

    return result;
}
