import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, FileText, Palette, Save, Lock, Trash2 } from "lucide-react";
import { toast as showToast } from "sonner";
import { setProcessingMode } from "@/core/network/guard";
import { clearLocalCache } from "@/core/storage/database-stub";
import type { ProcessingMode } from "@/core/processing/types";
import { LocalModeBadge } from "@/components/LocalModeBadge";

interface UserPreferences {
  defaultAction: string;
  outputFormat: string;
  theme: string;
  fontSize: string;
  autoSave: boolean;
  showTimestamps: boolean;
  processingMode: ProcessingMode;
}

const Settings = () => {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>({
    defaultAction: "session_summary",
    outputFormat: "markdown",
    theme: "light",
    fontSize: "medium",
    autoSave: true,
    showTimestamps: true,
    processingMode: "cloud",
  });
  
  const [isClearing, setIsClearing] = useState(false);

  // Load preferences from localStorage
  useEffect(() => {
    const savedPreferences = localStorage.getItem("clinicalai_preferences");
    if (savedPreferences) {
      const prefs = JSON.parse(savedPreferences);
      setPreferences(prefs);
      // Apply processing mode on load
      if (prefs.processingMode) {
        setProcessingMode(prefs.processingMode);
      }
    }
  }, []);

  const handleSavePreferences = () => {
    localStorage.setItem("clinicalai_preferences", JSON.stringify(preferences));
    setProcessingMode(preferences.processingMode);
    showToast.success("Preferences saved successfully!");
  };
  
  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      await clearLocalCache();
      showToast.success("Local cache and models cleared");
    } catch (err) {
      showToast.error("Failed to clear cache");
      console.error(err);
    } finally {
      setIsClearing(false);
    }
  };

  const handleResetPreferences = () => {
    const defaultPreferences: UserPreferences = {
      defaultAction: "session_summary",
      outputFormat: "markdown",
      theme: "light",
      fontSize: "medium",
      autoSave: true,
      showTimestamps: true,
      processingMode: "cloud",
    };
    setPreferences(defaultPreferences);
    localStorage.setItem("clinicalai_preferences", JSON.stringify(defaultPreferences));
    setProcessingMode("cloud");
    showToast.success("Preferences reset to defaults!");
  };

  return (
    <Layout
      currentConversationId={selectedConversationId}
      onConversationSelect={setSelectedConversationId}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-foreground mb-2">Settings</h2>
            <p className="text-muted-foreground">Customize your ClinicalAI Assistant experience</p>
          </div>
          <LocalModeBadge />
        </div>

        {/* Processing Mode */}
        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Processing Mode
            </CardTitle>
            <CardDescription>Choose where your data is processed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="processingMode">Processing Location</Label>
              <Select
                value={preferences.processingMode}
                onValueChange={(value: ProcessingMode) =>
                  setPreferences({ ...preferences, processingMode: value })
                }
              >
                <SelectTrigger id="processingMode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cloud">
                    <div className="flex items-center gap-2">
                      <span>☁️ Cloud</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="local-browser">
                    <div className="flex items-center gap-2">
                      <span>🔒 Local (Browser)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="local-lan">
                    <div className="flex items-center gap-2">
                      <span>🏠 Local (LAN Server)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="text-sm space-y-1 text-muted-foreground">
                {preferences.processingMode === "cloud" && (
                  <p>✓ Highest quality AI • Requires internet connection</p>
                )}
                {preferences.processingMode === "local-browser" && (
                  <>
                    <p>✓ Complete privacy - data never leaves your device</p>
                    <p>✓ Works offline after initial model download (~140MB)</p>
                    <p>⚠ Requires 8GB+ RAM with WebGPU for best performance</p>
                  </>
                )}
                {preferences.processingMode === "local-lan" && (
                  <>
                    <p>✓ On-premises processing - data stays on your network</p>
                    <p>✓ Better quality than browser-only</p>
                    <p>⚠ Requires local server setup (Sprint L2)</p>
                  </>
                )}
              </div>
            </div>
            
            {preferences.processingMode !== "cloud" && (
              <>
                <Separator />
                <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">Local Cache & Models</p>
                    <p className="text-sm text-muted-foreground">
                      Clear IndexedDB cache and downloaded models (~300MB)
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearCache}
                    disabled={isClearing}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isClearing ? "Clearing..." : "Clear Cache"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* AI Behavior Settings */}
        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-primary" />
              AI Behavior
            </CardTitle>
            <CardDescription>Configure default AI analysis preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="defaultAction">Default Analysis Type</Label>
              <Select
                value={preferences.defaultAction}
                onValueChange={(value) =>
                  setPreferences({ ...preferences, defaultAction: value })
                }
              >
                <SelectTrigger id="defaultAction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="session_summary">Session Summary</SelectItem>
                  <SelectItem value="soap_note">SOAP Note</SelectItem>
                  <SelectItem value="key_points">Key Points</SelectItem>
                  <SelectItem value="progress_report">Progress Report</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                The default analysis type when using quick actions
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="outputFormat">Preferred Output Format</Label>
              <Select
                value={preferences.outputFormat}
                onValueChange={(value) =>
                  setPreferences({ ...preferences, outputFormat: value })
                }
              >
                <SelectTrigger id="outputFormat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="markdown">Markdown (formatted)</SelectItem>
                  <SelectItem value="plain">Plain Text</SelectItem>
                  <SelectItem value="structured">Structured (bullets)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                How AI responses should be formatted
              </p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="autoSave">Auto-save Messages</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically save all messages to conversation history
                </p>
              </div>
              <Switch
                id="autoSave"
                checked={preferences.autoSave}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, autoSave: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Display Preferences */}
        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Display Preferences
            </CardTitle>
            <CardDescription>Customize the appearance of the interface</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select
                value={preferences.theme}
                onValueChange={(value) => setPreferences({ ...preferences, theme: value })}
              >
                <SelectTrigger id="theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="auto">Auto (system)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Choose your preferred color theme
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="fontSize">Font Size</Label>
              <Select
                value={preferences.fontSize}
                onValueChange={(value) => setPreferences({ ...preferences, fontSize: value })}
              >
                <SelectTrigger id="fontSize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                  <SelectItem value="extra-large">Extra Large</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Adjust text size for better readability
              </p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="showTimestamps">Show Timestamps</Label>
                <p className="text-sm text-muted-foreground">
                  Display timestamps on messages in conversations
                </p>
              </div>
              <Switch
                id="showTimestamps"
                checked={preferences.showTimestamps}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, showTimestamps: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Export Settings */}
        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Export & Data
            </CardTitle>
            <CardDescription>Manage your conversation data and exports</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
              <div>
                <p className="font-medium text-foreground">Export Format</p>
                <p className="text-sm text-muted-foreground">
                  Default format for conversation exports
                </p>
              </div>
              <span className="text-sm font-medium text-primary">PDF</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
              <div>
                <p className="font-medium text-foreground">Data Retention</p>
                <p className="text-sm text-muted-foreground">
                  Conversations are stored indefinitely
                </p>
              </div>
              <span className="text-sm font-medium text-primary">Unlimited</span>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={handleResetPreferences}>
            Reset to Defaults
          </Button>
          <Button onClick={handleSavePreferences} className="bg-primary hover:bg-primary/90">
            <Save className="w-4 h-4 mr-2" />
            Save Preferences
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
