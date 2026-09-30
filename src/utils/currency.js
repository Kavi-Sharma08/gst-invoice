/**
 * Formats a number as Indian Currency (INR).
 * Example: 35400 -> ₹ 35,400.00
 */
export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertLessThanThousand(num) {
  let result = '';
  if (num >= 100) {
    result += ONES[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }
  if (num >= 20) {
    result += TENS[Math.floor(num / 10)] + ' ';
    num %= 10;
  }
  if (num > 0) {
    result += ONES[num] + ' ';
  }
  return result.trim();
}

/**
 * Converts a numeric amount into words adhering to the Indian numbering system
 * (Crore, Lakh, Thousand, Hundred, Rupees & Paise).
 * Example: 35400 -> "Thirty-Five Thousand Four Hundred Rupees Only"
 */
export function numberToWords(amount) {
  const num = Math.abs(Number(amount) || 0);
  if (num === 0) return 'Zero Rupees Only';

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  let remaining = rupees;
  let words = '';

  const crore = Math.floor(remaining / 10000000);
  remaining %= 10000000;

  const lakh = Math.floor(remaining / 100000);
  remaining %= 100000;

  const thousand = Math.floor(remaining / 1000);
  remaining %= 1000;

  const hundred = remaining;

  if (crore > 0) {
    words += convertLessThanThousand(crore) + ' Crore ';
  }
  if (lakh > 0) {
    words += convertLessThanThousand(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    words += convertLessThanThousand(thousand) + ' Thousand ';
  }
  if (hundred > 0) {
    words += convertLessThanThousand(hundred) + ' ';
  }

  words = words.trim();
  let result = words ? `${words} Rupees` : '';

  if (paise > 0) {
    const paiseWords = convertLessThanThousand(paise);
    result += result ? ` and ${paiseWords} Paise` : `${paiseWords} Paise`;
  }

  return (result + ' Only').replace(/\s+/g, ' ');
}
