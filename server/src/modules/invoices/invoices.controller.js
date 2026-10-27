import { asyncHandler } from '../../shared/http/async-handler.js';
import * as invoiceService from './invoices.service.js';

export const list = asyncHandler(async (req, res) => {
  const result = await invoiceService.listInvoices(req.user.id, req.query);
  res.status(200).json({ success: true, data: result });
});

export const getOne = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.getInvoiceById(req.user.id, req.params.id);
  res.status(200).json({ success: true, data: invoice });
});

export const create = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.createInvoice(req.user.id, req.body);
  res.status(201).json({ success: true, data: invoice });
});

export const update = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.updateInvoice(req.user.id, req.params.id, req.body);
  res.status(200).json({ success: true, data: invoice });
});

export const remove = asyncHandler(async (req, res) => {
  await invoiceService.deleteInvoice(req.user.id, req.params.id);
  res.status(200).json({ success: true, message: 'Invoice deleted successfully' });
});

export const duplicate = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.duplicateInvoice(req.user.id, req.params.id);
  res.status(201).json({ success: true, data: invoice });
});
