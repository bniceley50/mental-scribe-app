import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { isPasswordLeaked } from "@/lib/passwordSecurity";

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
  const navigate = useNavigate();

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
      toast.error(error.message || "Failed to create account");
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
    setLoading(true);

    try {
      // Use challenge and verify for MFA
      const { data } = await supabase.auth.mfa.listFactors();
      const factorId = data?.all?.[0]?.id;
      
      if (!factorId) {
        toast.error("MFA setup required");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: mfaCode
      });

      if (error) throw error;

      // Clear failed login attempts on successful MFA
      await supabase.rpc('clear_failed_logins', {
        _identifier: email
      });

      toast.success("Successfully verified!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Failed to verify authentication code");
    } finally {
      setLoading(false);
    }
  };

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
                    <Label htmlFor="mfa-code">Authentication Code</Label>
                    <Input
                      id="mfa-code"
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      maxLength={6}
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      Enter the code from your authenticator app
                    </p>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 transition-all"
                    disabled={loading}
                  >
                    {loading ? "Verifying..." : "Verify Code"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setIsMfaRequired(false);
                      setMfaCode("");
                    }}
                  >
                    Back to Sign In
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
