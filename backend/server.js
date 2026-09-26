const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const db = require("./db");

const app = express();
const PORT = 5000;
const ADMIN_PASSKEY = process.env.ADMIN_PASSKEY || "ADMIN2026";

app.use(cors());
app.use(express.json());

// =====================================================
// AUTOMATIC OVERDUE TRACKING HELPER
// =====================================================
// Automatically checks due dates and updates 'Borrowed' -> 'Overdue'
function updateOverdueStatuses() {
    const today = new Date().toISOString().split("T")[0];
    db.run(
        `UPDATE borrowings
         SET status = 'Overdue'
         WHERE status = 'Borrowed' AND due_date < ?`,
        [today],
        function (err) {
            if (err) {
                console.error("Overdue check error:", err.message);
            } else if (this.changes > 0) {
                console.log(`[Auto-Overdue] Updated ${this.changes} loan(s) to 'Overdue'.`);
            }
        }
    );
}

// Run overdue check immediately at start and every 60 seconds
updateOverdueStatuses();
setInterval(updateOverdueStatuses, 60 * 1000);

// =====================================================
// HOME
// =====================================================
app.get("/", (req, res) => {
    res.json({
        message: "Smart Library Backend is Running",
        port: PORT,
        status: "active"
    });
});

// Public config endpoint (returns required hint for admin access)
app.get("/api/config", (req, res) => {
    res.json({
        appName: "Smart Library Management System",
        adminKeyHint: "Default Admin Passkey is ADMIN2026"
    });
});

// =====================================================
// REGISTER USER
// =====================================================
app.post("/api/register", (req, res) => {
    const { username, password, role, adminPasskey } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({
            message: "Username, password and role are required"
        });
    }

    const cleanUsername = username.trim();

    if (cleanUsername.length < 3) {
        return res.status(400).json({
            message: "Username must contain at least 3 characters"
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            message: "Password must contain at least 6 characters"
        });
    }

    if (role !== "student" && role !== "admin") {
        return res.status(400).json({
            message: "Invalid role"
        });
    }

    // Special access control for Admin registration
    if (role === "admin") {
        if (!adminPasskey) {
            return res.status(403).json({
                message: "Admin Passkey is required to register an administrative account."
            });
        }
        if (adminPasskey !== ADMIN_PASSKEY) {
            return res.status(403).json({
                message: "Invalid Admin Passkey. Access restricted to authorized library staff."
            });
        }
    }

    // Create secure password hash
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    const passwordHash = `${salt}:${hash}`;

    db.run(
        `INSERT INTO users (username, password, role) VALUES (?, ?, ?)`,
        [cleanUsername, passwordHash, role],
        function (err) {
            if (err) {
                if (err.message.includes("UNIQUE constraint failed")) {
                    return res.status(409).json({
                        message: "Username already exists. Please choose a different username."
                    });
                }
                return res.status(500).json({ message: err.message });
            }

            res.status(201).json({
                message: "Registration successful! You can now log in.",
                userId: this.lastID,
                role: role
            });
        }
    );
});

// =====================================================
// LOGIN USER
// =====================================================
app.post("/api/login", (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({
            message: "Username, password and role are required"
        });
    }

    db.get(
        `SELECT * FROM users WHERE username = ? AND role = ?`,
        [username.trim(), role],
        (err, user) => {
            if (err) {
                return res.status(500).json({ message: err.message });
            }

            if (!user) {
                return res.status(401).json({
                    message: `Invalid username, password, or no ${role} account found`
                });
            }

            const parts = user.password.split(":");
            const salt = parts[0];
            const storedHash = parts[1];

            const hash = crypto.scryptSync(password, salt, 64).toString("hex");

            if (hash !== storedHash) {
                return res.status(401).json({
                    message: "Invalid username or password"
                });
            }

            res.json({
                message: "Login successful",
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role
                }
            });
        }
    );
});

// =====================================================
// GET ALL BOOKS / SEARCH
// =====================================================
app.get("/api/books", (req, res) => {
    const q = req.query.q || req.query.search;

    if (q) {
        const queryTerm = `%${q.trim()}%`;
        db.all(
            `SELECT * FROM books
             WHERE title LIKE ? OR author LIKE ? OR category LIKE ? OR isbn LIKE ?
             ORDER BY id DESC`,
            [queryTerm, queryTerm, queryTerm, queryTerm],
            (err, rows) => {
                if (err) return res.status(500).json({ message: err.message });
                res.json(rows);
            }
        );
    } else {
        db.all(`SELECT * FROM books ORDER BY id DESC`, [], (err, rows) => {
            if (err) return res.status(500).json({ message: err.message });
            res.json(rows);
        });
    }
});

