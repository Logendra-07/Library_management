import { useEffect, useState, useMemo } from 'react';
import { getBooks, addBook, updateBook, deleteBook, getStats } from '../../api';

export default function InventoryDashboard() {
  const [books, setBooks] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState('ALL'); // 'ALL' | 'AVAILABLE' | 'LOW' | 'OUT'

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [form, setForm] = useState({
    title: '',
    author: '',
    category: '',
    isbn: '',
    total_copies: 1
  });

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [booksData, statsData] = await Promise.all([
        getBooks(),
        getStats()
      ]);
      setBooks(booksData || []);
      setStats(statsData || null);
    } catch (err) {
      setError(err.message || 'Failed to load inventory.');
    } finally {
      setLoading(false);
    }
  }

  const categories = useMemo(() => {
    const set = new Set(books.map((b) => b.category?.trim()).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [books]);

  // Open modal for Adding
  function openAddModal() {
    setEditingBook(null);
    setForm({
      title: '',
      author: '',
      category: '',
      isbn: '',
      total_copies: 3
    });
    setError('');
    setSuccess('');
    setIsModalOpen(true);
  }

  // Open modal for Editing
  function openEditModal(book) {
    setEditingBook(book);
    setForm({
      title: book.title || '',
      author: book.author || '',
      category: book.category || '',
      isbn: book.isbn || '',
      total_copies: book.total_copies || 1
    });
    setError('');
    setSuccess('');
    setIsModalOpen(true);
  }

  // Handle Form Submit (Add or Update)
  async function handleFormSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.title.trim() || !form.author.trim()) {
      setError('Title and Author are required fields.');
      return;
    }

    const copies = Number(form.total_copies);
    if (!Number.isInteger(copies) || copies < 1) {
      setError('Total copies must be a positive integer.');
      return;
    }

    setSaving(true);
    try {
      if (editingBook) {
        const res = await updateBook(editingBook.id, {
          title: form.title.trim(),
          author: form.author.trim(),
          category: form.category.trim(),
          isbn: form.isbn.trim(),
          total_copies: copies
        });
        setSuccess(res.message || 'Book updated successfully!');
      } else {
        const res = await addBook({
          title: form.title.trim(),
          author: form.author.trim(),
          category: form.category.trim(),
          isbn: form.isbn.trim(),
          total_copies: copies
        });
        setSuccess(res.message || 'New book added to library inventory!');
      }
      setIsModalOpen(false);
      await loadAll();
    } catch (err) {
      setError(err.message || 'Failed to save book.');
    } finally {
      setSaving(false);
    }
  }

  // Handle Delete Book
  async function handleDelete(book) {
    const borrowed = (book.total_copies ?? 0) - (book.available_copies ?? 0);
    if (borrowed > 0) {
      setError(`Cannot delete "${book.title}" because ${borrowed} copy/copies are actively borrowed.`);
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${book.title}" from the inventory?`
    );
    if (!confirmed) return;

    setError('');
    setSuccess('');
    try {
      const res = await deleteBook(book.id);
      setSuccess(res.message || `Deleted "${book.title}" from inventory.`);
      await loadAll();
    } catch (err) {
      setError(err.message || 'Failed to delete book.');
    }
  }

  // Filter books
  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        b.title?.toLowerCase().includes(q) ||
        b.author?.toLowerCase().includes(q) ||
        b.category?.toLowerCase().includes(q) ||
        b.isbn?.toLowerCase().includes(q);

      const matchesCat = categoryFilter === 'All' || b.category === categoryFilter;

      let matchesStock = true;
      const avail = b.available_copies ?? 0;
      if (stockFilter === 'AVAILABLE') matchesStock = avail > 0;
      else if (stockFilter === 'LOW') matchesStock = avail > 0 && avail <= 2;
      else if (stockFilter === 'OUT') matchesStock = avail === 0;

      return matchesSearch && matchesCat && matchesStock;
    });
  }, [books, search, categoryFilter, stockFilter]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">📊 Library Inventory Dashboard</h2>
          <p className="page-subtitle">
            Overview of catalog holdings, copies distribution, active loans, and book maintenance.
          </p>
        </div>
        <div className="action-buttons">
          <button className="btn btn-secondary btn-sm" onClick={loadAll} disabled={loading}>
            🔄 Refresh
          </button>
          <button className="btn btn-primary" onClick={openAddModal}>
            ➕ Add New Book
          </button>
        </div>
      </div>

      {error && <div className="banner banner-error">❌ {error}</div>}
      {success && <div className="banner banner-success">✅ {success}</div>}

      {/* KPI METRIC CARDS */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-icon">📚</div>
          <div className="stat-info">
            <span className="stat-label">Unique Titles</span>
            <span className="stat-value">{stats?.totalTitles ?? books.length}</span>
            <span className="stat-sub">Cataloged books</span>
          </div>
        </div>

        <div className="stat-card cyan">
          <div className="stat-icon">📦</div>
          <div className="stat-info">
            <span className="stat-label">Total Volumes</span>
            <span className="stat-value">{stats?.totalCopies ?? 0}</span>
            <span className="stat-sub">Physical copies</span>
          </div>
        </div>

        <div className="stat-card green">
          <div className="stat-icon">🟢</div>
          <div className="stat-info">
            <span className="stat-label">Available on Shelf</span>
            <span className="stat-value">{stats?.availableCopies ?? 0}</span>
            <span className="stat-sub">Ready to borrow</span>
          </div>
        </div>

        <div className="stat-card amber">
          <div className="stat-icon">📖</div>
          <div className="stat-info">
            <span className="stat-label">Currently Borrowed</span>
            <span className="stat-value">{stats?.borrowedCopies ?? 0}</span>
            <span className="stat-sub">With students</span>
          </div>
        </div>

        <div className="stat-card red">
          <div className="stat-icon">⚠️</div>
          <div className="stat-info">
            <span className="stat-label">Overdue Loans</span>
            <span className="stat-value" style={{ color: (stats?.overdueCount ?? 0) > 0 ? 'var(--danger)' : 'inherit' }}>
              {stats?.overdueCount ?? 0}
            </span>
            <span className="stat-sub">Past due date</span>
          </div>
        </div>
      </div>

      {/* SEARCH & AVAILABILITY FILTERS */}
      <div className="card" style={{ padding: '18px 22px' }}>
        <div className="toolbar" style={{ margin: 0 }}>
          <div className="search-input-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by book title, author, category, ISBN, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-pills">
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-light)', marginRight: 4 }}>
              Stock Availability:
            </span>
            <button
              className={`filter-pill ${stockFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setStockFilter('ALL')}
            >
              All Books
            </button>
            <button
              className={`filter-pill ${stockFilter === 'AVAILABLE' ? 'active' : ''}`}
              onClick={() => setStockFilter('AVAILABLE')}
            >
              In Stock
            </button>
            <button
              className={`filter-pill ${stockFilter === 'LOW' ? 'active' : ''}`}
              onClick={() => setStockFilter('LOW')}
            >
              Low Stock (≤2)
            </button>
            <button
              className={`filter-pill ${stockFilter === 'OUT' ? 'active' : ''}`}
              onClick={() => setStockFilter('OUT')}
            >
              Out of Stock
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="filter-pills" style={{ marginTop: 14 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-light)', marginRight: 4 }}>
            Category:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`filter-pill ${categoryFilter === cat ? 'active' : ''}`}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* BOOKS INVENTORY TABLE */}
      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <span>Loading inventory from SQLite database...</span>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <div className="empty-title">No Books Found</div>
            <p className="empty-desc">
              {books.length === 0
                ? "The library currently has no books in inventory. Click 'Add New Book' to get started!"
                : 'No books match your search and filter criteria.'}
            </p>
            {books.length === 0 && (
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openAddModal}>
                ➕ Add First Book
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 60 }}>ID</th>
                  <th>Book Details</th>
                  <th>Category</th>
                  <th>ISBN</th>
                  <th>Stock Levels</th>
                  <th>Availability Status</th>
                  <th style={{ width: 160 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBooks.map((book) => {
                  const available = (book.available_copies ?? 0) > 0;
                  const borrowed = (book.total_copies ?? 0) - (book.available_copies ?? 0);
                  const percentage = book.total_copies > 0 ? (book.available_copies / book.total_copies) * 100 : 0;
                  const barClass = percentage > 50 ? 'high' : percentage > 20 ? 'medium' : 'low';

                  return (
                    <tr key={book.id}>
                      <td>#{book.id}</td>
                      <td>
                        <strong>{book.title}</strong>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                          By {book.author}
                        </div>
                      </td>
                      <td>
                        <span className="book-category-tag">{book.category || 'General'}</span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--navy-mid)' }}>
                          {book.isbn || '—'}
                        </span>
                      </td>
                      <td>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                            <span><strong>{book.available_copies}</strong> avail</span>
                            <span style={{ color: 'var(--text-muted)' }}>{borrowed} borrowed</span>
                          </div>
                          <div className="copies-bar-bg" style={{ width: 120 }}>
                            <div
                              className={`copies-bar-fill ${barClass}`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-light)' }}>
                            Total: {book.total_copies}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${available ? 'available' : 'out'}`}>
                          {available ? `Available (${book.available_copies})` : 'Out of Stock'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => openEditModal(book)}
                            title="Edit book details or copies"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(book)}
                            title="Remove book from inventory"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD / EDIT BOOK MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => !saving && setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingBook ? '✏️ Update Book Details & Copies' : '➕ Add Book to Inventory'}
              </h3>
              <button
                className="btn-close"
                onClick={() => !saving && setIsModalOpen(false)}
                disabled={saving}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="field" style={{ marginBottom: 14 }}>
                <label>Book Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Introduction to Algorithms"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>

              <div className="field" style={{ marginBottom: 14 }}>
                <label>Author *</label>
                <input
                  type="text"
                  placeholder="e.g. Thomas H. Cormen"
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                  required
                />
              </div>

              <div className="form-row">
                <div className="field">
                  <label>Category / Genre</label>
                  <input
                    type="text"
                    placeholder="e.g. Computer Science, Fiction..."
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  />
                </div>

                <div className="field">
                  <label>ISBN</label>
                  <input
                    type="text"
                    placeholder="e.g. 978-0262033848"
                    value={form.isbn}
                    onChange={(e) => setForm({ ...form, isbn: e.target.value })}
                  />
                </div>
              </div>

              <div className="field" style={{ marginBottom: 20 }}>
                <label>
                  Total Copies in Library *
                  {editingBook && (
                    <span style={{ fontSize: 11, fontWeight: 'normal', color: 'var(--text-muted)', marginLeft: 8 }}>
                      (Currently {(editingBook.total_copies ?? 0) - (editingBook.available_copies ?? 0)} copy/copies borrowed)
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  min={editingBook ? Math.max(1, (editingBook.total_copies ?? 0) - (editingBook.available_copies ?? 0)) : 1}
                  value={form.total_copies}
                  onChange={(e) => setForm({ ...form, total_copies: e.target.value })}
                  required
                />
                <span style={{ fontSize: 11, color: 'var(--text-light)' }}>
                  Total quantity owned by the library. Available copies will automatically adjust.
                </span>
              </div>

              <div className="action-buttons" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving
                    ? 'Saving...'
                    : editingBook
                    ? '💾 Update Book'
                    : '➕ Add to Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}