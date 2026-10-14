import { Address } from '../models/Address.js';
import { lookupPincode } from '../services/pincode.js';
import { ApiError } from '../utils/ApiError.js';

const MAX_ADDRESSES = 10;

const listFor = (userId) => Address.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 });

async function findOwned(userId, id) {
  const address = await Address.findOne({ _id: id, user: userId });
  if (!address) throw ApiError.notFound('ADDRESS_NOT_FOUND', "We couldn't find that address.");
  return address;
}

async function makeDefault(address) {
  await Address.updateMany({ user: address.user, _id: { $ne: address._id }, isDefault: true }, { $set: { isDefault: false } });
  if (!address.isDefault) {
    address.isDefault = true;
    await address.save();
  }
  return address;
}

export async function listAddresses(req, res) {
  res.json({ items: await listFor(req.user._id) });
}

export async function createAddress(req, res) {
  const count = await Address.countDocuments({ user: req.user._id });
  if (count >= MAX_ADDRESSES) {
    throw ApiError.badRequest('ADDRESS_LIMIT_REACHED', `You can save up to ${MAX_ADDRESSES} addresses. Remove one to add another.`);
  }
  const { isDefault, ...fields } = req.body;
  const address = await Address.create({ ...fields, user: req.user._id, isDefault: false });
  if (count === 0 || isDefault) await makeDefault(address);
  res.status(201).json({ address });
}

export async function updateAddress(req, res) {
  const address = await findOwned(req.user._id, req.params.id);
  const { isDefault, ...fields } = req.body;
  address.set(fields);
  await address.save();
  // There is always exactly one default, so `isDefault: false` on it is a no-op.
  if (isDefault) await makeDefault(address);
  res.json({ address });
}

export async function deleteAddress(req, res) {
  const address = await findOwned(req.user._id, req.params.id);
  await address.deleteOne();
  if (address.isDefault) {
    const next = await Address.findOne({ user: req.user._id }).sort({ createdAt: -1 });
    if (next) await makeDefault(next);
  }
  res.json({ ok: true, items: await listFor(req.user._id) });
}

export async function setDefaultAddress(req, res) {
  const address = await findOwned(req.user._id, req.params.id);
  res.json({ address: await makeDefault(address) });
}

export async function pincodeLookup(req, res) {
  res.json(await lookupPincode(req.params.pincode));
}
