// routes/category.routes.js
import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import mongoose from 'mongoose';
import { restrictTo } from '../middlewares/restrictTo.js';
import Category from '../../models/Category.js';
import { catchAsync } from '../middlewares/errorHandler.js';

const router = express.Router();

router.use(authenticate);

router.get('/', catchAsync(async (req, res) => {

  const categories = await Category.find({ parentId: null, isActive: true })
    .select('code name')
    .lean();

  res.json({ success: true, data: categories });
}
));

router.get('/:categoryId/subcategories', catchAsync(async (req, res) => {
if (!mongoose.isValidObjectId(req.params.categoryId)) {
  return res.status(400).json({ success: false, message: 'Invalid category ID' });
}

  const subcategories = await Category.find({

    parentId: req.params.categoryId,
    isActive: true,
  })
    .select('code name')
    .lean();

  res.json({ success: true, data: subcategories });
}
));

export default router;
