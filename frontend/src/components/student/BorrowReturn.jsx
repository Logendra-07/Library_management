import { useEffect, useState } from 'react';
import { getBooks, borrowBook, returnBook, getStudentHistory } from '../../api';

export default function BorrowReturn({ user }) {
  const [activeLoans, setActiveLoans] = useState([]);
  const [availableBooks, setAvailableBooks] = useState([]);
  const [searchBook, setSearchBook] = useState('');
  const [dueDates, setDueDates] = useState({});

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    if (!user?.username) return;
    setLoading(true);
    setError('');
    try {
      const [booksData, historyData] = await Promise.all([
        getBooks(),
        getStudentHistory(user.username)
      ]);

      const allBooks = booksData || [];
      const history = historyData || [];

      // Filter active loans (Borrowed or Overdue)
      const active = history.filter((r) => r.status !== 'Returned');
      setActiveLoans(active);

      // Only books with available copies > 0
      setAvailableBooks(allBooks.filter((b) => (b.available_copies ?? 0) > 0));

      // Default due dates (+14 days)
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 14);
      const defaultDateStr = defaultDate.toISOString().split('T')[0];

      const initialDates = {};
      allBooks.forEach((b) => {
        initialDates[b.id] = defaultDateStr;
      });
      setDueDates(initialDates);
    } catch (err) {
      setError(err.message || 'Failed to load borrowing records.');
    } finally {
      setLoading(false);
    }
  }

  // Handle return book
  async function handleReturn(recordId, bookTitle) {
    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await returnBook(recordId);
      setSuccess(`✅ ${res.message || `Successfully returned "${bookTitle}". Available copies updated.`}`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to return book.');
    } finally {
      setActionLoading(false);
    }
  }

  // Handle borrow book
  async function handleBorrow(bookId, bookTitle) {
    const dueDate = dueDates[bookId];
    if (!dueDate) {
      setError('Please select a due date.');
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await borrowBook(bookId, user.username, dueDate);
      setSuccess(`🎉 ${res.message || `Successfully borrowed "${bookTitle}".`}`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to borrow book.');
    } finally {
      setActionLoading(false);
    }
  }

  const filteredAvailable = availableBooks.filter((b) => {
    const q = searchBook.toLowerCase();
    return (
      !q ||
      b.title?.toLowerCase().includes(q) ||
      b.author?.toLowerCase().includes(q) ||
      b.category?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">📖 Borrow & Return Desk</h2>
          <p className="page-subtitle">
            Manage your currently borrowed books and check out new titles in one place.
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadData} disabled={loading || actionLoading}>
          🔄 Refresh
        </button>
      </div>

      {error && <div className="banner banner-error">❌ {error}</div>}
      {success && <div className="banner banner-success">{success}</div>}

      {/* SECTION 1: ACTIVE LOANS */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <span>📚</span>
            <span>Your Active Borrowed Books ({activeLoans.length})</span>
          </h3>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Logged in as <strong>{user?.username}</strong>
          </span>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <span>Loading active loans...</span>
          </div>
        ) : activeLoans.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 16px' }}>
            <div className="empty-icon">✨</div>
            <div className="empty-title">No Active Loans</div>
            <p className="empty-desc">
              You do not have any borrowed books at the moment. Browse available books below to borrow!
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Book Title</th>
                  <th>Author</th>
                  <th>Borrowed Date</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeLoans.map((loan) => {
                  const isOverdue = loan.status === 'Overdue';
                  return (
                    <tr key={loan.id} style={{ background: isOverdue ? '#fff5f5' : 'inherit' }}>
                      <td>
                        <strong>{loan.title}</strong>
                        {loan.category && (
                          <div style={{ fontSize: 11, color: 'var(--text-light)' }}>
                            {loan.category}
                          </div>
                        )}
                      </td>
                      <td>{loan.author}</td>
                      <td>{loan.borrow_date || loan.borrowed_date}</td>
                      <td>
                        <span style={{ fontWeight: isOverdue ? '700' : '500', color: isOverdue ? 'var(--danger)' : 'inherit' }}>
                          {loan.due_date} {isOverdue && '⚠️'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${isOverdue ? 'overdue' : 'borrowed'}`}>
                          {loan.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-success"
                          disabled={actionLoading}
                          onClick={() => handleReturn(loan.id, loan.title)}
                        >
                          ↩️ Return Book
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 2: BROWSE & BORROW BOOKS */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <span>➕</span>
            <span>Borrow Available Books</span>
          </h3>
          <div className="search-input-wrap" style={{ maxWidth: 300 }}>
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Filter available books..."
              value={searchBook}
              onChange={(e) => setSearchBook(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <span>Loading available books...</span>
          </div>
        ) : filteredAvailable.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 16px' }}>
            <div className="empty-icon">📦</div>
            <div className="empty-title">No books currently in stock</div>
            <p className="empty-desc">
              All books matching your search are currently loaned out. Please check back later!
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Category</th>
                  <th>Stock Available</th>
                  <th style={{ width: 180 }}>Choose Due Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAvailable.map((book) => {
                  return (
                    <tr key={book.id}>
                      <td>
                        <strong>{book.title}</strong>
                      </td>
                      <td>{book.author}</td>
                      <td>
                        <span className="book-category-tag">{book.category || 'General'}</span>
                      </td>
                      <td>
                        <div className="copies-indicator">
                          <strong>{book.available_copies}</strong>
                          <span style={{ fontSize: 12, color: 'var(--text-light)' }}>
                            of {book.total_copies}
                          </span>
                        </div>
                      </td>
                      <td>
                        <input
                          type="date"
                          min={new Date().toISOString().split('T')[0]}
                          value={dueDates[book.id] || ''}
                          onChange={(e) =>
                            setDueDates({ ...dueDates, [book.id]: e.target.value })
                          }
                          style={{ padding: '6px 10px', fontSize: 13 }}
                        />
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-primary"
                          disabled={actionLoading || (book.available_copies ?? 0) <= 0}
                          onClick={() => handleBorrow(book.id, book.title)}
                        >
                          📖 Borrow
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
