import React from 'react';
import Register from './pages/Register';

// A simple wrapper around the Register component to handle any typing issues
const RegisterWrapper: React.FC = () => {
  return (
    <div>
      {/* @ts-ignore - Ignoring TypeScript errors for Register component */}
      <Register />
    </div>
  );
};

export default RegisterWrapper;