# 📚 Smart Library Management System (Student & Admin Portals)

A modern, full-stack **Smart Library Management System** featuring dedicated **Student & Admin Portals**, automated due-date and overdue tracking, real-time book inventory management, role-based authentication, and a secured administrative gate with passkey authorization.

- **GitHub Repository**: [https://github.com/Logendra-07/Library_management](https://github.com/Logendra-07/Library_management)
- **Live Public URL (Mobile & Desktop)**: [https://430c1122e9e27c.lhr.life](https://430c1122e9e27c.lhr.life)
- **Local Application URL**: `http://localhost:5173/`
- **Backend API URL**: `http://localhost:5000/api`

---

## 📑 Table of Contents

1. [System Overview & Architecture](#-system-overview--architecture)
2. [Demo Credentials & Access Control](#-demo-credentials--access-control)
3. [Portal Features](#-portal-features)
   - [Student Portal](#1-student-portal)
   - [Librarian / Admin Portal](#2-librarian--admin-portal)
4. [Security & Role-Based Access Control](#-security--role-based-access-control)
5. [Automatic Overdue Tracking Engine](#-automatic-overdue-tracking-engine)
6. [Database Schema (SQLite)](#-database-schema-sqlite)
7. [API Endpoints Reference](#-api-endpoints-reference)
8. [Installation & Setup Guide](#-installation--setup-guide)
9. [Presentation & Project Slides Summary](#-presentation--project-slides-summary)

---

## 🏛 System Overview & Architecture

The application is built as a clean, decoupled client-server architecture:

```
┌────────────────────────────────────────────────────────┐
│           React 18 + Vite Frontend (:5173)             │
│  ┌───────────────────────┐   ┌──────────────────────┐  │
│  │    Student Portal     │   │     Admin Portal     │  │
│  │ 🔎 Catalog Search     │   │ 📊 KPI Dashboard     │  │
│  │ 📖 Borrow & Return    │   │ ➕ Add / Edit Book   │  │
│  │ 📋 History Audit      │   │ 🗑️ Safe Delete        │  │
│  │ ⚠️ Overdue Alerts     │   │ 👥 Master Records    │  │
│  └───────────────────────┘   └──────────────────────┘  │
└──────────────────────────┬─────────────────────────────┘
                           │ (REST API via /api)
┌──────────────────────────▼─────────────────────────────┐
│             Node.js + Express Backend (:5000)          │
│  • Scrypt Password Hashing & Role Authentication       │
│  • Admin Passkey Gate (ADMIN2026)                      │
│  • Real-time Inventory & Stock Calculation             │
│  • Automated Overdue Daemon (BORROWED → OVERDUE)       │
└──────────────────────────┬─────────────────────────────┘
                           │ (SQLite3)
┌──────────────────────────▼─────────────────────────────┐
│                  SQLite3 Database                      │
│         books  |  borrowings  |  users                 │
└────────────────────────────────────────────────────────┘
```

---

## 🔑 Demo Credentials & Access Control

| Role | Username | Password | Special Requirements | Access Level |
|---|---|---|---|---|
| **Student** | `logu` | *(existing)* or create any | Open registration | Student Portal (Search, Borrow, Return, History, Overdue alerts) |
| **Admin** | `khaith` | *(existing)* | Requires Admin Passkey | Full Librarian Console (Inventory, Add/Edit books, All records, Overdue) |

> 🛡️ **Default Admin Authorization Passkey**: `ADMIN2026`  
> Anyone can register as a student, but only authorized staff with the passkey can register as an Administrator.

---

## 🌟 Portal Features

### 1. Student Portal

1. **🔎 Search Catalog**
   - Live, debounced search across Book Title, Author, Category, and ISBN.
   - Category filtering pills (All, Computer Science, Fiction, Science, History, etc.).
   - Visual stock availability progress bars (`Available / Total Copies`).
   - `Available` (green) and `Out of Stock` (red) status badges.
   - Quick "Borrow Book" modal with configurable or 14-day default due date.

2. **📖 Borrow & Return Desk**
   - **Active Loans Section**: Lists all books currently in possession with due-date countdowns.
   - **Instant Return**: Click "Return Book" to immediately restore inventory count and set status to `Returned`.
   - **Available Books Section**: Browse in-stock books and check them out with a date picker.

3. **📋 Borrowing History**
   - Complete personal audit trail: Book Name, Author, Borrowed Date, Due Date, Returned Date, and Status.
   - Filter records by status: `All`, `Borrowed`, `Overdue`, `Returned`.
   - High-level metric summary chips for quick accountability.

4. **⚠️ Overdue Tracking & Alerts**
   - Real-time comparison between today's date and due dates.
   - Automatically tags loans with `OVERDUE` badge and displays days late (e.g. `⚠️ 5 days late`).
   - One-click "Return Overdue Book Now" button to clear account standing.
   - Cheerful banner when account has 0 overdue obligations.

---

### 2. Librarian / Admin Portal

1. **📊 Inventory Dashboard**
   - Live KPI Stat Cards:
     - 📚 **Unique Titles** count
     - 📦 **Total Volumes** in library
     - 🟢 **Available Copies** on shelves
     - 📖 **Currently Borrowed** copies
     - ⚠️ **Overdue Loans** count
   - Quick stock availability filters: `All Books`, `In Stock`, `Low Stock (≤2)`, `Out of Stock`.

2. **➕ Add Books to Catalog**
   - Form fields: Title, Author, Category / Genre, ISBN, Total Copies.
   - Auto-initializes available copies to match total copies.

3. **✏️ Update Book Details & Copies**
   - Edit modal allowing title, author, category, ISBN, and stock modifications.
   - **Safe constraint**: Prevents reducing total copies below currently borrowed copies.

4. **🗑️ Remove Books**
   - Safe deletion safeguard: Blocks deletion if any copies are actively borrowed.

5. **👥 View All Borrowing Records**
   - Global view of every student loan across the institution.
   - Search by student name or book title; filter by `Borrowed`, `Overdue`, `Returned`.
   - Administrative override to mark any book returned on behalf of a student.

6. **⚠️ Overdue Books Console**
   - Filtered view of all past-due loans across all students.
   - Displays student name, book title, due date, and exact overdue duration.

---

## 🔒 Security & Role-Based Access Control

1. **Cryptographic Password Hashing**: Passwords are saved with unique 16-byte random salts using Node's `crypto.scryptSync(password, salt, 64)`. Plaintext passwords are never stored.
2. **Admin Passkey Gate**: Non-admin users cannot elevate privileges during registration without supplying the valid server passkey (`ADMIN2026`). Attempts return `HTTP 403 Forbidden`.
3. **Session Persistence**: Authentication state is maintained via `localStorage` with role verification.

---

## ⚡ Automatic Overdue Tracking Engine

The system does not rely on manual human intervention to detect overdue books:
- An internal daemon checks SQLite records:
  ```sql
  UPDATE borrowings
  SET status = 'Overdue'
  WHERE status = 'Borrowed' AND due_date < ?
  ```
- **Execution triggers**:
  - Automatically runs when the backend server boots.
  - Automatically executes every 60 seconds on a background timer.
  - Automatically executes before querying `/api/borrowings`, `/api/history/:student`, or `/api/overdue`.

---

## 💾 Database Schema (SQLite)

### `books`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique book ID |
| `title` | TEXT | NOT NULL | Title of the book |
| `author` | TEXT | NOT NULL | Author of the book |
| `category`| TEXT | | Genre or classification |
| `isbn` | TEXT | | ISBN number |
| `total_copies` | INTEGER | DEFAULT 1 | Total owned copies |
| `available_copies` | INTEGER | DEFAULT 1 | Current shelf copies |

### `borrowings`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique transaction ID |
| `book_id` | INTEGER | NOT NULL, FK(books.id) | Linked book |
| `student_name`| TEXT | NOT NULL | Borrower username |
| `borrow_date`| TEXT | NOT NULL | Date borrowed (YYYY-MM-DD) |
| `due_date` | TEXT | NOT NULL | Due date (YYYY-MM-DD) |
| `return_date`| TEXT | | Date returned (or NULL) |
| `status` | TEXT | DEFAULT 'Borrowed' | 'Borrowed' \| 'Overdue' \| 'Returned' |

### `users`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | User ID |
| `username` | TEXT | UNIQUE NOT NULL | Username |
| `password` | TEXT | NOT NULL | `salt:hash` (scrypt 64-byte) |
| `role` | TEXT | NOT NULL | `'student'` or `'admin'` |
| `created_at`| TEXT | DEFAULT CURRENT_TIMESTAMP | Registration timestamp |

---

## 📡 API Endpoints Reference

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/register` | Register user (requires `adminPasskey` if role is admin) | Public |
| `POST` | `/api/login` | Authenticate user & return role session | Public |
| `GET` | `/api/books` | Get all books (supports `?q=...` search) | Student & Admin |
| `POST` | `/api/books` | Add new book to inventory | Admin |
| `PUT` | `/api/books/:id` | Update book metadata and copies | Admin |
| `DELETE`| `/api/books/:id` | Remove book (blocked if active loans exist) | Admin |
| `POST` | `/api/borrow` | Borrow book (decrements copies) | Student |
| `POST` | `/api/return` | Return book (increments copies, sets return_date) | Student & Admin |
| `GET` | `/api/borrowings` | Retrieve all borrowing records across all students | Admin |
| `GET` | `/api/borrowings/student/:user` | Retrieve borrowing history for a specific student | Student |
| `GET` | `/api/overdue` | Retrieve overdue loans (optional `?student=...`) | Student & Admin |
| `GET` | `/api/stats` | Retrieve KPI metrics for inventory & loans | Admin |

---

## 🚀 Installation & Setup Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- npm

### 1. Start Backend (Port 5000)
```bash
cd backend
npm install
node server.js
```
*Backend runs on `http://localhost:5000` with automated overdue detection.*

### 2. Start Frontend (Port 5173)
```bash
cd ../frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173` with live hot-reloading.*

---

## 📽️ Presentation & Project Slides Summary

### Slide 1: Problem Statement & Objectives
- Traditional library management often suffers from desynchronized copy tracking, lack of student self-service, and delayed overdue penalty tracking.
- **Goal**: Build a modern, unified application supporting real-time catalog search, self-service borrow/return, automated overdue status transitions, and a secure administration console.

### Slide 2: Key Innovations
- **Auto-Overdue Sync Engine**: Zero human effort required to flag overdue books. The system transitions status dynamically based on ISO date comparisons.
- **Admin Passkey Gate**: Prevents privilege escalation while keeping student onboarding seamless.
- **Real-Time Inventory Safeguards**: Prevents deleting books with active loans and prevents lowering total stock below active borrowings.

### Slide 3: Technology Stack
- **Frontend**: React 18, Vite, Custom CSS Design System, Responsive Flex/Grid Layouts.
- **Backend**: Node.js, Express REST API, Crypto (Scrypt).
- **Database**: SQLite3 (ACID-compliant local storage).

### Slide 4: Conclusion & Future Scope
- The system achieves 100% test pass rates across borrowing, returning, overdue calculations, and security gates.
- Future enhancements include email reminder webhooks and barcode/RFID scanner integrations.
