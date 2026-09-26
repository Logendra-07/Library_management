import { useEffect, useState } from 'react';
import { getOverdueBooks, returnBook } from '../../api';

export default function OverdueBooks() {
  const [overdueList, setOverdueList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadOverdue();
  }, []);

  async function loadOverdue() {
    setLoading(true);
    setError('');
    try {
      const data = await getOverdueBooks();
      setOverdueList(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load overdue books.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminReturn(recordId, bookTitle, studentName) {
    const confirm = window.confirm(
      `Confirm return for overdue book "${bookTitle}" loaned to student "${studentName}"?`
    );
    if (!confirm) return;

    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await returnBook(recordId);
      setSuccess(`✅ ${res.message || `Processed return for "${bookTitle}".`}`);
      await loadOverdue();
    } catch (err) {
      setError(err.message || 'Failed to process return.');
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
          <h2 className="page-title">⚠️ Overdue Books Management</h2>
          <p className="page-subtitle">
            System automatically tracks due dates and tags overdue books. Manage overdue loans across all students.
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadOverdue} disabled={loading || actionLoading}>
          🔄 Refresh Overdue List
        </button>
      </div>

      {error && <div className="banner banner-error">❌ {error}</div>}
      {success && <div className="banner banner-success">{success}</div>}

      {/* Overdue alert indicator */}
      {!loading && overdueList.length > 0 && (
        <div className="banner banner-error" style={{ padding: '16px 20px', borderRadius: 12 }}>
          <span style={{ fontSize: 24 }}>🚨</span>
          <div>
            <strong>Action Needed:</strong> There are currently {overdueList.length} book loan(s) past their due dates in the library system.
            <div style={{ fontSize: 13, marginTop: 4 }}>
              Status has automatically transitioned from <code>BORROWED</code> → <code>OVERDUE</code>.
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <span>Checking overdue records...</span>
        </div>
      ) : overdueList.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>🎉</div>
          <h3 style={{ fontSize: 20, color: 'var(--navy-dark)', marginBottom: 8 }}>
            No Overdue Books Found!
          </h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto', fontSize: 14 }}>
            All active borrowings across the student body are currently within their authorized due dates.
          </p>
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
                <th>Due Date</th>
                <th>Days Past Due</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {overdueList.map((item) => {
                const days = getDaysOverdue(item.due_date);
                return (
                  <tr key={item.id} style={{ background: '#fff5f5' }}>
                    <td>#{item.id}</td>
                    <td>
                      <span className="user-pill" style={{ color: 'var(--danger)', background: '#fee2e2', border: '1px solid #fca5a5' }}>
                        👤 {item.student_name}
                      </span>
                    </td>
                    <td>
                      <strong>{item.title}</strong>
                      {item.category && (
                        <div style={{ fontSize: 11, color: 'var(--text-light)' }}>
                          {item.category}
                        </div>
                      )}
                    </td>
                    <td>{item.author}</td>
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
                        onClick={() => handleAdminReturn(item.id, item.title, item.student_name)}
                      >
                        ↩️ Process Return
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
  );
}