// Search route alias
app.get("/api/books/search", (req, res) => {
    const q = req.query.q || "";
    db.all(
        `SELECT * FROM books
         WHERE title LIKE ? OR author LIKE ? OR category LIKE ? OR isbn LIKE ?
         ORDER BY id DESC`,
        [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`],
        (err, rows) => {
            if (err) return res.status(500).json({ message: err.message });
            res.json(rows);
        }
    );
});

// =====================================================
// ADD BOOK (Admin)
// =====================================================
app.post("/api/books", (req, res) => {
    const { title, author, category, isbn, total_copies } = req.body;

    if (!title || !author) {
        return res.status(400).json({
            message: "Title and author are required"
        });
    }

    const total = Number(total_copies) || 1;
    if (total < 1) {
        return res.status(400).json({
            message: "Total copies must be at least 1"
        });
    }

    db.run(
        `INSERT INTO books (title, author, category, isbn, total_copies, available_copies)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [title.trim(), author.trim(), (category || "").trim(), (isbn || "").trim(), total, total],
        function (err) {
            if (err) return res.status(500).json({ message: err.message });

            res.status(201).json({
                message: "Book added successfully",
                id: this.lastID,
                book: {
                    id: this.lastID,
                    title: title.trim(),
                    author: author.trim(),
                    category: (category || "").trim(),
                    isbn: (isbn || "").trim(),
                    total_copies: total,
                    available_copies: total
                }
            });
        }
    );
});

// =====================================================
// UPDATE BOOK (Admin)
// =====================================================
app.put("/api/books/:id", (req, res) => {
    const id = req.params.id;
    const { title, author, category, isbn, total_copies } = req.body;

    if (!title || !author) {
        return res.status(400).json({
            message: "Title and author are required"
        });
    }

    const total = Number(total_copies);
    if (!Number.isInteger(total) || total < 1) {
        return res.status(400).json({
            message: "Total copies must be an integer >= 1"
        });
    }

    db.get("SELECT * FROM books WHERE id = ?", [id], (err, book) => {
        if (err) return res.status(500).json({ message: err.message });
        if (!book) return res.status(404).json({ message: "Book not found" });

        const currentlyBorrowed = book.total_copies - book.available_copies;
        if (total < currentlyBorrowed) {
            return res.status(400).json({
                message: `Cannot set total copies below ${currentlyBorrowed}. ${currentlyBorrowed} copy/copies are currently borrowed.`
            });
        }

        const newAvailable = total - currentlyBorrowed;

        db.run(
            `UPDATE books
             SET title = ?, author = ?, category = ?, isbn = ?, total_copies = ?, available_copies = ?
             WHERE id = ?`,
            [title.trim(), author.trim(), (category || "").trim(), (isbn || "").trim(), total, newAvailable, id],
            function (err) {
                if (err) return res.status(500).json({ message: err.message });
                res.json({
                    message: "Book updated successfully",
                    book: {
                        id: Number(id),
                        title: title.trim(),
                        author: author.trim(),
                        category: (category || "").trim(),
                        isbn: (isbn || "").trim(),
                        total_copies: total,
                        available_copies: newAvailable
                    }
                });
            }
        );
    });
});

// =====================================================
// DELETE BOOK (Admin)
// =====================================================
app.delete("/api/books/:id", (req, res) => {
    const id = req.params.id;

    db.get("SELECT * FROM books WHERE id = ?", [id], (err, book) => {
        if (err) return res.status(500).json({ message: err.message });
        if (!book) return res.status(404).json({ message: "Book not found" });

        // Prevent deletion if copies are currently borrowed
        if (book.available_copies < book.total_copies) {
            const activeCount = book.total_copies - book.available_copies;
            return res.status(400).json({
                message: `Cannot delete book. ${activeCount} copy/copies are currently borrowed. Please wait for them to be returned.`
            });
        }

        db.run("DELETE FROM books WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).json({ message: err.message });
            res.json({ message: "Book removed successfully from inventory" });
        });
    });
});

