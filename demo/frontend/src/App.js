import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import io from 'socket.io-client';

import './App.css';
import Dashboard from './components/Dashboard';
import CustomerView from './components/CustomerView';
import AdminView from './components/AdminView';
import Navigation from './components/Navigation';
import ConnectionStatus from './components/ConnectionStatus';
import NotificationCenter from './components/NotificationCenter';

function App() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [initialData, setInitialData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');

  useEffect(() => {
    // Initialize Socket.IO connection
    const newSocket = io('http://localhost:5001', {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to real-time server');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      setConnected(false);
    });

    // Listen for initial data
    newSocket.on('initialData', (data) => {
      console.log('📊 Received initial data:', data);
      setInitialData(data);
      setOrders(data.orders || []);
      setProducts(data.products || []);
      setUsers(data.users || []);
    });

    // Listen for real-time order updates
    newSocket.on('orderUpdate', (update) => {
      console.log('📦 Order update received:', update);
      
      setOrders(prev => {
        if (update.type === 'insert') {
          return [update.data, ...prev];
        } else if (update.type === 'update') {
          return prev.map(order => 
            order._id === update.orderId ? { ...order, ...update.data } : order
          );
        } else if (update.type === 'delete') {
          return prev.filter(order => order._id !== update.orderId);
        }
        return prev;
      });
    });

    // Listen for real-time product updates
    newSocket.on('productUpdate', (update) => {
      console.log('📦 Product update received:', update);
      
      setProducts(prev => {
        if (update.type === 'insert') {
          return [...prev, update.data];
        } else if (update.type === 'update') {
          return prev.map(product => 
            product._id === update.productId ? { ...product, ...update.data } : product
          );
        } else if (update.type === 'delete') {
          return prev.filter(product => product._id !== update.productId);
        }
        return prev;
      });
    });

    // Listen for user updates
    newSocket.on('userUpdate', (update) => {
      console.log('👤 User update received:', update);
      
      setUsers(prev => {
        if (update.type === 'insert') {
          return [...prev, update.data];
        } else if (update.type === 'update') {
          return prev.map(user => 
            user._id === update.userId ? { ...user, ...update.data } : user
          );
        } else if (update.type === 'delete') {
          return prev.filter(user => user._id !== update.userId);
        }
        return prev;
      });
    });

    // Listen for notifications
    newSocket.on('notification', (notification) => {
      console.log('🔔 Notification received:', notification);
      setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50
    });

    // Listen for metrics
    newSocket.on('metrics', (metricsData) => {
      console.log('📊 Metrics received:', metricsData);
      setMetrics(metricsData);
    });

    setSocket(newSocket);

    // Request initial metrics
    setTimeout(() => {
      newSocket.emit('requestData', 'orders');
      newSocket.emit('requestData', 'products');
      newSocket.emit('requestData', 'users');
    }, 1000);

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Clear old notifications
  useEffect(() => {
    const interval = setInterval(() => {
      setNotifications(prev => 
        prev.filter(notif => 
          Date.now() - new Date(notif.timestamp).getTime() < 300000 // Keep for 5 minutes
        )
      );
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const contextValue = {
    socket,
    connected,
    orders,
    products,
    users,
    notifications,
    metrics,
    setOrders,
    setProducts,
    setUsers
  };

  return (
    <div className="App">
      <Router>
        <div className="app-container">
          {/* Header */}
          <header className="app-header">
            <div className="header-content">
              <div className="header-left">
                <h1 className="app-title">
                  🚀 Real-time Order Management
                </h1>
                <span className="app-subtitle">
                  Powered by Ultimate Streaming Package
                </span>
              </div>
              <div className="header-right">
                <ConnectionStatus connected={connected} />
                <NotificationCenter notifications={notifications} />
              </div>
            </div>
            <Navigation currentView={currentView} setCurrentView={setCurrentView} />
          </header>

          {/* Main Content */}
          <main className="app-main">
            <Routes>
              <Route 
                path="/" 
                element={<Navigate to="/dashboard" replace />} 
              />
              <Route 
                path="/dashboard" 
                element={
                  <Dashboard 
                    {...contextValue}
                    setCurrentView={setCurrentView}
                  />
                } 
              />
              <Route 
                path="/customer" 
                element={
                  <CustomerView 
                    {...contextValue}
                    setCurrentView={setCurrentView}
                  />
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <AdminView 
                    {...contextValue}
                    setCurrentView={setCurrentView}
                  />
                } 
              />
            </Routes>
          </main>

          {/* Footer */}
          <footer className="app-footer">
            <div className="footer-content">
              <div className="footer-left">
                <span>
                  🎯 Demonstrating real-time capabilities with sub-millisecond latency
                </span>
              </div>
              <div className="footer-right">
                <span>
                  Connected Users: {connected ? '1' : '0'} | 
                  Orders: {orders.length} | 
                  Products: {products.length}
                </span>
              </div>
            </div>
          </footer>
        </div>
      </Router>

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            theme: {
              primary: '#4ade80',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            theme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
}

export default App; 