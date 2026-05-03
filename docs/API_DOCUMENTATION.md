# SupportFlow Backend API Documentation

This document is for frontend integration. It describes the current Express routes, what each API is for, what data the frontend should send, and what response shape the backend returns.

## Backend API Folder Structure

```text
src/
  app.js                         Route mounting, global middleware, 404, error handler
  routes/                        URL definitions and middleware composition
    auth.routes.js               Login, register, OTP, password reset, current user
    business.routes.js           Business onboarding, business profile, stats, knowledge base
    agent.routes.js              Agent/admin ticket dashboard APIs
    chat.routes.js               Public customer chat entrypoint
    customer.routes.js           Public customer identity/token endpoint
    businessAi.routes.js         Admin AI model selection APIs
    feedback.routes.js           Feedback token, public feedback submit, analytics
    superadmin.routes.js         Platform owner/superadmin APIs
  controllers/                   Extract req data, call services, send response
  validators/                    express-validator request validation rules
  services/                      Business logic
  repositories/                  MongoDB queries
  models/                        Mongoose schemas
  middlewares/                   Auth, tenant, validation, rate limit, errors
  sockets/                       Socket.io authentication and rooms
```

## Base URLs

Set this once in frontend:

```js
const API_BASE_URL = "http://localhost:4000";
```

Current route mounts:

```text
GET    /

/api/v1/auth
/api/v1/business
/api/v1/agents
/api/v1/customer
/api/v1/superadmin
/api/v1/businesses/public

/api/chat
/api/business-ai
/api/feedback
```

For chat, business AI, and feedback, use the current non-v1 paths until the backend adds v1 aliases.

## Common Frontend Rules

Authenticated requests:

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

Refresh token is stored by backend as an HTTP-only cookie named by the backend constant. In Axios/fetch, enable cookies:

```js
axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});
```

Standard success response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {}
}
```

Standard error response:

```json
{
  "success": false,
  "statusCode": 401,
  "message": "You are not logged in. Please log in to continue."
}
```

Validation error response:

```json
{
  "success": false,
  "statusCode": 422,
  "message": "Validation failed",
  "errors": {
    "email": "Please provide a valid email"
  }
}
```

Important roles:

```text
customer     Public/customer user
agent        Support agent
admin        Business owner/admin
superadmin   Platform owner
```

## Auth APIs

Base path: `/api/v1/auth`

### POST `/register`

Purpose: Create a customer account and queue email verification OTP.

Auth: Public.

Body:

```json
{
  "name": "Himanshu",
  "email": "user@example.com",
  "password": "Test@12345"
}
```

Validation:

```text
name: required, 2-50 chars
email: required, valid email
password: required, min 8 chars, uppercase, lowercase, number, special char
```

Response `201`:

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Success",
  "data": {
    "userId": "mongoId",
    "message": "Registration successful. Verification OTP queued."
  }
}
```

Frontend next step: Show OTP verification UI and call `/verify-otp`.

### POST `/login`

Purpose: Login with email/password and receive access token.

Auth: Public.

Body:

```json
{
  "email": "user@example.com",
  "password": "Test@12345"
}
```

Response when verified:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "accessToken": "jwt",
    "user": {
      "_id": "mongoId",
      "name": "Himanshu",
      "email": "user@example.com",
      "role": "customer",
      "businessId": null,
      "isActive": true,
      "isEmailVerified": true
    }
  }
}
```

Response when email is not verified:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "needsVerification": true,
    "userId": "mongoId",
    "message": "Please verify your email. A new OTP has been queued."
  }
}
```

Frontend next step: Store `accessToken` in memory/local storage according to your app strategy. Refresh token is set as HTTP-only cookie.

### POST `/google`

Purpose: Login/signup with Google ID token.

Auth: Public.

Body:

```json
{
  "idToken": "google-id-token",
  "businessName": "Optional Business Name"
}
```

