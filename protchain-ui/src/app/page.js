'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { authenticateUser } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authenticateUser(email, password);
      router.push('/workflows');
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="flex min-h-screen">
        {/* Left side - Marketing Content */}
        <div className="flex-1 px-8 py-12 lg:px-16 flex flex-col justify-center bg-gray-50">
          <Image
            src="/logo.png"
            alt="ProtChain"
            width={120}
            height={120}
            className="mb-8"
          />
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Welcome to ProtChain
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            ProtChain is revolutionizing proteomics research by combining the power of blockchain technology 
            with advanced bioinformatics. Our platform provides a secure, transparent, and immutable 
            infrastructure for storing and analyzing proteomic data.
          </p>
          <div className="space-y-4 text-gray-600">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-[#40C057] mt-1 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <p>Secure blockchain-based storage for proteomic data</p>
            </div>
            <div className="flex items-start">
              <svg className="w-6 h-6 text-[#40C057] mt-1 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <p>Advanced bioinformatics tools for protein analysis</p>
            </div>
            <div className="flex items-start">
              <svg className="w-6 h-6 text-[#40C057] mt-1 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <p>Streamlined workflow management system</p>
            </div>
            <div className="flex items-start">
              <svg className="w-6 h-6 text-[#40C057] mt-1 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <p>Collaborative research environment</p>
            </div>
          </div>
        </div>

        {/* Right side - Login Form */}
        <div className="hidden lg:flex lg:flex-1 flex-col justify-center px-8 lg:px-16 bg-white">
          <div className="max-w-md w-full mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Sign in to your account</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#40C057] focus:border-[#40C057]"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#40C057] focus:border-[#40C057]"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-[#40C057] focus:ring-[#40C057] border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                    Remember me
                  </label>
                </div>
                <Link href="/forgot-password" className="text-sm font-medium text-[#40C057] hover:text-[#2fa347]">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-[#40C057] hover:bg-[#2fa347] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#40C057] ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <p className="mt-6 text-center text-base text-gray-600">
              Don't have an account?{' '}
              <Link href="/signup" className="font-medium text-[#40C057] hover:text-[#2fa347]">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 