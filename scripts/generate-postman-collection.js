import { writeFileSync } from "node:fs";

const schema = "https://schema.getpostman.com/json/collection/v2.1.0/collection.json";
const collectionOutputPath = new URL("../postman/SupportFlow_AI_Current_Branch.postman_collection.json", import.meta.url);
const environmentOutputPath = new URL("../postman/SupportFlow_AI_Current_Branch.postman_environment.json", import.meta.url);

const collectionPreRequest = `
const now = Date.now();

function readVar(key) {
  return pm.environment.get(key) || pm.collectionVariables.get(key);
}

function writeVar(key, value) {
  pm.collectionVariables.set(key, value);
  try {
    pm.environment.set(key, value);
  } catch (error) {
    // Collection variables still make the collection runnable without an active environment.
  }
}

function ensureVar(key, fallback) {
  const current = readVar(key);
  if (current === undefined || current === null || current === "") {
    writeVar(key, fallback);
  }
}

ensureVar("BASE_URL", "http://localhost:3000");
ensureVar("MAX_RESPONSE_MS", "2000");
ensureVar("ordinaryUserEmail", "postman_user_" + now + "@supportflow.test");
ensureVar("ordinaryUsername", "postman_user_" + now);
ensureVar("ordinaryUserPassword", "Test@12345");
ensureVar("wrongPassword", "Wrong@12345");
ensureVar("chatCustomerEmail", "customer_" + now + "@example.com");
ensureVar("RUN_OPTIONAL_MUTATION_TESTS", "false");
ensureVar("superadminEmail", "");
ensureVar("superadminPassword", "");
ensureVar("adminEmail", "");
ensureVar("adminPassword", "");
ensureVar("agentEmail", "");
ensureVar("agentPassword", "");
`;

const collectionTests = `
let json = null;
try {
  json = pm.response.json();
} catch (error) {
  json = null;
}

pm.test("Response time is within limit", function () {
  const limit = Number(pm.environment.get("MAX_RESPONSE_MS") || pm.collectionVariables.get("MAX_RESPONSE_MS") || 2000);
  pm.expect(pm.response.responseTime).to.be.below(limit);
});

pm.test("Response body is JSON", function () {
  pm.expect(json, "Expected a JSON response body").to.not.equal(null);
});

pm.test("Response uses SupportFlow envelope", function () {
  pm.expect(json).to.have.property("success");
  pm.expect(json).to.have.property("message");
});

pm.test("Sensitive fields are not leaked", function () {
  const body = pm.response.text();
  pm.expect(body).to.not.include("passwordHash");
  pm.expect(body).to.not.include('"password"');
  pm.expect(body).to.not.include("apiKey");
});

pm.test("No development stack trace leaked", function () {
  pm.expect(pm.response.text()).to.not.include(" at ");
});
`;

const helperFunctions = `
function readVar(key) {
  return pm.environment.get(key) || pm.collectionVariables.get(key);
}

function writeVar(key, value) {
  if (value === undefined || value === null || value === "") return;
  pm.collectionVariables.set(key, value);
  try {
    pm.environment.set(key, value);
  } catch (error) {
    // Collection variables still work without an active environment.
  }
}

function bodyJson() {
  return pm.response.json();
}
`;

const optionalMutationGuard = `
const shouldRun = (pm.environment.get("RUN_OPTIONAL_MUTATION_TESTS") || pm.collectionVariables.get("RUN_OPTIONAL_MUTATION_TESTS")) === "true";
if (!shouldRun) {
  pm.execution.skipRequest();
}
`;

function lines(script) {
  return script.trim().split("\n");
}

function rawJson(value) {
  return JSON.stringify(value, null, 2);
}

function url(raw) {
  return { raw };
}

function auth(tokenVar) {
  if (!tokenVar) return undefined;
  return {
    type: "bearer",
    bearer: [{ key: "token", value: `{{${tokenVar}}}`, type: "string" }],
  };
}

