import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, Eye, EyeOff, CheckCircle2, ArrowLeft, Mail, KeyRound, ShieldAlert } from 'lucide-react';
import { sanitizeEmail, sanitizeText, validatePassword, authRateLimiter } from '@/lib/security';

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset-password';

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const { signIn, signUp, resetPassword, user, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Listen for Supabase password recovery link redirection
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      setMode('reset-password');
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset-password');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Redirect authenticated users away from Auth, except when setting new password
  useEffect(() => {
    if (user && mode !== 'reset-password') {
      if (isAdmin || user.user_metadata?.role === 'admin' || user.email === 'admin@stoxr.com') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    }
  }, [user, isAdmin, navigate, mode]);

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError('');
    setSuccess('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Check rate limit throttle against brute force attacks
    const rateCheck = authRateLimiter.checkAllowed();
    if (!rateCheck.allowed) {
      setError(`Too many requests. For security, please wait ${rateCheck.remainingSec}s before trying again.`);
      return;
    }

    // Sanitize and validate inputs
    let cleanEmail = '';
    if (mode !== 'reset-password') {
      const emailResult = sanitizeEmail(email);
      if (!emailResult.valid) {
        setError(emailResult.error || 'Please enter a valid email address.');
        return;
      }
      cleanEmail = emailResult.cleanEmail;
    }

    if (mode !== 'forgot') {
      const passResult = validatePassword(password);
      if (!passResult.valid) {
        setError(passResult.error || 'Invalid password.');
        return;
      }
    }

    const cleanFullName = mode === 'signup' ? sanitizeText(fullName, 60) : '';

    setLoading(true);

    try {
      if (mode === 'login') {
        const { data, error: signInError } = await signIn(cleanEmail, password);
        if (signInError) {
          authRateLimiter.recordFailure();

          // Check if this email is registered
          let isRegistered = true;
          try {
            const { data: exists, error: rpcError } = await supabase.rpc('check_email_exists', {
              email_to_check: cleanEmail,
            });
            if (!rpcError && typeof exists === 'boolean') {
              isRegistered = exists;
            } else {
              // Fallback probe
              const probe = await supabase.auth.signInWithOtp({
                email: cleanEmail,
                options: { shouldCreateUser: false },
              });
              if (probe.error && probe.error.status === 422 && probe.error.message.includes('Signups not allowed')) {
                isRegistered = false;
              }
            }
          } catch {
            isRegistered = true;
          }

          if (!isRegistered) {
            // Not registered: redirect to Sign Up mode with email pre-filled
            setMode('signup');
            setError(`No account found for "${cleanEmail}". We've redirected you to Sign Up so you can create your account.`);
            setLoading(false);
            return;
          }

          if (signInError.message === 'Invalid login credentials') {
            setError('Incorrect password. Please verify your password or use "Forgot password?".');
          } else if (signInError.message.toLowerCase().includes('email not confirmed')) {
            setError('Email confirmation required. Your account has been verified, please try signing in again.');
          } else {
            setError(signInError.message);
          }
          setLoading(false);
          return;
        }

        authRateLimiter.reset();

        if (cleanEmail === 'admin@stoxr.com') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      } else if (mode === 'signup') {
        const { error: signUpError } = await signUp(cleanEmail, password, cleanFullName);
        if (signUpError) {
          if (signUpError.message === 'User already registered') {
            setError('An account with this email already exists. Please try signing in instead.');
          } else {
            setError(signUpError.message);
          }
        } else {
          authRateLimiter.reset();
          // Attempt immediate login for the auto-confirmed account
          const { error: autoSignInError } = await signIn(cleanEmail, password);
          if (!autoSignInError) {
            navigate('/');
            return;
          } else {
            setSuccess('Account created and verified! You can now sign in.');
            switchMode('login');
          }
        }
      } else if (mode === 'forgot') {
        const { error: resetError } = await resetPassword(cleanEmail);
        if (resetError) {
          setError(resetError.message || 'Failed to send password reset email.');
        } else {
          setSuccess('Password reset link sent! Check your inbox for instructions to reset your password.');
        }
      } else if (mode === 'reset-password') {
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setLoading(false);
          return;
        }

        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) {
          setError(updateError.message || 'Failed to update password.');
        } else {
          setSuccess('Password updated successfully! Redirecting to login...');
          setTimeout(() => {
            switchMode('login');
          }, 2000);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4 selection:bg-white selection:text-black">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="flex flex-col items-center justify-center mb-2">
            <div className="h-12 w-48 flex items-center justify-center p-2 rounded-2xl bg-black border border-zinc-800 shadow-xl mb-3">
              <img
                src="/stoxr-banner.png"
                alt="STOXR"
                className="h-full w-auto object-contain brightness-125"
              />
            </div>
            <h1 className="text-2xl font-black text-white tracking-[0.25em] uppercase font-mono">
              STOXR
            </h1>
          </div>
          <p className="text-xs text-zinc-400 font-medium tracking-wide uppercase">
            Autonomous Financial Intelligence Platform
          </p>
        </div>

        {/* Auth Card */}
        <Card className="bg-[#0d0d10] border border-zinc-800/80 shadow-2xl rounded-3xl text-white">
          <CardHeader className="space-y-1.5 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold tracking-tight text-white">
                {mode === 'login' && 'Sign In'}
                {mode === 'signup' && 'Create Account'}
                {mode === 'forgot' && 'Reset Password'}
                {mode === 'reset-password' && 'Set New Password'}
              </CardTitle>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
                TERMINAL
              </span>
            </div>

            <CardDescription className="text-xs text-zinc-400">
              {mode === 'login' && 'Access your portfolio, real-time market signals & administration'}
              {mode === 'signup' && 'Register a new account to trade with AI-powered analytics'}
              {mode === 'forgot' && 'Enter your registered email and we will send you a password reset link'}
              {mode === 'reset-password' && 'Enter your new password below (minimum 6 characters)'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name field for sign-up */}
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-xs text-zinc-300">
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Enter your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="bg-black/40 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-white rounded-xl"
                  />
                </div>
              )}

              {/* Email Address field (login, signup, forgot) */}
              {mode !== 'reset-password' && (
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs text-zinc-300">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-black/40 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-white rounded-xl font-mono text-xs"
                  />
                </div>
              )}

              {/* Password field (login, signup, reset-password) */}
              {mode !== 'forgot' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs text-zinc-300">
                      {mode === 'reset-password' ? 'New Password' : 'Password'}
                    </Label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => switchMode('forgot')}
                        className="text-[11px] text-zinc-400 hover:text-white transition-colors underline-offset-4 hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-black/40 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-white rounded-xl pr-10 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors focus:outline-none"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Confirm Password field for password reset */}
              {mode === 'reset-password' && (
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs text-zinc-300">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="bg-black/40 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-white rounded-xl pr-10 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors focus:outline-none"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <Alert variant="destructive" className="bg-rose-950/40 border-rose-900/60 text-rose-300 rounded-2xl py-2.5">
                  <AlertCircle className="h-4 w-4 text-rose-400" />
                  <AlertDescription className="text-xs ml-2">{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="bg-emerald-950/40 border-emerald-900/60 text-emerald-300 rounded-2xl py-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <AlertDescription className="text-xs ml-2">{success}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-white text-black hover:bg-zinc-200 font-bold rounded-xl py-2.5 transition-all active:scale-[0.99] text-xs uppercase tracking-wider"
                disabled={loading}
              >
                {loading ? (
                  'Processing...'
                ) : mode === 'login' ? (
                  'Sign In to STOXR'
                ) : mode === 'signup' ? (
                  'Create Trader Account'
                ) : mode === 'forgot' ? (
                  'Send Reset Link'
                ) : (
                  'Update Password'
                )}
              </Button>
            </form>

            <div className="text-center pt-2">
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-zinc-400 hover:text-white text-xs transition-colors font-medium"
                >
                  Don't have an account? Sign up
                </button>
              )}

              {mode === 'signup' && (
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-zinc-400 hover:text-white text-xs transition-colors font-medium"
                >
                  Already have an account? Sign in
                </button>
              )}

              {(mode === 'forgot' || mode === 'reset-password') && (
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs transition-colors font-medium"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Sign In
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
