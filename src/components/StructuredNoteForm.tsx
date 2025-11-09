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
  AlertCircle,
  Sparkles,
  Loader2
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
  const [analyzingField, setAnalyzingField] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
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

  // Auto-save functionality with recording guard
  useEffect(() => {
    if (isRecording) {
      console.log("StructuredNoteForm: Skipping auto-save while recording");
      return;
    }

    const autoSaveTimer = setTimeout(() => {
      if (conversationId && Object.values(formData).some(v => v !== "" && v !== false)) {
        console.log("StructuredNoteForm: Auto-save triggered");
        handleSave(true);
      }
    }, 30000);

    return () => clearTimeout(autoSaveTimer);
  }, [formData, conversationId, isRecording]);

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
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error("Auth error:", authError);
        throw new Error("Authentication error. Please refresh and log in again.");
      }
      
      if (!user) {
        throw new Error("You must be logged in to save. Please refresh and log in again.");
      }

      // Verify conversation exists and belongs to user
      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .select("id, user_id")
        .eq("id", conversationId)
        .maybeSingle();

      if (convError) {
        console.error("Error checking conversation:", convError);
        throw new Error("Could not verify conversation. Please try again.");
      }

      if (!conversation) {
        throw new Error("Conversation not found. Please refresh the page.");
      }

      if (conversation.user_id !== user.id) {
        throw new Error("You don't have permission to save notes for this conversation.");
      }

      // Check if note exists
      const { data: existingNote, error: checkError } = await supabase
        .from("structured_notes")
        .select("id")
        .eq("conversation_id", conversationId)
        .maybeSingle();

      if (checkError) {
        console.error("Error checking existing note:", checkError);
        throw new Error(`Database error: ${checkError.message}`);
      }

      if (existingNote) {
        // Update existing note
        const { error: updateError } = await supabase
          .from("structured_notes")
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingNote.id);

        if (updateError) {
          console.error("Update error:", updateError);
          throw new Error(`Failed to update: ${updateError.message}`);
        }
      } else {
        // Create new note
        const { error: insertError } = await supabase
          .from("structured_notes")
          .insert({
            ...formData,
            conversation_id: conversationId,
            user_id: user.id,
          });

        if (insertError) {
          console.error("Insert error:", insertError);
          throw new Error(`Failed to create note: ${insertError.message}`);
        }
      }

      setLastSaved(new Date());
      
      if (!autoSave) {
        toast.success("Progress saved successfully", {
          icon: <CheckCircle2 className="h-4 w-4" />,
        });
        onSave?.();
      }
    } catch (error: any) {
      console.error("Error saving structured note:", error);
      const errorMessage = error?.message || "Failed to save progress";
      toast.error(errorMessage, {
        duration: 5000,
        description: "If this persists, please contact support.",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof StructuredNote, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    console.log("StructuredNoteForm: Recording started");
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    console.log("StructuredNoteForm: Recording stopped");
  };

  const getCharCount = (text: string) => {
    return `${text.length}/${MAX_CHARS}`;
  };

  const analyzeField = async (fieldName: keyof StructuredNote, fieldLabel: string) => {
    setAnalyzingField(fieldName as string);
    
    try {
      // Get conversation messages for context
      const { data: messages } = await supabase
        .from("messages")
        .select("content, role")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      const conversationContext = messages?.map(m => `${m.role}: ${m.content}`).join("\n") || "";

      const { data, error } = await supabase.functions.invoke("analyze-field", {
        body: {
          fieldName,
          fieldLabel,
          currentValue: formData[fieldName],
          conversationContext: conversationContext.slice(0, 8000), // Limit context size
        },
      });

      if (error) throw error;

      if (data?.suggestion) {
        setFormData(prev => ({
          ...prev,
          [fieldName]: ((prev[fieldName] as unknown as string) && typeof prev[fieldName] === 'string')
            ? `${prev[fieldName] as unknown as string} ${data.suggestion}`
            : (data.suggestion as string),
        }));
        toast.success(`${fieldLabel} analyzed successfully`, {
          icon: <Sparkles className="h-4 w-4" />,
          description: "AI suggestion appended. Your existing text was not replaced.",
        });
      }
    } catch (error) {
      console.error("Error analyzing field:", error);
      toast.error("Failed to analyze field");
    } finally {
      setAnalyzingField(null);
    }
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="client-perspective" className="font-semibold flex-1">
              Document client's perspective (client's own words) on current problems, issues, needs, and progress
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => analyzeField("client_perspective", "Client's Perspective")}
              disabled={analyzingField === "client_perspective"}
            >
              {analyzingField === "client_perspective" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <Textarea
                id="client-perspective"
                placeholder="Enter client's perspective..."
                value={formData.client_perspective}
                onChange={(e) => updateField("client_perspective", e.target.value)}
                className="min-h-[120px] resize-y bg-secondary/50"
                maxLength={MAX_CHARS}
              />
            </div>
            <VoiceInput
              onResult={(text) => {
                console.log("StructuredNoteForm: Voice delta for client_perspective:", text);
                setFormData(prev => ({
                  ...prev,
                  client_perspective: prev.client_perspective ? `${prev.client_perspective} ${text}` : text,
                }));
              }}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="current-status" className="font-semibold flex-1">
              Document client's current status, assessed needs, and interventions used during this session
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => analyzeField("current_status", "Current Status")}
              disabled={analyzingField === "current_status"}
            >
              {analyzingField === "current_status" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Present the provision of services provided to the client in an understandable manner.
          </p>
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <Textarea
                id="current-status"
                placeholder="Enter current status and interventions..."
                value={formData.current_status}
                onChange={(e) => updateField("current_status", e.target.value)}
                className="min-h-[120px] resize-y bg-secondary/50"
                maxLength={MAX_CHARS}
              />
            </div>
            <VoiceInput
              onResult={(text) => {
                setFormData(prev => ({
                  ...prev,
                  current_status: prev.current_status ? `${prev.current_status} ${text}` : text,
                }));
              }}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="response-interventions" className="font-semibold flex-1">
              Describe the client's response to interventions
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => analyzeField("response_to_interventions", "Response to Interventions")}
              disabled={analyzingField === "response_to_interventions"}
            >
              {analyzingField === "response_to_interventions" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Include what steps need to be taken and/or completed by the next scheduled session.
          </p>
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <Textarea
                id="response-interventions"
                placeholder="Describe client's response..."
                value={formData.response_to_interventions}
                onChange={(e) => updateField("response_to_interventions", e.target.value)}
                className="min-h-[120px] resize-y bg-secondary/50"
                maxLength={MAX_CHARS}
              />
            </div>
            <VoiceInput
              onResult={(text) => {
                setFormData(prev => ({
                  ...prev,
                  response_to_interventions: prev.response_to_interventions ? `${prev.response_to_interventions} ${text}` : text,
                }));
              }}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="new-issues-details" className="font-semibold flex-1">
                Provide details (be specific)
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => analyzeField("new_issues_details", "New Issues Details")}
                disabled={analyzingField === "new_issues_details"}
                className="shrink-0"
              >
                {analyzingField === "new_issues_details" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </Button>
            </div>
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
                onResult={(text) => {
                  setFormData(prev => ({
                    ...prev,
                    new_issues_details: prev.new_issues_details ? `${prev.new_issues_details} ${text}` : text,
                  }));
                }}
                onStartRecording={handleStartRecording}
                onStopRecording={handleStopRecording}
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="goals-progress" className="font-semibold flex-1">
              Progress Toward Treatment Goals
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => analyzeField("goals_progress", "Goals Progress")}
              disabled={analyzingField === "goals_progress"}
            >
              {analyzingField === "goals_progress" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </Button>
          </div>
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
              onResult={(text) => {
                setFormData(prev => ({
                  ...prev,
                  goals_progress: prev.goals_progress ? `${prev.goals_progress} ${text}` : text,
                }));
              }}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
            />
          </div>
          <div className="flex justify-end">
            <p className="text-xs text-muted-foreground">
              {getCharCount(formData.goals_progress)}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="safety-assessment" className="font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              Safety Assessment
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => analyzeField("safety_assessment", "Safety Assessment")}
              disabled={analyzingField === "safety_assessment"}
            >
              {analyzingField === "safety_assessment" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </Button>
          </div>
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
              onResult={(text) => {
                setFormData(prev => ({
                  ...prev,
                  safety_assessment: prev.safety_assessment ? `${prev.safety_assessment} ${text}` : text,
                }));
              }}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
            />
          </div>
          <div className="flex justify-end">
            <p className="text-xs text-muted-foreground">
              {getCharCount(formData.safety_assessment)}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="clinical-impression" className="font-semibold">
              Clinical Impression
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => analyzeField("clinical_impression", "Clinical Impression")}
              disabled={analyzingField === "clinical_impression"}
            >
              {analyzingField === "clinical_impression" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </Button>
          </div>
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
              onResult={(text) => {
                setFormData(prev => ({
                  ...prev,
                  clinical_impression: prev.clinical_impression ? `${prev.clinical_impression} ${text}` : text,
                }));
              }}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
            />
          </div>
          <div className="flex justify-end">
            <p className="text-xs text-muted-foreground">
              {getCharCount(formData.clinical_impression)}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="treatment-plan" className="font-semibold">
              Treatment Plan Updates
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => analyzeField("treatment_plan", "Treatment Plan")}
              disabled={analyzingField === "treatment_plan"}
            >
              {analyzingField === "treatment_plan" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </Button>
          </div>
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
              onResult={(text) => {
                setFormData(prev => ({
                  ...prev,
                  treatment_plan: prev.treatment_plan ? `${prev.treatment_plan} ${text}` : text,
                }));
              }}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
            />
          </div>
          <div className="flex justify-end">
            <p className="text-xs text-muted-foreground">
              {getCharCount(formData.treatment_plan)}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="next-steps" className="font-semibold">
              Next Steps / Follow-up
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => analyzeField("next_steps", "Next Steps")}
              disabled={analyzingField === "next_steps"}
            >
              {analyzingField === "next_steps" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </Button>
          </div>
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
              onResult={(text) => {
                setFormData(prev => ({
                  ...prev,
                  next_steps: prev.next_steps ? `${prev.next_steps} ${text}` : text,
                }));
              }}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
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
