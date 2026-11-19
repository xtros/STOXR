import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const { signIn, signUp, user, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (isAdmin || user.user_metadata?.role === 'admin' || user.email === 'admin@stoxr.com') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    }
  }, [user, isAdmin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const cleanEmail = email.trim();

    try {
      if (isLogin) {
        const { data, error: signInError } = await signIn(cleanEmail, password);
        if (signInError) {
          if (signInError.message === 'Invalid login credentials') {
            setError('Invalid email or password. Please verify your credentials or create an account.');
          } else if (signInError.message.toLowerCase().includes('email not confirmed')) {
            setError('Email confirmation required. Your account has been verified, please try signing in again.');
          } else {
            setError(signInError.message);
          }
          setLoading(false);
          return;
        }

        const loggedInUser = data?.user;
        const role = loggedInUser?.user_metadata?.role;
        if (role === 'admin' || cleanEmail === 'admin@stoxr.com') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      } else {
        const { error: signUpError } = await signUp(cleanEmail, password, fullName.trim());
        if (signUpError) {
          if (signUpError.message === 'User already registered') {
            setError('An account with this email already exists. Please try signing in instead.');
          } else {
            setError(signUpError.message);
          }
        } else {
          // Attempt immediate login for the auto-confirmed account
          const { error: autoSignInError } = await signIn(cleanEmail, password);
          if (!autoSignInError) {
            navigate('/');
            return;
          } else {
            setSuccess('Account created and verified! You can now sign in.');
            setIsLogin(true);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccess('');
    setEmail('');
    setPassword('');
    setFullName('');
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
                {isLogin ? 'Sign In' : 'Create Account'}
              </CardTitle>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
                TERMINAL
              </span>
            </div>

            <CardDescription className="text-xs text-zinc-400">
              {isLogin
                ? 'Access your portfolio, real-time market signals & administration'
                : 'Register a new account to trade with AI-powered analytics'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
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
                    required={!isLogin}
                    className="bg-black/40 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-white rounded-xl"
                  />
                </div>
              )}

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

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs text-zinc-300">
                    Password
                  </Label>
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
                {loading
                  ? 'Authenticating...'
                  : isLogin ? 'Sign In to STOXR' : 'Create Trader Account'}
              </Button>
            </form>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={toggleMode}
                className="text-zinc-400 hover:text-white text-xs transition-colors font-medium"
              >
                {isLogin
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