Response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "accessToken": "jwt",
    "user": {}
  }
}
```

### POST `/refresh` or `/refresh-token`

Purpose: Rotate refresh token cookie and return a new access token.

Auth: Uses HTTP-only refresh cookie. No bearer token needed.

Body: none.

Response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "accessToken": "jwt",
    "user": {}
  }
}
```

Frontend usage: Call when an authenticated API returns access-token-expired error.

### POST `/verify-otp`

Purpose: Verify email OTP or password reset OTP.

Auth: Public.

Body:

```json
{
  "userId": "mongoId",
  "otp": "123456"
}
```

Response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "accessToken": "jwt",
    "user": {},
    "message": "OTP verified successfully"
  }
}
```

### POST `/resend-otp`

Purpose: Send a new email verification OTP.

Auth: Public.

Body:

```json
{
  "userId": "mongoId"
}
```

Response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "message": "New verification OTP queued"
  }
}
```

### POST `/forgot-password`

Purpose: Queue password reset OTP.

Auth: Public.

Body:

```json
{
  "email": "user@example.com"
}
```

Response always generic:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "message": "If this email exists, a reset OTP has been queued"
  }
}
```

### POST `/reset-password`

Purpose: Reset password using OTP.

Auth: Public.

Body:

```json
{
  "userId": "mongoId",
  "otp": "123456",
  "newPassword": "NewTest@123"
}
```

Response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "message": "Password reset successful. Please log in again."
  }
}
```

### POST `/logout`

Purpose: Logout current refresh cookie session.

Auth: Optional refresh cookie.

Body: none.

Response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "message": "Logged out successfully"
  }
}
```

### POST `/logout-all`

Purpose: Logout all sessions for current user.

Auth: Bearer token required.

Body: none.

Response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "message": "Logged out from all devices"
  }
}
```

### GET `/me` or `/get-me`

Purpose: Fetch current logged-in user.

Auth: Bearer token required.

Response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "user": {}
  }
}
```

## Business APIs

Base path: `/api/v1/business`

### POST `/`

Purpose: Create a business for the logged-in verified user. This promotes the user to `admin`.

Auth: Bearer token, verified email.

Body:

```json
{
  "name": "Acme Support",
  "industry": "SaaS",
  "description": "Customer support for Acme"
}
```

`businessName` can be used instead of `name`.

Response `201`:

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Success",
  "data": {
    "business": {},
    "user": {
      "_id": "mongoId",
      "name": "Himanshu",
      "email": "admin@example.com",
      "role": "admin",
      "businessId": "mongoId"
    }
  }
}
```

### GET `/me`

Purpose: Get current admin's business profile.

Auth: Bearer token, verified email, active business, role `admin` or higher.

Response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "business": {
      "_id": "mongoId",
      "name": "Acme Support",
      "industry": "SaaS",
      "description": "Customer support for Acme",
      "settings": {},
      "knowledgeBase": [],
      "aiUsage": {},
      "owner": {}
    }
  }
}
```

### PATCH `/me`

Purpose: Update business profile, settings, and AI knowledge base.

Auth: Bearer token, verified email, active business, role `admin` or higher.

Body:

```json
{
  "name": "Acme Support",
  "industry": "SaaS",
  "description": "Support desk",
  "settings": {
    "chatWidgetEnabled": true,
    "autoReplyEnabled": true
  },
  "knowledgeBase": [
    {
      "title": "Refund policy",
      "content": "Refunds are available within 7 days.",
      "tags": ["billing", "refund"],
      "isActive": true
    }
  ]
}
```

Validation:

```text
knowledgeBase: max 50 entries
knowledgeBase.title: 1-160 chars
knowledgeBase.content: 1-3000 chars
knowledgeBase.tags: max 20 tags, each 1-50 chars
```

Response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "business": {}
  }
}
```

Frontend note: This endpoint replaces the `knowledgeBase` array you send. Keep current entries in state and send the full updated list.

### GET `/stats`

Purpose: Basic business dashboard stats.

Auth: Bearer token, verified email, active business, role `admin` or higher.

