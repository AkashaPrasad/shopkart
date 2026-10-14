import { config } from '../config.js';
import { StockAlert } from '../models/StockAlert.js';
import { User } from '../models/User.js';
import { formatINR } from '../utils/money.js';
import { sendMail } from './mail.js';

const orderLink = (order) => `${config.APP_URL}/account/orders/${order._id}`;
const itemLines = (order) => order.items.map((item) => `  ${item.qty} × ${item.name}  ${formatINR(item.price * item.qty)}`).join('\n');

async function recipient(order) {
  const user = await User.findById(order.user).select('name email deletedAt');
  return user && !user.deletedAt ? user : null;
}

export async function sendOrderConfirmed(order) {
  const user = await recipient(order);
  if (!user) return;
  const payment =
    order.payment.provider === 'cod' ? `Pay ${formatINR(order.total)} in cash when it arrives.` : `Paid: ${formatINR(order.total)}.`;
  await sendMail({
    to: user.email,
    subject: `Order ${order.orderNumber} confirmed`,
    text: `Hi ${user.name},\n\nTiny things, big joy: your order ${order.orderNumber} is confirmed.\n\n${itemLines(order)}\n\n${payment}\n\nTrack it here: ${orderLink(order)}\n\nShopKart`,
  });
}

export async function sendOrderShipped(order) {
  const user = await recipient(order);
  if (!user) return;
  await sendMail({
    to: user.email,
    subject: `Order ${order.orderNumber} has shipped`,
    text: `Hi ${user.name},\n\nGood news: order ${order.orderNumber} is on its way.\n\nTrack it here: ${orderLink(order)}\n\nShopKart`,
  });
}

export function sendPasswordReset(user, token) {
  const link = `${config.APP_URL}/reset-password?token=${token}`;
  return sendMail({
    to: user.email,
    subject: 'Reset your ShopKart password',
    text: `Hi ${user.name},\n\nUse this link within 30 minutes to choose a new password:\n${link}\n\nIf you didn't ask for this, you can ignore this email.\n\nShopKart`,
  });
}

/** Emails everyone waiting on this product and marks their alerts as sent. */
export async function notifyBackInStock(product) {
  const alerts = await StockAlert.find({ product: product._id, notifiedAt: null });
  if (!alerts.length) return 0;
  await StockAlert.updateMany({ _id: { $in: alerts.map((a) => a._id) } }, { $set: { notifiedAt: new Date() } });
  const link = `${config.APP_URL}/product/${product.slug}`;
  for (const alert of alerts) {
    void sendMail({
      to: alert.email,
      subject: `${product.name} is back in stock`,
      text: `Good news: ${product.name} is back. Grab it before it's gone again:\n${link}\n\nShopKart`,
    });
  }
  return alerts.length;
}
