import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MfaVerificationProps {
    email: string;
    onBackToSignIn: () => void;
}

export const MfaVerification = ({ email, onBackToSignIn }: MfaVerificationProps) => {
    const [mfaCode, setMfaCode] = useState("");
    const [recoveryCode, setRecoveryCode] = useState("");
    const [useRecoveryCode, setUseRecoveryCode] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleMfaVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: factorsData } = await supabase.auth.mfa.listFactors();
            const factorId = factorsData?.all?.[0]?.id;

            if (!factorId) {
                toast.error("Multi-factor authentication is not set up for this account. Please contact support.");
                setLoading(false);
                return;
            }

            if (useRecoveryCode) {
                if (!recoveryCode || recoveryCode.length !== 8 || !/^[A-Z0-9]{8}$/.test(recoveryCode)) {
                    toast.error("Please enter a valid 8-character recovery code");
                    setLoading(false);
                    return;
                }

                const { error } = await supabase.auth.mfa.challengeAndVerify({
                    factorId,
                    code: recoveryCode.toUpperCase()
                });

                if (error) {
                    toast.error("Invalid or already used recovery code");
                    setLoading(false);
                    return;
                }

                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase
                        .from('mfa_recovery_codes')
                        .update({ used_at: new Date().toISOString() })
                        .eq('user_id', user.id)
                        .eq('code_hash', recoveryCode.toUpperCase())
                        .is('used_at', null);
                }

                await supabase.rpc('clear_failed_logins', {
                    _identifier: email
                });

                toast.success("Recovery code verified! Welcome back.");
                toast.warning("Please generate new recovery codes from Security Settings");
                navigate("/");
                return;
            }

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

            await supabase.rpc('clear_failed_logins', {
                _identifier: email
            });

            toast.success("Authentication successful! Welcome back.");
            navigate("/");
        } catch (error: unknown) {
            let message = "An unexpected error occurred. Please try again or contact support.";
            if (error instanceof Error) {
                message = error.message;
            } else if (typeof error === "string") {
                message = error;
            }
            console.error("MFA verification error:", error);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
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
                onClick={onBackToSignIn}
                disabled={loading}
                aria-label="Go back to sign in"
            >
                Back to Sign In
            </Button>
        </form>
    );
};