Response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "stats": {
      "totalAgents": 0,
      "totalTickets": 0,
      "openTickets": 0,
      "resolvedTickets": 0,
      "totalCustomers": 0,
      "aiHandledRate": "0%"
    }
  }
}
```

## Customer APIs

Base path: `/api/v1/customer`

### POST `/identify`

Purpose: Public endpoint for chat widget to identify or create a customer and receive a customer JWT.

Auth: Public.

Body:

```json
{
  "businessId": "mongoId",
  "name": "Customer Name",
  "email": "customer@example.com",
  "phone": "+911234567890"
}
```

Validation:

```text
businessId: required MongoId
name: optional, max 80 chars
email: optional valid email
phone: optional, max 30 chars
```

Response `201`:

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Success",
  "data": {
    "customerToken": "jwt",
    "customerId": "mongoId",
    "name": "Customer Name"
  }
}
```

Frontend use: Store `customerToken` for chat widget identity if your frontend needs persistent customer context. The current chat message endpoint does not require this token yet.

## Public Chat API

Base path: `/api/chat`

### POST `/message`

Purpose: Customer sends a message. Backend classifies with AI, either creates an agent handoff ticket or creates an AI-resolved ticket.

Auth: Public.

Rate limit: 20 requests per minute per IP + businessId.

Body:

```json
{
  "businessId": "mongoId",
  "message": "I need help with a refund",
  "subject": "Refund help",
  "conversationId": "previousTicketMongoId",
  "customerName": "Customer Name",
  "customerEmail": "customer@example.com",
  "priority": "Medium",
  "category": "billing"
}
```

Required:

```text
businessId
message
```

Optional:

```text
subject: max 150 chars
conversationId: MongoId, used to load history when customerEmail matches previous ticket
customerName: max 100 chars
customerEmail: valid email
priority: Low, Medium, High, Critical, low, medium, high, urgent
category: billing, account, technical, general, refund, security, other
```

Response when routed to agent handoff `201`:

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Ticket created",
  "data": {
    "reply": "An agent will assist you shortly",
    "handoff": true,
    "priority": "High",
    "category": "refund",
    "confidence": 0.82,
    "reason": "Customer needs staff action",
    "tokensUsed": 123,
    "costEstimate": 0.000246,
    "provider": "openai",
    "model": "gpt-4o-mini",
    "modelSource": "business",
    "ticket": {},
    "message": {}
  }
}
```

Response when AI resolves directly `200`:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "AI reply generated",
  "data": {
    "reply": "Here is the answer...",
    "handoff": false,
    "priority": "Low",
    "category": "general",
    "confidence": 0.9,
    "reason": "Question answered from knowledge base",
    "tokensUsed": 220,
    "classificationTokensUsed": 80,
    "replyTokensUsed": 140,
    "costEstimate": 0.00044,
    "provider": "openai",
    "model": "gpt-4o-mini",
    "modelSource": "platform_default",
    "ticket": {},
    "messages": []
  }
}
```

Frontend use:

```text
If handoff=true, show the agent handoff message and keep ticket._id as conversationId.
If handoff=false, show the AI reply and still keep ticket._id for history.
```

## Agent Ticket APIs

Base path: `/api/v1/agents`

All routes require bearer token, active tenant, and role `agent`, `admin`, or `superadmin`.

### GET `/me`

Purpose: Get current authenticated agent/admin/superadmin user.

Response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Agent fetched",
  "data": {}
}
```

### GET `/tickets`

Purpose: Ticket list for agent dashboard.

Query:

```text
page: optional integer >= 1
limit: optional integer 1-50
status: optional open, pending, resolved, closed
priority: optional Low, Medium, High, Critical, low, medium, high, urgent
category: optional billing, account, technical, general, refund, security, other
```

Agent role behavior: agents see tickets assigned to them plus unassigned tickets. Admins see all business tickets. Superadmins can query cross-tenant through the repository path.

Response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Tickets fetched",
  "data": {
    "data": [
      {
        "_id": "ticketId",
        "businessId": "businessId",
        "customer": {
          "name": "Guest",
          "email": "customer@example.com"
        },
        "subject": "Need help",
        "status": "open",
        "priority": "Medium",
        "category": "general",
        "isHandoff": true,
        "assignedAgent": null,
        "source": "chat",
        "feedback": null,
        "createdAt": "ISO date",
        "updatedAt": "ISO date"
      }
    ],
    "total": 1,
    "page": 1,
    "totalPages": 1
  }
}
```

