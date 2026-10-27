import { asyncHandler } from '../../shared/http/async-handler.js';
import * as customerService from './customers.service.js';

export const list = asyncHandler(async (req, res) => {
  const result = await customerService.listCustomers(req.user.id, req.query);
  res.status(200).json({ success: true, data: result });
});

export const getOne = asyncHandler(async (req, res) => {
  const customer = await customerService.getCustomerById(req.user.id, req.params.id);
  res.status(200).json({ success: true, data: customer });
});

export const create = asyncHandler(async (req, res) => {
  const customer = await customerService.createCustomer(req.user.id, req.body);
  res.status(201).json({ success: true, data: customer });
});

export const update = asyncHandler(async (req, res) => {
  const customer = await customerService.updateCustomer(req.user.id, req.params.id, req.body);
  res.status(200).json({ success: true, data: customer });
});

export const remove = asyncHandler(async (req, res) => {
  await customerService.deleteCustomer(req.user.id, req.params.id);
  res.status(200).json({ success: true, message: 'Customer deleted successfully' });
});
