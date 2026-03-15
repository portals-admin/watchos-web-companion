import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Apple Sign In uses Apple's JS SDK loaded from the CDN.
 * In dev/test mode the sign-in button is simulated; in production
 * the Apple JS SDK (appleid.auth.js) handles the OAuth flow and returns
 * an identityToken to pass to our backend.
 */
export default function AuthPage() {
  const { user, signInWithApple } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const appleRef = useRef(null);

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    // Inject Apple Sign In SDK
    if (document.getElementById('apple-signin-sdk')) return;
    const script = document.createElement('script');
    script.id = 'apple-signin-sdk';
    script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
    script.async = true;
    script.onload = () => {
      if (window.AppleID && process.env.VITE_APPLE_CLIENT_ID) {
        window.AppleID.auth.init({
          clientId: import.meta.env.VITE_APPLE_CLIENT_ID,
          scope: 'name email',
          redirectURI: window.location.origin,
          usePopup: true,
        });
      }
    };
    document.head.appendChild(script);

    // Listen for Apple Sign In response
    document.addEventListener('AppleIDSignInOnSuccess', handleAppleSuccess);
    document.addEventListener('AppleIDSignInOnFailure', handleAppleFailure);
    return () => {
      document.removeEventListener('AppleIDSignInOnSuccess', handleAppleSuccess);
      document.removeEventListener('AppleIDSignInOnFailure', handleAppleFailure);
    };
  }, []);

  async function handleAppleSuccess(event) {
    const { authorization, user: appleUser } = event.detail;
    setLoading(true);
    setError(null);
    try {
      await signInWithApple(authorization.id_token, authorization.code, appleUser);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  }

  function handleAppleFailure(event) {
    if (event.detail?.error !== 'popup_closed_by_user') {
      setError('Apple Sign In failed. Please try again.');
    }
  }

  // Dev-mode: simulate sign-in with a fake token for local testing
  async function devSignIn() {
    setLoading(true);
    setError(null);
    try {
      // In dev, backend ignores expiration; use a placeholder token
      await signInWithApple('dev-token', 'dev-code', { name: { firstName: 'Dev', lastName: 'User' }, email: 'dev@example.com' });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Dev sign-in failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo" aria-hidden>⌚</div>
        <h1 className="auth-title">Watch Companion</h1>
        <p className="auth-subtitle">Your Apple Watch health data, anywhere.</p>

        {error && <div className="auth-error" role="alert">{error}</div>}

        {/* Apple Sign In button rendered by the SDK */}
        <div
          id="appleid-signin"
          ref={appleRef}
          data-color="black"
          data-border="true"
          data-type="sign in"
          className="apple-signin-btn"
          aria-label="Sign in with Apple"
        />

        {import.meta.env.DEV && (
          <button
            className="btn-dev-signin"
            onClick={devSignIn}
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Dev Sign In (local only)'}
          </button>
        )}

        <p className="auth-disclaimer">
          Sign in uses Apple ID. Your health data is stored securely and never shared.
        </p>
      </div>
    </div>
  );
}
