"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const code = searchParams.get("code");
  const errorDescription = searchParams.get("error_description");
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      setLoading(true);
      setAuthError(null);

      const supabase = createClient();
      
      // Clean up any stored email
      if (typeof window !== 'undefined') {
        localStorage.removeItem('unverified_email');
      }

      // Check for error in URL
      if (error) {
        console.error("Auth error from URL:", error, errorDescription);
        
        // Handle specific OAuth errors
        let userMessage = "Authentication failed";
        
        if (error === "access_denied") {
          userMessage = "Access was denied. This might be due to:";
        } else if (error === "invalid_request") {
          userMessage = "Invalid authentication request.";
        } else if (error === "unauthorized_client") {
          userMessage = "Client authentication failed.";
        } else if (error === "unsupported_response_type") {
          userMessage = "Unsupported response type.";
        } else if (error === "invalid_scope") {
          userMessage = "Invalid scope requested.";
        } else if (error === "server_error") {
          userMessage = "Server error occurred during authentication.";
        } else if (error === "temporarily_unavailable") {
          userMessage = "Authentication service temporarily unavailable.";
        }
        
        setAuthError(userMessage);
        setLoading(false);
        return;
      }

      // If there's no code, something went wrong
      if (!code) {
        console.error("No code found in callback URL");
        setAuthError("No authentication code received. Please try signing in again.");
        setLoading(false);
        return;
      }

      try {
        console.log("Exchanging code for session...");
        
        // Exchange the code for a session
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (exchangeError) {
          console.error("Code exchange error:", exchangeError);
          
          // Handle specific exchange errors
          if (exchangeError.message.includes("invalid code") || exchangeError.message.includes("code expired")) {
            setAuthError("The verification link has expired. Please request a new verification email.");
          } else if (exchangeError.message.includes("already used")) {
            setAuthError("This verification link has already been used.");
          } else {
            setAuthError(`Failed to verify: ${exchangeError.message}`);
          }
          setLoading(false);
          return;
        }

        console.log("Code exchanged successfully, getting session...");

        // Get the session after exchange
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Session error:", sessionError);
          setAuthError("Failed to establish session. Please try again.");
          setLoading(false);
          return;
        }

        if (!session) {
          console.error("No session after code exchange");
          setAuthError("Authentication failed. No session established.");
          setLoading(false);
          return;
        }

        console.log("Session established for user:", session.user.email);

        // Check if user is verified
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error("User error:", userError);
          setAuthError("Failed to get user information.");
          setLoading(false);
          return;
        }

        // IMPORTANT: Check if email is confirmed
        if (!user?.email_confirmed_at) {
          console.log("User email not confirmed yet");
          
          // Store email for verification page
          if (typeof window !== 'undefined') {
            localStorage.setItem('unverified_email', user?.email || '');
          }
          
          // Redirect to verification page
          router.push("/auth/verify?message=complete_verification");
          return;
        }

        console.log("User verified, checking profile...");

        // Check if profile exists
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        // If profile doesn't exist, create it
        if (profileError && profileError.code === "PGRST116") {
          console.log("Profile doesn't exist, creating...");
          
          const { error: insertError } = await supabase.from("profiles").insert({
            id: session.user.id,
            email: session.user.email,
            role: session.user.user_metadata?.role || "user",
            full_name: session.user.user_metadata?.full_name || null,
            phone: session.user.user_metadata?.phone || null,
          });

          if (insertError) {
            console.error("Profile creation error:", insertError);
            setAuthError("Failed to create user profile.");
            setLoading(false);
            return;
          }
        } else if (profileError) {
          console.error("Profile fetch error:", profileError);
          // Continue anyway - profile might not be critical
        }

        // If user is a driver, check/create driver details
        if (session.user.user_metadata?.role === "driver") {
          try {
            const { data: driverDetails } = await supabase
              .from("driver_details")
              .select("*")
              .eq("user_id", session.user.id)
              .single();

            if (!driverDetails) {
              await supabase.from("driver_details").insert({
                user_id: session.user.id,
                license_number: session.user.user_metadata?.license_number || "",
                vehicle_make: session.user.user_metadata?.vehicle_make || "",
                vehicle_model: session.user.user_metadata?.vehicle_model || "",
                vehicle_year: parseInt(session.user.user_metadata?.vehicle_year) || 2023,
                vehicle_color: session.user.user_metadata?.vehicle_color || "",
                vehicle_plate: session.user.user_metadata?.vehicle_plate || "",
                is_verified: false,
                is_online: false,
              });
            }
          } catch (driverError) {
            console.error("Driver details error:", driverError);
            // Continue even if driver details fail
          }
        }

        console.log("Authentication successful, redirecting...");

        // Clear any stored emails
        if (typeof window !== 'undefined') {
          localStorage.removeItem('unverified_email');
        }

        // Redirect based on role with a small delay to show success
        setTimeout(() => {
          const role = session.user.user_metadata?.role || "user";
          console.log("Redirecting user with role:", role);
          
          switch (role) {
            case "driver":
              router.push("/driver/dashboard");
              break;
            case "admin":
            case "moderator":
              router.push("/admin/dashboard");
              break;
            default:
              router.push("/dashboard");
          }
        }, 1000);

      } catch (err: any) {
        console.error("Unexpected error in callback:", err);
        setAuthError(`An unexpected error occurred: ${err.message || "Please try again."}`);
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [router, error, code, errorDescription]);

  // Show error state
  if (authError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Authentication Failed</CardTitle>
            <CardDescription>Unable to complete sign in</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{authError}</AlertDescription>
            </Alert>
            
            {error === "access_denied" && (
              <div className="rounded-lg bg-muted p-4">
                <h4 className="font-semibold mb-2">Possible reasons:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• The verification link expired</li>
                  <li>• The verification link was already used</li>
                  <li>• There's an issue with your browser cookies</li>
                  <li>• You cancelled the authentication process</li>
                </ul>
              </div>
            )}
            
            <div className="space-y-3">
              <Button
                onClick={() => router.push("/auth/verify")}
                className="w-full"
              >
                Go to Verification Page
              </Button>
              
              <Button
                variant="outline"
                onClick={() => router.push("/auth/login")}
                className="w-full"
              >
                Back to Login
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => router.push("/")}
                className="w-full"
              >
                Go to Homepage
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
            <CardTitle>Completing Verification</CardTitle>
            <CardDescription>Please wait while we verify your email...</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              This should only take a moment.
            </p>
            <div className="flex justify-center">
              <div className="h-1 w-24 bg-primary/20 rounded-full overflow-hidden">
                <div className="h-full w-full bg-primary animate-pulse"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show success state (briefly shown before redirect)
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>Email Verified Successfully!</CardTitle>
          <CardDescription>Redirecting you to your dashboard...</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">
            Your email has been verified and your account is ready to use.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}