import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Sparkles, 
  AlertTriangle, 
  FileText, 
  Activity,
  Pill,
  Stethoscope,
  HeartPulse
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AdvancedAnalysisProps {
  noteContent: string;
  conversationId: string;
}

interface MedicalEntities {
  diagnoses: string[];
  medications: string[];
  symptoms: string[];
  procedures: string[];
  vitals: string[];
  risk_factors: string[];
  mental_status: {
    mood?: string;
    affect?: string;
    thought_process?: string;
    orientation?: string;
  };
  clinical_concerns: string[];
}

export const AdvancedAnalysis = ({ noteContent, conversationId }: AdvancedAnalysisProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<string | null>(null);
  const [results, setResults] = useState<{
    medical_entities?: MedicalEntities;
    clinical_summary?: string;
    risk_assessment?: string;
  }>({});

  const runAnalysis = async (analysisType: string) => {
    if (!noteContent.trim()) {
      toast({
        title: "No content",
        description: "Please enter some clinical notes first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setActiveAnalysis(analysisType);

    try {
      // Get the user's session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      // Use fetch directly for streaming responses
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-clinical-notes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            notes: noteContent,
            action: analysisType,
            conversation_history: [],
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please try again in a moment.");
        }
        if (response.status === 402) {
          throw new Error("AI service credits depleted. Please contact support.");
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      // Parse the streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6);
            if (jsonStr === "[DONE]") {
              break;
            }

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullResponse += content;
              }
            } catch (e) {
              console.warn("Failed to parse SSE data:", e);
            }
          }
        }
      }

      // Store the result
      if (analysisType === "medical_entities") {
        try {
          const entities = JSON.parse(fullResponse);
          setResults(prev => ({ ...prev, medical_entities: entities }));
        } catch (e) {
          console.error("Failed to parse medical entities:", e);
          toast({
            title: "Parse Error",
            description: "Unable to parse medical entities from response",
            variant: "destructive",
          });
          return;
        }
      } else {
        setResults(prev => ({ ...prev, [analysisType]: fullResponse }));
      }

      toast({
        title: "Analysis Complete",
        description: `${analysisType.replace(/_/g, " ")} completed successfully`,
      });
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Unable to complete analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setActiveAnalysis(null);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Advanced AI Analysis
        </CardTitle>
        <CardDescription>
          Extract medical entities, assess risk, and generate comprehensive clinical summaries
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <Button
            onClick={() => runAnalysis("medical_entities")}
            disabled={loading}
            variant="outline"
            className="h-auto py-4 flex flex-col items-start gap-2"
          >
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              <span className="font-semibold">Extract Entities</span>
            </div>
            <span className="text-xs text-muted-foreground text-left">
              Diagnoses, medications, symptoms, vitals
            </span>
          </Button>

          <Button
            onClick={() => runAnalysis("clinical_summary")}
            disabled={loading}
            variant="outline"
            className="h-auto py-4 flex flex-col items-start gap-2"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="font-semibold">Clinical Summary</span>
            </div>
            <span className="text-xs text-muted-foreground text-left">
              Comprehensive assessment and recommendations
            </span>
          </Button>

          <Button
            onClick={() => runAnalysis("risk_assessment")}
            disabled={loading}
            variant="outline"
            className="h-auto py-4 flex flex-col items-start gap-2"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-semibold">Risk Assessment</span>
            </div>
            <span className="text-xs text-muted-foreground text-left">
              Safety evaluation and protective factors
            </span>
          </Button>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            <p className="mt-2 text-sm text-muted-foreground">
              Running {activeAnalysis?.replace(/_/g, " ")}...
            </p>
          </div>
        )}

        {results.medical_entities && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg">Medical Entity Extraction</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="diagnoses" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="diagnoses">Diagnoses</TabsTrigger>
                  <TabsTrigger value="medications">Medications</TabsTrigger>
                  <TabsTrigger value="symptoms">Symptoms</TabsTrigger>
                  <TabsTrigger value="clinical">Clinical</TabsTrigger>
                </TabsList>

                <TabsContent value="diagnoses" className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Stethoscope className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-semibold">Diagnoses & Conditions</h4>
                  </div>
                  {results.medical_entities.diagnoses.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {results.medical_entities.diagnoses.map((dx, i) => (
                        <Badge key={i} variant="secondary">{dx}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No diagnoses extracted</p>
                  )}

                  <div className="flex items-center gap-2 mt-4 mb-2">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-semibold">Risk Factors</h4>
                  </div>
                  {results.medical_entities.risk_factors.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {results.medical_entities.risk_factors.map((risk, i) => (
                        <Badge key={i} variant="destructive">{risk}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No risk factors identified</p>
                  )}
                </TabsContent>

                <TabsContent value="medications" className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Pill className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-semibold">Medications</h4>
                  </div>
                  {results.medical_entities.medications.length > 0 ? (
                    <div className="space-y-1">
                      {results.medical_entities.medications.map((med, i) => (
                        <div key={i} className="p-2 bg-secondary rounded-md text-sm">
                          {med}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No medications mentioned</p>
                  )}

                  <div className="flex items-center gap-2 mt-4 mb-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-semibold">Procedures & Interventions</h4>
                  </div>
                  {results.medical_entities.procedures.length > 0 ? (
                    <div className="space-y-1">
                      {results.medical_entities.procedures.map((proc, i) => (
                        <div key={i} className="p-2 bg-secondary rounded-md text-sm">
                          {proc}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No procedures documented</p>
                  )}
                </TabsContent>

                <TabsContent value="symptoms" className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <HeartPulse className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-semibold">Reported Symptoms</h4>
                  </div>
                  {results.medical_entities.symptoms.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {results.medical_entities.symptoms.map((symptom, i) => (
                        <div key={i} className="p-2 bg-secondary rounded-md text-sm">
                          • {symptom}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No symptoms documented</p>
                  )}

                  {results.medical_entities.vitals.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 mt-4 mb-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <h4 className="font-semibold">Vital Signs</h4>
                      </div>
                      <div className="space-y-1">
                        {results.medical_entities.vitals.map((vital, i) => (
                          <div key={i} className="p-2 bg-secondary rounded-md text-sm">
                            {vital}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="clinical" className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-semibold">Mental Status Examination</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {results.medical_entities.mental_status.mood && (
                      <div className="p-3 bg-secondary rounded-md">
                        <div className="text-xs text-muted-foreground mb-1">Mood</div>
                        <div className="text-sm">{results.medical_entities.mental_status.mood}</div>
                      </div>
                    )}
                    {results.medical_entities.mental_status.affect && (
                      <div className="p-3 bg-secondary rounded-md">
                        <div className="text-xs text-muted-foreground mb-1">Affect</div>
                        <div className="text-sm">{results.medical_entities.mental_status.affect}</div>
                      </div>
                    )}
                    {results.medical_entities.mental_status.thought_process && (
                      <div className="p-3 bg-secondary rounded-md">
                        <div className="text-xs text-muted-foreground mb-1">Thought Process</div>
                        <div className="text-sm">{results.medical_entities.mental_status.thought_process}</div>
                      </div>
                    )}
                    {results.medical_entities.mental_status.orientation && (
                      <div className="p-3 bg-secondary rounded-md">
                        <div className="text-xs text-muted-foreground mb-1">Orientation</div>
                        <div className="text-sm">{results.medical_entities.mental_status.orientation}</div>
                      </div>
                    )}
                  </div>

                  {results.medical_entities.clinical_concerns.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 mt-4 mb-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <h4 className="font-semibold">Clinical Concerns</h4>
                      </div>
                      <div className="space-y-2">
                        {results.medical_entities.clinical_concerns.map((concern, i) => (
                          <div key={i} className="p-2 bg-destructive/10 border-l-4 border-destructive rounded text-sm">
                            {concern}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {results.clinical_summary && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Clinical Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <div className="whitespace-pre-wrap">{results.clinical_summary}</div>
              </div>
            </CardContent>
          </Card>
        )}

        {results.risk_assessment && (
          <Card className="mb-4 border-destructive/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Risk Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <div className="whitespace-pre-wrap">{results.risk_assessment}</div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};
