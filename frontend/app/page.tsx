'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/retroui/Button';
import Link from 'next/link';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('token'));
  }, []);

  const primaryLink = isLoggedIn ? '/dashboard' : '/login';
  const secondaryLink = isLoggedIn ? '/dashboard' : '/register';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6">
      <div className="w-full max-w-lg space-y-12">
        <div className="space-y-4 text-center">
          <h1 className="text-5xl font-black uppercase tracking-tighter sm:text-7xl">
            Retro <br /> Salon
          </h1>
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-zinc-400">
            System Terminal v1.0.4
          </p>
        </div>

        <div className="h-px w-full bg-zinc-100" />

        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link href={primaryLink}>
            <Button size="lg" className="w-full rounded-none sm:w-48">
              Open Terminal
            </Button>
          </Link>
          <Link href={secondaryLink}>
            <Button variant="secondary" size="lg" className="w-full rounded-none sm:w-48">
              {isLoggedIn ? 'Join System' : 'Join System'}
            </Button>
          </Link>
        </div>

        <div 
          className="grid grid-cols-1 gap-8 sm:grid-cols-3"
          style={{ paddingTop: '10px' }}
        >
          {[
            { label: 'Booking', value: 'Auto-Sync' },
            { label: 'Queue', value: 'Asynchronous' },
            { label: 'Status', value: 'Online' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                {stat.label}
              </p>
              <p className="mt-1 font-bold uppercase tracking-tight">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
