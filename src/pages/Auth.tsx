import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SignInForm } from "@/features/auth/components/SignInForm";
import { SignUpForm } from "@/features/auth/components/SignUpForm";
import { MfaVerification } from "@/features/auth/components/MfaVerification";
import { PasswordReset } from "@/features/auth/components/PasswordReset";
import { NewPasswordForm } from "@/features/auth/components/NewPasswordForm";

const Auth = () => {
  const [isMfaRequired, setIsMfaRequired] = useState(false);
  const [showResetRequest, setShowResetRequest] = useState(false);
  const [isResetStage, setIsResetStage] = useState(false);
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [userEmail, setUserEmail] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        if (session) {
          navigate("/");
        }
      } else if (event === 'PASSWORD_RECOVERY') {
        setIsResetStage(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (isResetStage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]" />
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-[1px]" />
        <div className="relative z-10 w-full max-w-md">
          <div className="flex flex-col items-center mb-8 space-y-2">
            <div className="p-3 rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <Brain className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Mental Scribe</h1>
            <p className="text-muted-foreground">Clinical Documentation Assistant</p>
          </div>
          <NewPasswordForm />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]" />
      <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-[1px]" />

      <div className="relative z-10 w-full max-w-md space-y-8">
        <div className="flex flex-col items-center space-y-2">
          <div className="p-3 rounded-xl bg-primary/10 ring-1 ring-primary/20 animate-in fade-in zoom-in duration-500">
            <Brain className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Mental Scribe</h1>
          <p className="text-muted-foreground text-center max-w-xs">
            Secure, HIPAA-compliant clinical documentation for mental health professionals
          </p>
        </div>

        <Card className="border-border/50 shadow-xl backdrop-blur-sm bg-background/95 supports-[backdrop-filter]:bg-background/60">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center tracking-tight">
              {isMfaRequired
                ? "Two-Factor Authentication"
                : showResetRequest
                  ? "Reset Password"
                  : activeTab === "signin"
                    ? "Welcome back"
                    : "Create an account"}
            </CardTitle>
            <CardDescription className="text-center">
              {isMfaRequired
                ? "Please verify your identity to continue"
                : showResetRequest
                  ? "Enter your email to receive a reset link"
                  : activeTab === "signin"
                    ? "Enter your credentials to access your workspace"
                    : "Get started with your secure clinical workspace"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isMfaRequired ? (
              <MfaVerification
                email={userEmail}
                onBackToSignIn={() => {
                  setIsMfaRequired(false);
                  setActiveTab("signin");
                }}
              />
            ) : showResetRequest ? (
              <PasswordReset
                onBackToSignIn={() => {
                  setShowResetRequest(false);
                  setActiveTab("signin");
                }}
              />
            ) : (
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "signin" | "signup")} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                <TabsContent value="signin">
                  <SignInForm
                    onForgotPassword={() => setShowResetRequest(true)}
                    onMfaRequired={(email) => {
                      setUserEmail(email);
                      setIsMfaRequired(true);
                    }}
                  />
                </TabsContent>
                <TabsContent value="signup">
                  <SignUpForm
                    onSignInClick={() => setActiveTab("signin")}
                  />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
