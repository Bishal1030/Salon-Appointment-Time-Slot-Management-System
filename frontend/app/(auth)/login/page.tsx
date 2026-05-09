'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/retroui/Button';
import { Input } from '@/components/retroui/Input';
import { authService } from '@/services/auth.service';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { user } = await authService.login({ email, password });
      
      if (user?.selectedTemplateId) {
        router.push('/dashboard');
      } else {
        router.push('/dashboard/templates');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight uppercase">Login</h1>
          <p className="mt-2 text-sm text-zinc-500 uppercase tracking-widest">
            Enter your system credentials
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 rounded-none border-zinc-200"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 rounded-none border-zinc-200"
              />
            </div>
          </div>

          {error && (
            <div className="border border-black bg-black p-2 text-center text-[10px] font-bold uppercase text-white">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full rounded-none" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </Button>
        </form>

        <div className="text-center">
          <Link 
            href="/register" 
            className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-black transition-colors"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
