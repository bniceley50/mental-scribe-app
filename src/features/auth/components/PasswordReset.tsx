import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PasswordResetProps {
    onBackToSignIn: () => void;
}

export const PasswordReset = ({ onBackToSignIn }: PasswordResetProps) => {
    const [resetEmail, setResetEmail] = useState("");
    const [resetMessage, setResetMessage] = useState<string | null>(null);
    const [resetError, setResetError] = useState<string | null>(null);
    const [resetSubmitting, setResetSubmitting] = useState(false);
    const emailInputRef = useRef<HTMLInputElement>(null);

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
                onBackToSignIn();
            }, 2000);
        } catch (error: unknown) {
            let message = "Failed to send reset email";
            if (error instanceof Error) {
                message = error.message;
            } else if (typeof error === "string") {
                message = error;
            }
            setResetError(message);
            toast.error(message);
        } finally {
            setResetSubmitting(false);
        }
    };

    return (
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
                onClick={onBackToSignIn}
            >
                Back to sign in
            </Button>
        </form>
    );
};
