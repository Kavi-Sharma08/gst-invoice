/**
 * Standard HTTP response helpers.
 *
 * Convention:
 * - Single item: { data: item }
 * - List:        { data: [...items], meta: { total, page, limit } }
 * - Error:       { error: { code, message, fields? } }
 */

export function sendItem(res, item, statusCode = 200) {
  return res.status(statusCode).json({ data: item });
}

export function sendList(res, items, meta = {}, statusCode = 200) {
  return res.status(statusCode).json({
    data: items,
    meta: {
      total: Number(meta.total ?? items.length),
      page: Number(meta.page ?? 1),
      limit: Number(meta.limit ?? items.length)
    }
  });
}

export function sendError(res, code, message, statusCode = 400, fields = undefined, details = undefined) {
  const errorObj = {
    code: String(code),
    message: String(message)
  };
  if (fields && typeof fields === 'object') {
    errorObj.fields = fields;
  }
  if (details && typeof details === 'object') {
    errorObj.details = details;
  }
  return res.status(statusCode).json({ error: errorObj });
}

