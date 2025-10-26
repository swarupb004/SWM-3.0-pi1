import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="nav">
      <div className="container nav-container">
        <Link to="/dashboard" className="nav-brand">
          BPO Tracker
        </Link>

        <ul className="nav-menu">
          <li>
            <Link
              to="/dashboard"
              className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
            >
              Dashboard
            </Link>
          </li>
          <li>
            <Link
              to="/attendance"
              className={`nav-link ${isActive('/attendance') ? 'active' : ''}`}
            >
              Attendance
            </Link>
          </li>
          <li>
            <Link
              to="/cases"
              className={`nav-link ${isActive('/cases') ? 'active' : ''}`}
            >
              Cases
            </Link>
          </li>
          {user?.role && ['manager', 'admin'].includes(user.role) && (
            <>
              <li>
                <Link
                  to="/team"
                  className={`nav-link ${isActive('/team') ? 'active' : ''}`}
                >
                  Team
                </Link>
              </li>
              <li>
                <Link
                  to="/import"
                  className={`nav-link ${isActive('/import') ? 'active' : ''}`}
                >
                  Import
                </Link>
              </li>
            </>
          )}
          <li>
            <Link
              to="/reports"
              className={`nav-link ${isActive('/reports') ? 'active' : ''}`}
            >
              Reports
            </Link>
          </li>
          <li>
            <button onClick={handleLogout} className="btn btn-sm btn-secondary">
              Logout ({user?.username})
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navigation;
