"use client";

import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import UserDropdown from './UserDropdown';
import Breadcrumb from './Breadcrumb';

export default function Navbar() {
  const { user } = useAuth();

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-xl font-bold text-gray-800">
              Aido
            </Link>
            <Breadcrumb />
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <UserDropdown />
            ) : (
              <Link
                href="/auth/signin"
                className="text-gray-600 hover:text-gray-900"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 