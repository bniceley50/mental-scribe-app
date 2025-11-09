import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Eye, EyeOff, Loader2 } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [isMfaRequired, setIsMfaRequired] = useState(false);
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [showResetRequest, setShowResetRequest] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isResetStage, setIsResetStage] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lockoutMessage, setLockoutMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [rateLimitCooldown, setRateLimitCooldown] = useState<number>(0);
  const location = useLocation();
  const navigate = useNavigate();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  // Set page title dynamically
  useEffect(() => {
    document.title = isResetStage 
      ? "Reset Password – ClinicalAI Assistant"
      : activeTab === "signin"
      ? "Sign In – ClinicalAI Assistant"
      : "Sign Up – ClinicalAI Assistant";
  }, [activeTab, isResetStage]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const stageParam = params.get("stage") === "reset";
    const hash = location.hash || "";
    const hashIndicatesRecovery = hash.includes("type=recovery") || hash.includes("access_token");
    setIsResetStage(stageParam || hashIndicatesRecovery);
    
    // Handle route-based tab switching
    if (params.get("mode") === "signup") {
      setActiveTab("signup");
    }
  }, [location.search, location.hash]);

  // Rate limit cooldown timer
  useEffect(() => {
    if (rateLimitCooldown > 0) {
      const timer = setInterval(() => {
        setRateLimitCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [rateLimitCooldown]);

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
    setErrors({});
    setLockoutMessage(null);

    // Validate inputs
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      const newErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          newErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(newErrors);
      
      // Focus error summary
      setTimeout(() => errorSummaryRef.current?.focus(), 100);
      return;
    }

    setLoading(true);

    try {
      // CRITICAL: Always include emailRedirectTo for proper authentication flow
      const redirectUrl = `${window.location.origin}/`;
      
      // Call secure-signup edge function with server-side HIBP enforcement
      const { data, error } = await supabase.functions.invoke('secure-signup', {
        body: {
          email: validation.data.email,
          password: validation.data.password,
          emailRedirectTo: redirectUrl,
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
        setRateLimitCooldown(900); // 15 minutes
        setErrors({ general: "Too many signup attempts from your network. Please wait and try again." });
      } else {
        setErrors({ general: msg || "Failed to create account" });
      }
      setTimeout(() => errorSummaryRef.current?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLockoutMessage(null);

    // Validate inputs
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      const newErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          newErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(newErrors);
      setTimeout(() => errorSummaryRef.current?.focus(), 100);
      return;
    }

    setLoading(true);

    try {
      // Check account lockout before attempting sign in
      const { data: lockoutCheck } = await supabase.rpc('is_account_locked', {
        _identifier: validation.data.email
      });

      if (lockoutCheck) {
        setLockoutMessage("Account temporarily locked due to multiple failed login attempts. Please try again in 15 minutes.");
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
      setErrors({ general: error.message || "Failed to sign in" });
      setTimeout(() => errorSummaryRef.current?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    try {
      // Get the factor ID
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const factorId = factorsData?.all?.[0]?.id;
      
      if (!factorId) {
        toast.error("Multi-factor authentication is not set up for this account. Please contact support.");
        setLoading(false);
        return;
      }

      // If using recovery code
      if (useRecoveryCode) {
        // Validate recovery code format (8 alphanumeric characters)
        if (!recoveryCode || recoveryCode.length !== 8 || !/^[A-Z0-9]{8}$/.test(recoveryCode)) {
          toast.error("Please enter a valid 8-character recovery code");
          setLoading(false);
          return;
        }

        // Verify recovery code using Supabase MFA (they support recovery codes)
        const { error } = await supabase.auth.mfa.challengeAndVerify({
          factorId,
          code: recoveryCode.toUpperCase()
        });

        if (error) {
          toast.error("Invalid or already used recovery code");
          setLoading(false);
          return;
        }

        // Mark recovery code as used in our custom table (for tracking)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('mfa_recovery_codes')
            .update({ used_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .eq('code_hash', recoveryCode.toUpperCase())
            .is('used_at', null);
        }

        // Clear failed login attempts
        await supabase.rpc('clear_failed_logins', {
          _identifier: email
        });

        toast.success("Recovery code verified! Welcome back.");
        toast.warning("Please generate new recovery codes from Security Settings");
        navigate("/");
        return;
      }

      // Standard TOTP verification
      // Validate MFA code format
      if (!mfaCode || mfaCode.length !== 6 || !/^\d{6}$/.test(mfaCode)) {
        toast.error("Please enter a valid 6-digit authentication code");
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
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md">
        Skip to content
      </a>
      
      <Card id="main-content" className="w-full max-w-md shadow-lg border-border/50">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
            <Brain className="w-10 h-10 text-white" aria-hidden="true" />
          </div>
          <div>
            <CardTitle className="text-2xl">ClinicalAI Assistant</CardTitle>
            <CardDescription className="mt-2" id="app-description">
              Mental health clinical documentation made simple
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {/* Lockout/MFA warning above form */}
          {lockoutMessage && (
            <div role="alert" className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
              {lockoutMessage}
            </div>
          )}

          {/* Rate limit cooldown */}
          {rateLimitCooldown > 0 && (
            <div role="alert" className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
              Too many attempts. Try again in {Math.floor(rateLimitCooldown / 60)}:{String(rateLimitCooldown % 60).padStart(2, '0')}
            </div>
          )}

          {/* Error summary */}
          {Object.keys(errors).length > 0 && (
            <div 
              ref={errorSummaryRef}
              role="alert" 
              aria-live="assertive"
              tabIndex={-1}
              className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md space-y-1"
            >
              <p className="font-semibold text-sm text-destructive">Please fix the following errors:</p>
              <ul className="text-sm text-destructive space-y-1">
                {Object.entries(errors).map(([field, message]) => (
                  <li key={field}>
                    <a href={`#${field}-input`} className="underline hover:no-underline">
                      {field === 'general' ? message : `${field}: ${message}`}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Tabs 
            value={activeTab} 
            onValueChange={(val) => {
              setActiveTab(val as "signin" | "signup");
              setErrors({});
              setLockoutMessage(null);
              // Update URL without reload
              const url = new URL(window.location.href);
              url.searchParams.set('mode', val);
              window.history.replaceState({}, '', url.toString());
              // Focus first field after tab switch
              setTimeout(() => emailInputRef.current?.focus(), 100);
            }}
            className="w-full"
          >
            <TabsList role="tablist" className="grid w-full grid-cols-2 mb-6" aria-label="Authentication options">
              <TabsTrigger 
                value="signin" 
                role="tab"
                aria-selected={activeTab === "signin"}
                aria-controls="signin-panel"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger 
                value="signup"
                role="tab"
                aria-selected={activeTab === "signup"}
                aria-controls="signup-panel"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" role="tabpanel" id="signin-panel" aria-labelledby="signin-tab">
              {isMfaRequired ? (
                <form onSubmit={handleMfaVerify} className="space-y-4">
                  {!useRecoveryCode ? (
                    <>
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
                          Enter the 6-digit code from your authenticator app
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
                        variant="link"
                        className="w-full text-sm"
                        onClick={() => {
                          setUseRecoveryCode(true);
                          setMfaCode("");
                        }}
                        disabled={loading}
                      >
                        Use recovery code instead
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="recovery-code">
                          Recovery Code
                          <span className="sr-only"> (8 character recovery code)</span>
                        </Label>
                        <Input
                          id="recovery-code"
                          type="text"
                          placeholder="ABCD1234"
                          value={recoveryCode}
                          onChange={(e) => {
                            const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                            setRecoveryCode(value.slice(0, 8));
                          }}
                          maxLength={8}
                          required
                          autoFocus
                          aria-describedby="recovery-code-description"
                          className="text-center text-lg tracking-wider font-mono"
                        />
                        <p id="recovery-code-description" className="text-sm text-muted-foreground">
                          Enter one of your 8-character recovery codes
                        </p>
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90 transition-all"
                        disabled={loading || recoveryCode.length !== 8}
                        aria-label={loading ? "Verifying recovery code" : "Verify recovery code"}
                      >
                        {loading ? (
                          <>
                            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" aria-hidden="true" />
                            Verifying...
                          </>
                        ) : (
                          "Verify Recovery Code"
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="link"
                        className="w-full text-sm"
                        onClick={() => {
                          setUseRecoveryCode(false);
                          setRecoveryCode("");
                        }}
                        disabled={loading}
                      >
                        Use authenticator code instead
                      </Button>
                    </>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setIsMfaRequired(false);
                      setMfaCode("");
                      setRecoveryCode("");
                      setUseRecoveryCode(false);
                    }}
                    disabled={loading}
                    aria-label="Go back to sign in"
                  >
                    Back to Sign In
                  </Button>
                </form>
              ) : showResetRequest ? (
                <form onSubmit={handleResetRequest} className="space-y-4" aria-describedby="app-description">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email-input">Email Address</Label>
                    <Input
                      ref={emailInputRef}
                      id="reset-email-input"
                      name="email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      placeholder="name@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      disabled={resetSubmitting}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 transition-all focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    disabled={resetSubmitting}
                    aria-busy={resetSubmitting}
                  >
                    {resetSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        Sending...
                      </>
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>
                  {resetError && <p className="text-sm text-destructive" role="alert">{resetError}</p>}
                  {resetMessage && <p className="text-sm text-accent-foreground" role="alert">{resetMessage}</p>}
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
                <form onSubmit={handleSignIn} className="space-y-4" aria-describedby="app-description">
                  <div className="space-y-2">
                    <Label htmlFor="email-input">Email</Label>
                    <Input
                      ref={emailInputRef}
                      id="email-input"
                      name="email"
                      type="email"
                      autoComplete="username"
                      inputMode="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? "email-error" : undefined}
                    />
                    {errors.email && (
                      <p id="email-error" className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-input">Password</Label>
                    <div className="relative">
                      <Input
                        id="password-input"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        autoComplete="current-password"
                        aria-invalid={!!errors.password}
                        aria-describedby={errors.password ? "password-error" : undefined}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-pressed={showPassword}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        disabled={loading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        )}
                      </Button>
                    </div>
                    {errors.password && (
                      <p id="password-error" className="text-sm text-destructive">{errors.password}</p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 transition-all focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    disabled={loading}
                    aria-busy={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
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

            <TabsContent value="signup" role="tabpanel" id="signup-panel" aria-labelledby="signup-tab">
              <form onSubmit={handleSignUp} className="space-y-4" aria-describedby="app-description">
                <div className="space-y-2">
                  <Label htmlFor="signup-email-input">Email</Label>
                  <Input
                    ref={emailInputRef}
                    id="signup-email-input"
                    name="email"
                    type="email"
                    autoComplete="username"
                    inputMode="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "signup-email-error" : "password-requirements"}
                  />
                  {errors.email && (
                    <p id="signup-email-error" className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password-input">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password-input"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      autoComplete="new-password"
                      aria-invalid={!!errors.password}
                      aria-describedby={errors.password ? "signup-password-error" : "password-requirements"}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-pressed={showPassword}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      )}
                    </Button>
                  </div>
                  {errors.password && (
                    <p id="signup-password-error" className="text-sm text-destructive">{errors.password}</p>
                  )}
                  <p id="password-requirements" className="text-xs text-muted-foreground">
                    Must be at least 8 characters with uppercase, lowercase, number, and special character
                  </p>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 transition-all focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  disabled={loading}
                  aria-busy={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      Creating account...
                    </>
                  ) : (
                    "Sign Up"
                  )}
                </Button>
                
                <p className="text-xs text-center text-muted-foreground mt-6">
                  By signing up, you agree to our{" "}
                  <a href="/privacy" className="underline hover:no-underline">Privacy Policy</a>
                  {" "}and{" "}
                  <a href="/hipaa" className="underline hover:no-underline">HIPAA Notice</a>
                </p>
                
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Already have an account?{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto font-normal underline"
                    onClick={() => setActiveTab("signin")}
                  >
                    Sign in
                  </Button>
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
