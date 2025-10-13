"use client"

import React from 'react'
import AdminDashboard from '@/components/AdminDashboard'

// Ensure this route is always treated as dynamic (no static optimization)
export const dynamic = 'force-dynamic'

export default function AdminPage() {
  return (
    <>
      <AdminDashboard />
    </>
  )
}
