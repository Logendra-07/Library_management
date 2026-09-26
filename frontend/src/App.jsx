import { useState, useEffect } from 'react';
import Login from './components/auth/Login.jsx';

import SearchCatalog from './components/student/SearchCatalog.jsx';
import BorrowReturn from './components/student/BorrowReturn.jsx';
import BorrowingHistory from './components/student/BorrowingHistory.jsx';
import OverdueTracking from './components/student/OverdueTracking.jsx';

import InventoryDashboard from './components/admin/InventoryDashboard.jsx';
import BorrowingRecords from './components/admin/BorrowingRecords.jsx';
import OverdueBooks from './components/admin/OverdueBooks.jsx';

import { getOverdueBooks } from './api.js';

const STUDENT_TABS = [
  {
    key: 'search',
    label: '🔎 Search Catalog',
    component: SearchCatalog,
  },
  {
    key: 'borrow',
    label: '📖 Borrow & Return',
    component: BorrowReturn,
  },
  {
    key: 'history',
    label: '📋 Borrowing History',
    component: BorrowingHistory,
  },
  {
    key: 'overdue',
    label: '⚠️ Overdue Tracking',
    component: OverdueTracking,
  },
];

const ADMIN_TABS = [
  {
    key: 'inventory',
    label: '📊 Inventory Dashboard',
    component: InventoryDashboard,
  },
  {
    key: 'records',
    label: '👥 Borrowing Records',
    component: BorrowingRecords,
  },
  {
    key: 'overdue',
    label: '⚠️ Overdue Books',
    component: OverdueBooks,
  },
];

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('library_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState(() => {
    if (!user) return 'search';
    return user.role === 'student' ? 'search' : 'inventory';
  });

  const [overdueBadgeCount, setOverdueBadgeCount] = useState(0);

  // Load badge counts for overdue items
  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    async function checkOverdueCount() {
      try {
        const studentParam = user.role === 'student' ? user.username : '';
        const list = await getOverdueBooks(studentParam);
        if (isMounted && Array.isArray(list)) {
          setOverdueBadgeCount(list.length);
        }
      } catch {
        // Silently ignore background badge errors
      }
    }

    checkOverdueCount();
    const interval = setInterval(checkOverdueCount, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user, activeTab]);

  function handleLogin(userData) {
    setUser(userData);
    localStorage.setItem('library_user', JSON.stringify(userData));
    if (userData.role === 'student') {
      setActiveTab('search');
    } else {
      setActiveTab('inventory');
    }
  }

  function handleLogout() {
    setUser(null);
    localStorage.removeItem('library_user');
    setActiveTab('search');
    setOverdueBadgeCount(0);
  }

  // If not logged in, show polished Login / Register page
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const tabs = user.role === 'student' ? STUDENT_TABS : ADMIN_TABS;
  const currentTab = tabs.find((t) => t.key === activeTab) || tabs[0];
  const ActiveComponent = currentTab.component;

  return (
    <div className="app-shell">
      {/* Top Header */}
      <header className="topbar">
        <div className="brand-section">
          <div className="brand-logo">📚</div>
          <div>
            <div className="brand-title">
              <span>Smart Library Pro</span>
              <span className={`portal-badge ${user.role}`}>
                {user.role === 'student' ? 'Student Portal' : 'Admin Portal'}
              </span>
            </div>
          </div>
        </div>

        <div className="user-section">
          <div className="user-pill">
            <div className="user-avatar-circle">
              {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </div>
            <span>{user.username}</span>
            <span style={{ fontSize: 11, opacity: 0.8 }}>({user.role})</span>
          </div>

          <button className="btn-logout" onClick={handleLogout} title="Sign out of account">
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-heading">
            {user.role === 'student' ? 'Student Navigation' : 'Librarian Console'}
          </div>

          {tabs.map((tab) => {
            const isOverdueTab = tab.key === 'overdue';
            const showBadge = isOverdueTab && overdueBadgeCount > 0;

            return (
              <button
                key={tab.key}
                className={activeTab === tab.key ? 'active' : ''}
                onClick={() => setActiveTab(tab.key)}
              >
                <span>{tab.label}</span>
                {showBadge && (
                  <span className="sidebar-badge" title={`${overdueBadgeCount} overdue book(s)`}>
                    {overdueBadgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        <main className="content">
          <ActiveComponent
            user={user}
            onNavigateTab={(tabKey) => setActiveTab(tabKey)}
          />
        </main>
      </div>
    </div>
  );
}