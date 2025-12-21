var fs = require('fs');

exports.createDirIfDoesNotExist = (dir) => {
  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
  }
}

exports.currentLocalDate = () => {
  return new Date(new Date().toLocaleString( 'sv', { timeZoneName: 'short' } ).split(' ')[0]);
}

exports.formatDateToISOString = (date) => {
  return date.toISOString().split('T')[0];
}

exports.isEmpty = (obj) => {
  if (!obj) {
    return true;
  }
  for (const prop in obj) {
    if (Object.hasOwn(obj, prop)) {
      return false;
    }
  }

  return true;
}

exports.listSubDirectories = (directory) => {
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
}

exports.getFileContent = (filePath) => {
  return fs.readFileSync(filePath, 'utf8');
}

exports.parseNumericBoolean = (numericBoolean) => {
  return numericBoolean === 0 ? false : (numericBoolean === 1 ? true : numericBoolean);
}

exports.paginate = (array, page, limit) => {
  const totalTransactions = array.length;
  // Ensure the limit number is greater than 0
  if (limit < 1) {
    throw new Error(`Limit query parameter must be greater than 0`);
  }
  const numOfPages = Math.ceil(totalTransactions / limit);
  // Ensure the page number is within bounds
  if (page < 1 || page > numOfPages) {
    throw new Error(`Page query parameter must be between 1 and ${numOfPages}. Changing limit parameter can also change the number of pages.`);
  }
  const selectedPage = Math.min(page, numOfPages);
  // Calculate the total number of pages
  const startIndex = (selectedPage - 1) * limit;
  const endIndex = startIndex + limit;
  // Slice the transactions for the current page
  const paginatedTransactions = array.slice(startIndex, endIndex);
  return paginatedTransactions
}

exports.validatePaginationParameters = (req) => {
  if (!req.query.limit) {
    throw new Error('limit query parameter is required when using pagination');
  }
  else if (!req.query.page) {
    throw new Error('page query parameter is required when using pagination');
  }
}

// Money fields that should have _display versions added
const MONEY_FIELDS = [
  'amount',
  'balance',
  'spent',
  'budgeted',
  'available',
  'totalBudgeted',
  'totalSpent',
  'totalBalance',
  'totalIncome',
  'incomeAvailable',
  'lastMonthOverspent',
  'forNextMonth',
  'toBudget',
  'fromLastMonth',
  // AI agent route fields
  'total_budgeted',
  'total_spent',
  'total_available',
  'upcoming_total',
  'past_due_total',
  'paid_total',
  'paid_amount',
  // Debt payoff fields
  'payment_made',
  'total_payment_made',
  'remaining_debt',
  'total_remaining_debt'
];

/**
 * Format a single amount from cents to display string
 * @param {number} cents - Amount in cents
 * @param {string} currencySymbol - Currency symbol to use
 * @returns {string} Formatted amount string
 */
function formatSingleAmount(cents, currencySymbol) {
  const isNegative = cents < 0;
  const absolute = Math.abs(cents);
  const dollars = (absolute / 100).toFixed(2);
  const formatted = dollars.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return isNegative ? `-${currencySymbol}${formatted}` : `${currencySymbol}${formatted}`;
}

/**
 * Format an amount (single or range) from cents to display string
 * @param {number|object} amount - Amount in cents or range object {num1, num2}
 * @param {string} currencySymbol - Currency symbol to use
 * @returns {string|null} Formatted amount string
 */
exports.formatAmountDisplay = (amount, currencySymbol = 'P') => {
  if (amount === null || amount === undefined) return null;

  // Handle range objects (for schedules with isbetween)
  if (typeof amount === 'object' && amount.num1 !== undefined && amount.num2 !== undefined) {
    const display1 = formatSingleAmount(amount.num1, currencySymbol);
    const display2 = formatSingleAmount(amount.num2, currencySymbol);
    return `${display1} - ${display2}`;
  }

  if (typeof amount !== 'number') return null;

  return formatSingleAmount(amount, currencySymbol);
}

/**
 * Recursively add _display fields to objects containing money amounts
 * @param {any} data - Data to transform (object, array, or primitive)
 * @param {string} currencySymbol - Currency symbol to use
 * @returns {any} Transformed data with _display fields added
 */
exports.addDisplayFields = (data, currencySymbol = 'P') => {
  if (data === null || data === undefined) return data;

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => exports.addDisplayFields(item, currencySymbol));
  }

  // Handle objects
  if (typeof data === 'object') {
    const result = { ...data };

    for (const key of Object.keys(result)) {
      const value = result[key];

      // Check if this is a money field
      if (MONEY_FIELDS.includes(key)) {
        const displayValue = exports.formatAmountDisplay(value, currencySymbol);
        if (displayValue !== null) {
          result[`${key}_display`] = displayValue;
        }
      }

      // Recursively process nested objects/arrays
      if (typeof value === 'object' && value !== null) {
        result[key] = exports.addDisplayFields(value, currencySymbol);
      }
    }

    return result;
  }

  // Return primitives as-is
  return data;
}

/**
 * Validate that amount (cents) and amount_major (pesos) are both provided and match
 * @param {object} data - Object containing amount and amount_major fields
 * @param {string} fieldName - Name of the parent object for error messages (e.g., 'transaction', 'schedule')
 * @throws {Error} If validation fails
 */
exports.validateAmountFields = (data, fieldName = 'request') => {
  if (data.amount === undefined && data.amount_major === undefined) {
    // Neither provided - that's okay, amount might be optional
    return;
  }

  if (data.amount !== undefined && data.amount_major === undefined) {
    throw new Error(`${fieldName} must include both 'amount' (cents) and 'amount_major' (pesos) fields`);
  }

  if (data.amount === undefined && data.amount_major !== undefined) {
    throw new Error(`${fieldName} must include both 'amount' (cents) and 'amount_major' (pesos) fields`);
  }

  // Handle range objects for schedules with isbetween
  if (typeof data.amount === 'object' && data.amount.num1 !== undefined) {
    if (typeof data.amount_major !== 'object' || data.amount_major.num1 === undefined) {
      throw new Error(`${fieldName} amount_major must be a range object when amount is a range`);
    }

    const expectedNum1 = Math.round(data.amount_major.num1 * 100);
    const expectedNum2 = Math.round(data.amount_major.num2 * 100);

    if (data.amount.num1 !== expectedNum1 || data.amount.num2 !== expectedNum2) {
      throw new Error(
        `${fieldName} amount mismatch: amount.num1 (${data.amount.num1}) should equal amount_major.num1 * 100 (${expectedNum1}), ` +
        `and amount.num2 (${data.amount.num2}) should equal amount_major.num2 * 100 (${expectedNum2})`
      );
    }
    return;
  }

  // Standard single amount validation
  const expectedCents = Math.round(data.amount_major * 100);

  if (data.amount !== expectedCents) {
    throw new Error(
      `${fieldName} amount mismatch: amount (${data.amount} cents) does not match amount_major * 100 (${data.amount_major} × 100 = ${expectedCents} cents)`
    );
  }
}

/**
 * Strip amount_major field from data before sending to Actual Budget API
 * @param {object} data - Object that may contain amount_major field
 * @returns {object} New object without amount_major field
 */
exports.stripAmountMajor = (data) => {
  if (!data || typeof data !== 'object') return data;

  const { amount_major, ...rest } = data;
  return rest;
}