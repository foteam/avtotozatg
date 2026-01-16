import express from 'express';
import Review from '../models/review_model.js';
import CarWash from '../models/carwash_model.js';

const router = express.Router();

// Добавить отзыв
router.post('/', async (req, res) => {
    try {
        const { washId, name, comment, rating } = req.body;
        const review = new Review({ wash: washId, name, comment, rating });
        await review.save();

        // Добавить ссылку на отзыв в CarWash
        const wash = await CarWash.findById(washId);
        wash.reviews.push(review._id);
        await wash.save();

        res.json(review);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/:washId', async (req, res) => {
    try {
        const { washId } = req.params

        const reviews = await Review.find({ wash: washId })
            .sort({ createdAt: -1 }) // новые сверху
            .lean()

        res.json({
            success: true,
            count: reviews.length,
            reviews,
        })
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        })
    }
})

export default router;
