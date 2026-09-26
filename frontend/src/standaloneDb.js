/**
 * ============================================================
 * STANDALONE PERSISTENT DATABASE ENGINE (Local / Vercel 24/7)
 * ============================================================
 * Mirrors the exact SQLite schema and business logic in the browser.
 * Ensures the app works 100% of the time on Vercel even when the
 * local computer / backend server is turned off.
 */

const STORAGE_KEY_BOOKS = 'library_db_books';
const STORAGE_KEY_BORROWINGS = 'library_db_borrowings';
const STORAGE_KEY_USERS = 'library_db_users';
const ADMIN_PASSKEY = 'ADMIN2026';

// Initial seed books
const SEED_BOOKS = [
  {
    id: 1,
    title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    author: 'Robert C. Martin',
    category: 'Computer Science',
    isbn: '978-0132350884',
    total_copies: 5,
    available_copies: 4
  },
  {
    id: 2,
    title: 'The Pragmatic Programmer: Your Journey To Mastery',
    author: 'David Thomas & Andrew Hunt',
    category: 'Computer Science',
    isbn: '978-0135957059',
    total_copies: 3,
    available_copies: 3
  },
  {
    id: 3,
    title: 'Design Patterns: Elements of Reusable Object-Oriented Software',
    author: 'Erich Gamma et al.',
    category: 'Computer Science',
    isbn: '978-0201633610',
    total_copies: 2,
    available_copies: 2
  },
  {
    id: 4,
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    category: 'Fiction',
    isbn: '978-0061120084',
    total_copies: 4,
    available_copies: 3
  },
  {
    id: 5,
    title: 'Sapiens: A Brief History of Humankind',
    author: 'Yuval Noah Harari',
    category: 'History',
    isbn: '978-0062316097',
    total_copies: 4,
    available_copies: 4
  },
  {
    id: 6,
    title: 'A Brief History of Time',
    author: 'Stephen Hawking',
    category: 'Science',
    isbn: '978-0553380163',
    total_copies: 6,
    available_copies: 5
  },
  {
    id: 7,
    title: 'Kakka Muttai',
    author: 'Vetrimaran',
    category: 'Education',
    isbn: '978-8129116123',
    total_copies: 10,
    available_copies: 9
  }
];

// Initial demo users
const SEED_USERS = [
  { id: 1, username: 'logu', password: 'password123', role: 'student' },
  { id: 2, username: 'khaith', password: 'password123', role: 'admin' },
  { id: 3, username: 'student', password: 'password123', role: 'student' },
  { id: 4, username: 'admin', password: 'password123', role: 'admin' }
];

// Calculate past and future dates for demo borrowings
function getDateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

const SEED_BORROWINGS = [
  {
    id: 1,
    book_id: 1,
    student_name: 'logu',
    borrow_date: getDateOffset(-4),
    due_date: getDateOffset(10),
    return_date: null,
    status: 'Borrowed'
  },
  {
    id: 2,
    book_id: 4,
    student_name: 'logu',
    borrow_date: getDateOffset(-20),
    due_date: getDateOffset(-6),
    return_date: null,
    status: 'Overdue'
  },
  {
    id: 3,
    book_id: 6,
    student_name: 'logu',
    borrow_date: getDateOffset(-30),
    due_date: getDateOffset(-16),
    return_date: getDateOffset(-17),
    status: 'Returned'
  }
];

// Read from localStorage with fallback to seeds
function getStorage(key, defaultData) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultData));
      return defaultData;
    }
    return JSON.parse(raw);
  } catch {
    return defaultData;
  }
}

function setStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error('Storage error:', err);
  }
}

// Automatic overdue updater
function autoUpdateOverdue() {
  const borrowings = getStorage(STORAGE_KEY_BORROWINGS, SEED_BORROWINGS);
  const today = new Date().toISOString().split('T')[0];
  let changed = false;

  borrowings.forEach((b) => {
    if (b.status === 'Borrowed' && b.due_date < today) {
      b.status = 'Overdue';
      changed = true;
    }
  });

  if (changed) {
    setStorage(STORAGE_KEY_BORROWINGS, borrowings);
  }
}

// Join borrowing with book details
function enrichBorrowing(borrowing, books) {
  const book = books.find((b) => b.id === Number(borrowing.book_id)) || {};
  return {
    ...borrowing,
    title: book.title || 'Unknown Title',
    author: book.author || 'Unknown Author',
    category: book.category || 'General',
    isbn: book.isbn || '',
    borrowed_date: borrowing.borrow_date,
    returned_date: borrowing.return_date
  };
}

