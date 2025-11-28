import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().email("Invalid email address").trim().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

interface SignInFormProps {
  onForgotPassword: () => void;
  onMfaRequired: (email: string) => void;
}

export const SignInForm = ({ onForgotPassword, onMfaRequired }: SignInFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lockoutMessage, setLockoutMessage] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-focus email input on mount
    emailInputRef.current?.focus();

    // Network status listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLockoutMessage(null);

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
      // Check for account lockout (Robustness: fail open if RPC is missing)
      try {
        const { data: lockoutCheck, error: lockoutError } = await supabase.rpc('is_account_locked', {
          _identifier: validation.data.email
        });

        if (lockoutError) {
          console.warn("Lockout check failed:", lockoutError.message);
          // If it's a network error, we should probably stop, but for now let's proceed to auth
          // which will also fail if network is down, providing a consistent error message.
        } else if (lockoutCheck) {
          setLockoutMessage("Account temporarily locked due to multiple failed login attempts. Please try again in 15 minutes.");
          setLoading(false);
          return;
        }
      } catch (rpcError) {
        console.warn("Lockout RPC exception:", rpcError);
        // Proceed to login attempt
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: validation.data.email,
        password: validation.data.password,
      });

      if (error) {
        await supabase.rpc('record_failed_login', {
          _user_id: null,
          _email: validation.data.email,
          _ip_address: 'unknown'
        });
        throw error;
      }

      if (data?.user && !data.session) {
        onMfaRequired(validation.data.email);
        setLoading(false);
        return;
      }

      await supabase.rpc('clear_failed_logins', {
        _identifier: validation.data.email
      });

      toast.success("Signed in successfully!");
      navigate("/");
    } catch (error: unknown) {
      let message = "Failed to sign in";
      if (error instanceof Error) {
        message = error.message;
        if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
          message = "Unable to connect to the server. Please check your internet connection.";
        }
      } else if (typeof error === "string") {
        message = error;
      }
      setErrors({ general: message });
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setTimeout(() => errorSummaryRef.current?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSignIn}
      className={`space-y-4 ${isShaking ? "animate-shake" : ""}`}
      aria-describedby="app-description"
    >
      {lockoutMessage && (
        <div role="alert" className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
          {lockoutMessage}
        </div>
      )}

      {!isOnline && (
        <div role="alert" className="mb-4 p-3 bg-warning/10 border border-warning/20 rounded-md text-sm text-warning-foreground flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-warning animate-pulse" />
          You are currently offline. Please check your connection.
        </div>
      )}

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
        onClick={onForgotPassword}
      >
        Forgot your password?
      </Button>
    </form>
  );
};
