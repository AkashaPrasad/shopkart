import { ContactMessage } from '../models/ContactMessage.js';
import { Subscriber } from '../models/Subscriber.js';

/** 201 for a new subscriber, 200 if the email was already on the list. */
export async function subscribe(req, res) {
  const result = await Subscriber.updateOne(
    { email: req.body.email },
    { $setOnInsert: { email: req.body.email } },
    { upsert: true },
  );
  res.status(result.upsertedCount ? 201 : 200).json({ ok: true });
}

export async function contact(req, res) {
  await ContactMessage.create({ ...req.body, user: req.user?._id });
  res.status(201).json({ ok: true });
}
