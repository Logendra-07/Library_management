import { useEffect, useState, useMemo } from 'react';
import { getStudentHistory } from '../../api';

export default function BorrowingHistory({ user }) {
  const [history, setHistory] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadHistory();
  }, [user]);

  async function loadHistory() {
    if (!user?.username) return;
    setLoading(true);
    setError('');
    try {
      const data = await getStudentHistory(user.username);
      setHistory(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load borrowing history.');
    } finally {
      setLoading(false);
    }
  }

  // Count summaries
  const stats = useMemo(() => {
    const total = history.length;
    const active = history.filter((r) => r.status === 'Borrowed').length;
    const overdue = history.filter((r) => r.status === 'Overdue').length;
    const returned = history.filter((r) => r.status === 'Returned').length;
    return { total, active, overdue, returned };
  }, [history]);

  // Filter history by status and search
  const filteredRecords = useMemo(() => {
    return history.filter((rec) => {
      const matchesFilter = statusFilter === 'ALL' || rec.status?.toLowerCase() === statusFilter.toLowerCase();
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        rec.title?.toLowerCase().includes(q) ||
        rec.author?.toLowerCase().includes(q) ||
        rec.borrow_date?.includes(q) ||
        rec.due_date?.includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [history, statusFilter, search]);

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
          <h2 className="page-title">📋 My Borrowing History</h2>
          <p className="page-subtitle">
            Complete record of your borrowings, returns, and ongoing loan statuses.
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadHistory} disabled={loading}>
          🔄 Refresh
        </button>
      </div>

      {error && <div className="banner banner-error">❌ {error}</div>}

      {/* Metric Cards Summary */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card blue">
          <div className="stat-icon">📚</div>
          <div className="stat-info">
            <span className="stat-label">Total Transactions</span>
            <span className="stat-value">{stats.total}</span>
          </div>
        </div>

        <div className="stat-card cyan">
          <div className="stat-icon">📖</div>
          <div className="stat-info">
            <span className="stat-label">Active Loans</span>
            <span className="stat-value">{stats.active}</span>
          </div>
        </div>

        <div className="stat-card green">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <span className="stat-label">Books Returned</span>
            <span className="stat-value">{stats.returned}</span>
          </div>
        </div>

        <div className="stat-card red">
          <div className="stat-icon">⚠️</div>
          <div className="stat-info">
            <span className="stat-label">Overdue Books</span>
            <span className="stat-value" style={{ color: stats.overdue > 0 ? 'var(--danger)' : 'inherit' }}>
              {stats.overdue}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div className="toolbar" style={{ margin: 0 }}>
          <div className="search-input-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search history by title, author, date..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-pills">
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-light)', marginRight: 4 }}>
              Status:
            </span>
            <button
              className={`filter-pill ${statusFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setStatusFilter('ALL')}
            >
              All ({history.length})
            </button>
            <button
              className={`filter-pill ${statusFilter === 'Borrowed' ? 'active' : ''}`}
              onClick={() => setStatusFilter('Borrowed')}
            >
              Active ({stats.active})
            </button>
            <button
              className={`filter-pill ${statusFilter === 'Overdue' ? 'active' : ''}`}
              onClick={() => setStatusFilter('Overdue')}
            >
              Overdue ({stats.overdue})
            </button>
            <button
              className={`filter-pill ${statusFilter === 'Returned' ? 'active' : ''}`}
              onClick={() => setStatusFilter('Returned')}
            >
              Returned ({stats.returned})
            </button>
          </div>
        </div>
      </div>

      {/* History Table */}
      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <span>Loading borrowing records...</span>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📜</div>
            <div className="empty-title">No Records Found</div>
            <p className="empty-desc">
              {history.length === 0
                ? "You haven't borrowed any books yet. Visit the catalog to start reading!"
                : "No records match your search or filter selection."}
            </p>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Record #</th>
                <th>Book Title</th>
                <th>Author</th>
                <th>Borrowed Date</th>
                <th>Due Date</th>
                <th>Returned Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((item) => {
                const isOverdue = item.status === 'Overdue';
                return (
                  <tr key={item.id} style={{ background: isOverdue ? '#fff5f5' : 'inherit' }}>
                    <td>#{item.id}</td>
                    <td>
                      <strong>{item.title}</strong>
                      {item.category && (
                        <div style={{ fontSize: 11, color: 'var(--text-light)' }}>
                          {item.category}
                        </div>
                      )}
                    </td>
                    <td>{item.author}</td>
                    <td>{item.borrow_date || item.borrowed_date}</td>
                    <td>
                      <span style={{ color: isOverdue ? 'var(--danger)' : 'inherit', fontWeight: isOverdue ? 700 : 500 }}>
                        {item.due_date} {isOverdue && '⚠️'}
                      </span>
                    </td>
                    <td>
                      {item.return_date || item.returned_date ? (
                        <span style={{ color: 'var(--success)', fontWeight: 500 }}>
                          {item.return_date || item.returned_date}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-light)' }}>— Not returned yet —</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${getBadgeClass(item.status)}`}>
                        {item.status}
                      </span>
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
