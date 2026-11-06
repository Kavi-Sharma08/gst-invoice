import { asyncHandler } from '../../shared/http/async-handler.js';
import * as invoiceService from './invoices.service.js';
import * as invoiceNumberService from './invoice-number.service.js';
import { BusinessProfile } from '../business/business.model.js';
import { sendItem, sendList } from '../../shared/http/response.js';

export const list = asyncHandler(async (req, res) => {
  const result = await invoiceService.listInvoices(req.user.id, req.query);
  return sendList(res, result.invoices, {
    total: result.total,
    page: result.page,
    limit: result.limit
  });
});

export const getCounts = asyncHandler(async (req, res) => {
  const counts = await invoiceService.getInvoiceCounts(req.user.id, req.query);
  return sendItem(res, counts);
});

export const getSummary = asyncHandler(async (req, res) => {
  const summary = await invoiceService.getInvoiceSummary(req.user.id, req.query);
  return sendItem(res, summary);
});

export const getNextNumber = asyncHandler(async (req, res) => {
  const business = await BusinessProfile.findOne({ userId: req.user.id });
  const prefix = business?.invoiceSettings?.invoicePrefix;
  const startingNumber = business?.invoiceSettings?.startingNumber || 1;
  const nextInvoiceNumber = await invoiceNumberService.getPreviewNextInvoiceNumber(
    req.user.id,
    prefix,
    startingNumber
  );
  return sendItem(res, { nextInvoiceNumber });
});

export const getOne = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.getInvoiceById(req.user.id, req.params.id);
  return sendItem(res, invoice);
});

export const create = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.createDraftInvoice(req.user.id, req.body);
  return sendItem(res, invoice, 201);
});

export const update = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.updateDraftInvoice(req.user.id, req.params.id, req.body);
  return sendItem(res, invoice, 200);
});

export const remove = asyncHandler(async (req, res) => {
  const result = await invoiceService.deleteDraftInvoice(req.user.id, req.params.id);
  return sendItem(res, result, 200);
});

export const issue = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.issueInvoice(req.user.id, req.params.id);
  return sendItem(res, invoice, 200);
});

export const cancel = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.cancelInvoice(req.user.id, req.params.id);
  return sendItem(res, invoice, 200);
});

export const markPaid = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.markInvoicePaid(req.user.id, req.params.id);
  return sendItem(res, invoice, 200);
});

export const markUnpaid = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.markInvoiceUnpaid(req.user.id, req.params.id);
  return sendItem(res, invoice, 200);
});

export const duplicate = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.duplicateInvoice(req.user.id, req.params.id);
  return sendItem(res, invoice, 201);
});
