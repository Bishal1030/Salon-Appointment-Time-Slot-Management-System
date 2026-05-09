'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/services/api';
import { Button } from '@/components/retroui/Button';

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Initializing verification sequence...');
  const hasCalled = useRef(false);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Invalid or missing verification token.');
      return;
    }

    if (hasCalled.current) return;
    hasCalled.current = true;

    const verifyToken = async () => {
      try {
        const { data } = await api.get(`/auth/verify?token=${token}`);
        setStatus('success');
        setMessage(data.message || 'Identity verified successfully.');
      } catch (err: any) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification failed. The token may be expired.');
      }
    };

    verifyToken();
  }, [searchParams]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6">
      <div className="w-full max-w-sm space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-black uppercase tracking-tighter">
            Verification
          </h1>
          <div className="h-px w-full bg-zinc-100" />
        </div>

        <div className={`p-8 text-center border-2 border-black ${
          status === 'success' ? 'bg-black text-white' : 'bg-white text-black'
        }`}>
          {status === 'loading' && (
            <div className="animate-pulse flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold uppercase tracking-widest">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <p className="text-sm font-bold uppercase tracking-widest">Confirmed</p>
              <p className="text-xs opacity-80">{message}</p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <p className="text-red-600 text-sm font-bold uppercase tracking-widest">Rejected</p>
              <p className="text-xs text-zinc-500">{message}</p>
            </div>
          )}
        </div>

        <div className="text-center">
          <Button 
            onClick={() => router.push('/login')} 
            className="w-full rounded-none"
            variant={status === 'success' ? 'default' : 'secondary'}
          >
            Access Login Terminal
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