// =====================================================
// BORROW BOOK (Student)
// =====================================================
app.post("/api/borrow", (req, res) => {
    const book_id = req.body.book_id || req.body.bookId;
    const student_name = req.body.student_name || req.body.studentName || req.body.username;
    let due_date = req.body.due_date || req.body.dueDate;

    if (!book_id || !student_name) {
        return res.status(400).json({
            message: "Book ID and student name are required"
        });
    }

    // Default due date: +14 days from now if not explicitly passed
    if (!due_date) {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        due_date = d.toISOString().split("T")[0];
    }

    // Ensure due_date format is YYYY-MM-DD
    due_date = due_date.split("T")[0];

    db.get("SELECT * FROM books WHERE id = ?", [book_id], (err, book) => {
        if (err) return res.status(500).json({ message: err.message });
        if (!book) return res.status(404).json({ message: "Book not found" });

        if (book.available_copies <= 0) {
            return res.status(400).json({
                message: `"${book.title}" is currently out of stock.`
            });
        }

        const borrowDate = new Date().toISOString().split("T")[0];

        db.run(
            `INSERT INTO borrowings (book_id, student_name, borrow_date, due_date, status)
             VALUES (?, ?, ?, ?, 'Borrowed')`,
            [book_id, student_name, borrowDate, due_date],
            function (err) {
                if (err) return res.status(500).json({ message: err.message });
                const borrowingId = this.lastID;

                // Decrement available copies
                db.run(
                    `UPDATE books SET available_copies = available_copies - 1 WHERE id = ?`,
                    [book_id],
                    (updateErr) => {
                        if (updateErr) return res.status(500).json({ message: updateErr.message });
                        res.status(201).json({
                            message: `Successfully borrowed "${book.title}". Due date is ${due_date}.`,
                            borrowingId: borrowingId
                        });
                    }
                );
            }
        );
    });
});

// =====================================================
// RETURN BOOK (Student / Admin)
// =====================================================
app.post("/api/return", (req, res) => {
    const borrowing_id = req.body.borrowing_id || req.body.borrowingId || req.body.record_id || req.body.recordId;

    if (!borrowing_id) {
        return res.status(400).json({
            message: "Borrowing record ID is required"
        });
    }

    db.get("SELECT * FROM borrowings WHERE id = ?", [borrowing_id], (err, borrowing) => {
        if (err) return res.status(500).json({ message: err.message });
        if (!borrowing) return res.status(404).json({ message: "Borrowing record not found" });

        if (borrowing.status === "Returned") {
            return res.status(400).json({
                message: "This book has already been returned."
            });
        }

        const returnDate = new Date().toISOString().split("T")[0];

        db.run(
            `UPDATE borrowings SET return_date = ?, status = 'Returned' WHERE id = ?`,
            [returnDate, borrowing_id],
            (err) => {
                if (err) return res.status(500).json({ message: err.message });

                // Increment available copies
                db.run(
                    `UPDATE books SET available_copies = available_copies + 1 WHERE id = ?`,
                    [borrowing.book_id],
                    (incErr) => {
                        if (incErr) return res.status(500).json({ message: incErr.message });
                        res.json({
                            message: "Book returned successfully! Available copies updated."
                        });
                    }
                );
            }
        );
    });
});

// =====================================================
// GET ALL BORROWING RECORDS (Admin)
// =====================================================
app.get("/api/borrowings", (req, res) => {
    // Automatically update overdue status before serving records
    updateOverdueStatuses();

    db.all(
        `SELECT borrowings.*, books.title, books.author, books.category, books.isbn
         FROM borrowings
         JOIN books ON borrowings.book_id = books.id
         ORDER BY borrowings.id DESC`,
        [],
        (err, rows) => {
            if (err) return res.status(500).json({ message: err.message });
            res.json(rows);
        }
    );
});

// Alias for /api/records
app.get("/api/records", (req, res) => {
    updateOverdueStatuses();
    db.all(
        `SELECT borrowings.*, books.title, books.author, books.category, books.isbn,
                borrowings.borrow_date AS borrowed_date,
                borrowings.return_date AS returned_date
         FROM borrowings
         JOIN books ON borrowings.book_id = books.id
         ORDER BY borrowings.id DESC`,
        [],
        (err, rows) => {
            if (err) return res.status(500).json({ message: err.message });
            res.json(rows);
        }
    );
});

