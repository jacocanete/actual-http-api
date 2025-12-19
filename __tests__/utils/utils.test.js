jest.mock('fs');
const fs = require('fs');
const path = require('path');
const {
  createDirIfDoesNotExist,
  currentLocalDate,
  formatDateToISOString,
  isEmpty,
  listSubDirectories,
  getFileContent,
  parseNumericBoolean,
  paginate,
  validatePaginationParameters,
  formatAmountDisplay,
  addDisplayFields,
  validateAmountFields,
} = require('../../src/utils/utils');

describe('Utils', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createDirIfDoesNotExist', () => {
    it('should create directory if it does not exist', () => {
      fs.existsSync.mockReturnValue(false);
      const testDir = '/test/dir';

      createDirIfDoesNotExist(testDir);

      expect(fs.existsSync).toHaveBeenCalledWith(testDir);
      expect(fs.mkdirSync).toHaveBeenCalledWith(testDir, { recursive: true });
    });

    it('should not create directory if it already exists', () => {
      fs.existsSync.mockReturnValue(true);
      const testDir = '/test/dir';

      createDirIfDoesNotExist(testDir);

      expect(fs.existsSync).toHaveBeenCalledWith(testDir);
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('currentLocalDate', () => {
    it('should return today date in local timezone', () => {
      const result = currentLocalDate();

      // The implementation builds a date from the local YYYY-MM-DD string.
      // Compare the ISO date part to the expected local date string to be robust across timezones.
      const expectedLocalDate = new Date().toLocaleString('sv', { timeZoneName: 'short' }).split(' ')[0];

      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString().split('T')[0]).toBe(expectedLocalDate);
    });
  });

  describe('formatDateToISOString', () => {
    it('should format date to ISO string YYYY-MM-DD', () => {
      const date = new Date('2024-01-15T10:30:00Z');

      const result = formatDateToISOString(date);

      expect(result).toBe('2024-01-15');
    });

    it('should handle dates with leading zeros', () => {
      const date = new Date('2024-03-05T00:00:00Z');

      const result = formatDateToISOString(date);

      expect(result).toBe('2024-03-05');
    });
  });

  describe('isEmpty', () => {
    it('should return true for null', () => {
      expect(isEmpty(null)).toBe(true);
    });

    it('should return true for undefined', () => {
      expect(isEmpty(undefined)).toBe(true);
    });

    it('should return true for empty object', () => {
      expect(isEmpty({})).toBe(true);
    });

    it('should return false for object with properties', () => {
      expect(isEmpty({ name: 'test' })).toBe(false);
    });

    it('should return false for array', () => {
      expect(isEmpty([1, 2, 3])).toBe(false);
    });

    it('should return false for non-empty string', () => {
      expect(isEmpty('test')).toBe(false);
    });
  });

  describe('listSubDirectories', () => {
    it('should list only subdirectories', () => {
      const mockDirents = [
        { isDirectory: () => true, name: 'dir1' },
        { isDirectory: () => false, name: 'file1.txt' },
        { isDirectory: () => true, name: 'dir2' },
      ];
      fs.readdirSync.mockReturnValue(mockDirents);

      const result = listSubDirectories('/test/dir');

      expect(result).toEqual(['dir1', 'dir2']);
      expect(fs.readdirSync).toHaveBeenCalledWith('/test/dir', { withFileTypes: true });
    });

    it('should return empty array when no directories exist', () => {
      const mockDirents = [
        { isDirectory: () => false, name: 'file1.txt' },
        { isDirectory: () => false, name: 'file2.txt' },
      ];
      fs.readdirSync.mockReturnValue(mockDirents);

      const result = listSubDirectories('/test/dir');

      expect(result).toEqual([]);
    });
  });

  describe('getFileContent', () => {
    it('should read and return file content', () => {
      const fileContent = 'file content';
      fs.readFileSync.mockReturnValue(fileContent);

      const result = getFileContent('/test/file.txt');

      expect(result).toBe(fileContent);
      expect(fs.readFileSync).toHaveBeenCalledWith('/test/file.txt', 'utf8');
    });
  });

  describe('parseNumericBoolean', () => {
    it('should convert 0 to false', () => {
      expect(parseNumericBoolean(0)).toBe(false);
    });

    it('should convert 1 to true', () => {
      expect(parseNumericBoolean(1)).toBe(true);
    });

    it('should return non-0/1 values as is', () => {
      expect(parseNumericBoolean(2)).toBe(2);
      expect(parseNumericBoolean('yes')).toBe('yes');
      expect(parseNumericBoolean(null)).toBe(null);
    });
  });

  describe('paginate', () => {
    const testArray = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));

    it('should paginate array correctly with valid parameters', () => {
      const result = paginate(testArray, 1, 10);

      expect(result).toHaveLength(10);
      expect(result[0].id).toBe(1);
      expect(result[9].id).toBe(10);
    });

    it('should return correct page 2', () => {
      const result = paginate(testArray, 2, 10);

      expect(result).toHaveLength(10);
      expect(result[0].id).toBe(11);
      expect(result[9].id).toBe(20);
    });

    it('should return partial page on last page', () => {
      const result = paginate(testArray, 3, 10);

      expect(result).toHaveLength(5);
      expect(result[0].id).toBe(21);
      expect(result[4].id).toBe(25);
    });

    it('should throw error if limit is less than 1', () => {
      expect(() => paginate(testArray, 1, 0)).toThrow(
        'Limit query parameter must be greater than 0'
      );
      expect(() => paginate(testArray, 1, -1)).toThrow(
        'Limit query parameter must be greater than 0'
      );
    });

    it('should throw error if page is out of bounds', () => {
      expect(() => paginate(testArray, 0, 10)).toThrow(
        'Page query parameter must be between 1 and 3'
      );
      expect(() => paginate(testArray, 4, 10)).toThrow(
        'Page query parameter must be between 1 and 3'
      );
    });

    it('should handle single page correctly', () => {
      const result = paginate(testArray, 1, 100);

      expect(result).toHaveLength(25);
      expect(result).toEqual(testArray);
    });
  });

  describe('validatePaginationParameters', () => {
    it('should throw error if limit is missing', () => {
      const req = { query: { page: 1 } };

      expect(() => validatePaginationParameters(req)).toThrow(
        'limit query parameter is required when using pagination'
      );
    });

    it('should throw error if page is missing', () => {
      const req = { query: { limit: 10 } };

      expect(() => validatePaginationParameters(req)).toThrow(
        'page query parameter is required when using pagination'
      );
    });

    it('should not throw error if both parameters are present', () => {
      const req = { query: { limit: 10, page: 1 } };

      expect(() => validatePaginationParameters(req)).not.toThrow();
    });
  });

  describe('formatAmountDisplay', () => {
    it('should format positive amount correctly', () => {
      expect(formatAmountDisplay(500000, 'P')).toBe('P5,000.00');
    });

    it('should format negative amount correctly', () => {
      expect(formatAmountDisplay(-13341690, 'P')).toBe('-P133,416.90');
    });

    it('should format zero correctly', () => {
      expect(formatAmountDisplay(0, 'P')).toBe('P0.00');
    });

    it('should format small amounts correctly', () => {
      expect(formatAmountDisplay(50, 'P')).toBe('P0.50');
      expect(formatAmountDisplay(5, 'P')).toBe('P0.05');
    });

    it('should format large amounts with thousand separators', () => {
      expect(formatAmountDisplay(123456789, '$')).toBe('$1,234,567.89');
    });

    it('should handle range objects', () => {
      expect(formatAmountDisplay({ num1: 10000, num2: 20000 }, 'P')).toBe('P100.00 - P200.00');
    });

    it('should handle range objects with negative values', () => {
      expect(formatAmountDisplay({ num1: -20000, num2: -10000 }, 'P')).toBe('-P200.00 - -P100.00');
    });

    it('should return null for null input', () => {
      expect(formatAmountDisplay(null, 'P')).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(formatAmountDisplay(undefined, 'P')).toBeNull();
    });

    it('should return null for non-numeric input', () => {
      expect(formatAmountDisplay('invalid', 'P')).toBeNull();
    });

    it('should use default currency symbol', () => {
      expect(formatAmountDisplay(10000)).toBe('P100.00');
    });
  });

  describe('addDisplayFields', () => {
    it('should add display field for amount', () => {
      const result = addDisplayFields({ amount: -7374 }, 'P');
      expect(result.amount).toBe(-7374);
      expect(result.amount_display).toBe('-P73.74');
    });

    it('should add display field for balance', () => {
      const result = addDisplayFields({ balance: 500000 }, 'P');
      expect(result.balance).toBe(500000);
      expect(result.balance_display).toBe('P5,000.00');
    });

    it('should add display fields for multiple money fields', () => {
      const result = addDisplayFields({
        budgeted: 100000,
        spent: -50000,
        balance: 50000,
      }, 'P');
      expect(result.budgeted_display).toBe('P1,000.00');
      expect(result.spent_display).toBe('-P500.00');
      expect(result.balance_display).toBe('P500.00');
    });

    it('should process nested objects', () => {
      const result = addDisplayFields({
        category: {
          budgeted: 100000,
          spent: -25000,
        }
      }, 'P');
      expect(result.category.budgeted_display).toBe('P1,000.00');
      expect(result.category.spent_display).toBe('-P250.00');
    });

    it('should process arrays', () => {
      const result = addDisplayFields([
        { amount: 10000 },
        { amount: -20000 },
      ], 'P');
      expect(result[0].amount_display).toBe('P100.00');
      expect(result[1].amount_display).toBe('-P200.00');
    });

    it('should process deeply nested structures', () => {
      const result = addDisplayFields({
        month: '2024-01',
        totalSpent: -500000,
        categoryGroups: [
          {
            name: 'Essentials',
            spent: -300000,
            categories: [
              { name: 'Groceries', spent: -150000 },
              { name: 'Utilities', spent: -150000 },
            ]
          }
        ]
      }, 'P');
      expect(result.totalSpent_display).toBe('-P5,000.00');
      expect(result.categoryGroups[0].spent_display).toBe('-P3,000.00');
      expect(result.categoryGroups[0].categories[0].spent_display).toBe('-P1,500.00');
    });

    it('should not add display field for non-money fields', () => {
      const result = addDisplayFields({ id: 'abc123', name: 'Test' }, 'P');
      expect(result.id_display).toBeUndefined();
      expect(result.name_display).toBeUndefined();
    });

    it('should handle null and undefined', () => {
      expect(addDisplayFields(null, 'P')).toBeNull();
      expect(addDisplayFields(undefined, 'P')).toBeUndefined();
    });

    it('should return primitives unchanged', () => {
      expect(addDisplayFields(123, 'P')).toBe(123);
      expect(addDisplayFields('string', 'P')).toBe('string');
    });

    it('should use default currency symbol', () => {
      const result = addDisplayFields({ amount: 10000 });
      expect(result.amount_display).toBe('P100.00');
    });
  });

  describe('validateAmountFields', () => {
    it('should pass when both amount and amount_major are not provided', () => {
      expect(() => validateAmountFields({})).not.toThrow();
    });

    it('should pass when both amount and amount_major match', () => {
      expect(() => validateAmountFields({ amount: -40000, amount_major: -400 })).not.toThrow();
    });

    it('should pass when both are positive and match', () => {
      expect(() => validateAmountFields({ amount: 12345, amount_major: 123.45 })).not.toThrow();
    });

    it('should throw when only amount is provided', () => {
      expect(() => validateAmountFields({ amount: -40000 }, 'transaction')).toThrow(
        "transaction must include both 'amount' (cents) and 'amount_major' (pesos) fields"
      );
    });

    it('should throw when only amount_major is provided', () => {
      expect(() => validateAmountFields({ amount_major: -400 }, 'transaction')).toThrow(
        "transaction must include both 'amount' (cents) and 'amount_major' (pesos) fields"
      );
    });

    it('should throw when amount and amount_major do not match', () => {
      expect(() => validateAmountFields({ amount: -400, amount_major: -400 }, 'transaction')).toThrow(
        'transaction amount mismatch: amount (-400 cents) does not match amount_major * 100 (-400 × 100 = -40000 cents)'
      );
    });

    it('should handle range objects when both match', () => {
      expect(() => validateAmountFields({
        amount: { num1: -10000, num2: -20000 },
        amount_major: { num1: -100, num2: -200 }
      })).not.toThrow();
    });

    it('should throw when range objects do not match', () => {
      expect(() => validateAmountFields({
        amount: { num1: -100, num2: -200 },
        amount_major: { num1: -100, num2: -200 }
      }, 'schedule')).toThrow(
        'schedule amount mismatch'
      );
    });

    it('should throw when amount is range but amount_major is not', () => {
      expect(() => validateAmountFields({
        amount: { num1: -10000, num2: -20000 },
        amount_major: -100
      }, 'schedule')).toThrow(
        'schedule amount_major must be a range object when amount is a range'
      );
    });

    it('should use default field name in error message', () => {
      expect(() => validateAmountFields({ amount: -40000 })).toThrow(
        "request must include both 'amount' (cents) and 'amount_major' (pesos) fields"
      );
    });

    it('should handle rounding for decimal amounts', () => {
      // 73.74 * 100 = 7374
      expect(() => validateAmountFields({ amount: -7374, amount_major: -73.74 })).not.toThrow();
    });
  });
});
