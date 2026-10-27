import { db } from './database';

export async function getProducts(searchQuery = '') {
  try {
    let collection = await db.products.toArray();
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      collection = collection.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.hsnSac && p.hsnSac.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }
    return collection.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  } catch (error) {
    console.error('Failed to get products:', error);
    throw new Error('Unable to load products from local storage.');
  }
}

export async function getProductById(id) {
  try {
    return await db.products.get(Number(id));
  } catch (error) {
    console.error(`Failed to get product ${id}:`, error);
    throw new Error('Unable to retrieve product details.');
  }
}

export async function addProduct(data) {
  try {
    const now = new Date().toISOString();
    const product = {
      name: data.name?.trim() || '',
      type: data.type || 'Service', // 'Service' or 'Product'
      hsnSac: data.hsnSac?.trim() || '',
      gstRate: parseFloat(data.gstRate ?? 18),
      rate: parseFloat(data.rate ?? 0),
      unit: data.unit?.trim() || 'Nos',
      description: data.description?.trim() || '',
      createdAt: now,
      updatedAt: now
    };
    const id = await db.products.add(product);
    return { ...product, id };
  } catch (error) {
    console.error('Failed to add product:', error);
    throw new Error('Unable to save new item/service to local storage.');
  }
}

export async function updateProduct(id, data) {
  try {
    const numId = Number(id);
    const existing = await db.products.get(numId);
    if (!existing) throw new Error('Product not found');

    const updated = {
      ...existing,
      ...data,
      gstRate: data.gstRate !== undefined ? parseFloat(data.gstRate) : existing.gstRate,
      rate: data.rate !== undefined ? parseFloat(data.rate) : existing.rate,
      updatedAt: new Date().toISOString()
    };
    await db.products.put(updated);
    return updated;
  } catch (error) {
    console.error(`Failed to update product ${id}:`, error);
    throw new Error('Unable to update item/service in local storage.');
  }
}

export async function deleteProduct(id) {
  try {
    await db.products.delete(Number(id));
    return true;
  } catch (error) {
    console.error(`Failed to delete product ${id}:`, error);
    throw new Error('Unable to delete item/service from local storage.');
  }
}
