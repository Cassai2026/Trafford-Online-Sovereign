import React, { useEffect, useRef } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

export default function Login() {
  const { login } = useAuth();
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!CLIENT_ID || !window.google) return;

    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: async ({ credential }) => {
        try {
          const res = await api.post('/auth/google', { idToken: credential });
          login(res.data.token);
        } catch (err) {
          console.error('[Login] Auth failed:', err.message);
        }
      },
    });

    window.google.accounts.id.renderButton(buttonRef.current, {
      theme:  'filled_black',
      size:   'medium',
      text:   'signin_with',
      shape:  'pill',
    });
  }, [login]);

  if (!CLIENT_ID) {
    return (
      <span className="login-notice">
        🔒 Set REACT_APP_GOOGLE_CLIENT_ID to enable SSO
      </span>
    );
  }

  return <div ref={buttonRef} className="login-btn-container" />;
}
