# AI Agent Endpoints for Actual Budget API

These endpoints are optimized for AI agent consumption. They provide pre-processed, human-readable data with display values so the AI doesn't need to parse or format monetary amounts.

---

## Base URL

```
{host}/v1/budgets/{budgetSyncId}/ai
```

## Authentication

All requests require the `x-api-key` header.

---

## Endpoints

### 1. Budget Check

**Purpose:** Answer questions like "Can I afford this?" or "How much do I have left in my Food budget?"

```
GET /ai/budget-check
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | No | Filter by category name or ID. Case-insensitive partial match. |
| `month` | string | No | Month in `YYYY-MM` format. Defaults to current month. |

#### Response Structure

```json
{
  "data": {
    "month": "2025-12",
    "spending": {
      "summary": {
        "total_budgeted": 50000,
        "total_budgeted_display": "P500.00",
        "total_spent": -30000,
        "total_spent_display": "-P300.00",
        "total_available": 20000,
        "total_available_display": "P200.00"
      },
      "categories": [
        {
          "id": "uuid",
          "name": "Food",
          "group_name": "Essentials",
          "budgeted": 10000,
          "budgeted_display": "P100.00",
          "spent": -7500,
          "spent_display": "-P75.00",
          "available": 2500,
          "available_display": "P25.00"
        }
      ]
    },
    "debt_payoff": {
      "summary": {
        "total_payment_made": 20000,
        "total_payment_made_display": "P200.00",
        "total_remaining_debt": -100000,
        "total_remaining_debt_display": "-P1,000.00"
      },
      "categories": [
        {
          "id": "uuid",
          "name": "Credit Card Debt",
          "group_name": "Debt",
          "payment_made": 20000,
          "payment_made_display": "P200.00",
          "remaining_debt": -100000,
          "remaining_debt_display": "-P1,000.00"
        }
      ]
    }
  }
}
```

#### Field Descriptions

**Spending Categories:**
| Field | Description |
|-------|-------------|
| `budgeted` | Amount allocated to this category for the month (in cents) |
| `spent` | Amount spent from this category (negative value, in cents) |
| `available` | Remaining funds in this category (`budgeted + spent`) |

**Debt Categories (Carrying Debt Strategy):**
| Field | Description |
|-------|-------------|
| `payment_made` | Amount paid toward this debt this month (equals budgeted amount) |
| `remaining_debt` | Outstanding debt balance (negative if debt remains, 0 if paid off) |

#### Example Use Cases

| User Question | API Call |
|---------------|----------|
| "Can I afford a $50 dinner?" | `GET /ai/budget-check?category=food` → Check `available` field |
| "How's my budget looking?" | `GET /ai/budget-check` → Review all categories |
| "What's left in Entertainment?" | `GET /ai/budget-check?category=entertainment` |
| "How much debt do I have left?" | `GET /ai/budget-check` → Check `debt_payoff.summary.total_remaining_debt` |

---

### 2. Bills Due

**Purpose:** Answer questions like "What bills do I have coming up?" or "What bills are due in January?"

```
GET /ai/bills-due
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `month` | string | No | Month(s) in `YYYY-MM` format. Comma-separated for multiple months. When specified, filters bills to those due in the specified month(s). |

#### Behavior

| Scenario | Upcoming/Past Due | Paid |
|----------|-------------------|------|
| No `month` param | ALL unpaid bills relative to today | Current month only |
| With `month` param | Bills due in specified month(s) | Bills paid in specified month(s) |

#### Response Structure

```json
{
  "data": {
    "as_of_date": "2025-12-21",
    "months": ["2025-12"],
    "upcoming": [...],
    "past_due": [...],
    "paid": [...],
    "summary": {
      "upcoming_count": 15,
      "upcoming_total": -5786525,
      "upcoming_total_display": "P57,865.25",
      "past_due_count": 0,
      "past_due_total": 0,
      "past_due_total_display": "P0.00",
      "paid_count": 3,
      "paid_total": -2465421,
      "paid_total_display": "P24,654.21"
    }
  }
}
```

#### Bill Object Structure

Bills have three amount types based on how they're configured in Actual Budget:

