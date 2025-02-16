"use client";

import { useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { FcGoogle } from 'react-icons/fc';
import { HiMail } from 'react-icons/hi';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

export default function LoginButton() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user, signInWithGoogle, signInWithEmail, signInWithPhone, signInAsGuest } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [phoneSent, setPhoneSent] = useState(false);

  if (user) return null;

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (loginMethod === 'email') {
        await signInWithEmail(email);
        setEmailSent(true);
      } else {
        await signInWithPhone(phone);
        setPhoneSent(true);
      }
    } catch (error) {
      console.error('Error during login:', error);
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
            ) : phoneSent ? (
              <div className={`text-center ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                <p className="mb-4">Check your phone for the verification code!</p>
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

                <div className="flex gap-2 mb-4">
                  <button 
                    onClick={() => setLoginMethod('email')}
                    className={`flex-1 py-2 rounded-lg ${
                      loginMethod === 'email' 
                        ? 'bg-blue-600 text-white' 
                        : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    Email
                  </button>
                  <button 
                    onClick={() => setLoginMethod('phone')}
                    className={`flex-1 py-2 rounded-lg ${
                      loginMethod === 'phone' 
                        ? 'bg-blue-600 text-white' 
                        : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    Phone
                  </button>
                </div>

                <form onSubmit={handleContinue}>
                  {loginMethod === 'email' ? (
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
                  ) : (
                    <div className="mb-4">
                      <PhoneInput
                        country={'us'}
                        value={phone}
                        onChange={setPhone}
                        inputStyle={{
                          width: '100%',
                          height: '42px',
                          fontSize: '16px',
                          backgroundColor: isDark ? '#374151' : '#fff',
                          color: isDark ? '#fff' : '#000',
                          border: isDark ? '1px solid #4B5563' : '1px solid #D1D5DB',
                        }}
                      />
                    </div>
                  )}
                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <HiMail size={20} />
                    Continue with {loginMethod === 'email' ? 'Email' : 'Phone'}
                  </button>
                </form>

                <div className="mt-4 text-center">
                  <button 
                    onClick={signInAsGuest}
                    className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} hover:underline`}
                  >
                    Continue as Guest
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}