function request(name, method, rawUrl, options = {}) {
  const headers = [];
  if (options.body !== undefined) {
    headers.push({ key: "Content-Type", value: "application/json", type: "text" });
  }

  const item = {
    name,
    request: {
      method,
      header: headers,
      url: url(rawUrl),
    },
  };

  const requestAuth = auth(options.token);
  if (requestAuth) item.request.auth = requestAuth;

  if (options.body !== undefined) {
    item.request.body = {
      mode: "raw",
      raw: typeof options.body === "string" ? options.body : rawJson(options.body),
      options: { raw: { language: "json" } },
    };
  }

  const events = [];
  if (options.preRequest) {
    events.push({
      listen: "prerequest",
      script: { type: "text/javascript", exec: lines(options.preRequest) },
    });
  }
  if (options.tests) {
    events.push({
      listen: "test",
      script: { type: "text/javascript", exec: lines(helperFunctions + "\n" + options.tests) },
    });
  }
  if (events.length) item.event = events;

  return item;
}

function folder(name, items, description) {
  const item = { name, item: items };
  if (description) item.description = description;
  return item;
}

function expectStatus(statuses) {
  return `
pm.test("Expected status: ${statuses.join(" or ")}", function () {
  pm.expect([${statuses.join(", ")}]).to.include(pm.response.code);
});
`;
}

function expectSuccess(expected) {
  return `
pm.test("success is ${expected}", function () {
  pm.expect(bodyJson().success).to.eql(${expected});
});
`;
}

function storeAuthVars(tokenName, refreshName, userIdName, businessIdName) {
  return `
const json = bodyJson();
if (json.success) {
  writeVar("${tokenName}", json.accessToken);
  writeVar("${refreshName}", json.refreshToken);
  writeVar("${userIdName}", json.data && json.data._id);
  writeVar("${businessIdName}", json.data && json.data.businessId);
}
pm.test("access token returned", function () {
  pm.expect(json.accessToken).to.be.a("string").and.not.empty;
});
pm.test("user object returned without password", function () {
  pm.expect(json.data).to.be.an("object");
  pm.expect(JSON.stringify(json.data)).to.not.include("password");
});
`;
}

