import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldX } from "lucide-react"
import Link from "next/link"

export default function BannedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <ShieldX className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Account Suspended</CardTitle>
          <CardDescription>Your account has been banned</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Your TH-Drive account has been suspended due to violations of our community guidelines. If you believe this
            is a mistake, please contact our support team.
          </p>
          <Link href="mailto:support@th-drive.com">
            <Button variant="outline" className="w-full bg-transparent">
              Contact Support
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
