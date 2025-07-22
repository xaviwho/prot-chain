'use client';

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import { logoutUser } from "@/lib/api";
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState('');
  const pathname = usePathname();

  const checkAuth = () => {
    const token = Cookies.get('token');
    if (token) {
      setIsAuthenticated(true);
      // You might want to fetch the user's name from an API here
      // For now, we'll just show "Account"
    } else {
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    checkAuth();
    // Add event listener for cookie changes
    window.addEventListener('storage', checkAuth);
    
    // Check auth on pathname changes (route changes)
    checkAuth();

    // Cleanup
    return () => {
      window.removeEventListener('storage', checkAuth);
    };
  }, [pathname]); // Re-run when pathname changes

  const handleLogout = () => {
    logoutUser();
    setIsAuthenticated(false);
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-24">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo.png"
                alt="ProtChain"
                width={80}
                height={80}
                className="mr-2"
              />
            </Link>
          </div>
          <div className="flex items-center space-x-8">
            <div className="flex space-x-6">
              <Link
                href="/workflows"
                className="text-black hover:text-[#40C057] px-3 py-2 rounded-md text-base font-bold"
              >
                Workflows
              </Link>
              <Link
                href="/protein"
                className="text-black hover:text-[#40C057] px-3 py-2 rounded-md text-base font-bold"
              >
                Protein Analysis
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <span className="text-black px-3 py-2 rounded-md text-base font-bold">
                    Account
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-[#40C057] hover:text-[#2fa347] px-4 py-2 rounded-md text-base font-bold border-2 border-[#40C057] hover:bg-[#40C057] hover:text-white transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-[#40C057] hover:text-[#2fa347] px-4 py-2 rounded-md text-base font-bold border-2 border-[#40C057] hover:bg-[#40C057] hover:text-white transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="bg-[#40C057] text-white px-4 py-2 rounded-md text-base font-bold hover:bg-[#2fa347] transition-colors"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
} 