### GET `/tickets/:id`

Purpose: Ticket detail plus message thread.

Params:

```text
id: ticket MongoId
```

Response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Ticket fetched",
  "data": {
    "ticket": {},
    "messages": [
      {
        "_id": "messageId",
        "ticketId": "ticketId",
        "businessId": "businessId",
        "senderType": "customer",
        "senderId": null,
        "content": "Hello",
        "createdAt": "ISO date",
        "updatedAt": "ISO date"
      }
    ]
  }
}
```

### PATCH `/tickets/:id/status`

Purpose: Update ticket status.

Body:

```json
{
  "status": "resolved"
}
```

Allowed statuses:

```text
open, pending, resolved, closed
```

Response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Ticket status updated",
  "data": {}
}
```

Socket event emitted:

```text
ticket_updated
```

### PATCH `/tickets/:id/assign`

Purpose: Assign ticket to an active agent in the same business.

Auth: role `admin` or `superadmin`.

Body:

```json
{
  "agentId": "mongoId"
}
```

Response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Ticket assigned",
  "data": {}
}
```

Socket event emitted:

```text
ticket_updated
```

### POST `/tickets/:id/messages`

Purpose: Add agent/admin reply to ticket.

Body:

```json
{
  "content": "Thanks, I am checking this for you."
}
```

Validation:

```text
content: required, 1-3000 chars
```

Response `201`:

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Message added",
  "data": {
    "_id": "messageId",
    "ticketId": "ticketId",
    "businessId": "businessId",
    "senderType": "agent",
    "senderId": "agentUserId",
    "content": "Thanks, I am checking this for you.",
    "createdAt": "ISO date",
    "updatedAt": "ISO date"
  }
}
```

Socket event emitted:

```text
new_message
```

## Business AI APIs

Base path: `/api/business-ai`

All routes require bearer token, active tenant, role `admin`.

### GET `/models`

Purpose: List active AI models available for selection.

Response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "AI models fetched",
  "data": [
    {
      "_id": "modelId",
      "name": "GPT-4o Mini",
      "provider": "openai",
      "description": "OpenAI model managed by the platform",
      "isDefault": true,
      "config": {
        "maxTokens": 500,
        "temperature": 0.7
      }
    }
  ]
}
```

### GET `/selection`

Purpose: Get currently selected AI model for the business or platform default.

Response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Business AI model fetched",
  "data": {
    "businessId": "businessId",
    "source": "business",
    "model": {}
  }
}
```

`source` can be:

```text
business
platform_default
```

### PATCH `/selection`

Purpose: Select active AI model for the current business.

Body:

```json
{
  "modelId": "mongoId"
}
```

Response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Business AI model selected",
  "data": {
    "businessId": "businessId",
    "activeAIModel": {},
    "updatedAt": "ISO date"
  }
}
```

## Feedback APIs

Base path: `/api/feedback`

### POST `/:token`

Purpose: Public feedback submission page.

Auth: Public.

Params:

```text
token: 64-128 char hex token
```

Body:

```json
{
  "rating": 5,
  "resolved": true,
  "comment": "Great support"
}
```

Validation:

```text
rating: required integer 1-5
resolved: required boolean
comment: optional max 500 chars
```

Response `201`:

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Feedback submitted",
  "data": {
    "ticketId": "ticketId",
    "priority": "Medium",
    "category": "general",
    "feedback": {
      "rating": 5,
      "resolved": true,
      "comment": "Great support",
      "feedbackType": "agent",
      "submittedAt": "ISO date"
    }
  }
}
```

### POST `/tickets/:id/token`

Purpose: Generate feedback token/link for resolved or closed ticket.

Auth: Bearer token, role `agent`, `admin`, or `superadmin`.

Body:

