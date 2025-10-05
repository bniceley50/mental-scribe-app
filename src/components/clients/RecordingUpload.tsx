import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, Mic } from "lucide-react";

interface RecordingUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  conversationId?: string;
}

export function RecordingUpload({
  open,
  onOpenChange,
  clientId,
  conversationId,
}: RecordingUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type (audio files)
      if (!selectedFile.type.startsWith("audio/")) {
        toast.error("Please select an audio file");
        return;
      }
      // Validate file size (max 100MB)
      if (selectedFile.size > 100 * 1024 * 1024) {
        toast.error("File size must be less than 100MB");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(10);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      setProgress(30);

      // Upload to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("recordings")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setProgress(60);

      // Generate signed URL for secure access (1 hour expiry)
      const { data: signedData, error: signedError } = await supabase.storage
        .from("recordings")
        .createSignedUrl(fileName, 3600);

      if (signedError) throw signedError;

      setProgress(80);

      // Get audio duration (if possible)
      const audio = new Audio();
      const duration = await new Promise<number>((resolve) => {
        audio.addEventListener("loadedmetadata", () => {
          resolve(Math.floor(audio.duration));
        });
        audio.addEventListener("error", () => {
          resolve(0);
        });
        audio.src = URL.createObjectURL(file);
      });

      // Create recording record with signed URL
      const { error: dbError } = await supabase.from("recordings").insert({
        user_id: user.id,
        client_id: clientId,
        conversation_id: conversationId || null,
        file_name: file.name,
        file_url: signedData.signedUrl,
        file_size: file.size,
        duration_seconds: duration || null,
        transcription_status: "pending",
      });

      if (dbError) throw dbError;

      setProgress(100);
      toast.success("Recording uploaded successfully");
      
      queryClient.invalidateQueries({ queryKey: ["client-recordings", clientId] });
      onOpenChange(false);
      setFile(null);
      setProgress(0);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload recording");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Session Recording</DialogTitle>
          <DialogDescription>
            Upload an audio recording of a therapy session
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="recording">Audio File</Label>
            <div className="mt-2">
              <Input
                id="recording"
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </div>
            {file && (
              <div className="mt-2 p-3 bg-muted rounded-md flex items-center gap-2">
                <Mic className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
            )}
          </div>

          {uploading && (
            <div className="space-y-2">
              <Label>Upload Progress</Label>
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                {progress}%
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Uploading..." : "Upload Recording"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
