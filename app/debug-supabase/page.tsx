'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle, Key, Globe, Database } from 'lucide-react'

export default function DebugSupabasePage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])

  const runTests = async () => {
    setLoading(true)
    setResults([])
    
    const tests = []

    try {
      // Test 1: Check environment variables
      tests.push({
        name: 'Environment Variables',
        icon: <Key className="h-4 w-4" />,
        status: 'running'
      })

      const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
      const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      tests[tests.length - 1] = {
        ...tests[tests.length - 1],
        status: hasUrl && hasKey ? 'success' : 'error',
        message: hasUrl && hasKey 
          ? 'Environment variables found' 
          : `Missing: ${!hasUrl ? 'URL' : ''} ${!hasKey ? 'Key' : ''}`,
        details: {
          url: hasUrl ? '✓ Set' : '✗ Missing',
          key: hasKey ? '✓ Set' : '✗ Missing'
        }
      }

      // Test 2: Create Supabase client
      tests.push({
        name: 'Create Client',
        icon: <Globe className="h-4 w-4" />,
        status: 'running'
      })

      let supabase
      try {
        supabase = createClient()
        tests[tests.length - 1] = {
          ...tests[tests.length - 1],
          status: 'success',
          message: 'Client created successfully'
        }
      } catch (err: any) {
        tests[tests.length - 1] = {
          ...tests[tests.length - 1],
          status: 'error',
          message: `Failed to create client: ${err.message}`
        }
        setResults([...tests])
        setLoading(false)
        return
      }

      // Test 3: Test auth session
      tests.push({
        name: 'Auth Session',
        icon: <Database className="h-4 w-4" />,
        status: 'running'
      })

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          tests[tests.length - 1] = {
            ...tests[tests.length - 1],
            status: 'error',
            message: `Session error: ${sessionError.message}`,
            details: sessionError
          }
        } else if (session) {
          tests[tests.length - 1] = {
            ...tests[tests.length - 1],
            status: 'success',
            message: `Authenticated as: ${session.user.email}`,
            details: { userId: session.user.id }
          }
        } else {
          tests[tests.length - 1] = {
            ...tests[tests.length - 1],
            status: 'warning',
            message: 'No active session (user not logged in)'
          }
        }
      } catch (err: any) {
        tests[tests.length - 1] = {
          ...tests[tests.length - 1],
          status: 'error',
          message: `Session test failed: ${err.message}`
        }
      }

      // Test 4: Test database query (profiles table)
      tests.push({
        name: 'Database Query',
        icon: <Database className="h-4 w-4" />,
        status: 'running'
      })

      try {
        // Try a simple query to test connection
        const { data, error, count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
        
        if (error) {
          tests[tests.length - 1] = {
            ...tests[tests.length - 1],
            status: 'error',
            message: `Query error: ${error.message}`,
            details: { code: error.code, hint: error.hint }
          }
        } else {
          tests[tests.length - 1] = {
            ...tests[tests.length - 1],
            status: 'success',
            message: `Database connection successful`,
            details: { count }
          }
        }
      } catch (err: any) {
        tests[tests.length - 1] = {
          ...tests[tests.length - 1],
          status: 'error',
          message: `Query failed: ${err.message}`
        }
      }

      // Test 5: Test specific profile query
      if (supabase) {
        tests.push({
          name: 'Profile Query',
          icon: <Database className="h-4 w-4" />,
          status: 'running'
        })

        try {
          // Get current user if exists
          const { data: { user } } = await supabase.auth.getUser()
          
          if (user) {
            const { data, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single()
            
            if (error) {
              tests[tests.length - 1] = {
                ...tests[tests.length - 1],
                status: error.code === 'PGRST116' ? 'warning' : 'error',
                message: `Profile query: ${error.message}`,
                details: { code: error.code }
              }
            } else {
              tests[tests.length - 1] = {
                ...tests[tests.length - 1],
                status: 'success',
                message: `Profile found for user`,
                details: { email: data.email, role: data.role }
              }
            }
          } else {
            tests[tests.length - 1] = {
              ...tests[tests.length - 1],
              status: 'info',
              message: 'Skipped (no user logged in)'
            }
          }
        } catch (err: any) {
          tests[tests.length - 1] = {
            ...tests[tests.length - 1],
            status: 'error',
            message: `Profile test failed: ${err.message}`
          }
        }
      }

    } catch (err: any) {
      tests.push({
        name: 'General Error',
        status: 'error',
        message: `Unexpected error: ${err.message}`
      })
    }

    setResults(tests)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-3xl font-bold">Supabase Debugger</h1>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Connection Tests</CardTitle>
            <CardDescription>Test Supabase connection and configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={runTests} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Tests...
                </>
              ) : (
                'Run Diagnostic Tests'
              )}
            </Button>
          </CardContent>
        </Card>

        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
              <CardDescription>Detailed diagnostics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.map((test, index) => (
                  <div key={index} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {test.icon}
                        <h3 className="font-medium">{test.name}</h3>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                        test.status === 'success' ? 'bg-green-100 text-green-800' :
                        test.status === 'error' ? 'bg-red-100 text-red-800' :
                        test.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        test.status === 'info' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {test.status?.toUpperCase() || 'RUNNING'}
                      </span>
                    </div>
                    
                    {test.message && (
                      <p className="mt-2 text-sm">{test.message}</p>
                    )}
                    
                    {test.details && (
                      <div className="mt-2 rounded bg-gray-50 p-3">
                        <pre className="text-xs overflow-auto">
                          {JSON.stringify(test.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}