**Fixed Amount (`amount_type: "fixed"`):**
```json
{
  "id": "uuid",
  "name": "Internet Bill",
  "amount_type": "fixed",
  "amount": -212500,
  "amount_display": "P2,125.00",
  "payee_name": "Converge",
  "account_name": "GoTyme Bank",
  "next_date": "2026-01-11",
  "days_until_due": 20
}
```

**Approximate Amount (`amount_type: "approximate"`):**
```json
{
  "id": "uuid",
  "name": "Claude AI",
  "amount_type": "approximate",
  "amount": -567249,
  "amount_display": "~P5,672.49",
  "payee_name": "Anthropic",
  "account_name": "GoTyme Bank",
  "next_date": "2026-01-15",
  "days_until_due": 24
}
```

**Range Amount (`amount_type: "range"`):**
```json
{
  "id": "uuid",
  "name": "Electric Bill",
  "amount_type": "range",
  "amount_low": -600000,
  "amount_high": -900000,
  "amount_display": "P6,000.00 to P9,000.00",
  "payee_name": "Visayan Electric",
  "account_name": "GoTyme Bank",
  "next_date": "2026-01-01",
  "days_until_due": 10
}
```

**Paid Bill (additional fields):**
```json
{
  "id": "uuid",
  "name": "Toyota Car Loan",
  "amount_type": "fixed",
  "amount": -1593600,
  "amount_display": "P15,936.00",
  "payee_name": "Toyota",
  "account_name": "BDO Savings",
  "next_date": "2026-01-02",
  "paid_date": "2025-12-04",
  "paid_amount": -1593600,
  "paid_amount_display": "P15,936.00"
}
```

#### Field Descriptions

| Field | Description |
|-------|-------------|
| `amount_type` | One of: `fixed`, `approximate`, `range` |
| `amount` | Exact amount in cents (for fixed/approximate types) |
| `amount_low` | Lower bound in cents (for range type only) |
| `amount_high` | Upper bound in cents (for range type only) |
| `amount_display` | Human-readable amount. Prefixed with `~` for approximate. |
| `next_date` | Next scheduled due date (`YYYY-MM-DD`) |
| `days_until_due` | Days from today until due (upcoming bills only) |
| `days_overdue` | Days past the due date (past_due bills only) |
| `paid_date` | Date the bill was paid (paid bills only) |
| `paid_amount` | Actual amount paid in cents (paid bills only) |

#### Example Use Cases

| User Question | API Call |
|---------------|----------|
| "What bills do I have coming up?" | `GET /ai/bills-due` |
| "Am I behind on any bills?" | `GET /ai/bills-due` → Check `past_due` array |
| "What bills are due in January?" | `GET /ai/bills-due?month=2026-01` |
| "What did I pay this month?" | `GET /ai/bills-due` → Check `paid` array |
| "Show me Q1 2026 bills" | `GET /ai/bills-due?month=2026-01,2026-02,2026-03` |

---

### 3. Transactions

**Purpose:** Answer questions like "What did I spend on food?" or "Show me my Amazon purchases" and create new transactions.

#### GET Transactions

```
GET /ai/transactions
```

##### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `since_date` | string | **Yes** | Start date (YYYY-MM-DD) |
| `until_date` | string | No | End date (YYYY-MM-DD). Defaults to today. |
| `account` | string | No | Filter by account name (case-insensitive partial match) |
| `category` | string | No | Filter by category name (case-insensitive partial match) |
| `payee` | string | No | Filter by payee name (case-insensitive partial match) |
| `limit` | integer | No | Maximum results to return. Defaults to 100. |

##### Response Structure

```json
{
  "data": [
    {
      "id": "4d194727-2ab2-4b50-a1aa-d506f2790e68",
      "date": "2025-12-21",
      "amount": -15000,
      "amount_display": "-P150.00",
      "payee_name": "Starbucks",
      "category_name": "Food & Dining",
      "account_name": "GoTyme Bank",
      "notes": "Coffee with client",
      "cleared": true,
      "is_transfer": false,
      "is_split": false,
      "schedule_name": null
    }
  ]
}
```

##### Split Transaction Example

