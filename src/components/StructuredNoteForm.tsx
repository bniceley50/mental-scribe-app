import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { VoiceInput } from "@/components/VoiceInput";
import { 
  Save, 
  FileText, 
  CheckCircle2, 
  Clock,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface StructuredNoteFormProps {
  conversationId: string;
  onSave?: () => void;
}

interface StructuredNote {
  id?: string;
  client_perspective: string;
  current_status: string;
  response_to_interventions: string;
  new_issues_presented: boolean;
  new_issues_details: string;
  goals_progress: string;
  safety_assessment: string;
  clinical_impression: string;
  treatment_plan: string;
  next_steps: string;
  is_telehealth: boolean;
}

const MAX_CHARS = 4000;

export const StructuredNoteForm = ({ conversationId, onSave }: StructuredNoteFormProps) => {
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [formData, setFormData] = useState<StructuredNote>({
    client_perspective: "",
    current_status: "",
    response_to_interventions: "",
    new_issues_presented: false,
    new_issues_details: "",
    goals_progress: "",
    safety_assessment: "",
    clinical_impression: "",
    treatment_plan: "",
    next_steps: "",
    is_telehealth: false,
  });

  // Auto-save functionality
  useEffect(() => {
    const autoSaveTimer = setTimeout(() => {
      if (conversationId && Object.values(formData).some(v => v !== "" && v !== false)) {
        handleSave(true);
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearTimeout(autoSaveTimer);
  }, [formData, conversationId]);

  // Load existing note if available
  useEffect(() => {
    if (conversationId) {
      loadExistingNote();
    }
  }, [conversationId]);

  const loadExistingNote = async () => {
    try {
      const { data, error } = await supabase
        .from("structured_notes")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFormData({
          client_perspective: data.client_perspective || "",
          current_status: data.current_status || "",
          response_to_interventions: data.response_to_interventions || "",
          new_issues_presented: data.new_issues_presented || false,
          new_issues_details: data.new_issues_details || "",
          goals_progress: data.goals_progress || "",
          safety_assessment: data.safety_assessment || "",
          clinical_impression: data.clinical_impression || "",
          treatment_plan: data.treatment_plan || "",
          next_steps: data.next_steps || "",
          is_telehealth: data.is_telehealth || false,
        });
        setLastSaved(new Date(data.updated_at));
      }
    } catch (error) {
      console.error("Error loading structured note:", error);
    }
  };

  const handleSave = async (autoSave = false) => {
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if note exists
      const { data: existingNote } = await supabase
        .from("structured_notes")
        .select("id")
        .eq("conversation_id", conversationId)
        .maybeSingle();

      if (existingNote) {
        // Update existing note
        const { error } = await supabase
          .from("structured_notes")
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingNote.id);

        if (error) throw error;
      } else {
        // Create new note
        const { error } = await supabase
          .from("structured_notes")
          .insert({
            ...formData,
            conversation_id: conversationId,
            user_id: user.id,
          });

        if (error) throw error;
      }

      setLastSaved(new Date());
      
      if (!autoSave) {
        toast.success("Progress saved successfully", {
          icon: <CheckCircle2 className="h-4 w-4" />,
        });
        onSave?.();
      }
    } catch (error) {
      console.error("Error saving structured note:", error);
      toast.error("Failed to save progress");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof StructuredNote, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getCharCount = (text: string) => {
    return `${text.length}/${MAX_CHARS}`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Structured Clinical Documentation
            </CardTitle>
            <CardDescription>
              Complete the standardized clinical note form
            </CardDescription>
          </div>
          {lastSaved && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last saved: {format(lastSaved, "h:mm a")}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Session Type */}
        <div className="space-y-2">
          <Label className="font-semibold">Is this a telehealth visit?</Label>
          <RadioGroup
            value={formData.is_telehealth ? "yes" : "no"}
            onValueChange={(value) => updateField("is_telehealth", value === "yes")}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="telehealth-yes" />
              <Label htmlFor="telehealth-yes" className="font-normal cursor-pointer">
                Yes
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="telehealth-no" />
              <Label htmlFor="telehealth-no" className="font-normal cursor-pointer">
                No
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Separator />

        {/* Client Perspective */}
        <div className="space-y-2">
          <Label htmlFor="client-perspective" className="font-semibold">
            Document client's perspective (client's own words) on current problems, issues, needs, and progress
          </Label>
          <div className="flex gap-2">
            <Textarea
              id="client-perspective"
              placeholder="Enter client's perspective..."
              value={formData.client_perspective}
              onChange={(e) => updateField("client_perspective", e.target.value)}
              className="min-h-[120px] resize-y bg-secondary/50"
              maxLength={MAX_CHARS}
            />
            <VoiceInput
              onResult={(text) => updateField("client_perspective", formData.client_perspective + " " + text)}
            />
          </div>
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              Max. {MAX_CHARS} characters
            </p>
            <p className="text-xs text-muted-foreground">
              {getCharCount(formData.client_perspective)}
            </p>
          </div>
        </div>

        {/* Current Status */}
        <div className="space-y-2">
          <Label htmlFor="current-status" className="font-semibold">
            Document client's current status, assessed needs, and interventions used during this session
          </Label>
          <p className="text-sm text-muted-foreground">
            Present the provision of services provided to the client in an understandable manner.
          </p>
          <div className="flex gap-2">
            <Textarea
              id="current-status"
              placeholder="Enter current status and interventions..."
              value={formData.current_status}
              onChange={(e) => updateField("current_status", e.target.value)}
              className="min-h-[120px] resize-y bg-secondary/50"
              maxLength={MAX_CHARS}
            />
            <VoiceInput
              onResult={(text) => updateField("current_status", formData.current_status + " " + text)}
            />
          </div>
          <div className="flex justify-end">
            <p className="text-xs text-muted-foreground">
              {getCharCount(formData.current_status)}
            </p>
          </div>
        </div>

        {/* Response to Interventions */}
        <div className="space-y-2">
          <Label htmlFor="response-interventions" className="font-semibold">
            Describe the client's response to interventions
          </Label>
          <p className="text-sm text-muted-foreground">
            Include what steps need to be taken and/or completed by the next scheduled session.
          </p>
          <div className="flex gap-2">
            <Textarea
              id="response-interventions"
              placeholder="Describe client's response..."
              value={formData.response_to_interventions}
              onChange={(e) => updateField("response_to_interventions", e.target.value)}
              className="min-h-[120px] resize-y bg-secondary/50"
              maxLength={MAX_CHARS}
            />
            <VoiceInput
              onResult={(text) => updateField("response_to_interventions", formData.response_to_interventions + " " + text)}
            />
          </div>
          <div className="flex justify-end">
            <p className="text-xs text-muted-foreground">
              {getCharCount(formData.response_to_interventions)}
            </p>
          </div>
        </div>

        <Separator />

        {/* New Issues */}
        <div className="space-y-2">
          <Label className="font-semibold">
            SINCE LAST VISIT: Have new issues presented or significant changes occurred in the client's life?
          </Label>
          <RadioGroup
            value={formData.new_issues_presented ? "yes" : "no"}
            onValueChange={(value) => updateField("new_issues_presented", value === "yes")}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="new-issues-yes" />
              <Label htmlFor="new-issues-yes" className="font-normal cursor-pointer">
                Yes
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="new-issues-no" />
              <Label htmlFor="new-issues-no" className="font-normal cursor-pointer">
                No
              </Label>
            </div>
          </RadioGroup>
        </div>

        {formData.new_issues_presented && (
          <div className="space-y-2">
            <Label htmlFor="new-issues-details" className="font-semibold">
              Provide details (be specific)
            </Label>
            <div className="flex gap-2">
              <Textarea
                id="new-issues-details"
                placeholder="Describe new issues or changes..."
                value={formData.new_issues_details}
                onChange={(e) => updateField("new_issues_details", e.target.value)}
                className="min-h-[120px] resize-y bg-secondary/50"
                maxLength={MAX_CHARS}
              />
              <VoiceInput
                onResult={(text) => updateField("new_issues_details", formData.new_issues_details + " " + text)}
              />
            </div>
            <div className="flex justify-end">
              <p className="text-xs text-muted-foreground">
                {getCharCount(formData.new_issues_details)}
              </p>
            </div>
          </div>
        )}

        <Separator />

        {/* Additional Fields */}
        <div className="space-y-2">
          <Label htmlFor="goals-progress" className="font-semibold">
            Progress Toward Treatment Goals
          </Label>
          <div className="flex gap-2">
            <Textarea
              id="goals-progress"
              placeholder="Document progress toward established treatment goals..."
              value={formData.goals_progress}
              onChange={(e) => updateField("goals_progress", e.target.value)}
              className="min-h-[100px] resize-y bg-secondary/50"
              maxLength={MAX_CHARS}
            />
            <VoiceInput
              onResult={(text) => updateField("goals_progress", formData.goals_progress + " " + text)}
            />
          </div>
          <div className="flex justify-end">
            <p className="text-xs text-muted-foreground">
              {getCharCount(formData.goals_progress)}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="safety-assessment" className="font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            Safety Assessment
          </Label>
          <div className="flex gap-2">
            <Textarea
              id="safety-assessment"
              placeholder="Document safety concerns, risk factors, and protective factors..."
              value={formData.safety_assessment}
              onChange={(e) => updateField("safety_assessment", e.target.value)}
              className="min-h-[100px] resize-y bg-secondary/50"
              maxLength={MAX_CHARS}
            />
            <VoiceInput
              onResult={(text) => updateField("safety_assessment", formData.safety_assessment + " " + text)}
            />
          </div>
          <div className="flex justify-end">
            <p className="text-xs text-muted-foreground">
              {getCharCount(formData.safety_assessment)}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="clinical-impression" className="font-semibold">
            Clinical Impression
          </Label>
          <div className="flex gap-2">
            <Textarea
              id="clinical-impression"
              placeholder="Provide clinical assessment and diagnostic impressions..."
              value={formData.clinical_impression}
              onChange={(e) => updateField("clinical_impression", e.target.value)}
              className="min-h-[100px] resize-y bg-secondary/50"
              maxLength={MAX_CHARS}
            />
            <VoiceInput
              onResult={(text) => updateField("clinical_impression", formData.clinical_impression + " " + text)}
            />
          </div>
          <div className="flex justify-end">
            <p className="text-xs text-muted-foreground">
              {getCharCount(formData.clinical_impression)}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="treatment-plan" className="font-semibold">
            Treatment Plan Updates
          </Label>
          <div className="flex gap-2">
            <Textarea
              id="treatment-plan"
              placeholder="Document any updates or modifications to the treatment plan..."
              value={formData.treatment_plan}
              onChange={(e) => updateField("treatment_plan", e.target.value)}
              className="min-h-[100px] resize-y bg-secondary/50"
              maxLength={MAX_CHARS}
            />
            <VoiceInput
              onResult={(text) => updateField("treatment_plan", formData.treatment_plan + " " + text)}
            />
          </div>
          <div className="flex justify-end">
            <p className="text-xs text-muted-foreground">
              {getCharCount(formData.treatment_plan)}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="next-steps" className="font-semibold">
            Next Steps / Follow-up
          </Label>
          <div className="flex gap-2">
            <Textarea
              id="next-steps"
              placeholder="Document homework, action items, and follow-up plans..."
              value={formData.next_steps}
              onChange={(e) => updateField("next_steps", e.target.value)}
              className="min-h-[100px] resize-y bg-secondary/50"
              maxLength={MAX_CHARS}
            />
            <VoiceInput
              onResult={(text) => updateField("next_steps", formData.next_steps + " " + text)}
            />
          </div>
          <div className="flex justify-end">
            <p className="text-xs text-muted-foreground">
              {getCharCount(formData.next_steps)}
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button
            onClick={() => handleSave(false)}
            disabled={saving}
            size="lg"
            className="bg-primary hover:bg-primary/90"
          >
            {saving ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Progress
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
