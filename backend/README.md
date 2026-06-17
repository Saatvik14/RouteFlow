# Backend

Backend service for the platform.

## Tech Stack

* Node.js
* Express.js
* Supabase
* Axios
* Nodemon

---

# Project Structure

```text
backend/
│
├── src/
│   │
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── sockets/
│   ├── utils/
│   │
│   ├── app.js
│   └── server.js
│
├── package.json
└── .env
```

---

# Prerequisites

Install the following before starting:

* Node.js (LTS)
* npm

---

# Backend Setup

## 1. Clone Repository

```bash
git clone https://github.com/Saatvik14/RouteFlow.git
```

---

## 2. Go To Backend Folder

```bash
cd RouteFlow/backend
```

---

## 3. Install Dependencies

```bash
npm install
```

---

# Environment Variables

Create a `.env` file inside the backend folder.

## Example `.env`

```env
PORT=5000

SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key

OPTIMIZATION_API_URL=http://localhost:8989/optimize
```

---

# Running The Backend

## Development Mode

```bash
npm run dev
```

The backend will start on:

```text
http://localhost:5000
```

Nodemon is enabled, so the server automatically reloads whenever files are changed.

---

## Production Mode

```bash
npm start
```

---

# Available Scripts

| Command     | Description                 |
| ----------- | --------------------------- |
| npm run dev | Starts backend with nodemon |
| npm start   | Starts backend normally     |

---

# API Base URL

```text
http://localhost:5000/api
```

---

# Current Features

* Express server setup
* Route optimization API integration
* Supabase integration
* REST API structure
* Modular backend architecture

---

# Future Features

* Authentication
* Saved routes
* Subscription plans
* Fleet management
* Live tracking
* Notifications
* Admin dashboard

---

# Author

Saatvik Rawat