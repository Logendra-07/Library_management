/**
 * ============================================================
 *  CENTRAL API LAYER - SMART LIBRARY MANAGEMENT SYSTEM
 * ============================================================
 * Connects frontend directly to the SQLite backend on port 5000.
 */

const BASE_URL = '/api';

async function request(path, options = {}) {
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  };

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, config);
  } catch (netErr) {
    // If running standalone or proxy fails, fallback to direct port 5000
    try {
      res = await fetch(`http://localhost:5000/api${path}`, config);
    } catch {
      throw new Error("Unable to connect to library backend. Please ensure backend is running on port 5000.");
    }
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
    const errorMessage = data?.message || data?.error || `Request failed with status ${res.status}`;
    throw new Error(errorMessage);
  }

  return data;
}

// ============================================================
// AUTHENTICATION & ACCESS CONTROL
// ============================================================
export const login = (username, password, role) =>
  request('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password, role })
  });

export const register = (username, password, role, adminPasskey = '') =>
  request('/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, role, adminPasskey })
  });

// ============================================================
// BOOKS / CATALOG MANAGEMENT
// ============================================================
export const getBooks = (search = '') => {
  const query = search ? `?q=${encodeURIComponent(search)}` : '';
  return request(`/books${query}`);
};

export const addBook = (bookData) =>
  request('/books', {
    method: 'POST',
    body: JSON.stringify(bookData)
  });

export const updateBook = (id, bookData) =>
  request(`/books/${id}`, {
    method: 'PUT',
    body: JSON.stringify(bookData)
  });

export const deleteBook = (id) =>
  request(`/books/${id}`, {
    method: 'DELETE'
  });

// ============================================================
// BORROW & RETURN OPERATIONS
// ============================================================
export const borrowBook = (bookId, studentName, dueDate) =>
  request('/borrow', {
    method: 'POST',
    body: JSON.stringify({
      book_id: bookId,
      student_name: studentName,
      due_date: dueDate
    })
  });

export const returnBook = (borrowingId) =>
  request('/return', {
    method: 'POST',
    body: JSON.stringify({
      borrowing_id: borrowingId
    })
  });

// ============================================================
// BORROWING HISTORY & RECORDS
// ============================================================
export const getStudentHistory = (username) =>
  request(`/borrowings/student/${encodeURIComponent(username)}`);

export const getAllBorrowings = () =>
  request('/borrowings');

export const getOverdueBooks = (studentName = '') => {
  const query = studentName ? `?student=${encodeURIComponent(studentName)}` : '';
  return request(`/overdue${query}`);
};

export const getStats = () =>
  request('/stats');

export const getConfig = () =>
  request('/config');
