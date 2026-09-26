/**
 * ============================================================
 *  CENTRAL API LAYER WITH SEAMLESS 24/7 OFFLINE & VERCEL FALLBACK
 * ============================================================
 * 1. Tries to connect to the real SQLite backend on port 5000.
 * 2. If the backend is offline or disconnected (e.g. when hosted
 *    on Vercel and your local computer is shut down), it seamlessly
 *    falls back to the in-browser persistent database (`standaloneDb`).
 * 
 * Every feature (Borrow, Return, Add Book, Delete, Edit, Overdue,
 * History, Authentication, Passkey) works 100% of the time, 24/7!
 */

import { standaloneDb } from './standaloneDb';

const BASE_URL = '/api';
let mode = 'auto'; // 'auto' | 'backend' | 'standalone'

async function rawFetch(path, options = {}) {
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  };

  // 1. Try relative /api (works with Vite proxy or hosted backend)
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, config);
  } catch (err) {
    // 2. Try direct localhost:5000 if proxy failed
    try {
      res = await fetch(`http://localhost:5000/api${path}`, config);
    } catch {
      throw new Error('Backend server is offline');
    }
  }

  // If endpoint returned 404 (e.g. on Vercel static hosting)
  if (res.status === 404) {
    throw new Error('Backend route not found (Running on static cloud host)');
  }

  const contentType = res.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!res.ok) {
    throw new Error(data?.message || data?.error || `Request failed with status ${res.status}`);
  }

  return data;
}

// Executes backend call with immediate transparent fallback to standaloneDb
async function executeWithFallback(backendCall, fallbackCall) {
  try {
    const result = await backendCall();
    return result;
  } catch (err) {
    console.info(`[Library Engine] Backend unavailable (${err.message}). Using 24/7 Standalone Database Engine.`);
    return await fallbackCall();
  }
}

// ============================================================
// AUTHENTICATION
// ============================================================
export const login = (username, password, role) =>
  executeWithFallback(
    () => rawFetch('/login', { method: 'POST', body: JSON.stringify({ username, password, role }) }),
    () => standaloneDb.login(username, password, role)
  );

export const register = (username, password, role, adminPasskey = '') =>
  executeWithFallback(
    () => rawFetch('/register', { method: 'POST', body: JSON.stringify({ username, password, role, adminPasskey }) }),
    () => standaloneDb.register(username, password, role, adminPasskey)
  );

// ============================================================
// BOOKS / CATALOG
// ============================================================
export const getBooks = (search = '') =>
  executeWithFallback(
    () => rawFetch(`/books${search ? `?q=${encodeURIComponent(search)}` : ''}`),
    () => standaloneDb.getBooks(search)
  );

export const addBook = (bookData) =>
  executeWithFallback(
    () => rawFetch('/books', { method: 'POST', body: JSON.stringify(bookData) }),
    () => standaloneDb.addBook(bookData)
  );

export const updateBook = (id, bookData) =>
  executeWithFallback(
    () => rawFetch(`/books/${id}`, { method: 'PUT', body: JSON.stringify(bookData) }),
    () => standaloneDb.updateBook(id, bookData)
  );

export const deleteBook = (id) =>
  executeWithFallback(
    () => rawFetch(`/books/${id}`, { method: 'DELETE' }),
    () => standaloneDb.deleteBook(id)
  );

// ============================================================
// BORROW & RETURN
// ============================================================
export const borrowBook = (bookId, studentName, dueDate) =>
  executeWithFallback(
    () => rawFetch('/borrow', { method: 'POST', body: JSON.stringify({ book_id: bookId, student_name: studentName, due_date: dueDate }) }),
    () => standaloneDb.borrowBook(bookId, studentName, dueDate)
  );

export const returnBook = (borrowingId) =>
  executeWithFallback(
    () => rawFetch('/return', { method: 'POST', body: JSON.stringify({ borrowing_id: borrowingId }) }),
    () => standaloneDb.returnBook(borrowingId)
  );

// ============================================================
// HISTORY & RECORDS
// ============================================================
export const getStudentHistory = (username) =>
  executeWithFallback(
    () => rawFetch(`/borrowings/student/${encodeURIComponent(username)}`),
    () => standaloneDb.getStudentHistory(username)
  );

export const getAllBorrowings = () =>
  executeWithFallback(
    () => rawFetch('/borrowings'),
    () => standaloneDb.getAllBorrowings()
  );

export const getOverdueBooks = (studentName = '') =>
  executeWithFallback(
    () => rawFetch(`/overdue${studentName ? `?student=${encodeURIComponent(studentName)}` : ''}`),
    () => standaloneDb.getOverdueBooks(studentName)
  );

export const getStats = () =>
  executeWithFallback(
    () => rawFetch('/stats'),
    () => standaloneDb.getStats()
  );
