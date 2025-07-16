import React from 'react';

const ConnectionStatus = ({ connected }) => {
  return (
    <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
      <div className={`status-dot ${connected ? 'connected' : 'disconnected'}`}></div>
      <span className="status-text">
        {connected ? 'Live Connection' : 'Disconnected'}
      </span>
    </div>
  );
};

export default ConnectionStatus; 