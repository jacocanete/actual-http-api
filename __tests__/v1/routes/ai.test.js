// Ensure required secrets exist before importing modules that load config at module initialization
process.env.API_KEY = process.env.API_KEY || 'test-api-key';
process.env.ACTUAL_SERVER_PASSWORD = process.env.ACTUAL_SERVER_PASSWORD || 'test-password';

describe('AI Agent Routes', () => {
  let mockRouter;
  let mockBudget;
  let mockReq;
  let mockRes;
  let mockNext;
  let handlers;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-12-21'));
    jest.resetModules();
    jest.clearAllMocks();

    handlers = {};

    mockRouter = {
      get: jest.fn((path, handler) => {
        handlers[`GET ${path}`] = handler;
      }),
      post: jest.fn((path, handler) => {
        handlers[`POST ${path}`] = handler;
      }),
      patch: jest.fn((path, handler) => {
        handlers[`PATCH ${path}`] = handler;
      }),
      delete: jest.fn((path, handler) => {
        handlers[`DELETE ${path}`] = handler;
      }),
    };

    mockBudget = {
      getMonth: jest.fn().mockResolvedValue({
        month: '2025-12',
        categoryGroups: [
          {
            id: 'grp1',
            name: 'Essentials',
            is_income: false,
            hidden: false,
            categories: [
              {
                id: 'cat1',
                name: 'Food',
                hidden: false,
                budgeted: 10000,
                spent: -7500,
                balance: 2500,
              },
              {
                id: 'cat2',
                name: 'Transport',
                hidden: false,
                budgeted: 5000,
                spent: -3000,
                balance: 2000,
              },
              {
                id: 'cat3',
                name: 'Hidden Category',
                hidden: true,
                budgeted: 1000,
                spent: 0,
                balance: 1000,
              },
            ],
          },
          {
            id: 'grp2',
            name: 'Income',
            is_income: true,
            hidden: false,
            categories: [
              {
                id: 'cat-income',
                name: 'Salary',
                hidden: false,
                budgeted: 0,
                spent: 50000,
                balance: 50000,
              },
            ],
          },
          {
            id: 'grp3',
            name: 'Debt',
            is_income: false,
            hidden: false,
            categories: [
              {
                id: 'cat-debt1',
                name: 'Credit Card Debt',
                hidden: false,
                budgeted: 20000,
                spent: -50000,
                balance: -30000,
              },
              {
                id: 'cat-debt2',
                name: 'Loan Debt',
                hidden: false,
                budgeted: 10000,
                spent: -10000,
                balance: 0,
              },
            ],
          },
        ],
      }),
      getSchedules: jest.fn().mockResolvedValue([
        {
          id: 'sched1',
          name: 'Rent',
          next_date: '2025-12-25',
          completed: false,
          amount: -150000,
          amountOp: 'is',
          payee: 'payee1',
          account: 'acc1',
        },
        {
          id: 'sched2',
          name: 'Insurance',
          next_date: '2025-12-15',
          completed: false,
          amount: -50000,
          amountOp: 'isapprox',
          payee: 'payee2',
          account: 'acc1',
        },
        {
          id: 'sched3',
          name: 'Completed Bill',
          next_date: '2025-12-10',
          completed: true,
          amount: -10000,
          amountOp: 'is',
          payee: 'payee3',
          account: 'acc1',
        },
        {
          id: 'sched4',
          name: null,
          next_date: '2025-12-30',
          completed: false,
          amount: -25000,
          amountOp: 'is',
          payee: 'payee4',
          account: 'acc2',
        },
      ]),
      getPayees: jest.fn().mockResolvedValue([
        { id: 'payee1', name: 'Landlord' },
        { id: 'payee2', name: 'Insurance Co' },
        { id: 'payee3', name: 'Utility' },
        { id: 'payee4', name: 'Subscription' },
        { id: 'payee5', name: 'Phone Company' },
      ]),
      getAccounts: jest.fn().mockResolvedValue([
        { id: 'acc1', name: 'Checking', closed: false },
        { id: 'acc2', name: 'Savings', closed: false },
      ]),
      getTransactions: jest.fn().mockResolvedValue([]),
    };

    mockReq = {
      params: {},
      query: {},
      body: {},
    };

    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      locals: {
        budget: mockBudget,
      },
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('GET /budgets/:budgetSyncId/ai/budget-check', () => {
    it('should register the route', () => {
      const aiModule = require('../../../src/v1/routes/ai');
      aiModule(mockRouter);

      expect(mockRouter.get).toHaveBeenCalledWith(
        '/budgets/:budgetSyncId/ai/budget-check',
        expect.any(Function)
      );
    });

    it('should return spending and debt data separated', async () => {
      const aiModule = require('../../../src/v1/routes/ai');
      aiModule(mockRouter);

      const handler = handlers['GET /budgets/:budgetSyncId/ai/budget-check'];
      await handler(mockReq, mockRes, mockNext);

      expect(mockBudget.getMonth).toHaveBeenCalledWith('2025-12');
      expect(mockRes.json).toHaveBeenCalledWith({
        data: expect.objectContaining({
          month: '2025-12',
          spending: expect.objectContaining({
            summary: expect.objectContaining({
              total_budgeted: 15000,
              total_spent: -10500,
              total_available: 4500,
            }),
            categories: expect.arrayContaining([
              expect.objectContaining({ id: 'cat1', name: 'Food' }),
              expect.objectContaining({ id: 'cat2', name: 'Transport' }),
            ]),
          }),
          debt_payoff: expect.objectContaining({
            summary: expect.objectContaining({
              total_payment_made: 30000,
              total_remaining_debt: -30000,
            }),
            categories: expect.arrayContaining([
              expect.objectContaining({ id: 'cat-debt1', name: 'Credit Card Debt' }),
              expect.objectContaining({ id: 'cat-debt2', name: 'Loan Debt' }),
            ]),
          }),
        }),
      });
    });

    it('should skip income groups', async () => {
      const aiModule = require('../../../src/v1/routes/ai');
      aiModule(mockRouter);

      const handler = handlers['GET /budgets/:budgetSyncId/ai/budget-check'];
      await handler(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      const spendingIds = response.data.spending.categories.map((c) => c.id);
      const debtIds = response.data.debt_payoff.categories.map((c) => c.id);

      expect(spendingIds).not.toContain('cat-income');
      expect(debtIds).not.toContain('cat-income');
    });

    it('should skip hidden categories', async () => {
      const aiModule = require('../../../src/v1/routes/ai');
      aiModule(mockRouter);

      const handler = handlers['GET /budgets/:budgetSyncId/ai/budget-check'];
      await handler(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      const spendingIds = response.data.spending.categories.map((c) => c.id);

      expect(spendingIds).not.toContain('cat3');
    });

    it('should include group_name in category data', async () => {
      const aiModule = require('../../../src/v1/routes/ai');
      aiModule(mockRouter);

      const handler = handlers['GET /budgets/:budgetSyncId/ai/budget-check'];
      await handler(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      const foodCategory = response.data.spending.categories.find((c) => c.id === 'cat1');

      expect(foodCategory.group_name).toBe('Essentials');
    });

    it('should filter spending categories by name', async () => {
      const aiModule = require('../../../src/v1/routes/ai');
      aiModule(mockRouter);

      const handler = handlers['GET /budgets/:budgetSyncId/ai/budget-check'];
      mockReq.query.category = 'food';

      await handler(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];

      expect(response.data.spending.categories).toHaveLength(1);
      expect(response.data.spending.categories[0].name).toBe('Food');
    });

    it('should filter debt categories by name', async () => {
      const aiModule = require('../../../src/v1/routes/ai');
      aiModule(mockRouter);

      const handler = handlers['GET /budgets/:budgetSyncId/ai/budget-check'];
      mockReq.query.category = 'credit';

      await handler(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];

      expect(response.data.spending.categories).toHaveLength(0);
      expect(response.data.debt_payoff.categories).toHaveLength(1);
      expect(response.data.debt_payoff.categories[0].name).toBe('Credit Card Debt');
    });

    it('should accept month parameter', async () => {
      const aiModule = require('../../../src/v1/routes/ai');
      aiModule(mockRouter);

      const handler = handlers['GET /budgets/:budgetSyncId/ai/budget-check'];
      mockReq.query.month = '2025-11';

      await handler(mockReq, mockRes, mockNext);

      expect(mockBudget.getMonth).toHaveBeenCalledWith('2025-11');
    });

    it('should include display fields for spending categories', async () => {
      const aiModule = require('../../../src/v1/routes/ai');
      aiModule(mockRouter);

      const handler = handlers['GET /budgets/:budgetSyncId/ai/budget-check'];
      await handler(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];

      // Check spending summary has display fields
      expect(response.data.spending.summary).toHaveProperty('total_budgeted_display');
      expect(response.data.spending.summary).toHaveProperty('total_spent_display');
      expect(response.data.spending.summary).toHaveProperty('total_available_display');

      // Check spending categories have display fields
      const category = response.data.spending.categories[0];
      expect(category).toHaveProperty('budgeted_display');
      expect(category).toHaveProperty('spent_display');
      expect(category).toHaveProperty('available_display');
    });

    it('should include display fields for debt categories', async () => {
      const aiModule = require('../../../src/v1/routes/ai');
      aiModule(mockRouter);

      const handler = handlers['GET /budgets/:budgetSyncId/ai/budget-check'];
      await handler(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];

      // Check debt summary has display fields
      expect(response.data.debt_payoff.summary).toHaveProperty('total_payment_made_display');
      expect(response.data.debt_payoff.summary).toHaveProperty('total_remaining_debt_display');

      // Check debt categories have display fields
      const debtCategory = response.data.debt_payoff.categories[0];
      expect(debtCategory).toHaveProperty('payment_made_display');
      expect(debtCategory).toHaveProperty('remaining_debt_display');
    });

    it('should handle errors from getMonth', async () => {
      const aiModule = require('../../../src/v1/routes/ai');
      aiModule(mockRouter);

      const handler = handlers['GET /budgets/:budgetSyncId/ai/budget-check'];
      const error = new Error('Budget not found');
      mockBudget.getMonth.mockRejectedValueOnce(error);

      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('GET /budgets/:budgetSyncId/ai/bills-due', () => {
    it('should register the route', () => {
      const aiModule = require('../../../src/v1/routes/ai');
      aiModule(mockRouter);

      expect(mockRouter.get).toHaveBeenCalledWith(
        '/budgets/:budgetSyncId/ai/bills-due',
        expect.any(Function)
      );
    });

    it('should return upcoming and past-due bills', async () => {
      const aiModule = require('../../../src/v1/routes/ai');
      aiModule(mockRouter);

      const handler = handlers['GET /budgets/:budgetSyncId/ai/bills-due'];
      await handler(mockReq, mockRes, mockNext);

      expect(mockBudget.getSchedules).toHaveBeenCalled();
      expect(mockBudget.getPayees).toHaveBeenCalled();
      expect(mockBudget.getAccounts).toHaveBeenCalled();

      expect(mockRes.json).toHaveBeenCalledWith({
        data: expect.objectContaining({
          as_of_date: '2025-12-21',
          upcoming: expect.any(Array),
          past_due: expect.any(Array),
          summary: expect.objectContaining({
            upcoming_count: expect.any(Number),
            past_due_count: expect.any(Number),
          }),
        }),
      });
    });

    it('should skip completed schedules', async () => {
      const aiModule = require('../../../src/v1/routes/ai');
      aiModule(mockRouter);

      const handler = handlers['GET /budgets/:budgetSyncId/ai/bills-due'];
      await handler(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      const allBillIds = [
        ...response.data.upcoming.map((b) => b.id),
        ...response.data.past_due.map((b) => b.id),
      ];

      expect(allBillIds).not.toContain('sched3');
    });

    it('should categorize upcoming bills correctly', async () => {
      const aiModule = require('../../../src/v1/routes/ai');
      aiModule(mockRouter);

      const handler = handlers['GET /budgets/:budgetSyncId/ai/bills-due'];
      await handler(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];

      // sched1 (2025-12-25) and sched4 (2025-12-30) are upcoming
      const upcomingIds = response.data.upcoming.map((b) => b.id);
      expect(upcomingIds).toContain('sched1');
      expect(upcomingIds).toContain('sched4');
    });

    it('should categorize past-due bills correctly', async () => {
      const aiModule = require('../../../src/v1/routes/ai');
      aiModule(mockRouter);

      const handler = handlers['GET /budgets/:budgetSyncId/ai/bills-due'];
      await handler(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];

      // sched2 (2025-12-15) is past due
      const pastDueIds = response.data.past_due.map((b) => b.id);
      expect(pastDueIds).toContain('sched2');
    });

    it('should include days_until_due for upcoming bills', async () => {
      const aiModule = require('../../../src/v1/routes/ai');
      aiModule(mockRouter);

      const handler = handlers['GET /budgets/:budgetSyncId/ai/bills-due'];
      await handler(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      const rentBill = response.data.upcoming.find((b) => b.id === 'sched1');

      expect(rentBill).toHaveProperty('days_until_due');
      expect(rentBill.days_until_due).toBe(4); // Dec 25 - Dec 21
    });

    it('should include days_overdue for past-due bills', async () => {
      const aiModule = require('../../../src/v1/routes/ai');
      aiModule(mockRouter);

      const handler = handlers['GET /budgets/:budgetSyncId/ai/bills-due'];
      await handler(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      const insuranceBill = response.data.past_due.find((b) => b.id === 'sched2');

      expect(insuranceBill).toHaveProperty('days_overdue');
      expect(insuranceBill.days_overdue).toBe(6); // Dec 21 - Dec 15
    });

    it('should include payee and account names', async () => {
      const aiModule = require('../../../src/v1/routes/ai');
      aiModule(mockRouter);

      const handler = handlers['GET /budgets/:budgetSyncId/ai/bills-due'];
      await handler(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      const rentBill = response.data.upcoming.find((b) => b.id === 'sched1');

      expect(rentBill.payee_name).toBe('Landlord');
      expect(rentBill.account_name).toBe('Checking');
    });

    it('should use payee name when schedule name is null', async () => {
      const aiModule = require('../../../src/v1/routes/ai');
      aiModule(mockRouter);

      const handler = handlers['GET /budgets/:budgetSyncId/ai/bills-due'];
      await handler(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      const subscriptionBill = response.data.upcoming.find((b) => b.id === 'sched4');

      expect(subscriptionBill.name).toBe('Subscription');
    });

    it('should sort upcoming by nearest due date', async () => {
      const aiModule = require('../../../src/v1/routes/ai');
      aiModule(mockRouter);

      const handler = handlers['GET /budgets/:budgetSyncId/ai/bills-due'];
      await handler(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      const upcomingDays = response.data.upcoming.map((b) => b.days_until_due);

      // Should be sorted ascending
      for (let i = 1; i < upcomingDays.length; i++) {
        expect(upcomingDays[i]).toBeGreaterThanOrEqual(upcomingDays[i - 1]);
      }
    });

    it('should sort past_due by most overdue first', async () => {
      const aiModule = require('../../../src/v1/routes/ai');
      aiModule(mockRouter);

      // Add another past-due schedule for sorting test
      mockBudget.getSchedules.mockResolvedValueOnce([
        {
          id: 'sched-old',
          name: 'Old Bill',
          next_date: '2025-12-01',
          completed: false,
          amount: -10000,
          amountOp: 'is',
          payee: 'payee1',
          account: 'acc1',
        },
        {
          id: 'sched2',
          name: 'Insurance',
          next_date: '2025-12-15',
          completed: false,
          amount: -50000,
          amountOp: 'is',
          payee: 'payee2',
          account: 'acc1',
        },
      ]);

      const handler = handlers['GET /budgets/:budgetSyncId/ai/bills-due'];
      await handler(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      const pastDueDays = response.data.past_due.map((b) => b.days_overdue);

      // Should be sorted descending (most overdue first)
      for (let i = 1; i < pastDueDays.length; i++) {
        expect(pastDueDays[i]).toBeLessThanOrEqual(pastDueDays[i - 1]);
      }
    });

    it('should include display fields for monetary values', async () => {
      const aiModule = require('../../../src/v1/routes/ai');
      aiModule(mockRouter);

      const handler = handlers['GET /budgets/:budgetSyncId/ai/bills-due'];
      await handler(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];

      // Check summary has display fields
      expect(response.data.summary).toHaveProperty('upcoming_total_display');
      expect(response.data.summary).toHaveProperty('past_due_total_display');
      expect(response.data.summary).toHaveProperty('paid_total_display');

      // Check bills have amount_type and amount_display
      if (response.data.upcoming.length > 0) {
        expect(response.data.upcoming[0]).toHaveProperty('amount_type');
        expect(response.data.upcoming[0]).toHaveProperty('amount_display');
      }
    });

    it('should format fixed amounts correctly', async () => {
      const aiModule = require('../../../src/v1/routes/ai');
      aiModule(mockRouter);

      const handler = handlers['GET /budgets/:budgetSyncId/ai/bills-due'];
      await handler(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      const rentBill = response.data.upcoming.find((b) => b.id === 'sched1');

      expect(rentBill.amount_type).toBe('fixed');
      expect(rentBill.amount).toBe(-150000);
      expect(rentBill.amount_display).toBe('₱1,500.00');
    });

    it('should format approximate amounts with tilde', async () => {
      const aiModule = require('../../../src/v1/routes/ai');
      aiModule(mockRouter);

      const handler = handlers['GET /budgets/:budgetSyncId/ai/bills-due'];
      await handler(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      const insuranceBill = response.data.past_due.find((b) => b.id === 'sched2');

      expect(insuranceBill.amount_type).toBe('approximate');
      expect(insuranceBill.amount).toBe(-50000);
      expect(insuranceBill.amount_display).toBe('~₱500.00');
    });

    it('should format range amounts with amount_low and amount_high', async () => {
      const aiModule = require('../../../src/v1/routes/ai');
      aiModule(mockRouter);

      // Add a schedule with isbetween
      mockBudget.getSchedules.mockResolvedValueOnce([
        {
          id: 'sched-range',
          name: 'Electric Bill',
          next_date: '2025-12-28',
          completed: false,
          amount: { num1: -600000, num2: -900000 },
          amountOp: 'isbetween',
          payee: 'payee1',
          account: 'acc1',
        },
      ]);

      const handler = handlers['GET /budgets/:budgetSyncId/ai/bills-due'];
      await handler(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      const electricBill = response.data.upcoming[0];

      expect(electricBill.amount_type).toBe('range');
      expect(electricBill.amount_low).toBe(-600000);
      expect(electricBill.amount_high).toBe(-900000);
      expect(electricBill.amount_display).toBe('₱6,000.00 to ₱9,000.00');
      expect(electricBill).not.toHaveProperty('amount');
    });

    it('should calculate correct summary totals', async () => {
      const aiModule = require('../../../src/v1/routes/ai');
      aiModule(mockRouter);

      const handler = handlers['GET /budgets/:budgetSyncId/ai/bills-due'];
      await handler(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];

      expect(response.data.summary.upcoming_count).toBe(2);
      expect(response.data.summary.upcoming_total).toBe(-175000); // -150000 + -25000
      expect(response.data.summary.past_due_count).toBe(1);
      expect(response.data.summary.past_due_total).toBe(-50000);
      expect(response.data.summary.paid_count).toBe(0);
      expect(response.data.summary.paid_total).toBe(0);
    });

    it('should return months array in response', async () => {
      const aiModule = require('../../../src/v1/routes/ai');
      aiModule(mockRouter);

      const handler = handlers['GET /budgets/:budgetSyncId/ai/bills-due'];
      await handler(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];

      expect(response.data.months).toEqual(['2025-12']);
    });

    it('should accept single month parameter', async () => {
      const aiModule = require('../../../src/v1/routes/ai');
      aiModule(mockRouter);

      mockReq.query.month = '2025-11';
      const handler = handlers['GET /budgets/:budgetSyncId/ai/bills-due'];
      await handler(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];

      expect(response.data.months).toEqual(['2025-11']);
    });

    it('should accept multiple months as comma-separated list', async () => {
      const aiModule = require('../../../src/v1/routes/ai');
      aiModule(mockRouter);

      mockReq.query.month = '2025-12,2026-01,2026-02';
      const handler = handlers['GET /budgets/:budgetSyncId/ai/bills-due'];
      await handler(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];

      expect(response.data.months).toEqual(['2025-12', '2026-01', '2026-02']);
    });

    it('should identify all paid schedules from transactions this month', async () => {
      const aiModule = require('../../../src/v1/routes/ai');
      aiModule(mockRouter);

      // Schedules with different next_dates
      mockBudget.getSchedules.mockResolvedValueOnce([
        {
          id: 'sched1',
          name: 'Rent',
          next_date: '2025-12-21', // Still in current month
          completed: false,
          amount: -150000,
          amountOp: 'is',
          payee: 'payee1',
          account: 'acc1',
        },
        {
          id: 'sched5',
          name: 'Phone Bill',
          next_date: '2026-01-15', // Already advanced to next month
          completed: false,
          amount: -30000,
          amountOp: 'is',
          payee: 'payee5',
          account: 'acc1',
        },
      ]);

      // Both have transactions this month - both should be marked as paid
      mockBudget.getTransactions.mockResolvedValue([
        {
          id: 'tx1',
          schedule: 'sched1',
          date: '2025-12-20',
          amount: -150000,
        },
        {
          id: 'tx2',
          schedule: 'sched5',
          date: '2025-12-18',
          amount: -30000,
        },
      ]);

      const handler = handlers['GET /budgets/:budgetSyncId/ai/bills-due'];
      await handler(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];

      // Both should be in paid (any schedule with transaction this month)
      expect(response.data.paid).toHaveLength(2);
      expect(response.data.paid.map((b) => b.id)).toContain('sched1');
      expect(response.data.paid.map((b) => b.id)).toContain('sched5');
      expect(response.data.upcoming).toHaveLength(0);
    });

    it('should include paid_date and paid_amount for paid schedules', async () => {
      const aiModule = require('../../../src/v1/routes/ai');
      aiModule(mockRouter);

      mockBudget.getSchedules.mockResolvedValueOnce([
        {
          id: 'sched1',
          name: 'Rent',
          next_date: '2025-12-25', // Still in current month
          completed: false,
          amount: -150000,
          amountOp: 'is',
          payee: 'payee1',
          account: 'acc1',
        },
      ]);

      mockBudget.getTransactions.mockResolvedValue([
        {
          id: 'tx1',
          schedule: 'sched1',
          date: '2025-12-20',
          amount: -148000,
        },
      ]);

      const handler = handlers['GET /budgets/:budgetSyncId/ai/bills-due'];
      await handler(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      const paidBill = response.data.paid[0];

      expect(paidBill.paid_date).toBe('2025-12-20');
      expect(paidBill.paid_amount).toBe(-148000);
      expect(paidBill).toHaveProperty('paid_amount_display');
    });

    it('should include paid_total in summary', async () => {
      const aiModule = require('../../../src/v1/routes/ai');
      aiModule(mockRouter);

      mockBudget.getSchedules.mockResolvedValueOnce([
        {
          id: 'sched1',
          name: 'Rent',
          next_date: '2025-12-20', // Still in current month
          completed: false,
          amount: -150000,
          amountOp: 'is',
          payee: 'payee1',
          account: 'acc1',
        },
        {
          id: 'sched5',
          name: 'Phone Bill',
          next_date: '2025-12-18', // Still in current month
          completed: false,
          amount: -30000,
          amountOp: 'is',
          payee: 'payee5',
          account: 'acc1',
        },
      ]);

      mockBudget.getTransactions.mockResolvedValue([
        {
          id: 'tx1',
          schedule: 'sched1',
          date: '2025-12-20',
          amount: -150000,
        },
        {
          id: 'tx2',
          schedule: 'sched5',
          date: '2025-12-18',
          amount: -30000,
        },
      ]);

      const handler = handlers['GET /budgets/:budgetSyncId/ai/bills-due'];
      await handler(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];

      expect(response.data.summary.paid_count).toBe(2);
      expect(response.data.summary.paid_total).toBe(-180000);
      expect(response.data.summary).toHaveProperty('paid_total_display');
    });

    it('should skip closed accounts when fetching transactions', async () => {
      const aiModule = require('../../../src/v1/routes/ai');
      aiModule(mockRouter);

      mockBudget.getAccounts.mockResolvedValueOnce([
        { id: 'acc1', name: 'Checking', closed: false },
        { id: 'acc2', name: 'Old Account', closed: true },
      ]);

      const handler = handlers['GET /budgets/:budgetSyncId/ai/bills-due'];
      await handler(mockReq, mockRes, mockNext);

      // Should only call getTransactions for acc1, not acc2
      expect(mockBudget.getTransactions).toHaveBeenCalledTimes(1);
      expect(mockBudget.getTransactions).toHaveBeenCalledWith('acc1', expect.any(String), expect.any(String));
    });

    it('should handle errors from getSchedules', async () => {
      const aiModule = require('../../../src/v1/routes/ai');
      aiModule(mockRouter);

      const handler = handlers['GET /budgets/:budgetSyncId/ai/bills-due'];
      const error = new Error('Failed to fetch schedules');
      mockBudget.getSchedules.mockRejectedValueOnce(error);

      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
