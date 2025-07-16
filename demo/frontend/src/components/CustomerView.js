import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import axios from 'axios';
import toast from 'react-hot-toast';

const CustomerView = ({ orders, products, users, connected, socket }) => {
  const [selectedUser, setSelectedUser] = useState('user1');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [cart, setCart] = useState([]);

  // Filter orders for selected user
  const customerOrders = orders.filter(order => order.userId === selectedUser);
  const availableProducts = products.filter(product => product.stock > 0);
  const customers = users.filter(user => user.type === 'customer');

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.productId === product._id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.productId === product._id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: 1
      }]);
    }
    toast.success(`Added ${product.name} to cart!`);
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const updateCartQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(cart.map(item => 
      item.productId === productId 
        ? { ...item, quantity }
        : item
    ));
  };

  const placeOrder = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty!');
      return;
    }

    setIsPlacingOrder(true);
    
    try {
      const response = await axios.post('/api/orders', {
        userId: selectedUser,
        items: cart,
        shippingAddress: '123 Demo Street, Demo City, DC 12345'
      });

      if (response.data.success) {
        toast.success('🎉 Order placed successfully!');
        setCart([]);
      }
    } catch (error) {
      toast.error('Failed to place order');
      console.error('Error placing order:', error);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const getOrderStatusIcon = (status) => {
    const icons = {
      pending: '⏳',
      processing: '🔄',
      shipped: '🚚',
      delivered: '✅'
    };
    return icons[status] || '📦';
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="customer-view">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Customer Portal</h1>
            <p className="text-gray-600">Real-time order tracking and shopping</p>
          </div>
          <div className="real-time-indicator">
            <div className="real-time-dot"></div>
            Live Updates
          </div>
        </div>

        {/* User Selector */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Select Customer</h3>
          </div>
          <div className="flex gap-4">
            {customers.map(user => (
              <button
                key={user._id}
                className={`btn ${selectedUser === user._id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedUser(user._id)}
              >
                👤 {user.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-2 gap-6">
        {/* Left Column - Products & Cart */}
        <div className="space-y-6">
          {/* Available Products */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">🛍️ Available Products</h3>
              <div className="real-time-indicator">
                <div className="real-time-dot"></div>
                Live Stock Updates
              </div>
            </div>
            
            <div className="grid grid-2 gap-4">
              {availableProducts.map(product => (
                <div key={product._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="text-center mb-3">
                    <div className="text-4xl mb-2">{product.image}</div>
                    <h4 className="font-semibold">{product.name}</h4>
                    <p className="text-sm text-gray-600">{product.category}</p>
                  </div>
                  
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-lg">${product.price}</span>
                    <span className="text-sm text-gray-600">
                      {product.stock} in stock
                    </span>
                  </div>
                  
                  <button
                    className="btn btn-primary w-full"
                    onClick={() => addToCart(product)}
                    disabled={product.stock === 0}
                  >
                    Add to Cart
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Shopping Cart */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">🛒 Shopping Cart ({cart.length})</h3>
            </div>
            
            {cart.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Cart is empty</p>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {cart.map(item => (
                    <div key={item.productId} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <h5 className="font-semibold">{item.name}</h5>
                        <p className="text-sm text-gray-600">${item.price} each</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="btn btn-secondary px-2 py-1"
                          onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                        >
                          -
                        </button>
                        <span className="px-3">{item.quantity}</span>
                        <button
                          className="btn btn-secondary px-2 py-1"
                          onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                        >
                          +
                        </button>
                        <button
                          className="btn btn-danger px-2 py-1 ml-2"
                          onClick={() => removeFromCart(item.productId)}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-bold">Total: ${cartTotal.toFixed(2)}</span>
                  </div>
                  <button
                    className="btn btn-success w-full"
                    onClick={placeOrder}
                    disabled={isPlacingOrder}
                  >
                    {isPlacingOrder ? (
                      <>
                        <div className="loading"></div>
                        Placing Order...
                      </>
                    ) : (
                      '🚀 Place Order'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Column - Order Tracking */}
        <div className="space-y-6">
          {/* Order Tracking */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">📦 My Orders</h3>
              <div className="real-time-indicator">
                <div className="real-time-dot"></div>
                Real-time Tracking
              </div>
            </div>
            
            {customerOrders.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📦</div>
                <p className="text-gray-500">No orders yet</p>
                <p className="text-sm text-gray-400">Place your first order to see real-time tracking!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {customerOrders.map(order => (
                  <div key={order._id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold">Order #{order._id}</h4>
                        <p className="text-sm text-gray-600">
                          {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${order.total.toFixed(2)}</p>
                        <span className={`status-badge ${order.status}`}>
                          {getOrderStatusIcon(order.status)} {order.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="border-t pt-3">
                      <h5 className="font-medium mb-2">Items:</h5>
                      <div className="space-y-1">
                        {order.items.map((item, index) => (
                          <div key={index} className="text-sm text-gray-600 flex justify-between">
                            <span>{item.quantity}x Product {item.productId}</span>
                            <span>${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {order.shippingAddress && (
                      <div className="border-t pt-3 mt-3">
                        <h5 className="font-medium mb-1">Shipping Address:</h5>
                        <p className="text-sm text-gray-600">{order.shippingAddress}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Real-time Features Demo */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">🎯 Real-time Features</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded">
                <div className="text-green-600">✅</div>
                <div>
                  <p className="font-medium text-green-800">Live Order Updates</p>
                  <p className="text-sm text-green-600">See status changes instantly</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded">
                <div className="text-blue-600">📦</div>
                <div>
                  <p className="font-medium text-blue-800">Real-time Inventory</p>
                  <p className="text-sm text-blue-600">Stock updates as you shop</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded">
                <div className="text-purple-600">🔔</div>
                <div>
                  <p className="font-medium text-purple-800">Instant Notifications</p>
                  <p className="text-sm text-purple-600">Get notified of all changes</p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-700">
                <strong>🎮 Try this:</strong> Open admin view in another tab and watch how changes appear instantly here!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerView; 