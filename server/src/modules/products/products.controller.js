import { asyncHandler } from '../../shared/http/async-handler.js';
import * as productService from './products.service.js';

export const list = asyncHandler(async (req, res) => {
  const result = await productService.listProducts(req.user.id, req.query);
  res.status(200).json({ success: true, data: result });
});

export const getOne = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.user.id, req.params.id);
  res.status(200).json({ success: true, data: product });
});

export const create = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.user.id, req.body);
  res.status(201).json({ success: true, data: product });
});

export const update = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.user.id, req.params.id, req.body);
  res.status(200).json({ success: true, data: product });
});

export const remove = asyncHandler(async (req, res) => {
  await productService.deleteProduct(req.user.id, req.params.id);
  res.status(200).json({ success: true, message: 'Product deleted successfully' });
});
