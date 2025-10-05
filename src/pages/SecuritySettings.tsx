import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Key, Download } from "lucide-react";
import QRCode from "qrcode";

const SecuritySettings = () => {
  const [isMfaEnrolled, setIsMfaEnrolled] = useState(false);
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [verifyCode, setVerifyCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    checkMfaStatus();
  }, []);

  const checkMfaStatus = async () => {
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      setIsMfaEnrolled(data && data.all && data.all.length > 0);
    } catch (error) {
      console.error("Error checking MFA status:", error);
    }
  };

  const enrollMfa = async () => {
    setIsEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });

      if (error) throw error;

      if (data) {
        setSecret(data.totp.secret);
        
        // Generate QR code
        const qrCodeUrl = data.totp.qr_code;
        const qrCodeDataUrl = await QRCode.toDataURL(qrCodeUrl);
        setQrCode(qrCodeDataUrl);

        // Generate recovery codes
        const codes = Array.from({ length: 10 }, () => 
          Math.random().toString(36).substring(2, 10).toUpperCase()
        );
        setRecoveryCodes(codes);

        // Store hashed recovery codes in database
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          for (const code of codes) {
            await supabase.from('mfa_recovery_codes').insert({
              user_id: user.id,
              code_hash: await hashCode(code)
            });
          }
        }

        toast.success("MFA enrollment started. Please scan the QR code.");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsEnrolling(false);
    }
  };

  const verifyAndEnableMfa = async () => {
    setIsVerifying(true);
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      const factorId = data?.all?.[0]?.id;

      if (!factorId) {
        toast.error("No MFA factor found. Please start enrollment again.");
        return;
      }

      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: verifyCode,
      });

      if (error) throw error;

      setIsMfaEnrolled(true);
      setQrCode("");
      setSecret("");
      setVerifyCode("");
      toast.success("MFA successfully enabled!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const unenrollMfa = async () => {
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      const factorId = data?.all?.[0]?.id;

      if (!factorId) return;

      const { error } = await supabase.auth.mfa.unenroll({ factorId });

      if (error) throw error;

      setIsMfaEnrolled(false);
      toast.success("MFA disabled");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const hashCode = async (code: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const downloadRecoveryCodes = () => {
    const blob = new Blob([recoveryCodes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mfa-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-6">Security Settings</h1>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Multi-Factor Authentication (MFA)
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isMfaEnrolled && !qrCode && (
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Enable MFA to protect your account with time-based one-time passwords (TOTP).
              </p>
              <Button onClick={enrollMfa} disabled={isEnrolling}>
                {isEnrolling ? "Enrolling..." : "Enable MFA"}
              </Button>
            </div>
          )}

          {qrCode && (
            <div className="space-y-4">
              <div className="flex flex-col items-center space-y-4">
                <img src={qrCode} alt="MFA QR Code" className="w-64 h-64" />
                <div className="text-center">
                  <p className="text-sm font-medium mb-2">Secret Key (manual entry):</p>
                  <code className="bg-muted px-3 py-1 rounded text-sm">{secret}</code>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="verify-code">Enter verification code</Label>
                <Input
                  id="verify-code"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  maxLength={6}
                />
              </div>

              <Button onClick={verifyAndEnableMfa} disabled={isVerifying || verifyCode.length !== 6}>
                {isVerifying ? "Verifying..." : "Verify and Enable"}
              </Button>

              {recoveryCodes.length > 0 && (
                <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Key className="h-4 w-4" />
                      Recovery Codes
                    </CardTitle>
                    <CardDescription>
                      Save these codes in a secure location. Each code can be used once if you lose access to your authenticator.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 mb-4 font-mono text-sm">
                      {recoveryCodes.map((code, i) => (
                        <div key={i} className="bg-background px-3 py-2 rounded border">
                          {code}
                        </div>
                      ))}
                    </div>
                    <Button onClick={downloadRecoveryCodes} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download Recovery Codes
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {isMfaEnrolled && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <Shield className="h-5 w-5" />
                <span className="font-medium">MFA is enabled</span>
              </div>
              <Button onClick={unenrollMfa} variant="destructive">
                Disable MFA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SecuritySettings;
