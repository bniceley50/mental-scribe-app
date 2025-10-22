import { Shield, Lock, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const PrivacyFooter = () => {
  return (
    <div className="border-t border-border/50 bg-card/30 backdrop-blur-sm py-3 px-6">
      <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3" />
            End-to-end encrypted
          </span>
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            HIPAA-aware design
          </span>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-auto py-1 text-xs">
              <Info className="w-3 h-3 mr-1" />
              Privacy & Security
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Privacy & Security Statement
              </DialogTitle>
              <DialogDescription>
                Your data security and privacy is our top priority
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <section>
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  Data Security
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                  <li>All data is encrypted in transit and at rest using industry-standard encryption</li>
                  <li>Your conversations are stored securely and are only accessible to you</li>
                  <li>We use secure authentication to protect your account</li>
                  <li>Regular security audits and updates ensure ongoing protection</li>
                </ul>
              </section>

              <Separator />

              <section>
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  HIPAA Compliance Considerations
                </h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    <strong className="text-foreground">Important:</strong> This application is designed with
                    healthcare privacy in mind, but users must follow these guidelines:
                  </p>
                  <ul className="space-y-2 list-disc list-inside ml-4">
                    <li>
                      <strong className="text-foreground">Never include Protected Health Information (PHI)</strong> such as:
                      patient names, dates of birth, addresses, phone numbers, or medical record numbers
                    </li>
                    <li>Use patient initials or identifiers instead of full names</li>
                    <li>Remove or redact any identifying information before uploading documents</li>
                    <li>
                      De-identify session notes according to your organization's HIPAA policies
                    </li>
                  </ul>
                </div>
              </section>

              <Separator />

              <section>
                <h3 className="font-semibold text-foreground mb-3">Data Processing</h3>
                <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                  <li>AI processing is done through secure, encrypted channels</li>
                  <li>Your data is never used to train AI models</li>
                  <li>Conversation data is retained until you choose to delete it</li>
                  <li>You have full control to export or delete your data at any time</li>
                </ul>
              </section>

              <Separator />

              <section>
                <h3 className="font-semibold text-foreground mb-3">Your Responsibilities</h3>
                <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                  <li>Maintain the security of your account credentials</li>
                  <li>Log out when using shared or public computers</li>
                  <li>Review AI-generated content before using in professional settings</li>
                  <li>Follow your organization's data security and privacy policies</li>
                  <li>Report any security concerns immediately</li>
                </ul>
              </section>

              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-sm text-foreground">
                  <strong>Questions or Concerns?</strong>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  If you have any questions about data security or privacy, please contact your
                  system administrator or refer to your organization's privacy policy.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
