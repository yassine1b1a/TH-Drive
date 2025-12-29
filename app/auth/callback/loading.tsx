export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <h2 className="text-xl font-semibold">Verifying...</h2>
        <p className="text-muted-foreground mt-2">Please wait while we verify your email</p>
      </div>
    </div>
  )
}