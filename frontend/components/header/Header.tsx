'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { LogOut, User, Mail } from 'lucide-react';

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, [pathname]);

  const handleLogout = () => {
    authService.logout();
    setIsLoggedIn(false);
    router.push('/');
  };

  return (
    <>
      {/* Top Left Logo */}
      <div className="fixed top-8 left-8 z-50">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-6 h-6 bg-black flex items-center justify-center transition-transform group-hover:scale-110">
            <div className="w-3 h-3 border border-white" />
          </div>
          <span className="text-sm font-black uppercase tracking-tighter hover:underline">
            Retro Salon
          </span>
        </Link>
      </div>

      {/* Top Right Actions */}
      <div className="fixed top-8 right-8 z-50 flex items-center gap-4">
        {isLoggedIn ? (
          <>
            <Link 
              href="/dashboard/templates"
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:text-zinc-500 transition-colors bg-white/80 backdrop-blur-sm p-2"
            >
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">Templates</span>
            </Link>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:text-zinc-500 transition-colors bg-white/80 backdrop-blur-sm p-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </>
        ) : (
          pathname !== '/login' && (
            <Link 
              href="/login"
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:text-zinc-500 transition-colors bg-white/80 backdrop-blur-sm p-2"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Sign In</span>
            </Link>
          )
        )}
      </div>
    </>
  );
}
