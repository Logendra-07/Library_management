import { useEffect, useState, useMemo } from 'react';
import { getAllBorrowings, returnBook } from '../../api';

export default function BorrowingRecords() {
  const [records, setRecords] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadRecords();
  }, []);

  async function loadRecords() {
    setLoading(true);
    setError('');
    try {
      const data = await getAllBorrowings();
      setRecords(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load borrowing records.');
    } finally {
      setLoading(false);
    }
  }

  // Admin action: force return book on behalf of student
  async function handleAdminReturn(recordId, bookTitle, studentName) {
    const confirm = window.confirm(`Mark "${bookTitle}" returned for student "${studentName}"?`);
    if (!confirm) return;

    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await returnBook(recordId);
      setSuccess(`✅ ${res.message || `Processed return for "${bookTitle}". Available copies incremented.`}`);
      await loadRecords();
    } catch (err) {
      setError(err.message || 'Failed to process return.');
    } finally {
      setActionLoading(false);
    }
  }

  // Filtered list
  const filtered = useMemo(() => {
    return records.filter((r) => {
      const matchesFilter = filter === 'ALL' || r.status?.toLowerCase() === filter.toLowerCase();
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        r.student_name?.toLowerCase().includes(q) ||
        r.title?.toLowerCase().includes(q) ||
        r.author?.toLowerCase().includes(q) ||
        r.borrow_date?.includes(q) ||
        r.due_date?.includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [records, filter, search]);

  function getBadgeClass(status) {
    if (!status) return 'borrowed';
    const s = status.toLowerCase();
    if (s === 'overdue') return 'overdue';
    if (s === 'returned') return 'returned';
    return 'borrowed';
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">👥 All Library Borrowing Records</h2>
          <p className="page-subtitle">
            Auditing and oversight of every book borrowed, returned, or overdue across all students.
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadRecords} disabled={loading || actionLoading}>
          🔄 Refresh Records
        </button>
      </div>

      {error && <div className="banner banner-error">❌ {error}</div>}
      {success && <div className="banner banner-success">{success}</div>}

      {/* Toolbar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div className="toolbar" style={{ margin: 0 }}>
          <div className="search-input-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by student username, book title, date..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-pills">
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-light)', marginRight: 4 }}>
              Status:
            </span>
            <button
              className={`filter-pill ${filter === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilter('ALL')}
            >
              All Records ({records.length})
            </button>
            <button
              className={`filter-pill ${filter === 'Borrowed' ? 'active' : ''}`}
              onClick={() => setFilter('Borrowed')}
            >
              Borrowed ({records.filter((r) => r.status === 'Borrowed').length})
            </button>
            <button
              className={`filter-pill ${filter === 'Overdue' ? 'active' : ''}`}
              onClick={() => setFilter('Overdue')}
            >
              Overdue ({records.filter((r) => r.status === 'Overdue').length})
            </button>
            <button
              className={`filter-pill ${filter === 'Returned' ? 'active' : ''}`}
              onClick={() => setFilter('Returned')}
            >
              Returned ({records.filter((r) => r.status === 'Returned').length})
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <span>Loading student borrowing records...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">🗂️</div>
            <div className="empty-title">No Records Found</div>
            <p className="empty-desc">
              {records.length === 0
                ? 'No borrowing activity recorded yet in the database.'
                : 'No records match your search or filter selection.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th style={{ width: 60 }}>#ID</th>
                <th>Student</th>
                <th>Book Title</th>
                <th>Author</th>
                <th>Borrowed Date</th>
                <th>Due Date</th>
                <th>Returned Date</th>
                <th>Status</th>
                <th>Admin Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const isOverdue = r.status === 'Overdue';
                const canReturn = r.status === 'Borrowed' || r.status === 'Overdue';

                return (
                  <tr key={r.id} style={{ background: isOverdue ? '#fff5f5' : 'inherit' }}>
                    <td>#{r.id}</td>
                    <td>
                      <span className="user-pill" style={{ color: 'var(--navy-dark)', background: '#f1f5f9', display: 'inline-flex' }}>
                        👤 {r.student_name}
                      </span>
                    </td>
                    <td>
                      <strong>{r.title}</strong>
                      {r.category && (
                        <div style={{ fontSize: 11, color: 'var(--text-light)' }}>
                          {r.category}
                        </div>
                      )}
                    </td>
                    <td>{r.author}</td>
                    <td>{r.borrow_date || r.borrowed_date}</td>
                    <td>
                      <span style={{ fontWeight: isOverdue ? 700 : 500, color: isOverdue ? 'var(--danger)' : 'inherit' }}>
                        {r.due_date} {isOverdue && '⚠️'}
                      </span>
                    </td>
                    <td>
                      {r.return_date || r.returned_date ? (
                        <span style={{ color: 'var(--success)', fontWeight: 500 }}>
                          {r.return_date || r.returned_date}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-light)' }}>— Active —</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${getBadgeClass(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      {canReturn ? (
                        <button
                          className="btn btn-sm btn-success"
                          disabled={actionLoading}
                          onClick={() => handleAdminReturn(r.id, r.title, r.student_name)}
                        >
                          ↩️ Mark Returned
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-light)' }}>
                          Completed
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
