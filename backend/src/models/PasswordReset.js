import mongoose from 'mongoose';

const passwordResetSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    // Documents are purged by MongoDB a day after they expire.
    expiresAt: { type: Date, required: true, index: { expires: 24 * 60 * 60 } },
    usedAt: { type: Date },
  },
  { timestamps: true },
);

export const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema);