```json
{
  "expiresInDays": 14
}
```

Validation:

```text
expiresInDays: optional integer 1-90
```

Response `201`:

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Feedback token generated",
  "data": {
    "ticketId": "ticketId",
    "feedbackType": "agent",
    "expiresAt": "ISO date",
    "token": "hexToken",
    "submitUrl": "/api/feedback/hexToken",
    "feedbackUrl": "http://localhost:5173/feedback/hexToken"
  }
}
```

Frontend use: Send `feedbackUrl` to customer or navigate to your feedback page.

### GET `/analytics`

Purpose: Feedback analytics for business dashboard.

Auth: Bearer token, role `admin` or `superadmin`.

Query:

```text
businessId: optional MongoId; superadmin can filter, admins are forced to own business
dateFrom: optional ISO date
dateTo: optional ISO date
feedbackType: optional ai or agent
category: optional billing, account, technical, general, refund, security, other
```

Response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Feedback analytics fetched",
  "data": {
    "filters": {
      "businessId": "businessId",
      "dateFrom": null,
      "dateTo": null,
      "feedbackType": null,
      "category": null
    },
    "overview": {
      "totalFeedback": 0,
      "averageRating": 0,
      "csatScore": 0,
      "resolutionRate": 0
    },
    "byType": [],
    "byCategory": []
  }
}
```

## Superadmin APIs

Base path: `/api/v1/superadmin`

### POST `/bootstrap`

Purpose: Create the first superadmin. Public, but service allows only one superadmin.

Auth: Public.

Body:

```json
{
  "name": "Platform Owner",
  "email": "owner@example.com",
  "password": "Test@12345"
}
```

Response `201` first time:

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Success",
  "data": {
    "alreadyExists": false,
    "message": "Super admin created successfully",
    "superAdmin": {
      "name": "Platform Owner",
      "email": "owner@example.com",
      "role": "superadmin"
    }
  }
}
```

Response `200` if already exists:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "alreadyExists": true,
    "message": "Super admin already exists",
    "email": "owner@example.com"
  }
}
```

All routes below require bearer token with role `superadmin`.

### GET `/businesses`

Purpose: List all businesses with owner and agent count.

Response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "businesses": [],
    "total": 0
  }
}
```

### GET `/businesses/:id`

Purpose: Business detail for superadmin.

Response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "business": {},
    "agents": [],
    "counts": {
      "totalAgents": 0,
      "totalCustomers": 0,
      "totalTickets": 0,
      "openTickets": 0,
      "resolvedTickets": 0,
      "kbEntries": 0,
      "aiHandledRate": "0%"
    }
  }
}
```

### PATCH `/businesses/:id/toggle`

Purpose: Flip business active/inactive state.

Body: none.

Response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "business": {
      "_id": "businessId",
      "name": "Business",
      "isActive": false,
      "suspensionReason": ""
    }
  }
}
```

### PATCH `/businesses/:id/status`

Purpose: Explicitly activate/suspend a business.

Body:

```json
{
  "isActive": false,
  "reason": "Policy issue"
}
```

Response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "business": {}
  }
}
```

### PATCH `/businesses/:id/plan`

Purpose: Change plan.

Body:

```json
{
  "plan": "pro"
}
```

Allowed:

```text
free, pro
```

Response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "business": {
      "_id": "businessId",
      "name": "Business",
      "plan": "pro"
    }
  }
}
```

### GET `/users`

Purpose: Paginated platform users.

Query:

```text
page: optional
limit: optional
role: optional customer, agent, admin, superadmin
businessId: optional MongoId
```

Response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "users": [],
    "total": 0,
    "page": 1,
    "totalPages": 0
  }
}
```

### PATCH `/users/:id/role`

Purpose: Update user role and optionally tenant.

Body:

```json
{
  "role": "agent",
  "businessId": "mongoId"
}
```

Rules:

```text
If role is superadmin, businessId is forced to null.
For tenant roles, pass businessId when assigning a user to a business.
All existing sessions for that user are deleted.
```

