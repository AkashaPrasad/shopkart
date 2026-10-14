import { customAlphabet } from 'nanoid';

// Uppercase alphanumerics without look-alikes (0/O, 1/I) so numbers read well over the phone.
const suffix = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 6);

export const generateOrderNumber = () => `SK-${suffix()}`;
