/**
 * Validates and normalises request parts with zod schemas. Parsed values replace
 * the raw ones so handlers only ever see clean data. Express 5 exposes
 * `req.query` as a getter, so it is redefined rather than assigned.
 */
export const validate =
  ({ body, query, params } = {}) =>
  (req, _res, next) => {
    if (params) Object.assign(req.params, params.parse(req.params));
    if (query) {
      Object.defineProperty(req, 'query', {
        value: query.parse(req.query),
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
    if (body) req.body = body.parse(req.body ?? {});
    next();
  };
