import React, { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

const NotificationCenter = ({ notifications }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.length;

  return (
    <div className="notification-center" ref={dropdownRef}>
      <button
        className="notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        title="View notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            Recent Activity ({unreadCount})
          </div>
          
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-item">
                <p className="text-center text-gray-500 py-4">
                  No recent notifications
                </p>
              </div>
            ) : (
              notifications.slice(0, 10).map((notification, index) => (
                <div key={index} className="notification-item">
                  <div className={`notification-type ${notification.type}`}>
                    {notification.type.replace('_', ' ').toUpperCase()}
                  </div>
                  <div className="notification-message">
                    {notification.message}
                  </div>
                  <div className="notification-time">
                    {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 10 && (
            <div className="notification-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setIsOpen(false)}
              >
                View All ({notifications.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter; 