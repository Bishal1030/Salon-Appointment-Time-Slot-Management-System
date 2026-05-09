'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/retroui/Button';
import { Input } from '@/components/retroui/Input';
import { authService } from '@/services/auth.service';
import Link from 'next/link';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authService.register({ name, email, password });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 5000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight uppercase">Join</h1>
          <p className="mt-2 text-sm text-zinc-500 uppercase tracking-widest">
            Create your system identity
          </p>
        </div>

        {success ? (
          <div className="border-2 border-black p-8 text-center bg-black text-white space-y-4">
            <p className="text-sm font-bold uppercase tracking-widest">Identity Initialized</p>
            <p className="text-xs border-y border-white/20 py-4 px-2">
              Please check your email to verify your account before logging in.
            </p>
            <p className="text-[10px] uppercase opacity-50 tracking-widest">
              Redirecting to terminal...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  Full Name
                </label>
                <Input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-11 rounded-none border-zinc-200"
                />
              </div>

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
              {loading ? 'Processing...' : 'Create Account'}
            </Button>
          </form>
        )}

        <div className="text-center">
          <Link 
            href="/login" 
            className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-black transition-colors"
          >
            Back to Terminal
          </Link>
        </div>
      </div>
    </div>
  );
}