// ============================================================
// EXPORTED STANDALONE DATABASE API
// ============================================================

export const standaloneDb = {
  // Authentication
  async login(username, password, role) {
    const users = getStorage(STORAGE_KEY_USERS, SEED_USERS);
    const user = users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.role === role
    );

    if (!user) {
      throw new Error(`Invalid credentials or no ${role} account found with that username.`);
    }

    return {
      message: 'Login successful (Offline Persistent Mode)',
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    };
  },

  async register(username, password, role, adminPasskey = '') {
    const users = getStorage(STORAGE_KEY_USERS, SEED_USERS);
    const cleanUser = username.trim();

    if (users.some((u) => u.username.toLowerCase() === cleanUser.toLowerCase())) {
      throw new Error('Username already exists. Please choose a different username.');
    }

    if (role === 'admin') {
      if (!adminPasskey) {
        throw new Error('Admin Passkey is required to register an administrative account.');
      }
      if (adminPasskey !== ADMIN_PASSKEY) {
        throw new Error('Invalid Admin Passkey. Access restricted to authorized library staff.');
      }
    }

    const newUser = {
      id: Date.now(),
      username: cleanUser,
      password: password,
      role: role,
      created_at: new Date().toISOString()
    };

    users.push(newUser);
    setStorage(STORAGE_KEY_USERS, users);

    return {
      message: 'Registration successful! You can now log in.',
      userId: newUser.id,
      role: newUser.role
    };
  },

  // Books
  async getBooks(search = '') {
    const books = getStorage(STORAGE_KEY_BOOKS, SEED_BOOKS);
    if (!search) return books;

    const q = search.trim().toLowerCase();
    return books.filter(
      (b) =>
        b.title?.toLowerCase().includes(q) ||
        b.author?.toLowerCase().includes(q) ||
        b.category?.toLowerCase().includes(q) ||
        b.isbn?.toLowerCase().includes(q)
    );
  },

  async addBook(bookData) {
    const books = getStorage(STORAGE_KEY_BOOKS, SEED_BOOKS);
    const total = Number(bookData.total_copies) || 1;

    const newBook = {
      id: Date.now(),
      title: bookData.title.trim(),
      author: bookData.author.trim(),
      category: (bookData.category || '').trim(),
      isbn: (bookData.isbn || '').trim(),
      total_copies: total,
      available_copies: total
    };

    books.unshift(newBook);
    setStorage(STORAGE_KEY_BOOKS, books);

    return {
      message: 'Book added successfully to library inventory',
      id: newBook.id,
      book: newBook
    };
  },

  async updateBook(id, bookData) {
    const books = getStorage(STORAGE_KEY_BOOKS, SEED_BOOKS);
    const idx = books.findIndex((b) => b.id === Number(id));
    if (idx === -1) throw new Error('Book not found in inventory.');

    const currentBook = books[idx];
    const total = Number(bookData.total_copies);
    const borrowed = (currentBook.total_copies ?? 0) - (currentBook.available_copies ?? 0);

    if (total < borrowed) {
      throw new Error(`Cannot set total copies below ${borrowed}. ${borrowed} copy/copies are actively borrowed.`);
    }

    const newAvailable = total - borrowed;
    books[idx] = {
      ...currentBook,
      title: bookData.title.trim(),
      author: bookData.author.trim(),
      category: (bookData.category || '').trim(),
      isbn: (bookData.isbn || '').trim(),
      total_copies: total,
      available_copies: newAvailable
    };

    setStorage(STORAGE_KEY_BOOKS, books);
    return { message: 'Book updated successfully in database.', book: books[idx] };
  },

  async deleteBook(id) {
    const books = getStorage(STORAGE_KEY_BOOKS, SEED_BOOKS);
    const target = books.find((b) => b.id === Number(id));
    if (!target) throw new Error('Book not found in inventory.');

    const borrowed = (target.total_copies ?? 0) - (target.available_copies ?? 0);
    if (borrowed > 0) {
      throw new Error(`Cannot delete book. ${borrowed} copy/copies are currently borrowed.`);
    }

    const filtered = books.filter((b) => b.id !== Number(id));
    setStorage(STORAGE_KEY_BOOKS, filtered);
    return { message: 'Book permanently removed from library inventory.' };
  },

  // Borrow & Return
  async borrowBook(bookId, studentName, dueDate) {
    autoUpdateOverdue();
    const books = getStorage(STORAGE_KEY_BOOKS, SEED_BOOKS);
    const borrowings = getStorage(STORAGE_KEY_BORROWINGS, SEED_BORROWINGS);

    const bookIdx = books.findIndex((b) => b.id === Number(bookId));
    if (bookIdx === -1) throw new Error('Book not found in inventory.');

    const book = books[bookIdx];
    if ((book.available_copies ?? 0) <= 0) {
      throw new Error(`"${book.title}" is currently out of stock.`);
    }

    const today = new Date().toISOString().split('T')[0];
    const newBorrowing = {
      id: Date.now(),
      book_id: Number(bookId),
      student_name: studentName,
      borrow_date: today,
      due_date: dueDate || getDateOffset(14),
      return_date: null,
      status: 'Borrowed'
    };

    // Decrement available copies
    books[bookIdx].available_copies -= 1;

    borrowings.unshift(newBorrowing);
    setStorage(STORAGE_KEY_BOOKS, books);
    setStorage(STORAGE_KEY_BORROWINGS, borrowings);

    return {
      message: `Successfully borrowed "${book.title}". Due date is ${newBorrowing.due_date}.`,
      borrowingId: newBorrowing.id
    };
  },

  async returnBook(borrowingId) {
    autoUpdateOverdue();
    const books = getStorage(STORAGE_KEY_BOOKS, SEED_BOOKS);
    const borrowings = getStorage(STORAGE_KEY_BORROWINGS, SEED_BORROWINGS);

    const bIdx = borrowings.findIndex((b) => b.id === Number(borrowingId));
    if (bIdx === -1) throw new Error('Borrowing record not found.');

    const borrowing = borrowings[bIdx];
    if (borrowing.status === 'Returned') {
      throw new Error('This book has already been returned.');
    }

    const today = new Date().toISOString().split('T')[0];
    borrowing.return_date = today;
    borrowing.status = 'Returned';

    // Increment available copies
    const bookIdx = books.findIndex((b) => b.id === Number(borrowing.book_id));
    if (bookIdx !== -1) {
      books[bookIdx].available_copies = Math.min(
        books[bookIdx].total_copies,
        (books[bookIdx].available_copies ?? 0) + 1
      );
    }

    setStorage(STORAGE_KEY_BOOKS, books);
    setStorage(STORAGE_KEY_BORROWINGS, borrowings);

    return { message: 'Book returned successfully! Available copies updated.' };
  },

  // History & Records
  async getStudentHistory(username) {
    autoUpdateOverdue();
    const books = getStorage(STORAGE_KEY_BOOKS, SEED_BOOKS);
    const borrowings = getStorage(STORAGE_KEY_BORROWINGS, SEED_BORROWINGS);

    return borrowings
      .filter((b) => b.student_name?.toLowerCase() === username.trim().toLowerCase())
      .map((b) => enrichBorrowing(b, books));
  },

  async getAllBorrowings() {
    autoUpdateOverdue();
    const books = getStorage(STORAGE_KEY_BOOKS, SEED_BOOKS);
    const borrowings = getStorage(STORAGE_KEY_BORROWINGS, SEED_BORROWINGS);

    return borrowings.map((b) => enrichBorrowing(b, books));
  },

  async getOverdueBooks(studentName = '') {
    autoUpdateOverdue();
    const books = getStorage(STORAGE_KEY_BOOKS, SEED_BOOKS);
    const borrowings = getStorage(STORAGE_KEY_BORROWINGS, SEED_BORROWINGS);

    return borrowings
      .filter((b) => {
        const isOverdue = b.status === 'Overdue';
        const matchesStudent = !studentName || b.student_name?.toLowerCase() === studentName.toLowerCase();
        return isOverdue && matchesStudent;
      })
      .map((b) => enrichBorrowing(b, books));
  },

  async getStats() {
    autoUpdateOverdue();
    const books = getStorage(STORAGE_KEY_BOOKS, SEED_BOOKS);
    const borrowings = getStorage(STORAGE_KEY_BORROWINGS, SEED_BORROWINGS);

    const totalTitles = books.length;
    const totalCopies = books.reduce((acc, b) => acc + (b.total_copies || 0), 0);
    const availableCopies = books.reduce((acc, b) => acc + (b.available_copies || 0), 0);
    const borrowedCopies = totalCopies - availableCopies;

    const activeBorrowed = borrowings.filter((b) => b.status === 'Borrowed').length;
    const overdueCount = borrowings.filter((b) => b.status === 'Overdue').length;
    const returnedCount = borrowings.filter((b) => b.status === 'Returned').length;

    return {
      totalTitles,
      totalCopies,
      availableCopies,
      borrowedCopies,
      activeBorrowed,
      overdueCount,
      returnedCount,
      totalTransactions: borrowings.length
    };
  }
};
