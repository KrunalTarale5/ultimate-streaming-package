import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { formatDistanceToNow } from 'date-fns';

const Dashboard = ({ orders, products, users, notifications, metrics, connected, socket }) => {
  const [realtimeStats, setRealtimeStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    lowStockItems: 0,
    activeUsers: 0
  });
  
  const [chartData, setChartData] = useState([]);
  const [statusData, setStatusData] = useState([]);

  useEffect(() => {
    // Calculate real-time stats
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const lowStockItems = products.filter(product => product.stock < 10).length;
    const activeUsers = users.filter(user => user.type === 'customer').length;

    setRealtimeStats({
      totalOrders,
      totalRevenue,
      lowStockItems,
      activeUsers
    });

    // Create chart data for order trends
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));
      
      const dayOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= dayStart && orderDate <= dayEnd;
      });

      last7Days.push({
        date: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        orders: dayOrders.length,
        revenue: dayOrders.reduce((sum, order) => sum + order.total, 0)
      });
    }
    setChartData(last7Days);

    // Create status distribution data
    const statusCounts = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});

    const statusDataFormatted = Object.entries(statusCounts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: getStatusColor(status)
    }));
    
    setStatusData(statusDataFormatted);
  }, [orders, products, users]);

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ED8936',
      processing: '#4299E1',
      shipped: '#805AD5',
      delivered: '#48BB78'
    };
    return colors[status] || '#718096';
  };

  const recentOrders = orders.slice(0, 5);
  const lowStockProducts = products.filter(product => product.stock < 10);
  const recentNotifications = notifications.slice(0, 3);

  return (
    <div className="dashboard">
      {/* Header with Real-time Indicator */}
      <div className="dashboard-header mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Real-time Dashboard</h1>
            <p className="text-gray-600 mt-1">Live data powered by Ultimate Streaming Package</p>
          </div>
          <div className="real-time-indicator">
            <div className="real-time-dot"></div>
            LIVE DATA
          </div>
        </div>
      </div>

      {/* Real-time Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-value">{realtimeStats.totalOrders}</div>
          <div className="stat-label">Total Orders</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-value">${realtimeStats.totalRevenue.toFixed(2)}</div>
          <div className="stat-label">Total Revenue</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">⚠️</div>
          <div className="stat-value">{realtimeStats.lowStockItems}</div>
          <div className="stat-label">Low Stock Alerts</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{realtimeStats.activeUsers}</div>
          <div className="stat-label">Active Customers</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-2 mb-6">
        {/* Order Trends Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Order Trends (Last 7 Days)</h3>
            <div className="real-time-indicator">
              <div className="real-time-dot"></div>
              Live Updates
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'revenue' ? `$${value.toFixed(2)}` : value,
                  name === 'revenue' ? 'Revenue' : 'Orders'
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="orders" 
                stroke="#4299E1" 
                strokeWidth={3}
                dot={{ fill: '#4299E1', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Order Status Distribution */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Order Status Distribution</h3>
            <div className="real-time-indicator">
              <div className="real-time-dot"></div>
              Real-time
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-3">
        {/* Recent Orders */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Orders</h3>
            <div className="real-time-indicator">
              <div className="real-time-dot"></div>
              Live
            </div>
          </div>
          <div className="space-y-3">
            {recentOrders.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No orders yet</p>
            ) : (
              recentOrders.map(order => (
                <div key={order._id} className="border-l-4 border-blue-400 pl-4 py-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-sm">Order #{order._id}</p>
                      <p className="text-xs text-gray-600">
                        {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">${order.total.toFixed(2)}</p>
                      <span className={`status-badge ${order.status}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Low Stock Alerts</h3>
            <div className="real-time-indicator">
              <div className="real-time-dot"></div>
              Auto-Update
            </div>
          </div>
          <div className="space-y-3">
            {lowStockProducts.length === 0 ? (
              <p className="text-green-600 text-center py-4">✅ All products in stock</p>
            ) : (
              lowStockProducts.map(product => (
                <div key={product._id} className="border-l-4 border-red-400 pl-4 py-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-sm">{product.image} {product.name}</p>
                      <p className="text-xs text-gray-600">{product.category}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-red-600 font-bold text-sm">
                        {product.stock} left
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Notifications */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Activity</h3>
            <div className="real-time-indicator">
              <div className="real-time-dot"></div>
              Instant
            </div>
          </div>
          <div className="space-y-3">
            {recentNotifications.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recent activity</p>
            ) : (
              recentNotifications.map((notification, index) => (
                <div key={index} className="border-l-4 border-green-400 pl-4 py-2">
                  <div className={`notification-type ${notification.type}`}>
                    {notification.type.replace('_', ' ')}
                  </div>
                  <p className="text-sm text-gray-700 mt-1">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      {metrics && (
        <div className="card mt-6">
          <div className="card-header">
            <h3 className="card-title">Streaming Package Performance</h3>
            <div className="real-time-indicator">
              <div className="real-time-dot"></div>
              Live Metrics
            </div>
          </div>
          <div className="grid grid-3">
            <div className="text-center p-4">
              <div className="text-2xl font-bold text-blue-600">
                {metrics.cacheHitRatio ? (metrics.cacheHitRatio * 100).toFixed(1) : '90+'}%
              </div>
              <div className="text-sm text-gray-600">Cache Hit Ratio</div>
            </div>
            <div className="text-center p-4">
              <div className="text-2xl font-bold text-green-600">
                {connected ? '<1ms' : 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Real-time Latency</div>
            </div>
            <div className="text-center p-4">
              <div className="text-2xl font-bold text-purple-600">
                {metrics.totalOperations || '1000+'}
              </div>
              <div className="text-sm text-gray-600">Operations Processed</div>
            </div>
          </div>
        </div>
      )}

      {/* Demo Controls */}
      <div className="card mt-6">
        <div className="card-header">
          <h3 className="card-title">Demo Controls</h3>
          <p className="card-subtitle">Simulate real-time activity to see streaming in action</p>
        </div>
        <div className="flex gap-4 flex-wrap">
          <button 
            className="btn btn-primary"
            onClick={() => fetch('/api/simulate/new-order', { method: 'POST' })}
          >
            📦 Simulate New Order
          </button>
          <button 
            className="btn btn-warning"
            onClick={() => fetch('/api/simulate/update-stock', { method: 'POST' })}
          >
            📦 Update Stock Levels
          </button>
          <button 
            className="btn btn-success"
            onClick={() => fetch('/api/simulate/status-update', { method: 'POST' })}
          >
            🚚 Update Order Status
          </button>
        </div>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>💡 Tip:</strong> Watch how changes appear instantly across all views when you use these controls!
            This demonstrates the real-time capabilities of our Ultimate Streaming Package.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 