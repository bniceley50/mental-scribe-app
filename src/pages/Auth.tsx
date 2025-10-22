import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const authSchema = z.object({
  email: z.string()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters")
    .trim()
    .toLowerCase(),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be less than 128 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Password must contain at least one special character")
});

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [isMfaRequired, setIsMfaRequired] = useState(false);
  const [showResetRequest, setShowResetRequest] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isResetStage, setIsResetStage] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const stageParam = params.get("stage") === "reset";
    const hash = location.hash || "";
    const hashIndicatesRecovery = hash.includes("type=recovery") || hash.includes("access_token");
    setIsResetStage(stageParam || hashIndicatesRecovery);
  }, [location.search, location.hash]);

  const strongPassword = (pw: string) =>
    typeof pw === "string" &&
    pw.length >= 12 &&
    /[A-Z]/.test(pw) &&
    /[a-z]/.test(pw) &&
    /[0-9]/.test(pw) &&
    /[^A-Za-z0-9]/.test(pw);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetSubmitting(true);
    setResetError(null);
    setResetMessage(null);
    try {
      const redirectTo = `${window.location.origin}/auth?stage=reset`;
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), { redirectTo });
      if (error) {
        throw error;
      }
      setResetMessage("Password reset link sent. Check your email to continue.");
      toast.success("Password reset email sent.");
      setTimeout(() => {
        setShowResetRequest(false);
        setResetEmail("");
      }, 2000);
    } catch (error: any) {
      const message = typeof error?.message === "string" ? error.message : "Failed to send reset email";
      setResetError(message);
      toast.error(message);
    } finally {
      setResetSubmitting(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetSubmitting(true);
    setResetError(null);
    setResetMessage(null);

    if (!strongPassword(newPassword)) {
      setResetSubmitting(false);
      setResetError("Weak password (min 12 chars with upper, lower, number, special).");
      return;
    }

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        throw new Error("Missing session. Open the reset link from your email.");
      }
      const response = await fetch("/functions/v1/password-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json?.error || "Password reset failed");
      }
      setResetMessage("Password updated. Please sign in with your new password.");
      toast.success("Password updated. Please sign in with your new password.");
      setNewPassword("");
      navigate("/auth", { replace: true });
    } catch (error: any) {
      const message = typeof error?.message === "string" ? error.message : "Password reset failed";
      setResetError(message);
      toast.error(message);
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate inputs
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      // Call secure-signup edge function with server-side HIBP enforcement
      const { data, error } = await supabase.functions.invoke('secure-signup', {
        body: {
          email: validation.data.email,
          password: validation.data.password,
        },
      });

      if (error) throw error;
      
      if (data?.error) {
        toast.error(data.error);
        setLoading(false);
        return;
      }

      toast.success(data.message || "Account created! You can now sign in.");
      
      // Clear password field for security
      setPassword("");
    } catch (error: any) {
      const msg = typeof error?.message === 'string' ? error.message : '';
      if (msg.includes('non-2xx') || msg.includes('429')) {
        toast.error("Too many signup attempts from your network. Please wait ~15 minutes and try again.");
      } else {
        toast.error(msg || "Failed to create account");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate inputs
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      // Check account lockout before attempting sign in
      const { data: lockoutCheck } = await supabase.rpc('is_account_locked', {
        _identifier: validation.data.email
      });

      if (lockoutCheck) {
        toast.error("Account temporarily locked due to multiple failed login attempts. Please try again in 15 minutes.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: validation.data.email,
        password: validation.data.password,
      });

      if (error) {
        // Record failed login attempt
        await supabase.rpc('record_failed_login', {
          _user_id: null,
          _email: validation.data.email,
          _ip_address: 'unknown'
        });
        
        throw error;
      }

      // Check if MFA is required
      if (data?.user && !data.session) {
        setIsMfaRequired(true);
        toast.info("Please enter your authentication code");
        setLoading(false);
        return;
      }

      // Clear failed login attempts on successful sign in
      await supabase.rpc('clear_failed_logins', {
        _identifier: validation.data.email
      });

      toast.success("Signed in successfully!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate MFA code format
    if (!mfaCode || mfaCode.length !== 6 || !/^\d{6}$/.test(mfaCode)) {
      toast.error("Please enter a valid 6-digit authentication code");
      return;
    }

    setLoading(true);

    try {
      // Use challenge and verify for MFA
      const { data } = await supabase.auth.mfa.listFactors();
      const factorId = data?.all?.[0]?.id;
      
      if (!factorId) {
        toast.error("Multi-factor authentication is not set up for this account. Please contact support.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: mfaCode
      });

      if (error) {
        // Provide user-friendly error messages
        if (error.message.includes("expired")) {
          toast.error("Authentication code has expired. Please try again with a new code.");
        } else if (error.message.includes("invalid")) {
          toast.error("Invalid authentication code. Please check your authenticator app and try again.");
        } else {
          toast.error(error.message || "Failed to verify authentication code");
        }
        setLoading(false);
        return;
      }

      // Clear failed login attempts on successful MFA
      await supabase.rpc('clear_failed_logins', {
        _identifier: email
      });

      toast.success("Authentication successful! Welcome back.");
      navigate("/");
    } catch (error: any) {
      console.error("MFA verification error:", error);
      toast.error("An unexpected error occurred. Please try again or contact support.");
    } finally {
      setLoading(false);
    }
  };

  if (isResetStage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background p-4">
        <Card className="w-full max-w-md shadow-lg border-border/50">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
              <Brain className="w-10 h-10 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">Reset Your Password</CardTitle>
              <CardDescription className="mt-2">
                Choose a strong password with upper, lower, number, and special characters.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  minLength={12}
                  placeholder="New strong password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 transition-all"
                disabled={resetSubmitting}
              >
                {resetSubmitting ? "Updating..." : "Update Password"}
              </Button>
              {resetError && <p className="text-sm text-destructive">{resetError}</p>}
              {resetMessage && <p className="text-sm text-accent-foreground">{resetMessage}</p>}
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setIsResetStage(false);
                  navigate("/auth", { replace: true });
                }}
              >
                Back to Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background p-4">
      <Card className="w-full max-w-md shadow-lg border-border/50">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl">ClinicalAI Assistant</CardTitle>
            <CardDescription className="mt-2">
              Mental health clinical documentation made simple
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              {isMfaRequired ? (
                <form onSubmit={handleMfaVerify} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="mfa-code">
                      Authentication Code
                      <span className="sr-only"> (6 digits from your authenticator app)</span>
                    </Label>
                    <Input
                      id="mfa-code"
                      type="text"
                      inputMode="numeric"
                      pattern="\d{6}"
                      placeholder="000000"
                      value={mfaCode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        setMfaCode(value.slice(0, 6));
                      }}
                      maxLength={6}
                      required
                      autoComplete="one-time-code"
                      autoFocus
                      aria-describedby="mfa-code-description"
                      className="text-center text-lg tracking-widest"
                    />
                    <p id="mfa-code-description" className="text-sm text-muted-foreground">
                      Enter the 6-digit code from your authenticator app (e.g., Google Authenticator, Authy)
                    </p>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 transition-all"
                    disabled={loading || mfaCode.length !== 6}
                    aria-label={loading ? "Verifying authentication code" : "Verify authentication code"}
                  >
                    {loading ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" aria-hidden="true" />
                        Verifying...
                      </>
                    ) : (
                      "Verify Code"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setIsMfaRequired(false);
                      setMfaCode("");
                    }}
                    disabled={loading}
                    aria-label="Go back to sign in"
                  >
                    Back to Sign In
                  </Button>
                </form>
              ) : showResetRequest ? (
                <form onSubmit={handleResetRequest} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 transition-all"
                    disabled={resetSubmitting}
                  >
                    {resetSubmitting ? "Sending link..." : "Send reset link"}
                  </Button>
                  {resetError && <p className="text-sm text-destructive">{resetError}</p>}
                  {resetMessage && <p className="text-sm text-accent-foreground">{resetMessage}</p>}
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setShowResetRequest(false);
                      setResetEmail("");
                      setResetError(null);
                      setResetMessage(null);
                    }}
                  >
                    Back to sign in
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="transition-all"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 transition-all"
                    disabled={loading}
                  >
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    className="w-full mt-2"
                    onClick={() => {
                      setShowResetRequest(true);
                      setResetError(null);
                      setResetMessage(null);
                    }}
                  >
                    Forgot your password?
                  </Button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="transition-all"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 transition-all"
                  disabled={loading}
                >
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
