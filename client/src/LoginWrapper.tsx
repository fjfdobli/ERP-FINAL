import React from 'react';
import Login from './pages/Login';

// A simple wrapper around the Login component to handle any typing issues
const LoginWrapper: React.FC = () => {
  return (
    <div>
      {/* @ts-ignore - Ignoring TypeScript errors for Login component */}
      <Login />
    </div>
  );
};

export default LoginWrapper;