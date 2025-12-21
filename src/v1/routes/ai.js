const { addDisplayFields } = require('../../utils/utils');
const { config } = require('../../config/config');

/**
 * @swagger
 * tags:
 *   - name: AI Agent
 *     description: Specialized endpoints optimized for AI agent consumption. These endpoints provide pre-processed, human-readable data with display values.
 * components:
 *   schemas:
 *     AISpendingCategory:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         group_name:
 *           type: string
 *         budgeted:
 *           type: integer
 *         budgeted_display:
 *           type: string
 *         spent:
 *           type: integer
 *         spent_display:
 *           type: string
 *         available:
 *           type: integer
 *         available_display:
 *           type: string
 *     AIDebtCategory:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         group_name:
 *           type: string
 *         payment_made:
 *           type: integer
 *           description: Amount paid toward this debt this month (equals budgeted amount in Carrying Debt strategy)
 *         payment_made_display:
 *           type: string
 *         remaining_debt:
 *           type: integer
 *           description: Remaining debt balance (negative if debt remains, 0 if paid off)
 *         remaining_debt_display:
 *           type: string
 *     AIBudgetCheckResponse:
 *       type: object
 *       properties:
 *         month:
 *           type: string
 *         spending:
 *           type: object
 *           properties:
 *             summary:
 *               type: object
 *               properties:
 *                 total_budgeted:
 *                   type: integer
 *                 total_budgeted_display:
 *                   type: string
 *                 total_spent:
 *                   type: integer
 *                 total_spent_display:
 *                   type: string
 *                 total_available:
 *                   type: integer
 *                 total_available_display:
 *                   type: string
 *             categories:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AISpendingCategory'
 *         debt_payoff:
 *           type: object
 *           properties:
 *             summary:
 *               type: object
 *               properties:
 *                 total_payment_made:
 *                   type: integer
 *                 total_payment_made_display:
 *                   type: string
 *                 total_remaining_debt:
 *                   type: integer
 *                 total_remaining_debt_display:
 *                   type: string
 *             categories:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AIDebtCategory'
 *     AIBillFixed:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         amount_type:
 *           type: string
 *           enum: [fixed]
 *         amount:
 *           type: integer
 *         amount_display:
 *           type: string
 *           example: "₱2,450.00"
 *         payee_name:
 *           type: string
 *         account_name:
 *           type: string
 *         next_date:
 *           type: string
 *         days_until_due:
 *           type: integer
 *         days_overdue:
 *           type: integer
 *     AIBillApproximate:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         amount_type:
 *           type: string
 *           enum: [approximate]
 *         amount:
 *           type: integer
 *         amount_display:
 *           type: string
 *           example: "~₱409.00"
 *         payee_name:
 *           type: string
 *         account_name:
 *           type: string
 *         next_date:
 *           type: string
 *         days_until_due:
 *           type: integer
 *         days_overdue:
 *           type: integer
 *     AIBillRange:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         amount_type:
 *           type: string
 *           enum: [range]
 *         amount_low:
 *           type: integer
 *         amount_high:
 *           type: integer
 *         amount_display:
 *           type: string
 *           example: "₱6,000.00 to ₱9,000.00"
 *         payee_name:
 *           type: string
 *         account_name:
 *           type: string
 *         next_date:
 *           type: string
 *         days_until_due:
 *           type: integer
 *         days_overdue:
 *           type: integer
 *     AIBillPaid:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         amount_type:
 *           type: string
 *           enum: [fixed, approximate, range]
 *         amount:
 *           type: integer
 *         amount_display:
 *           type: string
 *         payee_name:
 *           type: string
 *         account_name:
 *           type: string
 *         next_date:
 *           type: string
 *         paid_date:
 *           type: string
 *         paid_amount:
 *           type: integer
 *         paid_amount_display:
 *           type: string
 *     AIBillsDueResponse:
 *       type: object
 *       properties:
 *         as_of_date:
 *           type: string
 *         months:
 *           type: array
 *           items:
 *             type: string
 *           description: Target months being queried (YYYY-MM format)
 *         upcoming:
 *           type: array
 *           items:
 *             oneOf:
 *               - $ref: '#/components/schemas/AIBillFixed'
 *               - $ref: '#/components/schemas/AIBillApproximate'
 *               - $ref: '#/components/schemas/AIBillRange'
 *         past_due:
 *           type: array
 *           items:
 *             oneOf:
 *               - $ref: '#/components/schemas/AIBillFixed'
 *               - $ref: '#/components/schemas/AIBillApproximate'
 *               - $ref: '#/components/schemas/AIBillRange'
 *         paid:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/AIBillPaid'
 *         summary:
 *           type: object
 *           properties:
 *             upcoming_count:
 *               type: integer
 *             upcoming_total:
 *               type: integer
 *             upcoming_total_display:
 *               type: string
 *             past_due_count:
 *               type: integer
 *             past_due_total:
 *               type: integer
 *             past_due_total_display:
 *               type: string
 *             paid_count:
 *               type: integer
 *             paid_total:
 *               type: integer
 *             paid_total_display:
 *               type: string
 *     AITransaction:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         date:
 *           type: string
 *           example: "2025-12-21"
 *         amount:
 *           type: integer
 *           description: Amount in cents (negative for expenses)
 *         amount_display:
 *           type: string
 *           example: "-P150.00"
 *         payee_name:
 *           type: string
 *         category_name:
 *           type: string
 *         account_name:
 *           type: string
 *         notes:
 *           type: string
 *         cleared:
 *           type: boolean
 *         is_transfer:
 *           type: boolean
 *         is_split:
 *           type: boolean
 *         schedule_name:
 *           type: string
 *           description: Name of linked recurring bill/schedule, if any
 *         split_items:
 *           type: array
 *           description: Present only if is_split is true
 *           items:
 *             type: object
 *             properties:
 *               amount:
 *                 type: integer
 *               amount_display:
 *                 type: string
 *               category_name:
 *                 type: string
 *               notes:
 *                 type: string
 *     AITransactionCreate:
 *       type: object
 *       required:
 *         - account_name
 *         - amount
 *         - amount_major
 *       properties:
 *         account_name:
 *           type: string
 *           description: Name of the account (case-insensitive match)
 *           example: "GoTyme Bank"
 *         date:
 *           type: string
 *           description: Transaction date (YYYY-MM-DD). Defaults to today.
 *           example: "2025-12-21"
 *         amount:
 *           type: integer
 *           description: Amount in cents (negative for expenses)
 *           example: -15000
 *         amount_major:
 *           type: number
 *           description: Amount in major currency units. Must equal amount/100.
 *           example: -150.00
 *         payee_name:
 *           type: string
 *           description: Payee name. Auto-created if doesn't exist.
 *           example: "Starbucks"
 *         category_name:
 *           type: string
 *           description: Category name (case-insensitive match). Optional.
 *           example: "Food & Dining"
 *         notes:
 *           type: string
 *           description: Optional notes/memo
 *           example: "Coffee with client"
 */

