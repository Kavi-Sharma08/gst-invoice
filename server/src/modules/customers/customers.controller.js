import { asyncHandler } from '../../shared/http/async-handler.js';
import { sendItem, sendList, sendError } from '../../shared/http/response.js';
import * as customerService from './customers.service.js';

export const list = asyncHandler(async (req, res) => {
  const result = await customerService.listCustomers(req.user.id, req.query);
  return sendList(res, result.customers, {
    total: result.total,
    page: result.page,
    limit: result.limit
  });
});

export const search = asyncHandler(async (req, res) => {
  const results = await customerService.searchCustomers(req.user.id, req.query);
  return res.status(200).json({ data: results });
});

export const getOne = asyncHandler(async (req, res) => {
  const customer = await customerService.getCustomerById(req.user.id, req.params.id);
  return sendItem(res, customer);
});

export const create = asyncHandler(async (req, res) => {
  const { customer, warnings } = await customerService.createCustomer(req.user.id, req.body);
  const response = { data: customer };
  if (warnings.length) response.meta = { warnings };
  return res.status(201).json(response);
});

export const update = asyncHandler(async (req, res) => {
  const { customer, warnings } = await customerService.updateCustomer(
    req.user.id,
    req.params.id,
    req.body
  );
  const response = { data: customer };
  if (warnings.length) response.meta = { warnings };
  return res.status(200).json(response);
});

export const remove = asyncHandler(async (req, res) => {
  await customerService.deleteCustomer(req.user.id, req.params.id);
  return sendItem(res, { success: true });
});

export const archive = asyncHandler(async (req, res) => {
  const customer = await customerService.archiveCustomer(req.user.id, req.params.id);
  return sendItem(res, customer);
});

export const unarchive = asyncHandler(async (req, res) => {
  const customer = await customerService.unarchiveCustomer(req.user.id, req.params.id);
  return sendItem(res, customer);
});
