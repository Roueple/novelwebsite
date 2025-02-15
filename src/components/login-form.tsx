"use client";

import { useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { FcGoogle } from 'react-icons/fc';
import { HiMail } from 'react-icons/hi';

export default function LoginButton() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user, signInWithGoogle, signInWithEmail } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  if (user) return null; // Don't show login button if user is logged in

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmail(email);
      setEmailSent(true);
    } catch (error) {
      console.error('Error sending magic link:', error);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`px-4 py-2 rounded-lg ${
          isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
        } border border-gray-300 hover:bg-opacity-80`}
      >
        Login
      </button>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowModal(false)} />
          <div className={`relative ${isDark ? 'bg-gray-800' : 'bg-white'} p-8 rounded-lg shadow-xl max-w-sm w-full mx-4`}>
            <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Login to Continue
            </h2>

            {emailSent ? (
              <div className={`text-center ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                <p className="mb-4">Check your email for the magic link!</p>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-blue-500 hover:underline"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={signInWithGoogle}
                  className={`w-full py-3 px-4 rounded-lg border flex items-center justify-center gap-2 ${
                    isDark ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <FcGoogle size={20} />
                  <span className={isDark ? 'text-white' : 'text-gray-900'}>Continue with Google</span>
                </button>

                <div className={`relative text-center my-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <span className="bg-inherit px-2 relative z-10">or</span>
                  <div className="absolute top-1/2 w-full h-px bg-gray-300 -z-10" />
                </div>

                <form onSubmit={handleEmailLogin}>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border mb-4 ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    required
                  />
                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <HiMail size={20} />
                    Continue with Email
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}