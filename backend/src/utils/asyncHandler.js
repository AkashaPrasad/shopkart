// Express 5 forwards rejected promises on its own; this wrapper keeps that
// behaviour explicit and also covers handlers that are invoked outside a router.
export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
