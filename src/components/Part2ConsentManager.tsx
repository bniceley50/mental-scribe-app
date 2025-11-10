import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, Calendar, User, FileText, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface Part2ConsentManagerProps {
  conversationId: string;
  onConsentChange?: () => void;
}

interface Consent {
  id: string;
  consent_type: string;
  disclosure_purpose: string;
  recipient_info: any; // Json type from Supabase
  status: string;
  granted_date: string;
  expiry_date: string | null;
  revoked_date: string | null;
  created_at: string;
}

interface RecipientInfo {
  name: string;
  organization?: string;
  npi?: string;
}

export default function Part2ConsentManager({
  conversationId,
  onConsentChange,
}: Part2ConsentManagerProps) {
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [consentToRevoke, setConsentToRevoke] = useState<string | null>(null);

  useEffect(() => {
    fetchConsents();
  }, [conversationId]);

  async function fetchConsents() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("part2_consents")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("granted_date", { ascending: false });

      if (error) throw error;
      setConsents(data || []);
    } catch (error: any) {
      console.error("Error fetching consents:", error);
      toast.error("Failed to load consents");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(id: string) {
    setRevoking(id);
    try {
      const { error } = await supabase
        .from("part2_consents")
        .update({
          status: "revoked",
          revoked_date: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Consent revoked successfully");
      
      // Update local state
      setConsents((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, status: "revoked", revoked_date: new Date().toISOString() }
            : c
        )
      );
      
      onConsentChange?.();
    } catch (error: any) {
      console.error("Error revoking consent:", error);
      toast.error(error?.message || "Failed to revoke consent");
    } finally {
      setRevoking(null);
      setConsentToRevoke(null);
    }
  }

  function getStatusBadge(consent: Consent) {
    if (consent.status === "revoked") {
      return <Badge variant="destructive">Revoked</Badge>;
    }
    
    if (consent.expiry_date) {
      const expiryDate = new Date(consent.expiry_date);
      const now = new Date();
      
      if (expiryDate < now) {
        return <Badge variant="secondary">Expired</Badge>;
      }
      
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilExpiry <= 7) {
        return <Badge variant="outline" className="border-amber-500 text-amber-600">
          Expires in {daysUntilExpiry} days
        </Badge>;
      }
      
      if (daysUntilExpiry <= 30) {
        return <Badge variant="outline" className="border-amber-500 text-amber-600">
          Expires in {daysUntilExpiry} days
        </Badge>;
      }
    }
    
    return <Badge variant="outline" className="border-accent text-accent-foreground">Active</Badge>;
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Part 2 Consents for this Conversation</h3>
      </div>

      {consents.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No consents have been granted for this conversation.</p>
              <p className="text-sm mt-1">
                Grant consent to allow clinical staff access to Part 2 protected information.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {consents.map((consent) => (
            <Card key={consent.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {consent.consent_type.charAt(0).toUpperCase() +
                        consent.consent_type.slice(1).replace("_", " ")}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Granted {formatDate(consent.granted_date)}
                    </CardDescription>
                  </div>
                  {getStatusBadge(consent)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-1">Disclosure Purpose</p>
                  <p className="text-sm text-muted-foreground">
                    {consent.disclosure_purpose}
                  </p>
                </div>

                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {(consent.recipient_info as RecipientInfo)?.name || "Unknown"}
                    </p>
                    {(consent.recipient_info as RecipientInfo)?.organization && (
                      <p className="text-xs text-muted-foreground">
                        {(consent.recipient_info as RecipientInfo).organization}
                      </p>
                    )}
                    {(consent.recipient_info as RecipientInfo)?.npi && (
                      <p className="text-xs text-muted-foreground">
                        NPI: {(consent.recipient_info as RecipientInfo).npi}
                      </p>
                    )}
                  </div>
                </div>

                {consent.expiry_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {consent.status === "revoked"
                        ? `Revoked on ${formatDate(consent.revoked_date)}`
                        : `Expires ${formatDate(consent.expiry_date)}`}
                    </span>
                  </div>
                )}

                {!consent.expiry_date && consent.status === "active" && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>No expiration date (active until revoked)</span>
                  </div>
                )}

                {consent.status === "active" && (
                  <div className="pt-2 border-t">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setConsentToRevoke(consent.id)}
                      disabled={revoking === consent.id}
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      {revoking === consent.id ? "Revoking..." : "Revoke Consent"}
                    </Button>
                  </div>
                )}

                {consent.status === "revoked" && (
                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    Revoked on {formatDate(consent.revoked_date)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog
        open={consentToRevoke !== null}
        onOpenChange={(open) => !open && setConsentToRevoke(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Part 2 Consent?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately revoke the consent and block clinical staff access to
              this Part 2 protected information. This action cannot be undone.
              <br />
              <br />
              <strong>Note:</strong> Revocation does not affect disclosures already made
              under this consent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => consentToRevoke && handleRevoke(consentToRevoke)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke Consent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
