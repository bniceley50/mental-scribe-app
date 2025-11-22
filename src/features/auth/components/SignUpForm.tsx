import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import PasswordStrength from "@/components/auth/PasswordStrength";

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

interface SignUpFormProps {
    onSignInClick: () => void;
}

export const SignUpForm = ({ onSignInClick }: SignUpFormProps) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [rateLimitCooldown, setRateLimitCooldown] = useState<number>(0);
    const emailInputRef = useRef<HTMLInputElement>(null);
    const errorSummaryRef = useRef<HTMLDivElement>(null);

    // Rate limit cooldown timer
    useEffect(() => {
        if (rateLimitCooldown > 0) {
            const timer = setInterval(() => {
                setRateLimitCooldown((prev) => Math.max(0, prev - 1));
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [rateLimitCooldown]);

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

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
            const redirectUrl = `${window.location.origin}/`;

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
            setPassword("");
        } catch (error: unknown) {
            let msg = "Failed to create account";
            if (error instanceof Error) {
                msg = error.message;
            } else if (typeof error === "string") {
                msg = error;
            }
            if (msg.includes('non-2xx') || msg.includes('429')) {
                setRateLimitCooldown(900); // 15 minutes
                setErrors({ general: "Too many signup attempts from your network. Please wait and try again." });
            } else {
                setErrors({ general: msg });
            }
            setTimeout(() => errorSummaryRef.current?.focus(), 100);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSignUp} className="space-y-4" aria-describedby="app-description">
            {rateLimitCooldown > 0 && (
                <div role="alert" className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                    Too many attempts. Try again in {Math.floor(rateLimitCooldown / 60)}:{String(rateLimitCooldown % 60).padStart(2, '0')}
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

                <PasswordStrength
                    password={password}
                    className="mt-3"
                    hibpEnabled={true}
                />

                <p id="password-requirements" className="text-xs text-muted-foreground mt-2">
                    Use at least 12 characters. Avoid reused passwords.
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
                    onClick={onSignInClick}
                >
                    Sign in
                </Button>
            </p>
        </form>
    );
};
