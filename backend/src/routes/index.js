import { Router } from 'express';
import mongoose from 'mongoose';
import { addressesRouter } from './addresses.js';
import { adminRouter } from './admin.js';
import { authRouter } from './auth.js';
import { cartRouter } from './cart.js';
import { miscRouter } from './misc.js';
import { ordersRouter } from './orders.js';
import { productsRouter } from './products.js';
import { reviewsRouter } from './reviews.js';
import { wishlistRouter } from './wishlist.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res
    .status(connected ? 200 : 503)
    .json({ ok: connected, uptime: process.uptime(), db: connected ? 'connected' : 'disconnected' });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/products', productsRouter);
apiRouter.use('/cart', cartRouter);
apiRouter.use('/addresses', addressesRouter);
apiRouter.use('/orders', ordersRouter);
apiRouter.use('/wishlist', wishlistRouter);
apiRouter.use('/reviews', reviewsRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/', miscRouter);