```json
{
  "id": "abc123",
  "date": "2025-12-21",
  "amount": -50000,
  "amount_display": "-P500.00",
  "payee_name": "SM Supermarket",
  "category_name": null,
  "account_name": "GoTyme Bank",
  "notes": null,
  "cleared": true,
  "is_transfer": false,
  "is_split": true,
  "schedule_name": null,
  "split_items": [
    {
      "amount": -30000,
      "amount_display": "-P300.00",
      "category_name": "Groceries",
      "notes": null
    },
    {
      "amount": -20000,
      "amount_display": "-P200.00",
      "category_name": "Household",
      "notes": "Cleaning supplies"
    }
  ]
}
```

##### Field Descriptions

| Field | Description |
|-------|-------------|
| `id` | Transaction ID (for reference in follow-up actions) |
| `date` | Transaction date (YYYY-MM-DD) |
| `amount` | Amount in cents (negative = expense, positive = income) |
| `amount_display` | Human-readable formatted amount |
| `payee_name` | Who the transaction was with |
| `category_name` | Budget category (null for uncategorized or transfers) |
| `account_name` | Which account the transaction is in |
| `notes` | User-added notes/memo |
| `cleared` | Whether the transaction is reconciled |
| `is_transfer` | True if this is a transfer between accounts |
| `is_split` | True if transaction is split across categories |
| `schedule_name` | Name of linked recurring bill (null if not recurring) |
| `split_items` | Array of split details (only present if `is_split: true`) |

##### Example Use Cases

| User Question | API Call |
|---------------|----------|
| "What did I spend on food this month?" | `GET /ai/transactions?since_date=2025-12-01&category=food` |
| "Show me my Amazon purchases" | `GET /ai/transactions?since_date=2025-01-01&payee=amazon` |
| "What are my recent transactions?" | `GET /ai/transactions?since_date=2025-12-01&limit=20` |
| "Show me transfers this month" | `GET /ai/transactions?since_date=2025-12-01` → filter where `is_transfer: true` |

---

#### POST Transactions

```
POST /ai/transactions
```

##### Request Body

```json
{
  "account_name": "GoTyme Bank",
  "date": "2025-12-21",
  "amount": -15000,
  "amount_major": -150.00,
  "payee_name": "Starbucks",
  "category_name": "Food & Dining",
  "notes": "Coffee with client"
}
```

##### Field Descriptions

| Field | Required | Description |
|-------|----------|-------------|
| `account_name` | **Yes** | Account name (case-insensitive match) |
| `date` | No | Date (YYYY-MM-DD). Defaults to today. |
| `amount` | **Yes** | Amount in cents (negative for expenses) |
| `amount_major` | **Yes** | Amount in major units. Must equal `amount / 100`. |
| `payee_name` | No | Payee name. **Auto-created if doesn't exist.** |
| `category_name` | No | Category name. Must exist. Null = uncategorized. |
| `notes` | No | Optional memo/notes |

##### Why Both `amount` and `amount_major`?

This dual-amount requirement is a safety mechanism:
- Prevents AI from accidentally creating transactions with wrong amounts
- AI must explicitly confirm the amount in both formats
- If they don't match (`amount !== amount_major * 100`), the request fails

##### Response

```json
{
  "data": {
    "id": null,
    "date": "2025-12-21",
    "amount": -15000,
    "amount_display": "-P150.00",
    "payee_name": "Starbucks",
    "category_name": "Food & Dining",
    "account_name": "GoTyme Bank",
    "notes": "Coffee with client",
    "cleared": false,
    "is_transfer": false,
    "is_split": false,
    "schedule_name": null
  },
  "budget_alert": {
    "status": "warning",
    "icon": "⚠️",
    "percent_used": 85,
    "message": "Getting close - P150.00 left",
    "available": 15000,
    "available_display": "P150.00"
  },
  "message": "Transaction created successfully"
}
```

##### Budget Alert Levels

| Percent Used | Status | Icon | Message |
|--------------|--------|------|---------|
| 0-79% | `on_track` | ✅ | "On track - P500.00 left" |
| 80-89% | `warning` | ⚠️ | "Getting close - P150.00 left" |
| 90-99% | `critical` | 🟠 | "Only P50.00 left!" |
| 100%+ | `over_budget` | 🔴 | "Over by P100.00. Pause spending." |

