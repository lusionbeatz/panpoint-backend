import { Router } from 'express';
import { getItems, getItem, createItem, updateItem, deleteItem } from '../controllers/items.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

router.get('/shops/:shopId/items',     getItems);
router.get('/shops/:shopId/items/:id', getItem);

router.post('/items',      protect, restrictTo('owner'), upload.array('images', 5), createItem);
router.patch('/items/:id', protect, restrictTo('owner'), upload.array('images', 5), updateItem);
router.delete('/items/:id', protect, restrictTo('owner'), deleteItem);

export default router;
