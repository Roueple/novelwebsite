// src/components/login-form.tsx
"use client";

import { useState } from 'react';
// FIX: Get signInWithProvider instead of specific providers
import { useAuth } from '@/providers/auth-provider';
import { FcGoogle } from 'react-icons/fc';
import { HiMail } from 'react-icons/hi';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { toast } from 'sonner'; // Import toast

export default function LoginForm() {
  // FIX: Destructure signInWithProvider, signInAnonymously instead of old names
  const { user, signInWithProvider, signInWithEmail, signInWithPhone, signInAnonymously, signOut, loading, guestLoading } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [phoneSent, setPhoneSent] = useState(false);
  // Use loading states from useAuth where appropriate
  // const [loading, setLoading] = useState(false); // Remove local loading state if using context state

  const handleSignOut = async () => {
      // setLoading(true); // Use context loading if needed, or keep local
      try {
          await signOut();
          toast.success("Signed out successfully.");
      } catch(error) {
          console.error("Sign out error:", error);
          toast.error("Failed to sign out.");
      } finally {
          // setLoading(false);
      }
  }

  if (user) {
    return (
      <Button
        variant="outline"
        onClick={handleSignOut}
        disabled={loading || guestLoading} // Disable during any loading
        size="sm"
      >
        {(loading || guestLoading) ? 'Logging out...' : 'Logout'}
      </Button>
    );
  }

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    // setLoading(true); // Use context loading if needed
    setEmailSent(false);
    setPhoneSent(false);
    try {
      if (loginMethod === 'email') {
        await signInWithEmail(email); // This function now handles linking/sign-in
        setEmailSent(true); // Still useful to show confirmation message
      } else {
        const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
        await signInWithPhone(formattedPhone); // This function now handles linking/sign-in
        setPhoneSent(true); // Still useful to show confirmation message
      }
    } catch (error) {
      // Error handling is mostly done within the auth provider functions now
      console.error('Error during login/link trigger:', error);
      // Toast errors are shown in the provider, maybe add a generic one here if needed
      // toast.error("An error occurred. Please try again.");
    } finally {
        // setLoading(false);
    }
  };

  // FIX: Call signInWithProvider for Google
  const handleGoogleSignIn = async () => {
      // setLoading(true); // Use context loading if needed
      try {
          await signInWithProvider('google');
          // Successful sign-in/linking will trigger auth state change
          setShowModal(false); // Close modal optimistically or wait for auth state change
      } catch (error) {
          // Error handled in provider
      } finally {
          // setLoading(false);
      }
  }

  // FIX: Call signInAnonymously
  const handleGuestSignIn = async () => {
      // setLoading(true); // Use context guestLoading
       try {
          await signInAnonymously();
          // Successful sign-in will trigger auth state change
          setShowModal(false); // Close modal
      } catch (error) {
          // Error handled in provider
      } finally {
          // setLoading(false);
      }
  }


  return (
    <>
      <Button
        variant="outline"
        onClick={() => setShowModal(true)}
        size="sm"
        disabled={loading || guestLoading} // Disable if loading anything
      >
        Login
      </Button>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => !(loading || guestLoading) && setShowModal(false)} />
          <div className="relative bg-card p-8 rounded-lg shadow-xl max-w-sm w-full mx-4">
             <button
                onClick={() => !(loading || guestLoading) && setShowModal(false)}
                disabled={loading || guestLoading}
                className="absolute top-3 right-3 p-1 rounded-full text-muted-foreground hover:bg-accent disabled:opacity-50"
                aria-label="Close login modal"
             >
                <X size={18} />
             </button>

            <h2 className="text-2xl font-bold mb-6 text-foreground">
              Login or Register
            </h2>

            {/* Confirmation messages remain the same */}
            {emailSent ? (
              <div className="text-center text-foreground">
                <p className="mb-4">Check your email ({email}) for the verification link!</p>
                <Button variant="link" onClick={() => setShowModal(false)}> Close </Button>
              </div>
            ) : phoneSent ? (
              <div className="text-center text-foreground">
                <p className="mb-4">Check your phone ({phone}) for the verification code!</p>
                 <Button variant="link" onClick={() => setShowModal(false)}> Close </Button>
              </div>
            ) : (
              // Main login options
              <div className="space-y-4">
                {/* FIX: Use handleGoogleSignIn */}
                <Button
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  disabled={loading || guestLoading}
                  className="w-full"
                >
                  <FcGoogle size={20} className="mr-2"/>
                  Continue with Google
                </Button>

                <div className="relative text-center my-4 text-muted-foreground text-xs">
                  <span className="bg-card px-2 relative z-10">OR</span>
                  <div className="absolute top-1/2 w-full h-px bg-border -z-10" />
                </div>

                {/* Email/Phone Toggle */}
                <div className="flex gap-2 mb-4">
                  <Button
                     variant={loginMethod === 'email' ? 'secondary' : 'ghost'}
                     onClick={() => setLoginMethod('email')}
                     disabled={loading || guestLoading}
                     className="flex-1"
                  > Email </Button>
                   <Button
                     variant={loginMethod === 'phone' ? 'secondary' : 'ghost'}
                     onClick={() => setLoginMethod('phone')}
                     disabled={loading || guestLoading}
                     className="flex-1"
                  > Phone </Button>
                </div>

                {/* Email/Phone Form */}
                <form onSubmit={handleContinue}>
                  {loginMethod === 'email' ? (
                    <Input
                      type="email" placeholder="Enter your email" value={email}
                      onChange={(e) => setEmail(e.target.value)} className="w-full mb-4"
                      required disabled={loading || guestLoading}
                    />
                  ) : (
                    <div className="mb-4 [&_.react-tel-input_.form-control]:w-full [&_.react-tel-input_.form-control]:bg-background [&_.react-tel-input_.form-control]:text-foreground [&_.react-tel-input_.form-control]:border-border">
                      <PhoneInput
                        country={'us'} value={phone} onChange={setPhone}
                        inputProps={{ name: 'phone', required: true, disabled: loading || guestLoading }}
                      />
                    </div>
                  )}
                  <Button
                    type="submit"
                    disabled={loading || guestLoading || (loginMethod === 'email' && !email) || (loginMethod === 'phone' && phone.length < 5)}
                    className="w-full"
                  >
                    {(loading || guestLoading) ? <LoadingSpinner className="mr-2" size="sm"/> : <HiMail size={20} className="mr-2"/>}
                    {(loading || guestLoading) ? 'Processing...' : `Continue with ${loginMethod === 'email' ? 'Email' : 'Phone'}`}
                  </Button>
                </form>

                {/* Guest Option */}
                <div className="mt-4 text-center">
                  {/* FIX: Use handleGuestSignIn */}
                  <Button
                    variant="link"
                    onClick={handleGuestSignIn}
                    disabled={loading || guestLoading}
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
