# Library Management System — Full Stack

A complete, working Library Management System: **Student Portal** +
**Librarian/Admin Portal**, both in one single-page web app, backed by
a real Express + SQLite API.

```
library-app/
  backend/     <- Express + SQLite API (port 5000)
  frontend/    <- React app (Student Portal + Admin Portal)
```

## Quickest way to run it (one page, one server)

This builds the React app and has the backend serve it directly, so
you open **one URL** and both portals live there.

```bash
# 1) Build the frontend
cd frontend
npm install
npm run build

# 2) Start the backend (also serves the built frontend)
cd ../backend
npm install
npm start
```

Now open **http://localhost:5000** — that's it. Both the Student
Portal and Admin Portal are on that one page, switchable with the
toggle at the top.

The database (`backend/library.db`) is created automatically on first
run, pre-seeded with 8 sample books and a few demo borrowing records
(one active loan, one overdue, one returned) so there's data to look
at immediately.

## Active development (auto-reload frontend)

If you're editing the React code and want instant reload instead of
rebuilding every time:

```bash
# Terminal 1
cd backend
npm install
npm start          # API on http://localhost:5000

# Terminal 2
cd frontend
npm install
npm run dev         # UI on http://localhost:5173, proxies /api to :5000
```

Use `http://localhost:5173` while developing. Switch back to the
"build + single URL" method above when you're done.

## What's implemented

**Student Portal**
- 🔎 Search Catalog — search by title/author, filter by category, live Available/Out of Stock status
- 📖 Borrow & Return — borrow available books, return active loans, copy counts update instantly
- 📋 Borrowing History — every past and current loan with borrowed/due/returned dates
- ⚠️ Overdue Tracking — books past their due date, flagged automatically by the backend

**Librarian/Admin Portal**
- 📊 Inventory Dashboard — add, edit, and remove books; live catalog table
- 👥 Borrowing Records — every loan across every student, filterable by status
- ⚠️ Overdue Books — all overdue loans with days-overdue count

**Backend behavior**
- Borrowing decrements `available_copies`; returning increments it
- Loan period is 14 days from the borrow date (edit `LOAN_PERIOD_DAYS` in `backend/server.js`)
- Any `BORROWED` record past its due date is automatically flipped to `OVERDUE` the next time any record-reading endpoint is called — no manual step needed
- A book with active loans can't be deleted (prevents orphaned records)

## Student identity (no login yet)

The Student Portal currently acts as a hardcoded demo student:
```js
const CURRENT_STUDENT = { id: 'student-1', name: 'Demo Student' };
```
found in `frontend/src/components/student/BorrowReturn.jsx`,
`BorrowingHistory.jsx`, and `OverdueTracking.jsx`. Add real login
whenever you're ready and swap this for the logged-in user.

## API reference

See `backend/server.js` for the full implementation, or
`frontend/src/api.js` for how the frontend calls it — they match
exactly out of the box.

| Method | Path                     | Purpose                          |
|--------|--------------------------|-----------------------------------|
| GET    | `/api/books`             | list all books                    |
| POST   | `/api/books`             | add a book                        |
| PUT    | `/api/books/:id`         | update a book                     |
| DELETE | `/api/books/:id`         | remove a book (blocked if active loans exist) |
| POST   | `/api/borrow`            | borrow a book                     |
| POST   | `/api/return`            | return a book                     |
| GET    | `/api/history/:studentId`| one student's borrowing history   |
| GET    | `/api/records`           | all borrowing records (admin)     |
| GET    | `/api/overdue`           | currently overdue records         |

## Resetting the demo data

Stop the server and delete the database file, then restart:
```bash
rm backend/library.db backend/library.db-wal backend/library.db-shm
npm start
```
It will be recreated and re-seeded automatically.
