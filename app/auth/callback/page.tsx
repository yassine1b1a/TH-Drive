import { Suspense } from 'react'
import AuthCallbackContent from './auth-callback-content'
import Loading from './loading'

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AuthCallbackContent />
    </Suspense>
  )
}