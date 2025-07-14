import React, { useState } from 'react';
import { useAuth } from './AuthProvider';

const AuthForm: React.FC = () => {
  const { user, loading, signIn, signUp, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (isRegister) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (user) {
    return (
      <div>
        <p>Welcome, {user.email}!</p>
        <button onClick={signOut}>Sign Out</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>{isRegister ? 'Register' : 'Login'}</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
      />
      <button type="submit">{isRegister ? 'Register' : 'Login'}</button>
      <button type="button" onClick={() => setIsRegister(r => !r)}>
        {isRegister ? 'Already have an account? Login' : 'No account? Register'}
      </button>
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </form>
  );
};

export default AuthForm;