**Note:** `budget_alert` is `null` for:
- Income transactions (positive amounts)
- Uncategorized transactions
- Debt category transactions
- Categories with no budget set

##### Example Use Cases

| User Request | API Call |
|--------------|----------|
| "Log a P150 coffee at Starbucks" | POST with `amount: -15000, amount_major: -150, payee_name: "Starbucks", category_name: "Food"` |
| "Record a P500 grocery expense" | POST with `amount: -50000, amount_major: -500, category_name: "Groceries"` |
| "Add P10,000 income from Freelance" | POST with `amount: 1000000, amount_major: 10000, payee_name: "Freelance Client"` |

---

### 4. Accounts

**Purpose:** Get context for "Which wallet?" when logging transactions. Maps user shorthand (e.g., "UB", "Gcash") to actual account names.

```
GET /ai/accounts
```

#### Parameters

None.

#### Response Structure

```json
{
  "data": [
    {
      "name": "UnionBank PlayEveryday Debit",
      "type": "checking",
      "balance": 2500000,
      "balance_display": "P25,000.00"
    },
    {
      "name": "GCash",
      "type": "checking",
      "balance": 150000,
      "balance_display": "P1,500.00"
    }
  ]
}
```

#### Field Descriptions

| Field | Description |
|-------|-------------|
| `name` | Full account name (use this for POST transactions) |
| `type` | Account type: `checking`, `savings`, `credit`, `investment`, `mortgage`, `debt`, `other` |
| `balance` | Current balance in cents |
| `balance_display` | Human-readable balance |

#### Example Use Cases

| User Input | AI Action |
|------------|-----------|
| "Paid with UB" | Match "UB" → "UnionBank PlayEveryday Debit" |
| "Used Gcash" | Match "Gcash" → "GCash" |
| "From my savings" | Match "savings" → account with type `savings` or name containing "savings" |

---

### 5. Categories

**Purpose:** Get context for categorizing transactions. Maps user input (e.g., "food", "groceries") to actual category names.

```
GET /ai/categories
```

#### Parameters

None.

#### Response Structure

```json
{
  "data": [
    {
      "name": "Food & Dining",
      "group": "Essentials",
      "is_income": false,
      "is_debt": false
    },
    {
      "name": "Salary",
      "group": "Income",
      "is_income": true,
      "is_debt": false
    },
    {
      "name": "Credit Card Payment",
      "group": "Debt",
      "is_income": false,
      "is_debt": true
    }
  ]
}
```

#### Field Descriptions

| Field | Description |
|-------|-------------|
| `name` | Category name (use this for POST transactions) |
| `group` | Parent group name |
| `is_income` | True if this is an income category |
| `is_debt` | True if this belongs to a debt group |

#### Example Use Cases

| User Input | AI Action |
|------------|-----------|
| "Log lunch expense" | Match "lunch" → "Food & Dining" |
| "Paid my credit card" | Match → category with `is_debt: true` |
| "Got my paycheck" | Match → category with `is_income: true` |
| "Grocery shopping" | Match "grocery" → "Groceries" |

---

## Notes for AI Agents

### Monetary Values
- All monetary values are in **cents** (integer)
- Every monetary field has a corresponding `_display` field with formatted string
- Use `_display` fields for user-facing responses
- Use raw cent values for calculations

### Negative Values
- **Expenses/payments** are negative (e.g., `-150000` = spending P1,500)
- **Income/available** are positive (e.g., `25000` = P250 available)
- Display values include the negative sign when applicable

### Categories
- **Spending categories**: Regular budget categories (Food, Transport, etc.)
- **Debt categories**: Categories in groups containing "debt" in the name
- Debt uses "Carrying Debt" strategy where `payment_made` equals the budgeted amount

### Schedules/Bills
- Schedules are recurring transactions (bills, subscriptions, loans)
- A schedule is "paid" when there's a linked transaction in the target month
- `next_date` advances after each payment, so a December payment may show January as next_date
