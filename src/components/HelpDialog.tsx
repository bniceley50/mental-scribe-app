import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  HelpCircle, 
  Mic, 
  Volume2, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  FileText,
  Brain,
  Table
} from "lucide-react";

export const HelpDialog = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <HelpCircle className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Welcome to Clinical Note Analysis</DialogTitle>
          <DialogDescription>
            Your AI-powered assistant for clinical documentation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Voice Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                🗣️ Voice Features
              </CardTitle>
              <CardDescription>Make documentation hands-free and accessible</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Mic className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Speak Your Notes (Speech-to-Text)</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                        <span>Tap the 🎤 microphone to start dictating your clinical notes</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                        <span>Notes are transcribed in real-time and added to your session</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                        <span>Button pulses red while listening—tap again to stop</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <Separator className="my-3" />

                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Volume2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Listen to Notes (Text-to-Speech)</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                        <span>Tap 🔊 speaker icon to hear your notes or AI responses read aloud</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                        <span>Perfect for reviewing documentation hands-free</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                        <span>Icon animates while speaking—tap to stop</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-900 dark:text-amber-200">
                    <p className="font-semibold mb-1">Browser Compatibility</p>
                    <p>Voice features work best in <strong>Chrome, Edge, and Safari</strong>. If unavailable, buttons will be disabled with helpful messages.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Analysis Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Advanced AI Analysis
              </CardTitle>
              <CardDescription>Powerful insights from your clinical notes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="border rounded-lg p-3">
                  <h4 className="font-semibold text-sm mb-2">Medical Entities</h4>
                  <p className="text-xs text-muted-foreground">
                    Automatically extracts diagnoses, medications, symptoms, and vitals
                  </p>
                </div>
                <div className="border rounded-lg p-3">
                  <h4 className="font-semibold text-sm mb-2">Clinical Summary</h4>
                  <p className="text-xs text-muted-foreground">
                    Comprehensive assessment with treatment recommendations
                  </p>
                </div>
                <div className="border rounded-lg p-3">
                  <h4 className="font-semibold text-sm mb-2">Risk Assessment</h4>
                  <p className="text-xs text-muted-foreground">
                    Safety evaluation with risk factors and protective factors
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documentation Modes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Documentation Modes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Badge variant="outline">Free-form</Badge>
                <p className="text-sm text-muted-foreground flex-1">
                  AI-assisted note taking with quick actions for SOAP notes, summaries, key points, and progress reports
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline">Structured</Badge>
                <p className="text-sm text-muted-foreground flex-1">
                  Standardized clinical forms with auto-save, character limits, and comprehensive session documentation
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">💡 Quick Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Use <kbd className="px-2 py-0.5 bg-secondary rounded text-xs">Ctrl+Enter</kbd> to quickly analyze notes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Upload PDF or text documents for AI analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>All conversations are auto-saved and accessible in History</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Export conversations as PDF or text from the History page</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Structured forms auto-save every 30 seconds</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Troubleshooting */}
          <Card className="border-amber-200 dark:border-amber-800">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                Troubleshooting
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <h4 className="font-semibold mb-1">Microphone not working?</h4>
                <ul className="text-muted-foreground space-y-1 ml-4">
                  <li>• Check browser permissions for microphone access</li>
                  <li>• Ensure you are using Chrome, Edge, or Safari</li>
                  <li>• Try refreshing the page and allowing microphone access again</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Text-to-speech not playing?</h4>
                <ul className="text-muted-foreground space-y-1 ml-4">
                  <li>• Check your device volume settings</li>
                  <li>• Ensure your browser supports speech synthesis</li>
                  <li>• Try a different browser if issues persist</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-1">AI analysis failing?</h4>
                <ul className="text-muted-foreground space-y-1 ml-4">
                  <li>• Ensure you are logged in</li>
                  <li>• Check your internet connection</li>
                  <li>• Try again in a few moments if service is busy</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
