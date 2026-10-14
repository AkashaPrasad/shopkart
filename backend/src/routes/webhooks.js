import express, { Router } from 'express';
import { razorpayWebhook } from '../controllers/webhooks.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const webhooksRouter = Router();

webhooksRouter.post('/razorpay', express.raw({ type: 'application/json', limit: '1mb' }), asyncHandler(razorpayWebhook));
