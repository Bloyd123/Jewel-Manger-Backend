// routes/category.routes.js
import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { restrictTo } from '../middlewares/restrictTo.js';

const router = express.Router();

router.use(authenticate);

// GET all categories
router.get('/', async (req, res) => {
  const Category = require('../models/Category.js').default;

  const categories = await Category.find({ parentId: null, isActive: true })
    .select('code name')
    .lean();

  res.json({ success: true, data: categories });
});

// GET subcategories by parent
router.get('/:categoryId/subcategories', async (req, res) => {
  const Category = require('../models/Category.js').default;

  const subcategories = await Category.find({
    parentId: req.params.categoryId,
    isActive: true,
  })
    .select('code name')
    .lean();

  res.json({ success: true, data: subcategories });
});

export default router;