module.exports = (router) => {
  /**
   * @swagger
   * /budgets/{budgetSyncId}/ai/budget-check:
   *   get:
   *     summary: Get budget status for AI agent ("Can I afford this?")
   *     description: >-
   *       Returns budget information optimized for AI consumption.
   *       All monetary values include human-readable display fields.
   *       Use this to check available funds in categories.
   *     tags: [AI Agent]
   *     security:
   *       - apiKey: []
   *     parameters:
   *       - $ref: '#/components/parameters/budgetSyncId'
   *       - $ref: '#/components/parameters/budgetEncryptionPassword'
   *       - name: category
   *         in: query
   *         schema:
   *           type: string
   *         required: false
   *         description: Category name or ID to filter. If omitted, returns all categories.
   *       - name: month
   *         in: query
   *         schema:
   *           type: string
   *         required: false
   *         description: Month in YYYY-MM format. Defaults to current month.
   *     responses:
   *       '200':
   *         description: Budget check data
   *         content:
   *           application/json:
   *             schema:
   *               required:
   *                 - data
   *               type: object
   *               properties:
   *                 data:
   *                   $ref: '#/components/schemas/AIBudgetCheckResponse'
   *       '400':
   *         $ref: '#/components/responses/400'
   *       '404':
   *         $ref: '#/components/responses/404'
   *       '500':
   *         $ref: '#/components/responses/500'
   */
  router.get('/budgets/:budgetSyncId/ai/budget-check', async (req, res, next) => {
    try {
      const { category, month } = req.query;
      const targetMonth = month || getCurrentMonth();

      const budgetMonth = await res.locals.budget.getMonth(targetMonth);

      // Separate spending categories from debt categories
      const spendingCategories = [];
      const debtCategories = [];

      for (const group of budgetMonth.categoryGroups) {
        // Skip income groups
        if (group.is_income) continue;

        // Check if this is a debt group (group name contains "debt", case-insensitive)
        const isDebtGroup = group.name.toLowerCase().includes('debt');

        for (const cat of group.categories) {
          // Skip hidden categories
          if (cat.hidden) continue;

          if (isDebtGroup) {
            debtCategories.push({
              id: cat.id,
              name: cat.name,
              group_name: group.name,
              payment_made: cat.budgeted,
              remaining_debt: cat.balance,
            });
          } else {
            spendingCategories.push({
              id: cat.id,
              name: cat.name,
              group_name: group.name,
              budgeted: cat.budgeted,
              spent: cat.spent,
              available: cat.balance,
            });
          }
        }
      }

      // Filter by category if specified
      let filteredSpending = spendingCategories;
      let filteredDebt = debtCategories;
      if (category) {
        const categoryLower = category.toLowerCase();
        filteredSpending = spendingCategories.filter(
          (c) => c.id === category || c.name.toLowerCase().includes(categoryLower)
        );
        filteredDebt = debtCategories.filter(
          (c) => c.id === category || c.name.toLowerCase().includes(categoryLower)
        );
      }

      // Calculate spending summary
      const spendingBudgeted = filteredSpending.reduce((sum, c) => sum + c.budgeted, 0);
      const spendingSpent = filteredSpending.reduce((sum, c) => sum + c.spent, 0);
      const spendingAvailable = filteredSpending.reduce((sum, c) => sum + c.available, 0);

      // Calculate debt summary
      const debtPaymentMade = filteredDebt.reduce((sum, c) => sum + c.payment_made, 0);
      const debtRemaining = filteredDebt.reduce((sum, c) => sum + c.remaining_debt, 0);

      const response = {
        month: targetMonth,
        spending: {
          summary: {
            total_budgeted: spendingBudgeted,
            total_spent: spendingSpent,
            total_available: spendingAvailable,
          },
          categories: filteredSpending,
        },
        debt_payoff: {
          summary: {
            total_payment_made: debtPaymentMade,
            total_remaining_debt: debtRemaining,
          },
          categories: filteredDebt,
        },
      };

      res.json({ data: addDisplayFields(response, config.currencySymbol) });
    } catch (err) {
      next(err);
    }
  });

  /**
   * @swagger
   * /budgets/{budgetSyncId}/ai/bills-due:
   *   get:
   *     summary: Get bills/schedules status for AI agent ("What bills are left?")
   *     description: >-
   *       Returns scheduled transactions categorized by status.
   *       Shows upcoming bills and past-due bills with days until/since due.
   *       All monetary values include human-readable display fields.
   *     tags: [AI Agent]
   *     security:
   *       - apiKey: []
   *     parameters:
   *       - $ref: '#/components/parameters/budgetSyncId'
   *       - $ref: '#/components/parameters/budgetEncryptionPassword'
   *       - name: month
   *         in: query
   *         schema:
   *           type: string
   *         required: false
   *         description: >-
   *           Month(s) in YYYY-MM format. Can be a single month or comma-separated list.
   *           Defaults to current month. Examples: "2025-12" or "2025-12,2026-01,2026-02"
   *     responses:
   *       '200':
   *         description: Bills due data
   *         content:
   *           application/json:
   *             schema:
   *               required:
   *                 - data
   *               type: object
   *               properties:
   *                 data:
   *                   $ref: '#/components/schemas/AIBillsDueResponse'
   *       '404':
   *         $ref: '#/components/responses/404'
   *       '500':
   *         $ref: '#/components/responses/500'
   */
  router.get('/budgets/:budgetSyncId/ai/bills-due', async (req, res, next) => {
    try {
      const { month } = req.query;
      const today = new Date();
      const todayStr = formatDate(today);
      const hasMonthFilter = !!month;

      // Parse month parameter - can be single month or comma-separated list
      let targetMonths;
      if (month) {
        targetMonths = month.split(',').map(m => m.trim());
      } else {
        targetMonths = [getCurrentMonth()];
      }

      // Calculate date range from target months
      const sortedMonths = targetMonths.sort();
      const firstMonth = sortedMonths[0];
      const lastMonth = sortedMonths[sortedMonths.length - 1];
      const monthStart = `${firstMonth}-01`;
      // Get last day of last month
      const [lastYear, lastMonthNum] = lastMonth.split('-').map(Number);
      const lastDayOfMonth = new Date(lastYear, lastMonthNum, 0).getDate();
      const monthEnd = `${lastMonth}-${String(lastDayOfMonth).padStart(2, '0')}`;

      const schedules = await res.locals.budget.getSchedules();
      const payees = await res.locals.budget.getPayees();
      const accounts = await res.locals.budget.getAccounts();

      // Create lookup maps
      const payeeMap = Object.fromEntries(payees.map((p) => [p.id, p.name]));
      const accountMap = Object.fromEntries(accounts.map((a) => [a.id, a.name]));

      // Helper to check if a date falls within target months
      const isInTargetMonths = (dateStr) => {
        const dateMonth = dateStr.substring(0, 7); // YYYY-MM
        return targetMonths.includes(dateMonth);
      };

      // Get transactions for the date range across all accounts to find paid schedules
      const transactionEndDate = monthEnd < todayStr ? monthEnd : todayStr;
      const paidScheduleTransactions = {};
      for (const account of accounts) {
        if (account.closed) continue;
        const transactions = await res.locals.budget.getTransactions(account.id, monthStart, transactionEndDate);
        for (const tx of transactions) {
          if (tx.schedule && isInTargetMonths(tx.date) && !paidScheduleTransactions[tx.schedule]) {
            paidScheduleTransactions[tx.schedule] = {
              transaction_id: tx.id,
              paid_date: tx.date,
              paid_amount: tx.amount,
            };
          }
        }
      }

      const upcoming = [];
      const pastDue = [];
      const paid = [];

      for (const schedule of schedules) {
        // Skip completed schedules
        if (schedule.completed) continue;

        const nextDate = new Date(schedule.next_date);
        const nextDateStr = schedule.next_date;
        const hasPaidTransaction = paidScheduleTransactions[schedule.id];

        const billInfo = {
          id: schedule.id,
          name: schedule.name || payeeMap[schedule.payee] || 'Unnamed',
          ...transformAmount(schedule, config.currencySymbol),
          payee_name: payeeMap[schedule.payee] || null,
          account_name: accountMap[schedule.account] || null,
          next_date: schedule.next_date,
        };

        if (hasPaidTransaction) {
          // Paid in the target period
          const paidInfo = paidScheduleTransactions[schedule.id];
          billInfo.paid_date = paidInfo.paid_date;
          billInfo.paid_amount = paidInfo.paid_amount;
          billInfo.paid_amount_display = formatBillAmount(paidInfo.paid_amount, config.currencySymbol);
          paid.push(billInfo);
        } else {
          // Not paid - check if we should include based on month filter
          const isNextDateInRange = isInTargetMonths(nextDateStr);

          // If month filter is specified, only include bills due in those months
          // If no month filter, include all upcoming/past_due bills
          if (hasMonthFilter && !isNextDateInRange) continue;

          const daysDiff = Math.floor((nextDate - today) / (1000 * 60 * 60 * 24));

          if (daysDiff >= 0) {
            billInfo.days_until_due = daysDiff;
            upcoming.push(billInfo);
          } else {
            billInfo.days_overdue = Math.abs(daysDiff);
            pastDue.push(billInfo);
          }
        }
      }

      // Sort: upcoming by nearest, past_due by most overdue, paid by most recent
      upcoming.sort((a, b) => a.days_until_due - b.days_until_due);
      pastDue.sort((a, b) => b.days_overdue - a.days_overdue);
      paid.sort((a, b) => new Date(b.paid_date) - new Date(a.paid_date));

      // Calculate totals
      const upcomingTotal = upcoming.reduce((sum, b) => sum + getAmountValue(b), 0);
      const pastDueTotal = pastDue.reduce((sum, b) => sum + getAmountValue(b), 0);
      const paidTotal = paid.reduce((sum, b) => sum + (b.paid_amount || 0), 0);

      const response = {
        as_of_date: todayStr,
        months: targetMonths,
        upcoming: upcoming,
        past_due: pastDue,
        paid: paid,
        summary: {
          upcoming_count: upcoming.length,
          upcoming_total: upcomingTotal,
          upcoming_total_display: formatBillAmount(upcomingTotal, config.currencySymbol),
          past_due_count: pastDue.length,
          past_due_total: pastDueTotal,
          past_due_total_display: formatBillAmount(pastDueTotal, config.currencySymbol),
          paid_count: paid.length,
          paid_total: paidTotal,
          paid_total_display: formatBillAmount(paidTotal, config.currencySymbol),
        },
      };

      res.json({ data: response });
    } catch (err) {
      next(err);
    }
  });

  /**
   * @swagger
   * /budgets/{budgetSyncId}/ai/transactions:
   *   get:
   *     summary: Get transactions optimized for AI agent consumption
   *     description: >-
   *       Returns transactions with resolved names instead of UUIDs.
   *       Filters by account, category, payee, or date range.
   *     tags: [AI Agent]
   *     security:
   *       - apiKey: []
   *     parameters:
   *       - $ref: '#/components/parameters/budgetSyncId'
   *       - $ref: '#/components/parameters/budgetEncryptionPassword'
   *       - name: account
   *         in: query
   *         schema:
   *           type: string
   *         description: Filter by account name (case-insensitive partial match)
   *       - name: category
   *         in: query
   *         schema:
   *           type: string
   *         description: Filter by category name (case-insensitive partial match)
   *       - name: payee
   *         in: query
   *         schema:
   *           type: string
   *         description: Filter by payee name (case-insensitive partial match)
   *       - name: since_date
   *         in: query
   *         schema:
   *           type: string
   *         required: true
   *         description: Start date (YYYY-MM-DD). Required.
   *       - name: until_date
   *         in: query
   *         schema:
   *           type: string
   *         description: End date (YYYY-MM-DD). Defaults to today.
   *       - name: limit
   *         in: query
   *         schema:
   *           type: integer
   *         description: Maximum number of transactions to return. Defaults to 100.
   *     responses:
   *       '200':
   *         description: List of transactions
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/AITransaction'
   *       '400':
   *         $ref: '#/components/responses/400'
   *       '500':
   *         $ref: '#/components/responses/500'
   *   post:
   *     summary: Create a transaction with human-readable names
   *     description: >-
   *       Creates a transaction using account, category, and payee names instead of UUIDs.
   *       Auto-creates payee if it doesn't exist.
   *     tags: [AI Agent]
   *     security:
   *       - apiKey: []
   *     parameters:
   *       - $ref: '#/components/parameters/budgetSyncId'
   *       - $ref: '#/components/parameters/budgetEncryptionPassword'
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/AITransactionCreate'
   *     responses:
   *       '201':
   *         description: Transaction created
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   $ref: '#/components/schemas/AITransaction'
   *                 message:
   *                   type: string
   *       '400':
   *         $ref: '#/components/responses/400'
   *       '500':
   *         $ref: '#/components/responses/500'
   */
  router.get('/budgets/:budgetSyncId/ai/transactions', async (req, res, next) => {
    try {
      const { account, category, payee, since_date, until_date, limit } = req.query;

      if (!since_date) {
        throw new Error('since_date query parameter is required (YYYY-MM-DD)');
      }

      const accounts = await res.locals.budget.getAccounts();
      const categories = await res.locals.budget.getCategories();
      const payees = await res.locals.budget.getPayees();
      const schedules = await res.locals.budget.getSchedules();

      // Create lookup maps
      const accountMap = Object.fromEntries(accounts.map(a => [a.id, a.name]));
      const categoryMap = Object.fromEntries(categories.map(c => [c.id, c.name]));
      const payeeMap = Object.fromEntries(payees.map(p => [p.id, p.name]));
      const scheduleMap = Object.fromEntries(schedules.map(s => [s.id, s.name || payeeMap[s.payee] || 'Unnamed']));

      // Filter accounts if specified
      let targetAccounts = accounts.filter(a => !a.closed);
      if (account) {
        const accountLower = account.toLowerCase();
        targetAccounts = targetAccounts.filter(a =>
          a.name.toLowerCase().includes(accountLower)
        );
        if (targetAccounts.length === 0) {
          throw new Error(`No account found matching "${account}"`);
        }
      }

      // Fetch transactions from all target accounts
      let allTransactions = [];
      const endDate = until_date || formatDate(new Date());

      for (const acc of targetAccounts) {
        const transactions = await res.locals.budget.getTransactions(acc.id, since_date, endDate);
        allTransactions = allTransactions.concat(
          transactions.map(tx => ({ ...tx, _accountId: acc.id }))
        );
      }

      // Transform transactions to AI-friendly format
      let result = allTransactions
        .filter(tx => !tx.tombstone && !tx.is_child) // Skip deleted and child transactions
        .map(tx => {
          const transformed = {
            id: tx.id,
            date: tx.date,
            amount: tx.amount,
            amount_display: formatTransactionAmount(tx.amount, config.currencySymbol),
            payee_name: payeeMap[tx.payee] || tx.imported_payee || null,
            category_name: categoryMap[tx.category] || null,
            account_name: accountMap[tx._accountId] || accountMap[tx.account] || null,
            notes: tx.notes || null,
            cleared: tx.cleared || false,
            is_transfer: !!tx.transfer_id,
            schedule_name: tx.schedule ? scheduleMap[tx.schedule] : null,
          };

          // Add split items if this is a parent transaction
          if (tx.is_parent && tx.subtransactions && tx.subtransactions.length > 0) {
            transformed.is_split = true;
            transformed.split_items = tx.subtransactions.map(sub => ({
              amount: sub.amount,
              amount_display: formatTransactionAmount(sub.amount, config.currencySymbol),
              category_name: categoryMap[sub.category] || null,
              notes: sub.notes || null,
            }));
          } else {
            transformed.is_split = false;
          }

          return transformed;
        });

      // Apply filters
      if (category) {
        const categoryLower = category.toLowerCase();
        result = result.filter(tx =>
          tx.category_name && tx.category_name.toLowerCase().includes(categoryLower)
        );
      }

      if (payee) {
        const payeeLower = payee.toLowerCase();
        result = result.filter(tx =>
          tx.payee_name && tx.payee_name.toLowerCase().includes(payeeLower)
        );
      }

      // Sort by date descending (newest first)
      result.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Apply limit
      const maxResults = parseInt(limit) || 100;
      result = result.slice(0, maxResults);

      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  });

  router.post('/budgets/:budgetSyncId/ai/transactions', async (req, res, next) => {
    try {
      const {
        account_name,
        date,
        amount,
        amount_major,
        payee_name,
        category_name,
        notes
      } = req.body;

      // Validate required fields
      if (!account_name) {
        throw new Error('account_name is required');
      }
      if (amount === undefined || amount_major === undefined) {
        throw new Error('Both amount (cents) and amount_major are required');
      }

      // Validate amount match
      const expectedCents = Math.round(amount_major * 100);
      if (amount !== expectedCents) {
        throw new Error(
          `amount mismatch: amount (${amount} cents) does not match amount_major * 100 (${amount_major} × 100 = ${expectedCents} cents)`
        );
      }

      // Resolve account
      const accounts = await res.locals.budget.getAccounts();
      const accountLower = account_name.toLowerCase();
      const matchedAccount = accounts.find(a =>
        a.name.toLowerCase() === accountLower ||
        a.name.toLowerCase().includes(accountLower)
      );
      if (!matchedAccount) {
        throw new Error(`Account "${account_name}" not found`);
      }

      // Resolve category (optional)
      let categoryId = null;
      if (category_name) {
        const categories = await res.locals.budget.getCategories();
        const categoryLower = category_name.toLowerCase();
        const matchedCategory = categories.find(c =>
          c.name.toLowerCase() === categoryLower ||
          c.name.toLowerCase().includes(categoryLower)
        );
        if (!matchedCategory) {
          throw new Error(`Category "${category_name}" not found`);
        }
        categoryId = matchedCategory.id;
      }

      // Resolve or create payee
      let payeeId = null;
      if (payee_name) {
        const payees = await res.locals.budget.getPayees();
        const payeeLower = payee_name.toLowerCase();
        const matchedPayee = payees.find(p =>
          p.name.toLowerCase() === payeeLower
        );

        if (matchedPayee) {
          payeeId = matchedPayee.id;
        } else {
          // Auto-create payee
          payeeId = await res.locals.budget.createPayee({ name: payee_name });
        }
      }

      // Build transaction object
      const transaction = {
        date: date || formatDate(new Date()),
        amount: amount,
        payee: payeeId,
        category: categoryId,
        notes: notes || null,
        cleared: false,
      };

      // Create transaction
      await res.locals.budget.addTransaction(matchedAccount.id, transaction);

      // Build response
      const response = {
        id: null, // Actual Budget doesn't return the ID on create
        date: transaction.date,
        amount: transaction.amount,
        amount_display: formatTransactionAmount(transaction.amount, config.currencySymbol),
        payee_name: payee_name || null,
        category_name: category_name || null,
        account_name: matchedAccount.name,
        notes: transaction.notes,
        cleared: transaction.cleared,
        is_transfer: false,
        is_split: false,
        schedule_name: null,
      };

      // Generate budget alert if category was specified and it's an expense
      let budgetAlert = null;
      if (categoryId && amount < 0) {
        try {
          const currentMonth = getCurrentMonth();
          const budgetMonth = await res.locals.budget.getMonth(currentMonth);

          // Find the category in budget data
          for (const group of budgetMonth.categoryGroups) {
            if (group.is_income) continue;
            const isDebtGroup = group.name.toLowerCase().includes('debt');
            if (isDebtGroup) continue; // Skip debt categories for budget alerts

            for (const cat of group.categories) {
              if (cat.id === categoryId) {
                const budgeted = cat.budgeted || 0;
                const spent = Math.abs(cat.spent || 0);
                const available = cat.balance || 0;

                if (budgeted > 0) {
                  const percentUsed = Math.round((spent / budgeted) * 100);

                  if (percentUsed >= 100) {
                    const overBy = Math.abs(available);
                    budgetAlert = {
                      status: 'over_budget',
                      icon: '🔴',
                      percent_used: percentUsed,
                      message: `Over by ${formatTransactionAmount(-overBy, config.currencySymbol)}. Pause spending.`,
                      available: available,
                      available_display: formatTransactionAmount(available, config.currencySymbol),
                    };
                  } else if (percentUsed >= 90) {
                    budgetAlert = {
                      status: 'critical',
                      icon: '🟠',
                      percent_used: percentUsed,
                      message: `Only ${formatTransactionAmount(available, config.currencySymbol)} left!`,
                      available: available,
                      available_display: formatTransactionAmount(available, config.currencySymbol),
                    };
                  } else if (percentUsed >= 80) {
                    budgetAlert = {
                      status: 'warning',
                      icon: '⚠️',
                      percent_used: percentUsed,
                      message: `Getting close - ${formatTransactionAmount(available, config.currencySymbol)} left`,
                      available: available,
                      available_display: formatTransactionAmount(available, config.currencySymbol),
                    };
                  } else {
                    budgetAlert = {
                      status: 'on_track',
                      icon: '✅',
                      percent_used: percentUsed,
                      message: `On track - ${formatTransactionAmount(available, config.currencySymbol)} left`,
                      available: available,
                      available_display: formatTransactionAmount(available, config.currencySymbol),
                    };
                  }
                }
                break;
              }
            }
          }
        } catch (alertErr) {
          // Don't fail the transaction if budget alert fails
          console.error('Failed to generate budget alert:', alertErr);
        }
      }

      res.status(201).json({
        data: response,
        budget_alert: budgetAlert,
        message: 'Transaction created successfully'
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * @swagger
   * /budgets/{budgetSyncId}/ai/accounts:
   *   get:
   *     summary: List active accounts for transaction context
   *     description: Returns active accounts with balances. Use this to determine which account a transaction should be logged to.
   *     tags: [AI Agent]
   *     security:
   *       - apiKey: []
   *     parameters:
   *       - $ref: '#/components/parameters/budgetSyncId'
   *     responses:
   *       '200':
   *         description: List of active accounts
   *       '404':
   *         $ref: '#/components/responses/404'
   *       '500':
   *         $ref: '#/components/responses/500'
   */
  router.get('/budgets/:budgetSyncId/ai/accounts', async (req, res, next) => {
    try {
      const accounts = await res.locals.budget.getAccounts();

      // Filter to active accounts only
      const activeAccounts = accounts.filter(a => !a.closed && !a.tombstone);

      // Fetch balances for each account
      const result = await Promise.all(
        activeAccounts.map(async (a) => {
          const balance = (await res.locals.budget.getAccountBalance(a.id)) || 0;
          return {
            name: a.name,
            type: a.type || 'checking',
            balance: balance,
            balance_display: formatTransactionAmount(balance, config.currencySymbol),
          };
        })
      );

      // Sort by name
      result.sort((a, b) => a.name.localeCompare(b.name));

      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  });

  /**
   * @swagger
   * /budgets/{budgetSyncId}/ai/categories:
   *   get:
   *     summary: List categories for transaction context
   *     description: Returns categories grouped by type. Use this to determine which category a transaction should be assigned to.
   *     tags: [AI Agent]
   *     security:
   *       - apiKey: []
   *     parameters:
   *       - $ref: '#/components/parameters/budgetSyncId'
   *     responses:
   *       '200':
   *         description: List of categories
   *       '404':
   *         $ref: '#/components/responses/404'
   *       '500':
   *         $ref: '#/components/responses/500'
   */
  router.get('/budgets/:budgetSyncId/ai/categories', async (req, res, next) => {
    try {
      const categories = await res.locals.budget.getCategories();
      const categoryGroups = await res.locals.budget.getCategoryGroups();

      // Create group lookup
      const groupMap = Object.fromEntries(categoryGroups.map(g => [g.id, g.name]));

      // Filter and transform categories
      const result = categories
        .filter(c => !c.tombstone && !c.hidden)
        .map(c => {
          const groupName = groupMap[c.group_id] || 'Uncategorized';
          const isDebt = groupName.toLowerCase().includes('debt');

          return {
            name: c.name,
            group: groupName,
            is_income: c.is_income || false,
            is_debt: isDebt,
          };
        })
        .sort((a, b) => {
          // Sort by group first, then by name
          const groupCompare = a.group.localeCompare(b.group);
          if (groupCompare !== 0) return groupCompare;
          return a.name.localeCompare(b.name);
        });

      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  });
};

// Helper to get numeric amount value (handles range objects and new structure)
function getAmountValue(bill) {
  // Handle new structure with amount_type
  if (bill.amount_type === 'range') {
    return bill.amount_low; // Use lower bound for ranges
  }
  if (bill.amount !== undefined) {
    return typeof bill.amount === 'number' ? bill.amount : 0;
  }
  return 0;
}

// Helper to format amount as positive display (bills are expenses, no need for negative)
function formatBillAmount(cents, currencySymbol) {
  const absolute = Math.abs(cents);
  const dollars = (absolute / 100).toFixed(2);
  const formatted = dollars.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${currencySymbol}${formatted}`;
}

// Helper to format transaction amount (preserves sign)
function formatTransactionAmount(cents, currencySymbol) {
  if (cents === null || cents === undefined) return null;
  const isNegative = cents < 0;
  const absolute = Math.abs(cents);
  const dollars = (absolute / 100).toFixed(2);
  const formatted = dollars.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return isNegative ? `-${currencySymbol}${formatted}` : `${currencySymbol}${formatted}`;
}

// Transform schedule amount based on amountOp into clean structure
function transformAmount(schedule, currencySymbol) {
  const amountOp = schedule.amountOp || 'is';
  const amount = schedule.amount;

  if (amountOp === 'isbetween' && typeof amount === 'object') {
    // Range amount
    return {
      amount_type: 'range',
      amount_low: amount.num1,
      amount_high: amount.num2,
      amount_display: `${formatBillAmount(amount.num1, currencySymbol)} to ${formatBillAmount(amount.num2, currencySymbol)}`,
    };
  } else if (amountOp === 'isapprox') {
    // Approximate amount
    return {
      amount_type: 'approximate',
      amount: amount,
      amount_display: `~${formatBillAmount(amount, currencySymbol)}`,
    };
  } else {
    // Fixed amount (is)
    return {
      amount_type: 'fixed',
      amount: amount,
      amount_display: formatBillAmount(amount, currencySymbol),
    };
  }
}

function getCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
