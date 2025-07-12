'use client'

import React from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'
import LandingPage from '@/components/LandingPage'
import Dashboard from '@/components/Dashboard'

export default function HomePage() {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth)
  
  // Show dashboard for authenticated users, landing page for others
  if (isAuthenticated && user) {
    return <Dashboard />
  }
  
  return <LandingPage />
}
