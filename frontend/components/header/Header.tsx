'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { LogOut, User, Mail } from 'lucide-react';

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
    
    if (token) {
      try {
        // Decode JWT payload to get the role securely
        const payload = JSON.parse(atob(token.split('.')[1]));
        setIsAdmin(payload.role === 'ADMIN');
      } catch (e) {
        setIsAdmin(false);
      }
    } else {
      setIsAdmin(false);
    }
  }, [pathname]);

  const handleLogout = () => {
    authService.logout();
    setIsLoggedIn(false);
    router.push('/');
  };

  return (
    <>
      {/* Top Left Logo & Actions */}
      <div className="fixed top-8 left-8 z-50 flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-6 h-6 bg-black flex items-center justify-center transition-transform group-hover:scale-110">
            <div className="w-3 h-3 border border-white" />
          </div>
          <span className="text-sm font-black uppercase tracking-tighter hover:underline">
            Retro Salon
          </span>
        </Link>

        {isLoggedIn && (
          <div className="hidden md:flex items-center gap-6">
            {isAdmin && (
              <Link 
                href="/dashboard/bulk"
                className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] hover:text-zinc-500 transition-colors"
              >
                <Mail className="w-3 h-3" />
                <span>Bulk Upload</span>
              </Link>
            )}
            <Link 
              href="/dashboard/templates"
              className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] hover:text-zinc-500 transition-colors"
            >
              <Mail className="w-3 h-3" />
              <span>Templates</span>
            </Link>
          </div>
        )}
      </div>

      {/* Top Right Actions */}
      <div className="fixed top-8 right-8 z-50 flex items-center gap-4">
        {isLoggedIn ? (
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:text-zinc-500 transition-colors bg-white/80 backdrop-blur-sm p-2 border border-black/5"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Log Out</span>
          </button>
        ) : (
          pathname !== '/login' && (
            <Link 
              href="/login"
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:text-zinc-500 transition-colors bg-white/80 backdrop-blur-sm p-2 border border-black/5"
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
