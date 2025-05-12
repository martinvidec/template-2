"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/hooks/useAuth';
import UserDropdown from './UserDropdown';
import Breadcrumb from './Breadcrumb';
import { FaCog, FaUsers, FaAddressBook } from 'react-icons/fa';

export default function Navbar() {
  const { user, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center gap-2">
              <Image
                src="/aido_logo_big.png"
                alt="Aido Logo"
                width={50}
                height={50}
                className="rounded-full"
              />
            </Link>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link href="/" className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium">Todos</Link>
                <Link href="/mentions" className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium">Mentions</Link>
                <Link href="/settings" className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium">Settings</Link>
                <Link href="/contacts" className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                  Kontakte
                </Link>
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              {/* Notification bell, etc. can go here */}

              {/* Profile dropdown - remove the user prop */}
              {user && <UserDropdown />}
            </div>
          </div>
          <div className="-mr-2 flex md:hidden">
            <button 
              type="button" 
              className="bg-gray-100 dark:bg-gray-700 inline-flex items-center justify-center p-2 rounded-md text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-indigo-500" 
              aria-controls="mobile-menu" 
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden`} id="mobile-menu">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <Link href="/" className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium">Todos</Link>
          <Link href="/mentions" className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium">Mentions</Link>
          <Link href="/settings" className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium">Settings</Link>
          <Link href="/contacts" className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium">Kontakte</Link>
        </div>
        {user && (
          <div className="pt-4 pb-3 border-t border-gray-200 dark:border-gray-700">
            <div className="relative px-5">
              <div className="flex justify-end">
                <UserDropdown />
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
} 