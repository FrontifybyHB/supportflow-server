# 🤖 SupportFlow AI

> AI-Powered Customer Support Platform — Built in 48 hours for Sheryians Coding School Hackathon 2026

SupportFlow AI automates customer support responses using GPT-4o-mini or Gemini, with intelligent handoff to human agents when confidence is low. It provides real-time ticket management, multi-tenant isolation, and an embeddable chat widget.

---

## 🚀 Live Demo

- **Backend API:** `https://supportflow-api.onrender.com/api/health`
- **Frontend Dashboard:** `https://supportflow.vercel.app`
- **Customer Chat Widget:** Embedded on any site via script tag

---

## ✨ Features

| Module | Capabilities |
|--------|--------------|
| **AI Answer Engine** | Responds to customer queries using your knowledge base. Falls back to ticket creation when confidence < 75%. |
| **Multi-Tenant Isolation** | Each business has its own users, customers, tickets, and knowledge base. No cross-tenant data leaks. |
| **Agent Dashboard** | Real-time ticket list with status, priority, sentiment. Update status, assign agents, and use AI-suggested replies. |
| **Admin Panel** | Manage agents, knowledge base entries, and view analytics (ticket volume, resolution times). |
| **Live Chat Widget** | Embeddable React component for your website. Connects via REST and Socket.io for real-time agent replies. |
| **Real-Time Events** | `ticket_created`, `ticket_updated`, `new_message` via Socket.io. |
| **AI Provider Strategy** | Switch between OpenAI and Gemini via one environment variable. |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Node.js + Express + Socket.io |
| **Database** | MongoDB Atlas (Mongoose ODM) |
| **Authentication** | JWT (HS256) + bcrypt |
| **AI** | OpenAI GPT-4o-mini / Google Gemini 1.5 Flash |
| **Frontend (Admin/Agent)** | React 18 + React Router 6 + Axios |
| **Real-Time** | Socket.io (client & server) |
| **Deployment** | Render (backend) + Vercel (frontend) |

---