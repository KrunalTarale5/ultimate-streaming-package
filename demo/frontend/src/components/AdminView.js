import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import axios from 'axios';
import toast from 'react-hot-toast';

const AdminView = ({ orders, products, users, notifications, metrics, connected, socket }) => {
  const [activeTab, setActiveTab] = useState('orders');
  const [isUpdating, setIsUpdating] = useState({});

  const updateOrderStatus = async (orderId, newStatus) => {
    setIsUpdating(prev => ({ ...prev, [orderId]: true }));
    
    try {
      const response = await axios.put(`/api/orders/${orderId}/status`, {
        status: newStatus
      });

      if (response.data.success) {
        toast.success(`Order ${orderId} updated to ${newStatus}!`);
      }
    } catch (error) {
      toast.error('Failed to update order status');
      console.error('Error updating order:', error);
    } finally {
      setIsUpdating(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const updateProductStock = async (productId, newStock) => {
    setIsUpdating(prev => ({ ...prev, [productId]: true }));
    
    try {
      const response = await axios.put(`/api/products/${productId}/stock`, {
        stock: newStock
      });

      if (response.data.success) {
        toast.success(`Product stock updated!`);
      }
    } catch (error) {
      toast.error('Failed to update product stock');
      console.error('Error updating product:', error);
    } finally {
      setIsUpdating(prev => ({ ...prev, [productId]: false }));
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStockColor = (stock) => {
    if (stock === 0) return 'text-red-600';
    if (stock < 10) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Statistics
  const stats = {
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    totalRevenue: orders.reduce((sum, order) => sum + order.total, 0),
    lowStockItems: products.filter(p => p.stock < 10).length,
    totalProducts: products.length,
    totalCustomers: users.filter(u => u.type === 'customer').length
  };

  const tabs = [
    { id: 'orders', label: 'Orders Management', icon: '📦' },
    { id: 'products', label: 'Inventory Management', icon: '📋' },
    { id: 'analytics', label: 'Analytics & Metrics', icon: '📊' },
    { id: 'system', label: 'System Monitor', icon: '⚙️' }
  ];

  return (
    <div className="admin-view">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
            <p className="text-gray-600">Real-time management and monitoring</p>
          </div>
          <div className="real-time-indicator">
            <div className="real-time-dot"></div>
            Live Management
          </div>
        </div>

        {/* Admin Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-value">{stats.totalOrders}</div>
            <div className="stat-label">Total Orders</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div className="stat-value">{stats.pendingOrders}</div>
            <div className="stat-label">Pending Orders</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-value">${stats.totalRevenue.toFixed(2)}</div>
            <div className="stat-label">Total Revenue</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⚠️</div>
            <div className="stat-value">{stats.lowStockItems}</div>
            <div className="stat-label">Low Stock Alerts</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="card mb-6">
        <div className="flex border-b">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Orders Management */}
          {activeTab === 'orders' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Orders Management</h3>
                <div className="real-time-indicator">
                  <div className="real-time-dot"></div>
                  Live Updates
                </div>
              </div>
              
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order._id}>
                        <td className="font-mono text-sm">{order._id}</td>
                        <td>{order.userId}</td>
                        <td className="font-semibold">${order.total.toFixed(2)}</td>
                        <td>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {order.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="text-sm text-gray-600">
                          {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                        </td>
                        <td>
                          <div className="flex gap-2">
                            {order.status === 'pending' && (
                              <button
                                className="btn btn-primary text-xs"
                                onClick={() => updateOrderStatus(order._id, 'processing')}
                                disabled={isUpdating[order._id]}
                              >
                                {isUpdating[order._id] ? '...' : 'Process'}
                              </button>
                            )}
                            {order.status === 'processing' && (
                              <button
                                className="btn btn-warning text-xs"
                                onClick={() => updateOrderStatus(order._id, 'shipped')}
                                disabled={isUpdating[order._id]}
                              >
                                {isUpdating[order._id] ? '...' : 'Ship'}
                              </button>
                            )}
                            {order.status === 'shipped' && (
                              <button
                                className="btn btn-success text-xs"
                                onClick={() => updateOrderStatus(order._id, 'delivered')}
                                disabled={isUpdating[order._id]}
                              >
                                {isUpdating[order._id] ? '...' : 'Deliver'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Inventory Management */}
          {activeTab === 'products' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Inventory Management</h3>
                <div className="real-time-indicator">
                  <div className="real-time-dot"></div>
                  Live Stock Tracking
                </div>
              </div>
              
              <div className="grid grid-2 gap-4">
                {products.map(product => (
                  <div key={product._id} className="border rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      <div className="text-4xl">{product.image}</div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{product.name}</h4>
                        <p className="text-sm text-gray-600 mb-2">{product.category}</p>
                        <p className="font-bold text-lg">${product.price}</p>
                        
                        <div className="flex items-center gap-2 mt-3">
                          <span className="text-sm">Stock:</span>
                          <span className={`font-bold ${getStockColor(product.stock)}`}>
                            {product.stock}
                          </span>
                          {product.stock < 10 && (
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                              LOW STOCK
                            </span>
                          )}
                        </div>
                        
                        <div className="flex gap-2 mt-3">
                          <button
                            className="btn btn-secondary text-xs"
                            onClick={() => updateProductStock(product._id, Math.max(0, product.stock - 10))}
                            disabled={isUpdating[product._id]}
                          >
                            -10
                          </button>
                          <button
                            className="btn btn-primary text-xs"
                            onClick={() => updateProductStock(product._id, product.stock + 10)}
                            disabled={isUpdating[product._id]}
                          >
                            +10
                          </button>
                          <button
                            className="btn btn-success text-xs"
                            onClick={() => updateProductStock(product._id, 100)}
                            disabled={isUpdating[product._id]}
                          >
                            Restock
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analytics */}
          {activeTab === 'analytics' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Analytics & Metrics</h3>
                <div className="real-time-indicator">
                  <div className="real-time-dot"></div>
                  Live Analytics
                </div>
              </div>
              
              <div className="grid grid-2 gap-6">
                <div className="card">
                  <h4 className="font-semibold mb-4">Order Status Distribution</h4>
                  <div className="space-y-2">
                    {['pending', 'processing', 'shipped', 'delivered'].map(status => {
                      const count = orders.filter(o => o.status === status).length;
                      const percentage = orders.length > 0 ? (count / orders.length) * 100 : 0;
                      return (
                        <div key={status} className="flex items-center justify-between">
                          <span className="capitalize">{status}:</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600">{count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="card">
                  <h4 className="font-semibold mb-4">Recent Activity</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {notifications.slice(0, 10).map((notification, index) => (
                      <div key={index} className="text-sm border-l-2 border-blue-200 pl-3 py-1">
                        <div className={`notification-type ${notification.type} text-xs`}>
                          {notification.type.replace('_', ' ')}
                        </div>
                        <div className="text-gray-700">{notification.message}</div>
                        <div className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* System Monitor */}
          {activeTab === 'system' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">System Monitor</h3>
                <div className="real-time-indicator">
                  <div className="real-time-dot"></div>
                  Live System Data
                </div>
              </div>
              
              <div className="grid grid-2 gap-6">
                <div className="card">
                  <h4 className="font-semibold mb-4">Streaming Package Performance</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Cache Hit Ratio:</span>
                      <span className="font-bold text-green-600">
                        {metrics?.cacheHitRatio ? (metrics.cacheHitRatio * 100).toFixed(1) : '92.3'}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Real-time Latency:</span>
                      <span className="font-bold text-blue-600">
                        {connected ? '<1ms' : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Operations Processed:</span>
                      <span className="font-bold text-purple-600">
                        {metrics?.totalOperations || '1,247'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Active Connections:</span>
                      <span className="font-bold text-orange-600">
                        {connected ? '1' : '0'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h4 className="font-semibold mb-4">Database Collections</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span>📦 Orders:</span>
                      <span className="font-bold">{orders.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>📋 Products:</span>
                      <span className="font-bold">{products.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>👥 Users:</span>
                      <span className="font-bold">{users.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>🔔 Notifications:</span>
                      <span className="font-bold">{notifications.length}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Demo Controls */}
              <div className="card mt-6">
                <h4 className="font-semibold mb-4">Demo Controls</h4>
                <div className="flex gap-4 flex-wrap">
                  <button 
                    className="btn btn-primary"
                    onClick={() => fetch('/api/simulate/new-order', { method: 'POST' })}
                  >
                    📦 Generate Order
                  </button>
                  <button 
                    className="btn btn-warning"
                    onClick={() => fetch('/api/simulate/update-stock', { method: 'POST' })}
                  >
                    📦 Random Stock Update
                  </button>
                  <button 
                    className="btn btn-success"
                    onClick={() => fetch('/api/simulate/status-update', { method: 'POST' })}
                  >
                    🚚 Random Status Update
                  </button>
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>👀 Watch Real-time Updates:</strong> Use these controls and see changes instantly 
                    reflected across all views. Open customer view in another tab to see both perspectives!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminView; 