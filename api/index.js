const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
const ADMIN_PASSKEY = process.env.ADMIN_PASSKEY || "ADMIN2026";

app.use(cors());
app.use(express.json());

// In-Memory Cloud Database with Persistence
let books = [
  {
    id: 1,
    title: "Clean Code: A Handbook of Agile Software Craftsmanship",
    author: "Robert C. Martin",
    category: "Computer Science",
    isbn: "978-0132350884",
    total_copies: 5,
    available_copies: 4
  },
  {
    id: 2,
    title: "The Pragmatic Programmer: Your Journey To Mastery",
    author: "David Thomas & Andrew Hunt",
    category: "Computer Science",
    isbn: "978-0135957059",
    total_copies: 3,
    available_copies: 3
  },
  {
    id: 3,
    title: "Design Patterns: Elements of Reusable Object-Oriented Software",
    author: "Erich Gamma et al.",
    category: "Computer Science",
    isbn: "978-0201633610",
    total_copies: 2,
    available_copies: 2
  },
  {
    id: 4,
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    category: "Fiction",
    isbn: "978-0061120084",
    total_copies: 4,
    available_copies: 3
  },
  {
    id: 5,
    title: "Sapiens: A Brief History of Humankind",
    author: "Yuval Noah Harari",
    category: "History",
    isbn: "978-0062316097",
    total_copies: 4,
    available_copies: 4
  },
  {
    id: 6,
    title: "A Brief History of Time",
    author: "Stephen Hawking",
    category: "Science",
    isbn: "978-0553380163",
    total_copies: 6,
    available_copies: 5
  },
  {
    id: 7,
    title: "Kakka Muttai",
    author: "Vetrimaran",
    category: "Education",
    isbn: "978-8129116123",
    total_copies: 10,
    available_copies: 9
  }
];

function getDateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

let borrowings = [
  {
    id: 1,
    book_id: 1,
    student_name: "logu",
    borrow_date: getDateOffset(-4),
    due_date: getDateOffset(10),
    return_date: null,
    status: "Borrowed"
  },
  {
    id: 2,
    book_id: 4,
    student_name: "logu",
    borrow_date: getDateOffset(-20),
    due_date: getDateOffset(-6),
    return_date: null,
    status: "Overdue"
  },
  {
    id: 3,
    book_id: 6,
    student_name: "logu",
    borrow_date: getDateOffset(-30),
    due_date: getDateOffset(-16),
    return_date: getDateOffset(-17),
    status: "Returned"
  }
];

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedPassword) {
  if (!storedPassword.includes(":")) {
    return password === storedPassword;
  }
  const [salt, storedHash] = storedPassword.split(":");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return hash === storedHash;
}

let users = [
  { id: 1, username: "logu", password: hashPassword("123456"), role: "student" },
  { id: 2, username: "khaith", password: hashPassword("123456"), role: "admin" }
];

function updateOverdueStatuses() {
  const today = new Date().toISOString().split("T")[0];
  borrowings.forEach((b) => {
    if (b.status === "Borrowed" && b.due_date < today) {
      b.status = "Overdue";
    }
  });
}

function enrichBorrowing(borrowing) {
  const book = books.find((b) => b.id === Number(borrowing.book_id)) || {};
  return {
    ...borrowing,
    title: book.title || "Unknown Book",
    author: book.author || "Unknown Author",
    category: book.category || "General",
    isbn: book.isbn || "",
    borrowed_date: borrowing.borrow_date,
    returned_date: borrowing.return_date
  };
}

// Routes
app.get("/api", (req, res) => {
  res.json({ message: "Smart Library Vercel API is live", status: "active" });
});

app.get("/api/config", (req, res) => {
  res.json({
    appName: "Smart Library Management System",
    adminKeyHint: "Default Admin Passkey is ADMIN2026"
  });
});

app.post("/api/register", (req, res) => {
  const { username, password, role, adminPasskey } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ message: "Username, password and role are required" });
  }

  const cleanUser = username.trim();
  if (users.some((u) => u.username.toLowerCase() === cleanUser.toLowerCase())) {
    return res.status(409).json({ message: "Username already exists. Please choose a different username." });
  }

  if (role === "admin") {
    if (!adminPasskey) {
      return res.status(403).json({ message: "Admin Passkey is required to register an administrative account." });
    }
    if (adminPasskey !== ADMIN_PASSKEY) {
      return res.status(403).json({ message: "Invalid Admin Passkey. Access restricted to authorized library staff." });
    }
  }

  const newUser = {
    id: Date.now(),
    username: cleanUser,
    password: hashPassword(password),
    role
  };
  users.push(newUser);

  res.status(201).json({ message: "Registration successful! You can now log in.", userId: newUser.id, role });
});

app.post("/api/login", (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ message: "Username, password and role are required" });
  }

  const user = users.find(
    (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.role === role
  );

  if (!user || !verifyPassword(password, user.password)) {
    return res.status(401).json({ message: `Invalid username, password, or no ${role} account found` });
  }

  res.json({
    message: "Login successful",
    user: { id: user.id, username: user.username, role: user.role }
  });
});

app.get("/api/books", (req, res) => {
  const q = req.query.q || req.query.search;
  if (q) {
    const term = q.trim().toLowerCase();
    const filtered = books.filter(
      (b) =>
        b.title?.toLowerCase().includes(term) ||
        b.author?.toLowerCase().includes(term) ||
        b.category?.toLowerCase().includes(term) ||
        b.isbn?.toLowerCase().includes(term)
    );
    return res.json(filtered);
  }
  res.json(books);
});

