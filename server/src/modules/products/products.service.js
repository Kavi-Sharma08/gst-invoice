import { Product } from './products.model.js';
import { AppError } from '../../shared/errors/app-error.js';

export async function listProducts(userId, { search = '', page = 1, limit = 50 } = {}) {
  const query = { userId };
  if (search) {
    const regex = new RegExp(search.trim(), 'i');
    query.$or = [{ name: regex }, { hsnSac: regex }, { description: regex }];
  }

  const skip = (Math.max(1, page) - 1) * limit;
  const [products, total] = await Promise.all([
    Product.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit),
    Product.countDocuments(query)
  ]);

  return {
    products: products.map((p) => p.toJSON()),
    total,
    page: Number(page),
    limit: Number(limit)
  };
}

export async function getProductById(userId, productId) {
  const product = await Product.findOne({ _id: productId, userId });
  if (!product) {
    throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
  }
  return product.toJSON();
}

export async function createProduct(userId, data) {
  const product = await Product.create({
    ...data,
    userId
  });
  return product.toJSON();
}

export async function updateProduct(userId, productId, data) {
  const product = await Product.findOneAndUpdate(
    { _id: productId, userId },
    { ...data, updatedAt: new Date() },
    { new: true, runValidators: true }
  );
  if (!product) {
    throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
  }
  return product.toJSON();
}

export async function deleteProduct(userId, productId) {
  const result = await Product.findOneAndDelete({ _id: productId, userId });
  if (!result) {
    throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
  }
  return { success: true };
}
