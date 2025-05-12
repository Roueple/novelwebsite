// src/components/login-form.tsx
"use client";

import { useState } from 'react';
import { useAuth } from '@/providers/auth-provider'; // Correctly imports useAuth
import { FcGoogle } from 'react-icons/fc';
import { HiMail } from 'react-icons/hi';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css'; // Ensure this CSS is properly handled
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { toast } from 'sonner';

export default function LoginForm() {
  // Removed signInAnonymously and guestLoading from destructuring
  const { user, signInWithProvider, signInWithEmail, signInWithPhone, signOut, loading, profileLoading } = useAuth();
  // Added profileLoading to disable buttons if profile is being fetched

  const [showModal, setShowModal] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [phoneSent, setPhoneSent] = useState(false);
  // Local loading state for form submission, distinct from global auth loading
  const [formSubmitting, setFormSubmitting] = useState(false);


  const handleSignOut = async () => {
    // No local loading state needed here if signOut itself handles global loading state via onAuthStateChange
    try {
      await signOut();
      // toast.success("Signed out successfully."); // AuthProvider signOut shows this
    } catch (error) {
      console.error("Sign out error:", error);
      // toast.error("Failed to sign out."); // AuthProvider signOut shows this
    }
  };

  if (user) { // If user object exists, they are authenticated
    return (
      <Button
        variant="outline"
        onClick={handleSignOut}
        disabled={loading || profileLoading} // Disable during global loading or profile fetch
        size="sm"
      >
        {loading || profileLoading ? 'Please wait...' : 'Logout'}
      </Button>
    );
  }

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setEmailSent(false);
    setPhoneSent(false);
    try {
      if (loginMethod === 'email') {
        if (!email) {
          toast.error("Please enter your email.");
          setFormSubmitting(false);
          return;
        }
        await signInWithEmail(email); // This sends OTP
        setEmailSent(true);
      } else {
        if (phone.length < 5) { // Basic phone validation
            toast.error("Please enter a valid phone number.");
            setFormSubmitting(false);
            return;
        }
        const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
        await signInWithPhone(formattedPhone); // This sends OTP
        setPhoneSent(true);
      }
    } catch (error) {
      // Errors are typically handled and toasted within the signInWithEmail/Phone methods in AuthProvider
      console.error('Error during login/link trigger:', error);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    // Global loading state from useAuth() will reflect ongoing auth process
    try {
      await signInWithProvider('google');
      // Optimistically close modal, or wait for auth state change to naturally close it
      // For now, let onAuthStateChange handle user state and potential redirects
      // setShowModal(false); // Consider if this is needed or if auth flow handles UI changes
    } catch (error) {
      // Error handled in AuthProvider's signInWithProvider
    }
  };

  // handleGuestSignIn function is REMOVED

  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
            setShowModal(true);
            // Reset form states when opening modal
            setEmail('');
            setPhone('');
            setEmailSent(false);
            setPhoneSent(false);
            setLoginMethod('email');
        }}
        size="sm"
        disabled={loading || profileLoading} // Disable if global auth/profile loading is happening
      >
        Login / Sign Up
      </Button>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 animate-fade-in">
          <div className="relative bg-card p-6 sm:p-8 rounded-lg shadow-xl max-w-sm w-full mx-4">
            <button
              onClick={() => !(loading || formSubmitting) && setShowModal(false)}
              disabled={loading || formSubmitting} // Disable close if form is submitting or global loading
              className="absolute top-3 right-3 p-1 rounded-full text-muted-foreground hover:bg-accent disabled:opacity-50"
              aria-label="Close login modal"
            >
              <X size={18} />
            </button>

            <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-foreground text-center">
              {emailSent ? 'Check Your Email' : phoneSent ? 'Check Your Phone' : 'Login or Sign Up'}
            </h2>

            {emailSent ? (
              <div className="text-center text-foreground">
                <p className="mb-4">We've sent a verification link to <span className="font-medium">{email}</span>.</p>
                <p className="text-xs text-muted-foreground">Click the link to complete your sign-in.</p>
                <Button variant="link" onClick={() => setShowModal(false)} className="mt-4"> Close </Button>
              </div>
            ) : phoneSent ? (
              <div className="text-center text-foreground">
                <p className="mb-4">We've sent a verification code to <span className="font-medium">{phone}</span>.</p>
                <p className="text-xs text-muted-foreground">Enter the code in your device if prompted by Supabase Auth UI (or this is for passwordless OTP).</p>
                <Button variant="link" onClick={() => setShowModal(false)} className="mt-4"> Close </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Button
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  disabled={loading || formSubmitting || profileLoading} // Disable during any loading/submitting
                  className="w-full"
                >
                  <FcGoogle size={20} className="mr-2"/>
                  Continue with Google
                </Button>

                <div className="relative text-center my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <div className="flex gap-2 mb-4">
                  <Button
                    variant={loginMethod === 'email' ? 'secondary' : 'ghost'}
                    onClick={() => setLoginMethod('email')}
                    disabled={loading || formSubmitting || profileLoading}
                    className="flex-1"
                  > Email </Button>
                  <Button
                    variant={loginMethod === 'phone' ? 'secondary' : 'ghost'}
                    onClick={() => setLoginMethod('phone')}
                    disabled={loading || formSubmitting || profileLoading}
                    className="flex-1"
                  > Phone </Button>
                </div>

                <form onSubmit={handleContinue}>
                  {loginMethod === 'email' ? (
                    <Input
                      type="email" placeholder="Enter your email" value={email}
                      onChange={(e) => setEmail(e.target.value)} className="w-full mb-4"
                      required disabled={loading || formSubmitting || profileLoading}
                    />
                  ) : (
                    <div className="mb-4 [&_.react-tel-input_.form-control]:w-full [&_.react-tel-input_.form-control]:bg-background [&_.react-tel-input_.form-control]:text-foreground [&_.react-tel-input_.form-control]:border-border">
                      <PhoneInput
                        country={'us'} value={phone} onChange={setPhone}
                        inputProps={{ name: 'phone', required: true, disabled: loading || formSubmitting || profileLoading }}
                      />
                    </div>
                  )}
                  <Button
                    type="submit"
                    disabled={loading || formSubmitting || profileLoading || (loginMethod === 'email' && !email) || (loginMethod === 'phone' && phone.length < 5)}
                    className="w-full"
                  >
                    {formSubmitting ? <LoadingSpinner className="mr-2" size="sm"/> : <HiMail size={20} className="mr-2"/>}
                    {formSubmitting ? 'Sending...' : `Send Verification ${loginMethod === 'email' ? 'Link' : 'Code'}`}
                  </Button>
                </form>
                {/* "Continue as Guest" button is REMOVED */}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}