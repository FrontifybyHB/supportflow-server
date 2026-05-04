<div align="center">

# SupportFlow AI — Server

**Production-grade Node.js + Express backend for a multi-tenant AI customer support platform**

[![API Health](https://img.shields.io/badge/API-Live%20on%20Render-4f46e5?style=for-the-badge&logo=render)](https://supportflow-api.onrender.com/api/health)
[![Node.js](https://img.shields.io/badge/Node.js-20%20LTS-339933?style=flat-square&logo=nodedotjs)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb)](https://www.mongodb.com/atlas)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101?style=flat-square&logo=socketdotio)](https://socket.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

</div>

---

## What is SupportFlow AI?

SupportFlow AI is a **multi-tenant AI-powered customer support platform**. Each registered business gets a fully isolated workspace — with its own agents, customers, tickets, conversations, knowledge base, and analytics.

This repository is the **Node.js + Express backend server**. It exposes a REST API, a Socket.io real-time layer, and an AI orchestration service that processes every inbound customer message through OpenAI GPT-4o-mini or Google Gemini 1.5 Flash.

> Customer message → AI triage → Direct AI answer **or** human ticket → Agent notified in real time → Resolution

The AI is embedded in the core workflow — not bolted on. It affects every customer interaction by answering FAQs, summarising conversations, scoring urgency, suggesting agent replies, and escalating complex issues automatically.

**Frontend client:** [supportflow-client](https://github.com/FrontifybyHB/supportflow-client) · **Live app:** [supportflowai.vercel.app](https://supportflowai.vercel.app)

---

## Live API

```
https://supportflow-backend-server.up.railway.app
```

Returns `{ "status": "ok" }` when the server is running.

---

## Key Features

### 🤖 AI Orchestration Engine
- Retrieves relevant knowledge base entries per business using keyword and tag matching
- Calls OpenAI GPT-4o-mini or Gemini 1.5 Flash with dynamic system prompt + KB context
- Returns structured JSON: `answer`, `confidence` (0.0–1.0), `sentiment`, `priority`, `handoffNeeded`, `summary`
- If `confidence >= 0.75` and `handoffNeeded = false` → AI answer delivered directly to customer
- If `confidence < 0.75` or `handoffNeeded = true` → ticket auto-created with AI summary + suggested reply
- Full fallback handler: LLM timeout or bad JSON → ticket created silently, customer sees a polite message, no 500 error ever surfaced

### 🏢 Multi-Tenant Isolation
- Every data record carries a `businessId` field
- `requireTenant` middleware attaches `businessId` from JWT to every request
- Every database query filters by `businessId` — zero cross-tenant data access possible
- Returns `403 Forbidden` if `businessId` is missing or mismatched

### 🎫 Ticket Management
- Auto-created on AI handoff with priority, sentiment, summary, and `aiSuggestedReply` pre-filled
- Full lifecycle: `open → in_progress → resolved → closed`
- Full audit trail: `updatedBy` (userId) + `updatedAt` on every status change
- On-demand AI reply regeneration via `POST /api/tickets/:id/suggest-reply`

### ⚡ Real-Time Events via Socket.io
- Agents join their business room on connect (`join_business`)
- `ticket_created` — emitted immediately after AI handoff creates a ticket
- `ticket_updated` — broadcast on every status change
- `new_message` — emitted when a customer sends a message
- `agent_reply` — emitted when an agent sends a reply

### 🔐 Authentication & RBAC
- JWT (HS256) with `userId`, `role`, and `businessId` embedded in the payload
- `bcrypt` password hashing with cost factor ≥ 10
- Four roles: `superadmin`, `admin`, `agent`, `customer`
- Role guards applied per route — no extra DB call needed
- `passwordHash` field never returned in any API response

### 📚 Knowledge Base
- Admin CRUD for FAQ and policy entries with title, content, tags, and `isActive` flag
- Only `isActive: true` entries are injected into the AI context
- In-memory cache per `businessId` (5-minute TTL) avoids repeated DB reads on every message
- Cache invalidated automatically on any admin create, update, or delete

### 📊 Analytics
- Per-business ticket counts by status
- AI-handled conversation rate
- Date-range filtering support
- Scoped strictly to the authenticated business — no platform-wide data leakage

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 20 LTS |
| Framework | Express | 4.x |
| Real-time | Socket.io | 4.x |
| Database | MongoDB Atlas | 7.x |
| ODM | Mongoose | 8.x |
| Authentication | jsonwebtoken | 9.x |
| Password hashing | bcryptjs | 2.x |
| Environment | dotenv | 16.x |
| Primary AI | OpenAI API (GPT-4o-mini) | Latest |
| Alternate AI | Google Gemini 1.5 Flash | Latest |
| Deployment | Railway (free tier) | — |

---

## Project Structure

```text
src/
├── config/
│   ├── db.js                   # MongoDB Atlas connection
│   └── env.js                  # Environment variable validation
│
├── models/
│   ├── User.model.js           # Admins and agents (role, businessId, isActive)
│   ├── Business.model.js       # Tenant workspace (ownerId, plan, settings)
│   ├── Customer.model.js       # External support user (scoped to businessId)
│   ├── Conversation.model.js   # Chat history with embedded messages[]
│   ├── Ticket.model.js         # Human-trackable support issue
│   └── KnowledgeBase.model.js  # FAQ/policy source material for AI
│
├── controllers/
│   ├── auth.controller.js
│   ├── business.controller.js
│   ├── agent.controller.js
│   ├── chat.controller.js
│   ├── ticket.controller.js
│   ├── ai.controller.js
│   ├── knowledge.controller.js
│   └── analytics.controller.js
│
├── routes/
│   ├── auth.routes.js
│   ├── business.routes.js
│   ├── agent.routes.js
│   ├── chat.routes.js
│   ├── ticket.routes.js
│   ├── ai.routes.js
│   ├── knowledge.routes.js
│   └── analytics.routes.js
│
├── services/
│   ├── ai.service.js           # AI orchestration: KB fetch → prompt → LLM → parse → route
│   ├── ticket.service.js       # Ticket lifecycle, assignment, suggested reply
│   ├── chat.service.js         # Conversation management, message storage
│   └── knowledge.service.js    # KB retrieval with in-memory cache
│
├── middlewares/
│   ├── auth.middleware.js       # verifyToken — JWT verification, req.user
│   ├── tenant.middleware.js     # requireTenant — businessId attachment + guard
│   ├── role.middleware.js       # requireRole('admin' | 'agent') — RBAC
│   └── error.middleware.js      # Global error handler
│
├── utils/
│   ├── ApiResponse.js          # Standardised { success, data } response factory
│   ├── ApiError.js             # Custom error class with HTTP status
│   ├── asyncHandler.js         # Wraps async controllers — no try/catch repetition
│   └── generateToken.js        # JWT issuance helper
│
├── socket/
│   └── index.js                # Socket.io server setup and event handlers
│
├── app.js                      # Express app setup, CORS, middleware mounting
└── server.js                   # HTTP server + Socket.io bootstrap
```

---

## API Reference

### Base URL

```
Development:  http://localhost:5000/api
Production:   https://supportflow-backend-server.up.railway.app
```

### Response Format

All endpoints return a consistent envelope:

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": "message string" }
```

### Authentication

All protected endpoints require:
```
Authorization: Bearer <jwt_token>
```

---

### Auth Endpoints (Public)

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/register` | `name, email, password` | Register a business admin account |
| `POST` | `/auth/login` | `email, password` | Authenticate and receive JWT |
| `GET` | `/auth/me` | — | Load current authenticated user profile |

---

### Business Endpoints (Admin JWT)

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `POST` | `/business` | `name, industry?` | Create a business workspace |
| `GET` | `/business/me` | — | Load current business workspace details |

---

### Agent Management (Admin JWT)

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `POST` | `/agents` | `name, email, password` | Create an agent account |
| `GET` | `/agents` | — | List all agents for the business |
| `PATCH` | `/agents/:id` | `isActive: boolean` | Activate or deactivate an agent |

---

### Chat Endpoints

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| `POST` | `/chat/message` | Optional | `message, businessId, customerInfo?` | Process customer message through AI |
| `GET` | `/chat/conversations` | Agent JWT | `?page=1&limit=20` | List conversations for the business |
| `GET` | `/chat/conversations/:id` | Agent JWT | — | Load full conversation with messages |

**Response — AI answered directly:**
```json
{ "data": { "type": "ai_answer", "answer": "Here is the answer..." } }
```

**Response — Handed off to agent:**
```json
{ "data": { "type": "handoff", "ticketId": "...", "message": "An agent will reply shortly." } }
```

---

### Ticket Endpoints (Agent or Admin JWT)

| Method | Endpoint | Body / Query | Description |
|--------|----------|-------------|-------------|
| `GET` | `/tickets` | `?status=open&priority=high&page=1` | List tickets with filters |
| `POST` | `/tickets` | `title, summary?, customerId, priority?` | Create ticket manually |
| `GET` | `/tickets/:id` | — | Get single ticket (populated) |
| `PATCH` | `/tickets/:id/status` | `status: in_progress\|resolved\|closed` | Update ticket status |
| `PATCH` | `/tickets/:id/assign` | `agentId` | Assign ticket to an agent |
| `POST` | `/tickets/:id/suggest-reply` | — | Generate fresh AI-suggested reply |

---

### Knowledge Base Endpoints (Admin JWT)

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `POST` | `/knowledge` | `title, content, tags[]` | Create a knowledge base entry |
| `GET` | `/knowledge` | `?isActive=true` | List knowledge base entries |
| `PATCH` | `/knowledge/:id` | `title?, content?, tags?, isActive?` | Update an entry |
| `DELETE` | `/knowledge/:id` | — | Delete an entry |

---

### Analytics Endpoint (Admin JWT)

| Method | Endpoint | Query | Description |
|--------|----------|-------|-------------|
| `GET` | `/analytics` | `?from=2026-01-01&to=2026-04-30` | Ticket counts and AI-handled rate for the business |

---

### Socket.io Events

| Event | Direction | Payload | When it fires |
|-------|-----------|---------|---------------|
| `join_business` | Client → Server | `{ businessId }` | Agent connects to their business room |
| `new_message` | Server → Client | `{ conversationId, message }` | Customer sends a message |
| `ticket_created` | Server → Client | `{ ticket }` | AI handoff creates a new ticket |
| `ticket_updated` | Server → Client | `{ ticketId, status, updatedBy }` | Any agent updates a ticket status |
| `agent_reply` | Server → Client | `{ conversationId, message }` | Agent sends a reply |

---

## Data Models

### Indexes (defined in Mongoose schemas)

| Collection | Index | Purpose |
|-----------|-------|---------|
| `users` | `{ email: 1 }` unique | Fast login lookup |
| `tickets` | `{ businessId: 1, status: 1, priority: 1 }` | Agent dashboard filtered queries |
| `conversations` | `{ businessId: 1, customerId: 1, updatedAt: -1 }` | Sorted conversation history |
| `knowledgebase` | `{ businessId: 1, isActive: 1, tags: 1 }` | Fast AI context retrieval |
| `customers` | `{ businessId: 1, email: 1 }` | Returning customer identification |

---

## Getting Started

### Prerequisites

- Node.js 20 LTS
- npm 9+
- MongoDB Atlas account (free tier is sufficient)
- OpenAI API key **or** Google Gemini API key

### Installation

```bash
git clone https://github.com/FrontifybyHB/supportflow-server.git
cd supportflow-server
npm install
```

### Environment Setup

Create a `.env` file in the root directory (use `.env.example` as a template):

```bash
# Server
PORT=5000

# Database
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/supportflow

# Authentication
JWT_SECRET=your_minimum_32_character_random_secret
JWT_EXPIRES_IN=7d

# AI Provider — set to 'openai' or 'gemini'
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...          # Only needed if AI_PROVIDER=gemini

# CORS
CLIENT_URL=http://localhost:5173  # Your frontend URL
```

> **Never commit `.env` to version control.** The `.env.example` file documents all required keys without values.

### Run the Server

```bash
# Development (with nodemon hot-reload)
npm run dev

# Production
npm start
```

Server starts on `http://localhost:5000`. Health check: `GET /api/health`

---

## Switching AI Providers

No code changes needed. Set one environment variable:

```bash
AI_PROVIDER=openai    # Uses GPT-4o-mini
AI_PROVIDER=gemini    # Uses Gemini 1.5 Flash
```

Each provider is a separate file exporting the same `complete(systemPrompt, userMessage)` interface. The AI Orchestration Service loads the correct provider at runtime.

---

## Middleware Execution Chain

Every protected request passes through this chain in order:

```
Request
  ↓
verifyToken        — JWT verification → attaches req.user
  ↓
requireTenant      — businessId extraction → attaches req.businessId
  ↓
requireRole(...)   — role check (admin / agent)
  ↓
Controller         — request validation + service call + response
```

---

## AI Decision Flow

```
POST /api/chat/message
  ↓
Auth + Tenant middleware
  ↓
ChatController → ChatService.handleMessage()
  ↓
KnowledgeService.getContext(businessId, message)   ← top 5 active KB entries
  ↓
AIOrchestrationService.processMessage()
  ↓
Build system prompt + inject KB context → call LLM API
  ↓
Parse JSON response: { answer, confidence, sentiment, priority, handoffNeeded, summary }
  ↓
confidence >= 0.75 AND handoffNeeded = false?
  ├── YES → return AI answer to customer | mark conversation aiHandled = true
  └── NO  → TicketService.createFromHandoff() → emit ticket_created via Socket.io
  ↓
LLM error / timeout?
  └── catch block → createFromHandoff() with fallback summary | customer sees polite message
```

---

## Deployment on Render

1. Go to [render.com](https://render.com) → **New Web Service** → connect your GitHub repo
2. Set **Root Directory** to `/` (or your backend folder)
3. **Build Command:** `npm install`
4. **Start Command:** `node src/server.js`
5. Add all environment variables from the `.env` section above
6. Enable **Auto-Deploy** on the `main` branch
7. Copy the Render URL and set it as `VITE_API_BASE_URL` in your frontend

> **Free tier cold starts:** Add a cron job or uptime monitor to ping `GET /api/health` every 10 minutes to keep the instance warm during your demo.

---

## Pre-Demo Checklist

| Check | How to Verify |
|-------|---------------|
| Server is live | `GET /api/health` returns `{ "status": "ok" }` |
| Database connected | `POST /api/auth/register` returns a JWT |
| Auth flow | Login → `GET /api/auth/me` returns correct user with `businessId` |
| KB creation | `POST /api/knowledge` (admin JWT) → entry appears in `GET /api/knowledge` |
| AI answers | `POST /api/chat/message` with a FAQ question → `type: "ai_answer"` |
| Handoff works | `POST /api/chat/message` with unknown question → `type: "handoff"` + ticket in DB |
| Real-time | Open agent dashboard → send chat in another tab → ticket appears without refresh |
| Tenant isolation | Business A JWT calling Business B's `/api/tickets` → empty array or 403 |

---

## Non-Functional Targets

| Target | Goal | How it's achieved |
|--------|------|-------------------|
| AI response time | < 5 seconds end-to-end | GPT-4o-mini with `max_tokens: 500`, `temperature: 0.3` |
| Ticket notification | < 2 seconds chat → agent dashboard | Socket.io emit inside TicketService immediately after DB insert |
| Tenant isolation | 100% — zero cross-tenant data | `businessId` filter on every query enforced by tenant middleware |
| Query performance | < 100ms on indexed fields | Compound indexes on `businessId + status + priority` etc. |
| Password security | Zero plaintext passwords | `bcrypt.hash()` on register, `bcrypt.compare()` on login, `select: false` on `passwordHash` field |
| AI fallback | 100% coverage | Every LLM call wrapped in try/catch → ticket always created on failure |

---

## Hackathon Context

SupportFlow AI was built for the **Sheryians Coding School Hackathon 2026** under Problem Statement #1: *AI Customer Support Platform for Multi-Tenant Businesses*.

The project demonstrates: multi-tenant architecture with `businessId` isolation, four-role RBAC with JWT, practical Generative AI embedded in the support workflow, real-time agent notifications via Socket.io, and a complete end-to-end support lifecycle — all within a 48-hour build window.

---

## Related

- 🖥️ **Frontend client** — [supportflow-client](https://github.com/FrontifybyHB/supportflow-client)
- 🌐 **Live app** — [supportflowai.vercel.app](https://supportflowai.vercel.app)
- 📄 **SRS Document** — Software Requirements Specification v1.0
- 🗂️ **System Design** — HLD + LLD + 48-Hour Build Plan v2.0

---

<div align="center">

Built with ❤️ for Sheryians Coding School Hackathon 2026

</div>
