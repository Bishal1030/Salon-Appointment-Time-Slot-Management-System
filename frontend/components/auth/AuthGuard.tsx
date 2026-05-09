'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      router.push('/login');
    } else {
      setAuthorized(true);
    }
  }, [router]);

  if (!authorized) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="space-y-4 text-center">
          <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">
            Verifying System Credentials
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
