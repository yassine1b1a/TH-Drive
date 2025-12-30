'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'

// We'll create this page next, but for now create a placeholder
export default function RideTrackingPage() {
  const params = useParams()
  const router = useRouter()
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Ride Tracking</h1>
        <p className="text-muted-foreground">Ride ID: {params.id}</p>
        <button 
          onClick={() => router.push('/book-ride')}
          className="mt-4 px-4 py-2 bg-primary text-white rounded"
        >
          Book Another Ride
        </button>
      </div>
    </div>
  )
}