// =====================================================
// GET STUDENT BORROWING HISTORY
// =====================================================
app.get("/api/borrowings/student/:username", (req, res) => {
    updateOverdueStatuses();
    const username = req.params.username;

    db.all(
        `SELECT borrowings.*, books.title, books.author, books.category, books.isbn,
                borrowings.borrow_date AS borrowed_date,
                borrowings.return_date AS returned_date
         FROM borrowings
         JOIN books ON borrowings.book_id = books.id
         WHERE borrowings.student_name = ?
         ORDER BY borrowings.id DESC`,
        [username],
        (err, rows) => {
            if (err) return res.status(500).json({ message: err.message });
            res.json(rows);
        }
    );
});

// Alias for /api/history/:username
app.get("/api/history/:username", (req, res) => {
    updateOverdueStatuses();
    const username = req.params.username;

    db.all(
        `SELECT borrowings.*, books.title, books.author, books.category, books.isbn,
                borrowings.borrow_date AS borrowed_date,
                borrowings.return_date AS returned_date
         FROM borrowings
         JOIN books ON borrowings.book_id = books.id
         WHERE borrowings.student_name = ?
         ORDER BY borrowings.id DESC`,
        [username],
        (err, rows) => {
            if (err) return res.status(500).json({ message: err.message });
            res.json(rows);
        }
    );
});

// =====================================================
// GET OVERDUE BOOKS (Admin & Student check)
// =====================================================
app.get("/api/overdue", (req, res) => {
    updateOverdueStatuses();
    const student = req.query.student;

    let query = `
        SELECT borrowings.*, books.title, books.author, books.category, books.isbn,
               borrowings.borrow_date AS borrowed_date
        FROM borrowings
        JOIN books ON borrowings.book_id = books.id
        WHERE borrowings.status = 'Overdue'
    `;
    const params = [];

    if (student) {
        query += ` AND borrowings.student_name = ?`;
        params.push(student);
    }

    query += ` ORDER BY borrowings.due_date ASC`;

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json(rows);
    });
});

// =====================================================
// INVENTORY & SYSTEM STATS (Admin Dashboard)
// =====================================================
app.get("/api/stats", (req, res) => {
    updateOverdueStatuses();

    db.get(
        `SELECT 
            COUNT(id) AS totalTitles,
            COALESCE(SUM(total_copies), 0) AS totalCopies,
            COALESCE(SUM(available_copies), 0) AS availableCopies
         FROM books`,
        [],
        (err, bookStats) => {
            if (err) return res.status(500).json({ message: err.message });

            db.get(
                `SELECT 
                    COUNT(CASE WHEN status = 'Borrowed' THEN 1 END) AS activeBorrowed,
                    COUNT(CASE WHEN status = 'Overdue' THEN 1 END) AS overdueCount,
                    COUNT(CASE WHEN status = 'Returned' THEN 1 END) AS returnedCount,
                    COUNT(id) AS totalTransactions
                 FROM borrowings`,
                [],
                (err2, borrowStats) => {
                    if (err2) return res.status(500).json({ message: err2.message });

                    db.get(
                        `SELECT 
                            COUNT(CASE WHEN role = 'student' THEN 1 END) AS totalStudents,
                            COUNT(CASE WHEN role = 'admin' THEN 1 END) AS totalAdmins
                         FROM users`,
                        [],
                        (err3, userStats) => {
                            if (err3) return res.status(500).json({ message: err3.message });

                            res.json({
                                totalTitles: bookStats.totalTitles || 0,
                                totalCopies: bookStats.totalCopies || 0,
                                availableCopies: bookStats.availableCopies || 0,
                                borrowedCopies: (bookStats.totalCopies || 0) - (bookStats.availableCopies || 0),
                                activeBorrowed: borrowStats.activeBorrowed || 0,
                                overdueCount: borrowStats.overdueCount || 0,
                                returnedCount: borrowStats.returnedCount || 0,
                                totalTransactions: borrowStats.totalTransactions || 0,
                                totalStudents: userStats.totalStudents || 0,
                                totalAdmins: userStats.totalAdmins || 0
                            });
                        }
                    );
                }
            );
        }
    );
});

// =====================================================
// START SERVER
// =====================================================
app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`📚 Smart Library Backend listening on port ${PORT}`);
    console.log(`   Admin Passkey configured: ${ADMIN_PASSKEY}`);
    console.log(`   API Endpoint: http://localhost:${PORT}/api`);
    console.log(`===============================================`);
});