const collection = {
  info: {
    name: "SupportFlow AI - Current Branch Full API Test Suite",
    description:
      "Importable Postman v2.1 collection generated from the current server branch. Seeded superadmin/admin/agent credentials and businessId are required for tenant-protected routes because this branch does not expose public business or agent creation endpoints.",
    schema,
  },
  event: [
    {
      listen: "prerequest",
      script: { type: "text/javascript", exec: lines(collectionPreRequest) },
    },
    {
      listen: "test",
      script: { type: "text/javascript", exec: lines(collectionTests) },
    },
  ],
  variable: [
    { key: "BASE_URL", value: "http://localhost:3000", type: "string" },
    { key: "MAX_RESPONSE_MS", value: "2000", type: "string" },
    { key: "RUN_OPTIONAL_MUTATION_TESTS", value: "false", type: "string" },
    { key: "superadminEmail", value: "", type: "string" },
    { key: "superadminPassword", value: "", type: "string" },
    { key: "adminEmail", value: "", type: "string" },
    { key: "adminPassword", value: "", type: "string" },
    { key: "agentEmail", value: "", type: "string" },
    { key: "agentPassword", value: "", type: "string" },
    { key: "businessId", value: "", type: "string" },
    { key: "agentId", value: "", type: "string" },
  ],
  item: [
    folder("00 - Environment Setup", [
      request("Auth Required - Missing Token Baseline", "GET", "{{BASE_URL}}/api/v1/auth/get-me", {
        tests: expectStatus([401]) + expectSuccess(false),
      }),
      request("Chat Validation - Missing businessId Baseline", "POST", "{{BASE_URL}}/api/chat/message", {
        body: {
          message: "I need help with my account",
        },
        tests: expectStatus([400]) + expectSuccess(false),
      }),
    ], "Before running tenant folders, set superadminEmail/superadminPassword, adminEmail/adminPassword, agentEmail/agentPassword, and businessId if your admin token does not include it."),

    folder("01 - Auth", [
      folder("Happy Path", [
        request("Register Ordinary User", "POST", "{{BASE_URL}}/api/v1/auth/register", {
          body: {
            username: "{{ordinaryUsername}}",
            name: "Postman Ordinary User",
            email: "{{ordinaryUserEmail}}",
            password: "{{ordinaryUserPassword}}",
          },
          tests:
            expectStatus([201]) +
            expectSuccess(true) +
            storeAuthVars("ordinaryUserToken", "ordinaryUserRefreshToken", "ordinaryUserId", "ordinaryUserBusinessId"),
        }),
        request("Login Ordinary User", "POST", "{{BASE_URL}}/api/v1/auth/login", {
          body: {
            email: "{{ordinaryUserEmail}}",
            password: "{{ordinaryUserPassword}}",
          },
          tests:
            expectStatus([200]) +
            expectSuccess(true) +
            storeAuthVars("ordinaryUserToken", "ordinaryUserRefreshToken", "ordinaryUserId", "ordinaryUserBusinessId"),
        }),
        request("Get Current Ordinary User", "GET", "{{BASE_URL}}/api/v1/auth/get-me", {
          token: "ordinaryUserToken",
          tests:
            expectStatus([200]) +
            expectSuccess(true) +
            `
pm.test("current user id matches ordinary user", function () {
  pm.expect(String(bodyJson().data._id)).to.eql(String(readVar("ordinaryUserId")));
});
`,
        }),
        request("Refresh Access Token", "POST", "{{BASE_URL}}/api/v1/auth/refresh-token", {
          body: {
            refreshToken: "{{ordinaryUserRefreshToken}}",
          },
          tests:
            expectStatus([200]) +
            expectSuccess(true) +
            `
const json = bodyJson();
writeVar("ordinaryUserTokenRefreshed", json.accessToken);
pm.test("new access token returned", function () {
  pm.expect(json.accessToken).to.be.a("string").and.not.empty;
});
`,
        }),
        request("Logout Ordinary User", "POST", "{{BASE_URL}}/api/v1/auth/logout", {
          token: "ordinaryUserToken",
          tests: expectStatus([200]) + expectSuccess(true),
        }),
      ]),
      folder("Seeded Role Login", [
        request("Login Superadmin", "POST", "{{BASE_URL}}/api/v1/auth/login", {
          body: {
            email: "{{superadminEmail}}",
            password: "{{superadminPassword}}",
          },
          tests:
            expectStatus([200]) +
            expectSuccess(true) +
            storeAuthVars("superadminToken", "superadminRefreshToken", "superadminId", "superadminBusinessId") +
            `
pm.test("superadmin role returned", function () {
  pm.expect(bodyJson().data.role).to.eql("superadmin");
});
`,
        }),
        request("Login Admin", "POST", "{{BASE_URL}}/api/v1/auth/login", {
          body: {
            email: "{{adminEmail}}",
            password: "{{adminPassword}}",
          },
          tests:
            expectStatus([200]) +
            expectSuccess(true) +
            storeAuthVars("adminToken", "adminRefreshToken", "adminId", "businessId") +
            `
pm.test("admin role returned", function () {
  pm.expect(bodyJson().data.role).to.eql("admin");
});
pm.test("admin has business context", function () {
  pm.expect(readVar("businessId")).to.be.a("string").and.not.empty;
});
`,
        }),
        request("Login Agent", "POST", "{{BASE_URL}}/api/v1/auth/login", {
          body: {
            email: "{{agentEmail}}",
            password: "{{agentPassword}}",
          },
          tests:
            expectStatus([200]) +
            expectSuccess(true) +
            storeAuthVars("agentToken", "agentRefreshToken", "agentId", "agentBusinessId") +
            `
pm.test("agent role returned", function () {
  pm.expect(bodyJson().data.role).to.eql("agent");
});
pm.test("agent belongs to active business", function () {
  pm.expect(bodyJson().data.businessId).to.be.a("string").and.not.empty;
});
`,
        }),
      ]),
      folder("Negative Tests", [
        request("Wrong Password", "POST", "{{BASE_URL}}/api/v1/auth/login", {
          body: {
            email: "{{ordinaryUserEmail}}",
            password: "{{wrongPassword}}",
          },
          tests: expectStatus([401]) + expectSuccess(false),
        }),
        request("Duplicate Email", "POST", "{{BASE_URL}}/api/v1/auth/register", {
          body: {
            username: "{{ordinaryUsername}}_dup",
            name: "Duplicate User",
            email: "{{ordinaryUserEmail}}",
            password: "{{ordinaryUserPassword}}",
          },
          tests: expectStatus([400]) + expectSuccess(false),
        }),
        request("Role Cannot Be Set During Registration", "POST", "{{BASE_URL}}/api/v1/auth/register", {
          body: {
            username: "role_attempt_{{$timestamp}}",
            name: "Role Attempt",
            email: "role_attempt_{{$timestamp}}@supportflow.test",
            password: "{{ordinaryUserPassword}}",
            role: "admin",
          },
          tests: expectStatus([400]) + expectSuccess(false),
        }),
        request("Refresh Token Missing", "POST", "{{BASE_URL}}/api/v1/auth/refresh-token", {
          body: {},
          tests: expectStatus([401]) + expectSuccess(false),
        }),
        request("Verify Email Missing Email", "POST", "{{BASE_URL}}/api/v1/auth/verify-email", {
          body: {},
          tests: expectStatus([400]) + expectSuccess(false),
        }),
        request("Verify Email Invalid Token", "GET", "{{BASE_URL}}/api/v1/auth/verify-email?token=invalid-token", {
          tests: expectStatus([401]) + expectSuccess(false),
        }),
      ]),
    ]),

    folder("02 - Superadmin Platform", [
      folder("Read APIs", [
        request("Get Platform Stats", "GET", "{{BASE_URL}}/api/v1/superadmin/stats", {
          token: "superadminToken",
          tests:
            expectStatus([200]) +
            expectSuccess(true) +
            `
pm.test("stats contain platform counters", function () {
  const data = bodyJson().data;
  pm.expect(data).to.have.property("totalBusinesses");
  pm.expect(data).to.have.property("totalUsers");
  pm.expect(data).to.have.property("totalTickets");
});
`,
        }),
        request("Get Usage Stats", "GET", "{{BASE_URL}}/api/v1/superadmin/usage", {
          token: "superadminToken",
          tests:
            expectStatus([200]) +
            expectSuccess(true) +
            `
pm.test("usage contains AI counters", function () {
  const data = bodyJson().data;
  pm.expect(data).to.have.property("aiApiCalls");
  pm.expect(data).to.have.property("tokensConsumed");
  pm.expect(data).to.have.property("usageByPlan");
});
`,
        }),
        request("List Businesses", "GET", "{{BASE_URL}}/api/v1/superadmin/businesses", {
          token: "superadminToken",
          tests:
            expectStatus([200]) +
            expectSuccess(true) +
            `
const businesses = bodyJson().data || [];
if (!readVar("businessId") && businesses.length) {
  const active = businesses.find((business) => business.isActive !== false) || businesses[0];
  writeVar("businessId", active._id);
}
pm.test("businesses response is an array", function () {
  pm.expect(businesses).to.be.an("array");
});
`,
        }),
        request("Get Business By ID", "GET", "{{BASE_URL}}/api/v1/superadmin/businesses/{{businessId}}", {
          token: "superadminToken",
          tests:
            expectStatus([200]) +
            expectSuccess(true) +
            `
pm.test("business id matches variable", function () {
  pm.expect(String(bodyJson().data._id)).to.eql(String(readVar("businessId")));
});
`,
        }),
        request("List Users", "GET", "{{BASE_URL}}/api/v1/superadmin/users", {
          token: "superadminToken",
          tests:
            expectStatus([200]) +
            expectSuccess(true) +
            `
const users = bodyJson().data || [];
const agent = users.find((user) => user.email === readVar("agentEmail"));
const admin = users.find((user) => user.email === readVar("adminEmail"));
writeVar("agentId", agent && agent._id);
writeVar("adminId", admin && admin._id);
pm.test("users response is an array", function () {
  pm.expect(users).to.be.an("array");
});
`,
        }),
        request("Get Admin User By ID", "GET", "{{BASE_URL}}/api/v1/superadmin/users/{{adminId}}", {
          token: "superadminToken",
          tests: expectStatus([200]) + expectSuccess(true),
        }),
      ]),
      folder("Business Mutations - Opt In", [
        request("Suspend Business", "PATCH", "{{BASE_URL}}/api/v1/superadmin/businesses/{{businessId}}/suspend", {
          token: "superadminToken",
          preRequest: optionalMutationGuard,
          tests:
            expectStatus([200]) +
            expectSuccess(true) +
            `
pm.test("business is suspended", function () {
  pm.expect(bodyJson().data.isActive).to.eql(false);
});
`,
        }),
        request("Activate Business", "PATCH", "{{BASE_URL}}/api/v1/superadmin/businesses/{{businessId}}/activate", {
          token: "superadminToken",
          preRequest: optionalMutationGuard,
          tests:
            expectStatus([200]) +
            expectSuccess(true) +
            `
pm.test("business is active", function () {
  pm.expect(bodyJson().data.isActive).to.eql(true);
});
`,
        }),
        request("Change Business Plan", "PATCH", "{{BASE_URL}}/api/v1/superadmin/businesses/{{businessId}}/plan", {
          token: "superadminToken",
          preRequest: optionalMutationGuard,
          body: { plan: "pro" },
          tests:
            expectStatus([200]) +
            expectSuccess(true) +
            `
pm.test("plan changed to pro", function () {
  pm.expect(bodyJson().data.plan).to.eql("pro");
});
`,
        }),
      ]),
      folder("User Mutations - Opt In", [
        request("Deactivate Agent User", "PATCH", "{{BASE_URL}}/api/v1/superadmin/users/{{agentId}}/deactivate", {
          token: "superadminToken",
          preRequest: optionalMutationGuard,
          tests:
            expectStatus([200]) +
            expectSuccess(true) +
            `
pm.test("agent is inactive", function () {
  pm.expect(bodyJson().data.isActive).to.eql(false);
});
`,
        }),
        request("Reactivate Agent User", "PATCH", "{{BASE_URL}}/api/v1/superadmin/users/{{agentId}}/reactivate", {
          token: "superadminToken",
          preRequest: optionalMutationGuard,
          tests:
            expectStatus([200]) +
            expectSuccess(true) +
            `
pm.test("agent is active", function () {
  pm.expect(bodyJson().data.isActive).to.eql(true);
});
`,
        }),
      ]),
      folder("AI Model Management", [
        request("List AI Models", "GET", "{{BASE_URL}}/api/v1/superadmin/models", {
          token: "superadminToken",
          tests:
            expectStatus([200]) +
            expectSuccess(true) +
            `
pm.test("models response is an array", function () {
  pm.expect(bodyJson().data).to.be.an("array");
});
`,
        }),
        request("Create AI Model", "POST", "{{BASE_URL}}/api/v1/superadmin/models", {
          token: "superadminToken",
          body: {
            name: "Postman Custom Model {{$timestamp}}",
            provider: "custom",
            description: "Temporary model created by Postman collection",
            apiKey: "postman-test-key",
            endpoint: "http://127.0.0.1:9/mock-ai",
            isActive: true,
            isDefault: false,
            config: {
              maxTokens: 256,
              temperature: 0.2,
            },
          },
          tests:
            expectStatus([201]) +
            expectSuccess(true) +
            `
const model = bodyJson().data;
writeVar("modelId", model && model._id);
pm.test("model created without apiKey leak", function () {
  pm.expect(model._id).to.be.a("string");
  pm.expect(model).to.not.have.property("apiKey");
});
`,
        }),
        request("Get AI Model", "GET", "{{BASE_URL}}/api/v1/superadmin/models/{{modelId}}", {
          token: "superadminToken",
          tests: expectStatus([200]) + expectSuccess(true),
        }),
        request("Update AI Model", "PATCH", "{{BASE_URL}}/api/v1/superadmin/models/{{modelId}}", {
          token: "superadminToken",
          body: {
            description: "Updated by Postman collection",
            config: {
              maxTokens: 300,
              temperature: 0.3,
            },
          },
          tests:
            expectStatus([200]) +
            expectSuccess(true) +
            `
pm.test("model updated", function () {
  pm.expect(bodyJson().data.description).to.eql("Updated by Postman collection");
});
`,
        }),
        request("Set Default AI Model - Opt In", "PATCH", "{{BASE_URL}}/api/v1/superadmin/models/{{modelId}}/default", {
          token: "superadminToken",
          preRequest: optionalMutationGuard,
          tests:
            expectStatus([200]) +
            expectSuccess(true) +
            `
pm.test("model marked default", function () {
  pm.expect(bodyJson().data.isDefault).to.eql(true);
});
`,
        }),
      ]),
    ]),

    folder("03 - Business AI", [
      request("List Available Business AI Models", "GET", "{{BASE_URL}}/api/business-ai/models", {
        token: "adminToken",
        tests: expectStatus([200]) + expectSuccess(true),
      }),
      request("Get Business AI Selection", "GET", "{{BASE_URL}}/api/business-ai/selection", {
        token: "adminToken",
        tests:
          expectStatus([200]) +
          expectSuccess(true) +
          `
pm.test("selection is scoped to business", function () {
  pm.expect(String(bodyJson().data.businessId)).to.eql(String(readVar("businessId")));
});
`,
      }),
      request("Select Business AI Model - Opt In", "PATCH", "{{BASE_URL}}/api/business-ai/selection", {
        token: "adminToken",
        preRequest: optionalMutationGuard,
        body: {
          modelId: "{{modelId}}",
        },
        tests:
          expectStatus([200]) +
          expectSuccess(true) +
          `
pm.test("selected model matches modelId", function () {
  pm.expect(String(bodyJson().data.activeAIModel._id)).to.eql(String(readVar("modelId")));
});
`,
      }),
      request("Business AI Selection Requires Admin", "GET", "{{BASE_URL}}/api/business-ai/selection", {
        token: "agentToken",
        tests: expectStatus([403]) + expectSuccess(false),
      }),
    ]),

    folder("04 - Customer Chat", [
      folder("Happy Path", [
        request("Create Chat Ticket", "POST", "{{BASE_URL}}/api/chat/message", {
          body: {
            businessId: "{{businessId}}",
            customerName: "Postman Customer",
            customerEmail: "{{chatCustomerEmail}}",
            subject: "Billing question from Postman",
            message: "I need help understanding a billing charge and would like an agent to review it.",
            priority: "high",
            category: "billing",
          },
          tests:
            expectStatus([200, 201]) +
            expectSuccess(true) +
            `
const data = bodyJson().data;
const ticket = data.ticket || {};
writeVar("ticketId", ticket._id);
writeVar("conversationId", ticket._id);
writeVar("customerMessageId", data.message && data.message._id);
pm.test("chat response includes ticket and reply", function () {
  pm.expect(data.reply).to.be.a("string").and.not.empty;
  pm.expect(ticket._id).to.be.a("string").and.not.empty;
  pm.expect(String(ticket.businessId)).to.eql(String(readVar("businessId")));
});
`,
        }),
        request("Continue Existing Conversation", "POST", "{{BASE_URL}}/api/chat/message", {
          body: {
            businessId: "{{businessId}}",
            conversationId: "{{conversationId}}",
            customerName: "Postman Customer",
            customerEmail: "{{chatCustomerEmail}}",
            message: "Here is one more detail on the same issue.",
          },
          tests:
            expectStatus([200, 201]) +
            expectSuccess(true) +
            `
pm.test("conversation continuation returns a ticket", function () {
  pm.expect(bodyJson().data.ticket._id).to.be.a("string").and.not.empty;
});
`,
        }),
      ]),
      folder("Negative Tests", [
        request("Chat Missing Message", "POST", "{{BASE_URL}}/api/chat/message", {
          body: {
            businessId: "{{businessId}}",
          },
          tests: expectStatus([400]) + expectSuccess(false),
        }),
        request("Chat Invalid Business ID Format", "POST", "{{BASE_URL}}/api/chat/message", {
          body: {
            businessId: "not-a-mongo-id",
            message: "Hello",
          },
          tests: expectStatus([400]) + expectSuccess(false),
        }),
        request("Chat Nonexistent Business", "POST", "{{BASE_URL}}/api/chat/message", {
          body: {
            businessId: "000000000000000000000000",
            message: "Hello",
          },
          tests: expectStatus([404]) + expectSuccess(false),
        }),
      ]),
    ]),

    folder("05 - Agent Tickets", [
      folder("Read APIs", [
        request("Get Agent Me", "GET", "{{BASE_URL}}/api/v1/agents/me", {
          token: "agentToken",
          tests:
            expectStatus([200]) +
            expectSuccess(true) +
            `
pm.test("agent me has business context", function () {
  pm.expect(String(bodyJson().data.businessId)).to.eql(String(readVar("businessId")));
});
`,
        }),
        request("List Agent Tickets", "GET", "{{BASE_URL}}/api/v1/agents/tickets", {
          token: "agentToken",
          tests:
            expectStatus([200]) +
            expectSuccess(true) +
            `
const data = bodyJson().data;
if (!readVar("ticketId") && data.data && data.data.length) {
  writeVar("ticketId", data.data[0]._id);
}
pm.test("paginated ticket shape returned", function () {
  pm.expect(data).to.have.property("data");
  pm.expect(data).to.have.property("total");
  pm.expect(data).to.have.property("page");
  pm.expect(data).to.have.property("totalPages");
});
`,
        }),
        request("List Tickets Filtered By Status", "GET", "{{BASE_URL}}/api/v1/agents/tickets?status=open", {
          token: "agentToken",
          tests:
            expectStatus([200]) +
            expectSuccess(true) +
            `
pm.test("all returned tickets are open", function () {
  (bodyJson().data.data || []).forEach((ticket) => pm.expect(ticket.status).to.eql("open"));
});
`,
        }),
        request("List Tickets Filtered By Priority", "GET", "{{BASE_URL}}/api/v1/agents/tickets?priority=High", {
          token: "agentToken",
          tests:
            expectStatus([200]) +
            expectSuccess(true) +
            `
pm.test("all returned tickets are high priority", function () {
  (bodyJson().data.data || []).forEach((ticket) => pm.expect(ticket.priority).to.eql("High"));
});
`,
        }),
        request("List Tickets With Pagination", "GET", "{{BASE_URL}}/api/v1/agents/tickets?page=1&limit=5", {
          token: "agentToken",
          tests:
            expectStatus([200]) +
            expectSuccess(true) +
            `
pm.test("pagination metadata is correct", function () {
  const data = bodyJson().data;
  pm.expect(data.page).to.eql(1);
  pm.expect(data.data.length).to.be.at.most(5);
});
`,
        }),
        request("Get Ticket Detail", "GET", "{{BASE_URL}}/api/v1/agents/tickets/{{ticketId}}", {
          token: "agentToken",
          tests:
            expectStatus([200]) +
            expectSuccess(true) +
            `
pm.test("ticket detail contains messages", function () {
  const data = bodyJson().data;
  pm.expect(data.ticket._id).to.eql(readVar("ticketId"));
  pm.expect(data.messages).to.be.an("array");
});
`,
        }),
      ]),
      folder("Mutations", [
        request("Assign Ticket To Agent", "PATCH", "{{BASE_URL}}/api/v1/agents/tickets/{{ticketId}}/assign", {
          token: "adminToken",
          body: {
            agentId: "{{agentId}}",
          },
          tests:
            expectStatus([200]) +
            expectSuccess(true) +
            `
pm.test("ticket assigned to agent", function () {
  pm.expect(String(bodyJson().data.assignedAgent)).to.eql(String(readVar("agentId")));
});
`,
        }),
        request("Agent Add Message", "POST", "{{BASE_URL}}/api/v1/agents/tickets/{{ticketId}}/messages", {
          token: "agentToken",
          body: {
            content: "Thanks for the details. I am checking this for you.",
          },
          tests:
            expectStatus([201]) +
            expectSuccess(true) +
            `
pm.test("agent message created", function () {
  pm.expect(bodyJson().data.senderType).to.eql("agent");
});
`,
        }),
        request("Update Ticket Status To Pending", "PATCH", "{{BASE_URL}}/api/v1/agents/tickets/{{ticketId}}/status", {
          token: "agentToken",
          body: {
            status: "pending",
          },
          tests:
            expectStatus([200]) +
            expectSuccess(true) +
            `
pm.test("ticket is pending", function () {
  pm.expect(bodyJson().data.status).to.eql("pending");
});
`,
        }),
        request("Update Ticket Status To Resolved", "PATCH", "{{BASE_URL}}/api/v1/agents/tickets/{{ticketId}}/status", {
          token: "agentToken",
          body: {
            status: "resolved",
          },
          tests:
            expectStatus([200]) +
            expectSuccess(true) +
            `
pm.test("ticket is resolved", function () {
  pm.expect(bodyJson().data.status).to.eql("resolved");
});
`,
        }),
      ]),
      folder("Negative And Isolation Tests", [
        request("Invalid Ticket Status", "PATCH", "{{BASE_URL}}/api/v1/agents/tickets/{{ticketId}}/status", {
          token: "agentToken",
          body: {
            status: "done",
          },
          tests: expectStatus([400]) + expectSuccess(false),
        }),
        request("Assign Ticket Requires Admin", "PATCH", "{{BASE_URL}}/api/v1/agents/tickets/{{ticketId}}/assign", {
          token: "agentToken",
          body: {
            agentId: "{{agentId}}",
          },
          tests: expectStatus([403]) + expectSuccess(false),
        }),
        request("Agent Tickets Missing Token", "GET", "{{BASE_URL}}/api/v1/agents/tickets", {
          tests: expectStatus([401]) + expectSuccess(false),
        }),
      ]),
    ]),

    folder("06 - Feedback", [
      folder("Happy Path", [
        request("Generate Feedback Token", "POST", "{{BASE_URL}}/api/feedback/tickets/{{ticketId}}/token", {
          token: "agentToken",
          body: {
            expiresInDays: 14,
          },
          tests:
            expectStatus([201]) +
            expectSuccess(true) +
            `
const data = bodyJson().data;
writeVar("feedbackToken", data.token);
pm.test("feedback token is returned", function () {
  pm.expect(data.token).to.be.a("string").and.not.empty;
  pm.expect(data.submitUrl).to.include(data.token);
});
`,
        }),
        request("Submit Feedback", "POST", "{{BASE_URL}}/api/feedback/{{feedbackToken}}", {
          body: {
            rating: 5,
            resolved: true,
            comment: "Postman automated feedback submission",
          },
          tests:
            expectStatus([201]) +
            expectSuccess(true) +
            `
pm.test("feedback attached to ticket", function () {
  const feedback = bodyJson().data.feedback;
  pm.expect(feedback.rating).to.eql(5);
  pm.expect(feedback.resolved).to.eql(true);
});
`,
        }),
        request("Get Feedback Analytics", "GET", "{{BASE_URL}}/api/feedback/analytics", {
          token: "adminToken",
          tests:
            expectStatus([200]) +
            expectSuccess(true) +
            `
pm.test("analytics overview returned", function () {
  const data = bodyJson().data;
  pm.expect(data).to.have.property("overview");
  pm.expect(data.overview).to.have.property("totalFeedback");
});
`,
        }),
        request("Get Feedback Analytics With Filters", "GET", "{{BASE_URL}}/api/feedback/analytics?feedbackType=agent&category=billing", {
          token: "adminToken",
          tests: expectStatus([200]) + expectSuccess(true),
        }),
      ]),
      folder("Negative Tests", [
        request("Submit Feedback Invalid Token", "POST", "{{BASE_URL}}/api/feedback/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", {
          body: {
            rating: 4,
            resolved: true,
            comment: "Invalid token case",
          },
          tests: expectStatus([404]) + expectSuccess(false),
        }),
        request("Feedback Analytics Requires Admin", "GET", "{{BASE_URL}}/api/feedback/analytics", {
          token: "agentToken",
          tests: expectStatus([403]) + expectSuccess(false),
        }),
      ]),
    ]),

    folder("07 - Cleanup", [
      request("Delete Created AI Model", "DELETE", "{{BASE_URL}}/api/v1/superadmin/models/{{modelId}}", {
        token: "superadminToken",
        tests: expectStatus([200]) + expectSuccess(true),
      }),
    ]),
  ],
};

