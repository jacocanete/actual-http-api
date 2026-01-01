# n8n Agent Tools — Actual Budget AI API

Configure these as HTTP Request tools in your n8n AI Agent node.

---

## Base Configuration

```
Base URL: {{$json.apiBaseUrl}}/v1/budgets/{{$json.budgetSyncId}}/ai
```

**Headers (all requests):**
```
x-api-key: {{$json.apiKey}}
```

---

## Tools

### 1. get_accounts

**Description:**
Get list of active accounts with current balances. Use this to find valid account names when the user specifies an account (e.g., "UB", "BDO", "Gcash"). Returns account name, type, and current balance.

**Method:** GET

**URL:** `{{$json.apiBaseUrl}}/v1/budgets/{{$json.budgetSyncId}}/ai/accounts`

**Parameters:** None

**Response Fields:**
| Field | Description |
|-------|-------------|
| `name` | Account name (use this for transactions) |
| `type` | Account type (checking, savings, credit, etc.) |
| `balance` | Current balance in cents |
| `balance_display` | Formatted balance string |

---

### 2. get_categories

**Description:**
Get list of available budget categories. Use this to match user input (e.g., "food", "transport") to actual category names. Shows category name, group, and whether it's income or debt.

**Method:** GET

**URL:** `{{$json.apiBaseUrl}}/v1/budgets/{{$json.budgetSyncId}}/ai/categories`

**Parameters:** None

**Response Fields:**
| Field | Description |
|-------|-------------|
| `name` | Category name (use this for transactions) |
| `group` | Parent group name |
| `is_income` | True if income category |
| `is_debt` | True if debt category |

---

### 3. get_budget_check

**Description:**
Check budget status for all categories or a specific category. Shows budgeted amount, spent amount, and available balance for each category. Use this to answer "How's my budget?", "What's left for X?", or "Can I afford this?". Separates spending categories from debt categories.

**Method:** GET

**URL:** `{{$json.apiBaseUrl}}/v1/budgets/{{$json.budgetSyncId}}/ai/budget-check`

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `category` | string | No | Filter by category name (partial match) |
| `month` | string | No | Month in YYYY-MM format. Defaults to current month. |

**Response Fields (Spending Categories):**
| Field | Description |
|-------|-------------|
| `name` | Category name |
| `group_name` | Parent group |
| `budgeted` / `budgeted_display` | Amount allocated |
| `spent` / `spent_display` | Amount spent (negative) |
| `available` / `available_display` | Remaining balance |

**Response Fields (Debt Categories):**
| Field | Description |
|-------|-------------|
| `name` | Category name |
| `payment_made` / `payment_made_display` | Payment made this month |
| `remaining_debt` / `remaining_debt_display` | Outstanding balance |

---

### 4. get_bills_due

**Description:**
Get upcoming bills, past due bills, and paid bills. Use this to answer "What bills are coming up?", "Am I behind on any bills?", or "What did I pay this month?". Shows bill name, amount, due date, and payment status.

**Method:** GET

**URL:** `{{$json.apiBaseUrl}}/v1/budgets/{{$json.budgetSyncId}}/ai/bills-due`

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `month` | string | No | Filter by month(s) in YYYY-MM format. Comma-separated for multiple months. |

**Response Structure:**
- `upcoming`: Bills due in the future
- `past_due`: Bills past their due date (unpaid)
- `paid`: Bills already paid
- `summary`: Totals and counts

**Bill Fields:**
| Field | Description |
|-------|-------------|
| `name` | Bill/schedule name |
| `amount_type` | `fixed`, `approximate`, or `range` |
| `amount` / `amount_display` | Bill amount |
| `payee_name` | Who receives payment |
| `account_name` | Payment account |
| `next_date` | Next due date |
| `days_until_due` | Days until due (upcoming) |
| `days_overdue` | Days past due (past_due) |

---

### 5. get_transactions

**Description:**
Get transaction history with filters. Use this to answer "What did I spend on X?", "Show my recent transactions", or "How much did I spend this month?". Returns transactions with resolved names (not IDs).

**Method:** GET

**URL:** `{{$json.apiBaseUrl}}/v1/budgets/{{$json.budgetSyncId}}/ai/transactions`

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `since_date` | string | **Yes** | Start date (YYYY-MM-DD) |
| `until_date` | string | No | End date (YYYY-MM-DD). Defaults to today. |
| `account` | string | No | Filter by account name (partial match) |
| `category` | string | No | Filter by category name (partial match) |
| `payee` | string | No | Filter by payee name (partial match) |
| `limit` | integer | No | Max results. Defaults to 100. |

**Response Fields:**
| Field | Description |
|-------|-------------|
| `id` | Transaction ID |
| `date` | Transaction date |
| `amount` / `amount_display` | Amount (negative = expense) |
| `payee_name` | Payee name |
| `category_name` | Category name |
| `account_name` | Account name |
| `notes` | Transaction notes |
| `cleared` | Reconciliation status |
| `is_transfer` | True if transfer between accounts |
| `is_split` | True if split transaction |

---

### 6. create_transaction

**Description:**
Create a new transaction. Use this when the user wants to log an expense or income. Requires account name, amount in both cents and pesos (for validation), and optionally payee, category, date, and notes. Returns the created transaction plus a budget alert showing category status.

**Method:** POST

**URL:** `{{$json.apiBaseUrl}}/v1/budgets/{{$json.budgetSyncId}}/ai/transactions`

**Body (JSON):**
```json
{
  "account_name": "GoTyme Bank",
  "date": "2025-12-21",
  "amount": -35000,
  "amount_major": -350,
  "payee_name": "Grab Food",
  "category_name": "Life",
  "notes": "Dinner"
}
```

**Body Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `account_name` | string | **Yes** | Account name (partial match) |
| `date` | string | No | Date YYYY-MM-DD. Defaults to today. |
| `amount` | integer | **Yes** | Amount in cents. Negative for expenses. |
| `amount_major` | number | **Yes** | Amount in pesos. Must equal amount/100. |
| `payee_name` | string | No | Payee name. Auto-created if new. |
| `category_name` | string | No | Category name. Must exist. |
| `notes` | string | No | Transaction notes. |

**Amount Validation:**
- Both `amount` and `amount_major` are required
- `amount` must equal `amount_major × 100`
- Example: ₱350 expense → `amount: -35000`, `amount_major: -350`

**Response includes `budget_alert`:**
| Field | Description |
|-------|-------------|
| `status` | `on_track`, `warning`, `critical`, `over_budget` |
| `icon` | ✅, ⚠️, 🟠, or 🔴 |
| `percent_used` | Percentage of budget used |
| `message` | Human-readable alert message |
| `available` / `available_display` | Remaining budget |

**Budget Alert Thresholds:**
| Percent | Status | Icon |
|---------|--------|------|
| 0-79% | `on_track` | ✅ |
| 80-89% | `warning` | ⚠️ |
| 90-99% | `critical` | 🟠 |
| 100%+ | `over_budget` | 🔴 |

---

## Quick Reference

| Tool | When to Use |
|------|-------------|
| `get_accounts` | User mentions unknown account name |
| `get_categories` | User mentions unknown category, need to match input |
| `get_budget_check` | "How's my budget?", "What's left for X?", "Can I afford?" |
| `get_bills_due` | "What bills?", "Upcoming payments?", "Am I behind?" |
| `get_transactions` | "What did I spend on?", "Show transactions", "History" |
| `create_transaction` | "Spent X on Y", "Log expense", "Paid for", "Got paid" |
