import { useEffect, useState, useMemo } from 'react';
import { getBooks, borrowBook } from '../../api';

export default function SearchCatalog({ user, onNavigateTab }) {
  const [books, setBooks] = useState([]);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Borrow modal state
  const [borrowModalBook, setBorrowModalBook] = useState(null);
  const [dueDate, setDueDate] = useState('');
  const [borrowingLoading, setBorrowingLoading] = useState(false);

  useEffect(() => {
    loadCatalog();
  }, []);

  async function loadCatalog() {
    setLoading(true);
    setError('');
    try {
      const data = await getBooks();
      setBooks(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load book catalog.');
    } finally {
      setLoading(false);
    }
  }

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set(books.map((b) => b.category?.trim()).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [books]);

  // Filter books by query, category, and availability
  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        book.title?.toLowerCase().includes(q) ||
        book.author?.toLowerCase().includes(q) ||
        book.category?.toLowerCase().includes(q) ||
        book.isbn?.toLowerCase().includes(q);

      const matchesCat = selectedCategory === 'All' || book.category === selectedCategory;
      const matchesAvail = !onlyAvailable || (book.available_copies ?? 0) > 0;

      return matchesQuery && matchesCat && matchesAvail;
    });
  }, [books, query, selectedCategory, onlyAvailable]);

  // Open quick borrow modal
  function openBorrowModal(book) {
    setError('');
    setSuccessMsg('');
    const d = new Date();
    d.setDate(d.getDate() + 14); // 2 weeks default
    setDueDate(d.toISOString().split('T')[0]);
    setBorrowModalBook(book);
  }

  async function handleConfirmBorrow() {
    if (!borrowModalBook || !dueDate) return;
    setBorrowingLoading(true);
    setError('');
    try {
      const res = await borrowBook(borrowModalBook.id, user.username, dueDate);
      setSuccessMsg(`🎉 ${res.message || `You borrowed "${borrowModalBook.title}"!`}`);
      setBorrowModalBook(null);
      await loadCatalog(); // Refresh copies
    } catch (err) {
      setError(err.message || 'Failed to borrow book.');
    } finally {
      setBorrowingLoading(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">🔎 Search Library Catalog</h2>
          <p className="page-subtitle">
            Explore our rich collection of books. Check real-time stock and borrow directly.
          </p>
        </div>
        <div className="action-buttons">
          <button
            className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('grid')}
          >
            📱 Grid View
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('table')}
          >
            📋 Table View
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && <div className="banner banner-error">❌ {error}</div>}
      {successMsg && (
        <div className="banner banner-success">
          {successMsg}
          {onNavigateTab && (
            <button
              className="btn btn-sm btn-secondary"
              style={{ marginLeft: 'auto' }}
              onClick={() => onNavigateTab('borrow')}
            >
              View My Loans ➔
            </button>
          )}
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="card" style={{ padding: '18px 22px' }}>
        <div className="toolbar" style={{ margin: 0 }}>
          <div className="search-input-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by book title, author, category, or ISBN..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: 0 }}>
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
                style={{ minWidth: 'auto', width: 16, height: 16 }}
              />
              <span style={{ fontSize: 13, fontWeight: 500 }}>Only Show Available</span>
            </label>
          </div>
        </div>

        {/* Category Pills */}
        <div className="filter-pills" style={{ marginTop: 14 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-light)', marginRight: 4 }}>
            Categories:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`filter-pill ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Display */}
      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <span>Loading catalog from database...</span>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📖</div>
            <div className="empty-title">No books match your criteria</div>
            <p className="empty-desc">
              Try adjusting your search terms or selecting a different category filter.
            </p>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="books-grid">
          {filteredBooks.map((book) => {
            const available = (book.available_copies ?? 0) > 0;
            const percentage = book.total_copies > 0 ? (book.available_copies / book.total_copies) * 100 : 0;
            const barClass = percentage > 50 ? 'high' : percentage > 20 ? 'medium' : 'low';

            return (
              <div key={book.id} className="book-card">
                <div>
                  <div className="book-card-header">
                    <span className="book-category-tag">{book.category || 'General'}</span>
                    <span className={`badge ${available ? 'available' : 'out'}`}>
                      {available ? 'Available' : 'Out of Stock'}
                    </span>
                  </div>
                  <h3 className="book-card-title">{book.title}</h3>
                  <p className="book-card-author">✍️ {book.author}</p>
                  {book.isbn && (
                    <p style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 8 }}>
                      ISBN: {book.isbn}
                    </p>
                  )}
                </div>

                <div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Copies Availability:</span>
                      <strong style={{ color: available ? 'var(--success)' : 'var(--danger)' }}>
                        {book.available_copies} / {book.total_copies}
                      </strong>
                    </div>
                    <div className="copies-bar-bg" style={{ width: '100%' }}>
                      <div
                        className={`copies-bar-fill ${barClass}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="book-card-footer">
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      #{book.id}
                    </span>
                    <button
                      className="btn btn-sm btn-primary"
                      disabled={!available}
                      onClick={() => openBorrowModal(book)}
                    >
                      {available ? '📖 Borrow Book' : '❌ Out of Stock'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Author</th>
                <th>Category</th>
                <th>Copies (Avail / Total)</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredBooks.map((book) => {
                const available = (book.available_copies ?? 0) > 0;
                const percentage = book.total_copies > 0 ? (book.available_copies / book.total_copies) * 100 : 0;
                const barClass = percentage > 50 ? 'high' : percentage > 20 ? 'medium' : 'low';

                return (
                  <tr key={book.id}>
                    <td>#{book.id}</td>
                    <td>
                      <strong>{book.title}</strong>
                      {book.isbn && (
                        <div style={{ fontSize: 11, color: 'var(--text-light)' }}>
                          ISBN: {book.isbn}
                        </div>
                      )}
                    </td>
                    <td>{book.author}</td>
                    <td>
                      <span className="book-category-tag">{book.category || 'General'}</span>
                    </td>
                    <td>
                      <div className="copies-indicator">
                        <span>{book.available_copies} / {book.total_copies}</span>
                        <div className="copies-bar-bg">
                          <div
                            className={`copies-bar-fill ${barClass}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${available ? 'available' : 'out'}`}>
                        {available ? 'Available' : 'Out of Stock'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-primary"
                        disabled={!available}
                        onClick={() => openBorrowModal(book)}
                      >
                        {available ? 'Borrow' : 'Out of Stock'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Borrow Modal */}
      {borrowModalBook && (
        <div className="modal-overlay" onClick={() => setBorrowModalBook(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">📖 Borrow Book</h3>
              <button className="btn-close" onClick={() => setBorrowModalBook(null)}>
                ✕
              </button>
            </div>

            <div style={{ marginBottom: 18 }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy-dark)' }}>
                {borrowModalBook.title}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                By {borrowModalBook.author} • Category: {borrowModalBook.category || 'General'}
              </p>
            </div>

            <div className="banner banner-info" style={{ fontSize: 13 }}>
              ℹ️ Borrower: <strong>{user.username}</strong>. Currently available copies: <strong>{borrowModalBook.available_copies}</strong>.
            </div>

            <div className="field" style={{ marginBottom: 20 }}>
              <label>Select Due Date</label>
              <input
                type="date"
                value={dueDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Standard borrowing window is 14 days. Books returned after this date will automatically be marked OVERDUE.
              </span>
            </div>

            <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setBorrowModalBook(null)}
                disabled={borrowingLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmBorrow}
                disabled={borrowingLoading}
              >
                {borrowingLoading ? 'Processing...' : 'Confirm Borrow'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
