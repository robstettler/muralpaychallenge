## Architecture

```
Frontend
    ├── public/index.html      — Customer storefront
    └── public/merchant.html   — Merchant dashboard
    │
    ▼
NestJS API (src/)
    ├── /api/products     — Product catalog (seeded from DB)
    ├── /api/cart          — Shopping cart CRUD
    ├── /api/orders        — Order creation + status polling
    ├── /api/orders/:id/payout — Payout status per order
    └── /api/webhooks      — Mural webhook receiver
    │
    ▼
Mural Pay API
    ├── GET  /api/accounts/:id              — Get wallet address
    ├── POST /api/transactions/search       — Poll for deposits
    ├── POST /api/payouts/payout            — Create COP payout
    ├── POST /api/payouts/payout/:id/execute — Execute payout
    └── GET  /api/payouts/payout/:id        — Get payout status
    │
    ▼
PostgreSQL (TypeORM, auto-synced)
```

## How Payment Matching Works

**Wallet-per-order with a pre-warmed pool**: Each order is assigned a dedicated Mural account/wallet from a pool. When a deposit webhook fires for a given `muralAccountId`, we look up the single `AWAITING_PAYMENT` order assigned to that account. The deposit amount is validated against the order total — underpayments are rejected and the order stays in `AWAITING_PAYMENT`, while exact payments and overpayments are accepted.

### Wallet Pool Lifecycle

1. **Bootstrap**: On startup, existing Mural accounts are imported into the `wallets` table. If none are available, a new one is requested.
2. **Claim**: At checkout, an `AVAILABLE` wallet is atomically claimed (`SELECT FOR UPDATE SKIP LOCKED`) and assigned to the order.
3. **Lazy activation**: If no `AVAILABLE` wallets exist, `INITIALIZING` wallets are polled for activation. As a last resort, a new Mural account is created on the spot.
4. **Release**: After payment confirmation (or order expiry), the wallet is released back to the pool as `AVAILABLE`.
5. **Replenish**: When the pool is empty after an order, a new wallet is requested in the background.

## Merchant Auto-Withdrawal (UNTESTED)
When a customer payment is confirmed, the system automatically:

1. Creates a COP payout request via Mural's Payouts API
2. Executes the payout (USDC → COP conversion + bank transfer)
3. Tracks payout status through webhooks: INITIATED → PENDING → COMPLETED

The merchant dashboard at `/merchant.html` shows all orders, payment statuses, and withdrawal progress with live exchange rates.

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Mural Pay API key, account, and transfer API key

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file:

```env
MURAL_API_KEY=your_mural_api_key
MURAL_API_BASE_URL=https://api.muralpay.com
MURAL_WEBHOOK_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
MURAL_TRANSFER_API_KEY=your_mural_transfer_api_key
POSTGRES_URL=postgresql://user:password@localhost:5432/muralpaychallenge
```

### Run

```bash
npx nest start --watch
```

- Customer storefront: http://localhost:3000
- Merchant dashboard: http://localhost:3000/merchant.html
- Swagger docs: http://localhost:3000/docs

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/products` | List all products |
| GET | `/api/products/:id` | Get single product |
| POST | `/api/cart` | Create a new cart |
| POST | `/api/cart/:cartId/items` | Add item to cart |
| GET | `/api/cart/:cartId` | Get cart contents |
| DELETE | `/api/cart/:cartId/items/:productId` | Remove item |
| POST | `/api/orders` | Create order from cart |
| GET | `/api/orders/:id` | Get order status |
| GET | `/api/orders` | List all orders |
| GET | `/api/orders/:id/payout` | Get payout status for an order |
| POST | `/api/webhooks/mural` | Mural webhook receiver |

## Incomplete
- Merchant payout not yet tested, so this step may not function as intended.

## Known Pitfalls

- **Underpayment**: If the customer sends less than the order total in a signle transaction, the deposit is rejected and the order remains in `AWAITING_PAYMENT`
- **Overpayment**: Accepted — the order is marked PAID but the excess is not refunded automatically
- **Expired orders**: Payment after 30-min expiry results in unmatched deposit (wallet already released)
- **No automatic refunds**: Unmatched or excess deposits require manual intervention
- **Payout execute failure**: If execute fails (e.g., insufficient balance), payout record is saved as INITIATED for retry
- **`createFromCart()` not transactional**: Order creation involves multiple writes (save order, update wallet, clear cart) without a wrapping transaction — a mid-sequence failure could leave inconsistent state (e.g., wallet ASSIGNED with no linked order). The critical paths (`matchDeposit`, `expireOrders`) do use explicit transactions.

## Improvements Prior to Production

**Wallet pool service:**
- Seperate API and service to provide wallet ids for above transactions
- Pre-warm the pool to a minimum size (e.g., 20 AVAILABLE wallets) via a background job, rather than reactively replenishing one at a time after each checkout.

**Job queue:**
- Move COP payout initiation from fire-and-forget async to a proper job queue (MQ + Redis). Gives retries, backoff, and decouples webhook response time from Mural API latency.

**Webhook idempotency:**
- Store processed `eventId`s to prevent double-processing on retries

**Distributed scheduling:**
- `expireOrders()` runs via `@Interval` in every process. With multiple instances, add a distributed lock (Postgres advisory lock) so only one runs the expiry loop.

**Wrap `createFromCart()` in a transaction:**
- Order creation, wallet assignment, and cart clearing are separate writes. Wrap in a QueryRunner transaction to match the safety of `matchDeposit` and `expireOrders`.

**Replace polling with push:**
- Frontend polls order status every 5s. Replace with SSE or WebSockets to push status changes and reduce load at scale.

**Connection pooling:**
- Add PgBouncer or equivalent for multiple NestJS instances sharing one Postgres.

**Read replicas:**
- Route merchant dashboard queries (list all orders/payouts) to a read replica as volume grows.
  
**Product service**
- Currently product list is just hardcoded
- Need database storage and CRUD operations to maintain a real catalog

## Vercel Deployment

The app includes Vercel deployment config:

```bash
vercel deploy
```

Set environment variables in Vercel dashboard.