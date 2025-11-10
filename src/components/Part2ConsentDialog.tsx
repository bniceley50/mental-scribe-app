import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Shield, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Part2ConsentDialogProps {
  conversationId: string;
  open: boolean;
  onClose: () => void;
  onConsentGranted?: () => void;
}

export default function Part2ConsentDialog({
  conversationId,
  open,
  onClose,
  onConsentGranted,
}: Part2ConsentDialogProps) {
  const [form, setForm] = useState({
    consent_type: "treatment",
    disclosure_purpose: "",
    recipient_name: "",
    recipient_organization: "",
    recipient_npi: "",
    expiry_date: "",
    patient_acknowledgment: false,
  });
  const [saving, setSaving] = useState(false);

  const isFormValid = () => {
    return (
      form.disclosure_purpose.trim().length >= 10 &&
      form.recipient_name.trim().length > 0 &&
      form.patient_acknowledgment
    );
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!isFormValid()) {
      toast.error("Please complete all required fields and acknowledge the disclosure risks");
      return;
    }

    setSaving(true);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to grant consent");
        return;
      }

      const { data, error } = await supabase
        .from("part2_consents")
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          consent_type: form.consent_type,
          disclosure_purpose: form.disclosure_purpose.trim(),
          recipient_info: {
            name: form.recipient_name.trim(),
            organization: form.recipient_organization.trim() || null,
            npi: form.recipient_npi.trim() || null,
          },
          granted_date: new Date().toISOString(),
          expiry_date: form.expiry_date ? new Date(form.expiry_date).toISOString() : null,
          status: "active",
        })
        .select("id")
        .single();

      if (error) throw error;

      toast.success("Part 2 consent granted successfully");
      
      // Reset form
      setForm({
        consent_type: "treatment",
        disclosure_purpose: "",
        recipient_name: "",
        recipient_organization: "",
        recipient_npi: "",
        expiry_date: "",
        patient_acknowledgment: false,
      });
      
      onConsentGranted?.();
      onClose();
    } catch (error: any) {
      console.error("Error granting consent:", error);
      toast.error(error?.message || "Failed to grant consent");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Grant 42 CFR Part 2 Consent
          </DialogTitle>
          <DialogDescription>
            This consent authorizes disclosure of substance use disorder (SUD) treatment
            information protected under 42 CFR Part 2. This information cannot be
            re-disclosed without additional patient consent.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Important:</strong> This consent is required for clinical staff to
            access Part 2 protected records. You may revoke this consent at any time.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="consent_type">
              Consent Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.consent_type}
              onValueChange={(value) => setForm({ ...form, consent_type: value })}
            >
              <SelectTrigger id="consent_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="treatment">Treatment</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="healthcare_ops">Healthcare Operations</SelectItem>
                <SelectItem value="research">Research</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="disclosure_purpose">
              Disclosure Purpose <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="disclosure_purpose"
              placeholder="Describe the specific purpose for this disclosure (minimum 10 characters)"
              value={form.disclosure_purpose}
              onChange={(e) => setForm({ ...form, disclosure_purpose: e.target.value })}
              className="min-h-[80px]"
              required
            />
            <p className="text-xs text-muted-foreground">
              {form.disclosure_purpose.length}/10 characters minimum
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient_name">
              Recipient Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="recipient_name"
              placeholder="Name of person or organization receiving information"
              value={form.recipient_name}
              onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient_organization">
              Recipient Organization <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Input
              id="recipient_organization"
              placeholder="Healthcare facility or organization"
              value={form.recipient_organization}
              onChange={(e) => setForm({ ...form, recipient_organization: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient_npi">
              National Provider Identifier (NPI) <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Input
              id="recipient_npi"
              placeholder="10-digit NPI number"
              value={form.recipient_npi}
              onChange={(e) => setForm({ ...form, recipient_npi: e.target.value })}
              maxLength={10}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiry_date">
              Consent Expiry Date <span className="text-muted-foreground">(Optional - leave blank for indefinite)</span>
            </Label>
            <Input
              id="expiry_date"
              type="date"
              value={form.expiry_date}
              onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
              min={new Date().toISOString().split("T")[0]}
            />
            <p className="text-xs text-muted-foreground">
              If no expiry date is specified, this consent will remain active until revoked.
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-start gap-3">
              <Checkbox
                id="acknowledgment"
                checked={form.patient_acknowledgment}
                onCheckedChange={(checked) =>
                  setForm({ ...form, patient_acknowledgment: checked === true })
                }
              />
              <div className="space-y-1">
                <Label
                  htmlFor="acknowledgment"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I acknowledge and understand the following:
                </Label>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>
                    I am authorizing disclosure of information protected under 42 CFR Part 2
                  </li>
                  <li>
                    This information relates to substance use disorder (SUD) diagnosis or treatment
                  </li>
                  <li>
                    Recipients cannot re-disclose this information without my additional consent
                  </li>
                  <li>
                    I have the right to revoke this consent at any time
                  </li>
                  <li>
                    Revocation will not affect disclosures already made under this consent
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid() || saving}
            >
              {saving ? "Granting Consent..." : "Grant Consent"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
