import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DiagnosisItem {
  condition: string;
  rationale: string;
  confidence: 'low' | 'medium' | 'high';
  codes: string[];
}

interface DifferentialDiagnosisProps {
  clinicalPresentation: string;
  patientHistory?: string;
  symptoms?: string[];
  onDiagnosesGenerated?: (diagnoses: DiagnosisItem[]) => void;
}

export function DifferentialDiagnosis({
  clinicalPresentation,
  patientHistory,
  symptoms,
  onDiagnosesGenerated
}: DifferentialDiagnosisProps) {
  const [diagnoses, setDiagnoses] = useState<DiagnosisItem[]>([]);
  const [loading, setLoading] = useState(false);

  const generateDiagnoses = async () => {
    if (!clinicalPresentation.trim()) {
      toast.error("Please provide clinical presentation");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('differential-diagnosis', {
        body: {
          clinicalPresentation,
          patientHistory,
          symptoms
        }
      });

      if (error) throw error;

      const generatedDiagnoses = data.diagnoses;
      setDiagnoses(generatedDiagnoses);
      onDiagnosesGenerated?.(generatedDiagnoses);
      
      toast.success(`Generated ${generatedDiagnoses.length} differential diagnoses`);
    } catch (error) {
      console.error('Error generating diagnoses:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate diagnoses');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Differential Diagnosis</h3>
        </div>
        <Button
          onClick={generateDiagnoses}
          disabled={loading || !clinicalPresentation}
          size="sm"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate DDx'
          )}
        </Button>
      </div>

      {diagnoses.length > 0 && (
        <div className="space-y-3">
          {diagnoses.map((dx, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{dx.condition}</CardTitle>
                    <div className="flex gap-2">
                      <Badge className={getConfidenceColor(dx.confidence)}>
                        {dx.confidence} confidence
                      </Badge>
                      {dx.codes.map((code, i) => (
                        <Badge key={i} variant="outline">
                          {code}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">#{index + 1}</span>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">{dx.rationale}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {diagnoses.length === 0 && !loading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground text-center">
              No differential diagnoses generated yet.
              <br />
              Add clinical presentation and click "Generate DDx".
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
