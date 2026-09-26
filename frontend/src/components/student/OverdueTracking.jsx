import { useEffect, useState } from 'react';
import { getOverdueBooks, returnBook } from '../../api';

export default function OverdueTracking({ user, onNavigateTab }) {
  const [overdueList, setOverdueList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadOverdue();
  }, [user]);

  async function loadOverdue() {
    if (!user?.username) return;
    setLoading(true);
    setError('');
    try {
      const data = await getOverdueBooks(user.username);
      setOverdueList(data || []);
    } catch (err) {
      setError(err.message || 'Failed to check overdue records.');
    } finally {
      setLoading(false);
    }
  }

  async function handleReturn(recordId, bookTitle) {
    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await returnBook(recordId);
      setSuccess(`🎉 ${res.message || `Returned overdue book "${bookTitle}"! Your account is updated.`}`);
      await loadOverdue();
    } catch (err) {
      setError(err.message || 'Failed to return overdue book.');
    } finally {
      setActionLoading(false);
    }
  }

  function getDaysOverdue(dueDateStr) {
    if (!dueDateStr) return 1;
    const due = new Date(dueDateStr);
    const now = new Date();
    const diffTime = now.getTime() - due.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">⚠️ Overdue Tracking & Alerts</h2>
          <p className="page-subtitle">
            Automated tracking compares due dates with today's date. Keep your account clear of fines!
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadOverdue} disabled={loading || actionLoading}>
          🔄 Check Due Dates
        </button>
      </div>

      {error && <div className="banner banner-error">❌ {error}</div>}
      {success && <div className="banner banner-success">{success}</div>}

      {/* Prominent Overdue Warning Banner if books exist */}
      {!loading && overdueList.length > 0 && (
        <div className="banner banner-error" style={{ padding: '16px 20px', borderRadius: 12 }}>
          <span style={{ fontSize: 24 }}>🚨</span>
          <div>
            <strong>Attention Required:</strong> You have {overdueList.length} overdue book(s) in your possession!
            <div style={{ fontSize: 13, marginTop: 4 }}>
              The system has automatically updated status from <code>BORROWED</code> → <code>OVERDUE</code>. Please return them promptly.
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <span>Checking library due dates and syncing records...</span>
        </div>
      ) : overdueList.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>🎉</div>
          <h3 style={{ fontSize: 20, color: 'var(--navy-dark)', marginBottom: 8 }}>
            No Overdue Books!
          </h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: 500, margin: '0 auto 24px auto', fontSize: 14 }}>
            Great job! All your borrowed books are either within their allowed borrowing window or already returned. Your student borrowing privileges are active.
          </p>
          {onNavigateTab && (
            <button className="btn btn-primary" onClick={() => onNavigateTab('search')}>
              Browse Catalog to Borrow Books ➔
            </button>
          )}
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ color: 'var(--danger)' }}>
              <span>⚠️</span>
              <span>Overdue Books Awaiting Return ({overdueList.length})</span>
            </h3>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Student: <strong>{user?.username}</strong>
            </span>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Book Title</th>
                  <th>Author</th>
                  <th>Borrowed Date</th>
                  <th>Due Date</th>
                  <th>Lapse Duration</th>
                  <th>Current Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {overdueList.map((item) => {
                  const days = getDaysOverdue(item.due_date);
                  return (
                    <tr key={item.id} style={{ background: '#fff5f5' }}>
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
                        <strong style={{ color: 'var(--danger)' }}>
                          {item.due_date}
                        </strong>
                      </td>
                      <td>
                        <span className="badge overdue" style={{ fontWeight: 700 }}>
                          ⚠️ {days} day{days > 1 ? 's' : ''} late
                        </span>
                      </td>
                      <td>
                        <span className="badge overdue">
                          OVERDUE
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-success"
                          disabled={actionLoading}
                          onClick={() => handleReturn(item.id, item.title)}
                        >
                          ↩️ Return Book Now
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
