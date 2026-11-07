// Patch invoices.service.js to add customer ownership checks (CRLF-aware)
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dirname, '../src/modules/invoices/invoices.service.js');

let content = readFileSync(filePath, 'utf8');
// Normalize to LF for matching, we'll restore CRLF at the end
const isCRLF = content.includes('\r\n');
if (isCRLF) content = content.replace(/\r\n/g, '\n');

// 1. Replace Customer model import with getOwnedCustomer service import
if (content.includes("import { Customer } from '../customers/customers.model.js';")) {
  content = content.replace(
    "import { Customer } from '../customers/customers.model.js';",
    "import { getOwnedCustomer } from '../customers/customers.service.js';"
  );
  console.log('✓ Replaced Customer import with getOwnedCustomer');
} else if (content.includes("import { getOwnedCustomer }")) {
  console.log('  getOwnedCustomer already imported');
} else {
  console.error('✗ Could not find Customer import line');
  process.exit(1);
}

// 2. Add ownership check in createDraftInvoice
const CREATE_MARKER = "  const sellerState = business?.state || '';\n\n  const customerState = data.placeOfSupply";
const CREATE_PATCH = `  const sellerState = business?.state || '';

  // Security: verify customerId belongs to this user — prevents cross-tenant snapshot copying
  if (data.customerId) {
    const ownedCustomer = await getOwnedCustomer(userId, String(data.customerId));
    if (!ownedCustomer) {
      throw new AppError('Customer not found or access denied.', 404, 'CUSTOMER_NOT_FOUND');
    }
    if (ownedCustomer.isArchived) {
      throw new AppError('Cannot create an invoice for an archived customer.', 422, 'CUSTOMER_ARCHIVED');
    }
  }

  const customerState = data.placeOfSupply`;

if (content.includes(CREATE_MARKER)) {
  content = content.replace(CREATE_MARKER, CREATE_PATCH);
  console.log('✓ Added ownership check to createDraftInvoice');
} else {
  console.error('✗ Could not find CREATE_MARKER');
  console.log('--- Context around sellerState ---');
  const idx = content.indexOf("sellerState = business?.state");
  console.log(JSON.stringify(content.slice(idx - 10, idx + 200)));
  process.exit(1);
}

// 3. Add ownership check in updateDraftInvoice
// Find the second occurrence of `const sellerState` (the one in updateDraftInvoice)
const UPDATE_MARKER = "  const business = await BusinessProfile.findOne({ userId });\n  const sellerState = business?.state || existing.business?.state";
const UPDATE_PATCH = `  // Security: verify customerId belongs to this user when it changes
  if (data.customerId) {
    const ownedCustomer = await getOwnedCustomer(userId, String(data.customerId));
    if (!ownedCustomer) {
      throw new AppError('Customer not found or access denied.', 404, 'CUSTOMER_NOT_FOUND');
    }
    if (ownedCustomer.isArchived) {
      throw new AppError('Cannot assign an archived customer to an invoice.', 422, 'CUSTOMER_ARCHIVED');
    }
  }

  const business = await BusinessProfile.findOne({ userId });
  const sellerState = business?.state || existing.business?.state`;

if (content.includes(UPDATE_MARKER)) {
  content = content.replace(UPDATE_MARKER, UPDATE_PATCH);
  console.log('✓ Added ownership check to updateDraftInvoice');
} else {
  console.error('✗ Could not find UPDATE_MARKER — skipping (non-fatal)');
}

// Restore CRLF if the original had it
if (isCRLF) content = content.replace(/\n/g, '\r\n');

writeFileSync(filePath, content, 'utf8');
console.log('✓ invoices.service.js patched successfully');
