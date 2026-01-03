import express from 'express';
import CarWash from '../models/carwash_model.js';

const router = express.Router();

// Получить все автомойки
router.get('/', async (req, res) => {
    try {
        const washes = await CarWash.find().populate('reviews');
        res.json(washes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Получить автомойку по ID
router.get('/:id', async (req, res) => {
    try {
        const wash = await CarWash.findById(req.params.id).populate('reviews');
        if (!wash) return res.status(404).json({ error: 'CarWash not found' });
        res.json(wash);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Создать новую автомойку
router.post('/', async (req, res) => {
    try {
        const newWash = new CarWash(req.body);
        await newWash.save();
        res.json(newWash);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