const environment = {
  id: "supportflow-ai-current-branch-local",
  name: "SupportFlow AI - Current Branch Local",
  values: [
    { key: "BASE_URL", value: "http://localhost:3000", type: "default", enabled: true },
    { key: "MAX_RESPONSE_MS", value: "2000", type: "default", enabled: true },
    { key: "RUN_OPTIONAL_MUTATION_TESTS", value: "false", type: "default", enabled: true },
    { key: "superadminEmail", value: "", type: "default", enabled: true },
    { key: "superadminPassword", value: "", type: "secret", enabled: true },
    { key: "adminEmail", value: "", type: "default", enabled: true },
    { key: "adminPassword", value: "", type: "secret", enabled: true },
    { key: "agentEmail", value: "", type: "default", enabled: true },
    { key: "agentPassword", value: "", type: "secret", enabled: true },
    { key: "businessId", value: "", type: "default", enabled: true },
    { key: "agentId", value: "", type: "default", enabled: true },
    { key: "ordinaryUserEmail", value: "", type: "default", enabled: true },
    { key: "ordinaryUsername", value: "", type: "default", enabled: true },
    { key: "ordinaryUserPassword", value: "", type: "secret", enabled: true },
    { key: "ordinaryUserToken", value: "", type: "secret", enabled: true },
    { key: "ordinaryUserRefreshToken", value: "", type: "secret", enabled: true },
    { key: "superadminToken", value: "", type: "secret", enabled: true },
    { key: "adminToken", value: "", type: "secret", enabled: true },
    { key: "agentToken", value: "", type: "secret", enabled: true },
    { key: "ticketId", value: "", type: "default", enabled: true },
    { key: "conversationId", value: "", type: "default", enabled: true },
    { key: "modelId", value: "", type: "default", enabled: true },
    { key: "feedbackToken", value: "", type: "secret", enabled: true },
  ],
  _postman_variable_scope: "environment",
  _postman_exported_using: "Codex",
};

writeFileSync(collectionOutputPath, JSON.stringify(collection, null, 2) + "\n");
writeFileSync(environmentOutputPath, JSON.stringify(environment, null, 2) + "\n");
