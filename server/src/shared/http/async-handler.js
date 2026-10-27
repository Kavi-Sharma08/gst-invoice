/**
 * Wraps an async express route handler to forward unhandled rejections to next()
 * @param {Function} fn
 * @returns {Function}
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
