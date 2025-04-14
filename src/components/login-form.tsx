"use client";

import { useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { FcGoogle } from 'react-icons/fc';
import { HiMail } from 'react-icons/hi';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react'; // <-- IMPORT X from lucide-react
import LoadingSpinner from '@/components/ui/loading-spinner'; // <-- IMPORT LoadingSpinner

export default function LoginForm() {
  // Removed theme imports as planned
  const { user, signInWithGoogle, signInWithEmail, signInWithPhone, signInAsGuest, signOut } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [phoneSent, setPhoneSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
      setLoading(true);
      try { // Add try/catch for sign out as well
          await signOut();
      } catch(error) {
          console.error("Sign out error:", error);
          alert("Failed to sign out."); // Optional feedback
      } finally {
          setLoading(false);
      }
  }

  if (user) {
    return (
      <Button
        variant="outline"
        onClick={handleSignOut}
        disabled={loading}
        size="sm"
      >
        {loading ? 'Logging out...' : 'Logout'}
      </Button>
    );
  }

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setEmailSent(false);
    setPhoneSent(false);
    try {
      if (loginMethod === 'email') {
        await signInWithEmail(email);
        setEmailSent(true);
      } else {
        const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
        await signInWithPhone(formattedPhone);
        setPhoneSent(true);
      }
    } catch (error) {
      console.error('Error during login:', error);
      const message = error instanceof Error ? error.message : 'Login failed. Please try again.';
      alert(message); // Provide more specific error if available
    } finally {
        setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
      setLoading(true);
      try {
          await signInWithGoogle();
          // Successful sign-in will trigger auth state change, closing modal implicitly
      } catch (error) {
          console.error('Google Sign in error:', error);
          alert('Google Sign in failed. Please try again.');
          setLoading(false); // Ensure loading is false on error
      }
      // No finally needed if modal closes automatically on auth change
  }

  const handleGuestSignIn = async () => {
      setLoading(true);
      try {
          await signInAsGuest();
          // Successful sign-in will trigger auth state change, closing modal implicitly
      } catch (error) {
           console.error('Guest Sign in error:', error);
          alert('Guest Sign in failed. Please try again.');
           setLoading(false); // Ensure loading is false on error
      }
       // No finally needed if modal closes automatically on auth change
  }


  return (
    <>
      <Button
        variant="outline"
        onClick={() => setShowModal(true)}
        size="sm"
      >
        Login
      </Button>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => !loading && setShowModal(false)} />
          <div className="relative bg-card p-8 rounded-lg shadow-xl max-w-sm w-full mx-4">
             <button
                onClick={() => !loading && setShowModal(false)}
                disabled={loading}
                className="absolute top-3 right-3 p-1 rounded-full text-muted-foreground hover:bg-accent disabled:opacity-50"
                aria-label="Close login modal"
             >
                <X size={18} /> {/* X is now imported */}
             </button>

            <h2 className="text-2xl font-bold mb-6 text-foreground">
              Login to Continue
            </h2>

            {emailSent ? (
              <div className="text-center text-foreground">
                <p className="mb-4">Check your email ({email}) for the magic link!</p>
                <Button variant="link" onClick={() => setShowModal(false)}>
                  Close
                </Button>
              </div>
            ) : phoneSent ? (
              <div className="text-center text-foreground">
                <p className="mb-4">Check your phone ({phone}) for the verification code!</p>
                 <Button variant="link" onClick={() => setShowModal(false)}>
                  Close
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Button
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full"
                >
                  <FcGoogle size={20} className="mr-2"/>
                  Continue with Google
                </Button>

                <div className="relative text-center my-4 text-muted-foreground text-xs">
                  <span className="bg-card px-2 relative z-10">OR</span>
                  <div className="absolute top-1/2 w-full h-px bg-border -z-10" />
                </div>

                <div className="flex gap-2 mb-4">
                  <Button
                     variant={loginMethod === 'email' ? 'secondary' : 'ghost'}
                     onClick={() => setLoginMethod('email')}
                     disabled={loading}
                     className="flex-1"
                  >
                    Email
                  </Button>
                   <Button
                     variant={loginMethod === 'phone' ? 'secondary' : 'ghost'}
                     onClick={() => setLoginMethod('phone')}
                     disabled={loading}
                     className="flex-1"
                  >
                    Phone
                  </Button>
                </div>

                <form onSubmit={handleContinue}>
                  {loginMethod === 'email' ? (
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full mb-4"
                      required
                      disabled={loading}
                    />
                  ) : (
                    <div className="mb-4 [&_.react-tel-input_.form-control]:w-full [&_.react-tel-input_.form-control]:bg-background [&_.react-tel-input_.form-control]:text-foreground [&_.react-tel-input_.form-control]:border-border">
                      <PhoneInput
                        country={'us'}
                        value={phone}
                        onChange={setPhone}
                        inputProps={{
                            name: 'phone',
                            required: true,
                            disabled: loading
                        }}
                      />
                    </div>
                  )}
                  <Button
                    type="submit"
                    disabled={loading || (loginMethod === 'email' && !email) || (loginMethod === 'phone' && phone.length < 5)}
                    className="w-full"
                  >
                    {loading ? (
                        <LoadingSpinner className="mr-2" size="sm"/> // LoadingSpinner is now imported
                    ) : (
                        <HiMail size={20} className="mr-2"/>
                    )}
                    {loading ? 'Sending...' : `Continue with ${loginMethod === 'email' ? 'Email' : 'Phone'}`}
                  </Button>
                </form>

                <div className="mt-4 text-center">
                  <Button
                    variant="link"
                    onClick={handleGuestSignIn}
                    disabled={loading}
                    className="text-sm text-muted-foreground"
                  >
                    Continue as Guest
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}