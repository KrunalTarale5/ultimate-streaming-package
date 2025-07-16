import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navigation = ({ currentView, setCurrentView }) => {
  const location = useLocation();

  const navItems = [
    {
      id: 'dashboard',
      path: '/dashboard',
      label: 'Dashboard',
      icon: '📊',
      description: 'Real-time overview'
    },
    {
      id: 'customer',
      path: '/customer',
      label: 'Customer View',
      icon: '👤',
      description: 'Order tracking'
    },
    {
      id: 'admin',
      path: '/admin',
      label: 'Admin View',
      icon: '⚙️',
      description: 'Management panel'
    }
  ];

  return (
    <nav className="navigation">
      <ul className="nav-list">
        {navItems.map(item => (
          <li key={item.id} className="nav-item">
            <Link
              to={item.path}
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => setCurrentView(item.id)}
              title={item.description}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Navigation; 