app.get("/api/books/search", (req, res) => {
  const q = (req.query.q || "").toLowerCase();
  res.json(
    books.filter(
      (b) =>
        b.title?.toLowerCase().includes(q) ||
        b.author?.toLowerCase().includes(q) ||
        b.category?.toLowerCase().includes(q) ||
        b.isbn?.toLowerCase().includes(q)
    )
  );
});

app.post("/api/books", (req, res) => {
  const { title, author, category, isbn, total_copies } = req.body;
  if (!title || !author) return res.status(400).json({ message: "Title and author are required" });

  const total = Number(total_copies) || 1;
  const newBook = {
    id: Date.now(),
    title: title.trim(),
    author: author.trim(),
    category: (category || "").trim(),
    isbn: (isbn || "").trim(),
    total_copies: total,
    available_copies: total
  };

  books.unshift(newBook);
  res.status(201).json({ message: "Book added successfully", id: newBook.id, book: newBook });
});

app.put("/api/books/:id", (req, res) => {
  const id = Number(req.params.id);
  const { title, author, category, isbn, total_copies } = req.body;
  const book = books.find((b) => b.id === id);
  if (!book) return res.status(404).json({ message: "Book not found" });

  const total = Number(total_copies);
  const borrowed = book.total_copies - book.available_copies;
  if (total < borrowed) {
    return res.status(400).json({
      message: `Cannot set total copies below ${borrowed}. ${borrowed} copy/copies are currently borrowed.`
    });
  }

  book.title = title.trim();
  book.author = author.trim();
  book.category = (category || "").trim();
  book.isbn = (isbn || "").trim();
  book.total_copies = total;
  book.available_copies = total - borrowed;

  res.json({ message: "Book updated successfully", book });
});

app.delete("/api/books/:id", (req, res) => {
  const id = Number(req.params.id);
  const book = books.find((b) => b.id === id);
  if (!book) return res.status(404).json({ message: "Book not found" });

  if (book.available_copies < book.total_copies) {
    const active = book.total_copies - book.available_copies;
    return res.status(400).json({ message: `Cannot delete book. ${active} copy/copies are currently borrowed.` });
  }

  books = books.filter((b) => b.id !== id);
  res.json({ message: "Book removed successfully from inventory" });
});

app.post("/api/borrow", (req, res) => {
  const book_id = Number(req.body.book_id || req.body.bookId);
  const student_name = req.body.student_name || req.body.studentName || req.body.username;
  let due_date = req.body.due_date || req.body.dueDate || getDateOffset(14);

  const book = books.find((b) => b.id === book_id);
  if (!book) return res.status(404).json({ message: "Book not found" });
  if (book.available_copies <= 0) {
    return res.status(400).json({ message: `"${book.title}" is currently out of stock.` });
  }

  const today = new Date().toISOString().split("T")[0];
  const newBorrowing = {
    id: Date.now(),
    book_id,
    student_name,
    borrow_date: today,
    due_date: due_date.split("T")[0],
    return_date: null,
    status: "Borrowed"
  };

  book.available_copies -= 1;
  borrowings.unshift(newBorrowing);

  res.status(201).json({
    message: `Successfully borrowed "${book.title}". Due date is ${newBorrowing.due_date}.`,
    borrowingId: newBorrowing.id
  });
});

app.post("/api/return", (req, res) => {
  const borrowing_id = Number(req.body.borrowing_id || req.body.borrowingId || req.body.record_id);
  const borrowing = borrowings.find((b) => b.id === borrowing_id);
  if (!borrowing) return res.status(404).json({ message: "Borrowing record not found" });
  if (borrowing.status === "Returned") return res.status(400).json({ message: "This book has already been returned." });

  const today = new Date().toISOString().split("T")[0];
  borrowing.return_date = today;
  borrowing.status = "Returned";

  const book = books.find((b) => b.id === Number(borrowing.book_id));
  if (book) {
    book.available_copies = Math.min(book.total_copies, book.available_copies + 1);
  }

  res.json({ message: "Book returned successfully! Available copies updated." });
});

app.get("/api/borrowings", (req, res) => {
  updateOverdueStatuses();
  res.json(borrowings.map(enrichBorrowing));
});

app.get("/api/records", (req, res) => {
  updateOverdueStatuses();
  res.json(borrowings.map(enrichBorrowing));
});

app.get("/api/borrowings/student/:username", (req, res) => {
  updateOverdueStatuses();
  const username = req.params.username.toLowerCase();
  res.json(borrowings.filter((b) => b.student_name.toLowerCase() === username).map(enrichBorrowing));
});

app.get("/api/history/:username", (req, res) => {
  updateOverdueStatuses();
  const username = req.params.username.toLowerCase();
  res.json(borrowings.filter((b) => b.student_name.toLowerCase() === username).map(enrichBorrowing));
});

app.get("/api/overdue", (req, res) => {
  updateOverdueStatuses();
  const student = req.query.student ? req.query.student.toLowerCase() : null;
  res.json(
    borrowings
      .filter((b) => b.status === "Overdue" && (!student || b.student_name.toLowerCase() === student))
      .map(enrichBorrowing)
  );
});

app.get("/api/stats", (req, res) => {
  updateOverdueStatuses();
  const totalTitles = books.length;
  const totalCopies = books.reduce((a, b) => a + (b.total_copies || 0), 0);
  const availableCopies = books.reduce((a, b) => a + (b.available_copies || 0), 0);
  const borrowedCopies = totalCopies - availableCopies;

  res.json({
    totalTitles,
    totalCopies,
    availableCopies,
    borrowedCopies,
    activeBorrowed: borrowings.filter((b) => b.status === "Borrowed").length,
    overdueCount: borrowings.filter((b) => b.status === "Overdue").length,
    returnedCount: borrowings.filter((b) => b.status === "Returned").length,
    totalTransactions: borrowings.length
  });
});

module.exports = app;
