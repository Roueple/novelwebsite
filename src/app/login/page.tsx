// components/LoginForm.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import Link from 'next/link';

export default function LoginForm() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signIn(email, password);
      setShowModal(false);
    } catch (error) {
      setError('Invalid email or password');
    }
  };

  return (
    <>
      <button
        className={`px-4 py-2 rounded ${
          isDark ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-800'
        } hover:bg-opacity-80`}
        onClick={() => setShowModal(true)}
      >
        Sign In
      </button>
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black opacity-50"></div>
          <div className={`bg-white rounded p-8 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                Sign In
              </h2>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-3 py-2 border ${
                  isDark ? 'border-gray-700 bg-gray-800 text-white' : 'border-gray-300'
                } rounded`}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-3 py-2 border ${
                  isDark ? 'border-gray-700 bg-gray-800 text-white' : 'border-gray-300'
                } rounded`}
                required
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                className={`w-full px-4 py-2 rounded ${
                  isDark ? 'bg-red-600 text-white' : 'bg-red-500 text-white'
                } hover:bg-red-600`}
              >
                Sign In
              </button>
              <div className="text-center">
                <Link href="/register" className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} hover:underline`}>
                  Create an account
                </Link>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}