Response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "user": {}
  }
}
```

### GET `/stats`

Purpose: Platform stats.

Response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "totalBusinesses": 0,
    "activeBusinesses": 0,
    "totalAgents": 0,
    "totalCustomers": 0,
    "totalUsers": 0
  }
}
```

## Socket.io Integration

Server is attached to the same HTTP server as Express.

Frontend connect:

```js
import { io } from "socket.io-client";

const socket = io(API_BASE_URL, {
  withCredentials: true,
  auth: {
    token: accessToken,
  },
});
```

Auth:

```text
Use the same REST accessToken.
The backend reads userId, role, and businessId from the token.
```

Join business room:

```js
socket.emit("join_business", { businessId }, (result) => {
  console.log(result);
});
```

Join ticket room:

```js
socket.emit("join_room", { room: ticketId }, (result) => {
  console.log(result);
});
```

Server events to listen for:

```js
socket.on("ticket_created", ({ ticket }) => {});
socket.on("ticket_updated", (ticket) => {});
socket.on("new_message", (message) => {});
```

Room rules:

```text
Admins and agents can join their business room.
Agents can join unassigned tickets or tickets assigned to them.
Admins can join business tickets.
Superadmins can join any ticket room.
```

## Data Models Frontend Will Commonly Render

### User

```json
{
  "_id": "mongoId",
  "name": "User Name",
  "email": "user@example.com",
  "role": "admin",
  "businessId": "businessId",
  "isActive": true,
  "isEmailVerified": true,
  "avatarUrl": "",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

### Business

```json
{
  "_id": "businessId",
  "name": "Business",
  "industry": "SaaS",
  "description": "",
  "ownerId": "userId",
  "settings": {
    "chatWidgetEnabled": true,
    "autoReplyEnabled": false
  },
  "activeAIModel": "modelId",
  "knowledgeBase": [],
  "aiUsage": {
    "aiCalls": 0,
    "tokensConsumed": 0,
    "costEstimate": 0
  },
  "plan": "free",
  "isActive": true,
  "suspensionReason": "",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

### Ticket

```json
{
  "_id": "ticketId",
  "businessId": "businessId",
  "customer": {
    "name": "Guest",
    "email": "customer@example.com"
  },
  "subject": "Support request",
  "status": "open",
  "priority": "Medium",
  "category": "general",
  "isHandoff": true,
  "assignedAgent": null,
  "source": "chat",
  "feedback": null,
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

### Message

```json
{
  "_id": "messageId",
  "ticketId": "ticketId",
  "businessId": "businessId",
  "senderType": "customer",
  "senderId": null,
  "content": "Message text",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

## Frontend Integration Order

Recommended dashboard flow:

```text
1. POST /api/v1/auth/login
2. Store data.accessToken
3. GET /api/v1/auth/me
4. If user has no businessId and is verified, show create business screen
5. POST /api/v1/business
6. Admin dashboard:
   - GET /api/v1/business/me
   - GET /api/v1/business/stats
   - GET /api/v1/agents/tickets
   - GET /api/business-ai/models
   - GET /api/business-ai/selection
   - GET /api/feedback/analytics
7. Agent dashboard:
   - GET /api/v1/agents/me
   - GET /api/v1/agents/tickets
   - GET /api/v1/agents/tickets/:id
   - POST /api/v1/agents/tickets/:id/messages
8. Public chat widget:
   - POST /api/v1/customer/identify
   - POST /api/chat/message
9. Socket.io:
   - connect with accessToken
   - join business room or ticket room
   - listen for ticket_created, ticket_updated, new_message
```

## Current API Gaps To Know

These services/validators exist but no route currently exposes them:

```text
Agent management:
- create agent
- list agents
- update agent active state
```

For the frontend agent management page, either use the superadmin `/users/:id/role` flow for now, or add admin-scoped routes later:

```text
POST   /api/v1/business/agents
GET    /api/v1/business/agents
PATCH  /api/v1/business/agents/:id
```

The business stats API currently returns placeholder ticket counts (`0`) because ticket aggregate stats are not implemented there yet.
