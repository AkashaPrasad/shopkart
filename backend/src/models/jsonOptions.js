// Shared serialisation: expose both `_id` and `id`, hide `__v`, and let each
// model strip its private fields.
export const jsonOptions = (hiddenFields = []) => ({
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    for (const field of hiddenFields) delete ret[field];
    return ret;
  },
});
