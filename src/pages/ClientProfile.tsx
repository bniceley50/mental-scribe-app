import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Edit,
  FileText,
  Mic,
  Upload,
  Calendar,
  User,
  Phone,
  Mail,
  Heart,
  Shield,
} from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { ClientDialog } from "@/components/clients/ClientDialog";
import { RecordingUpload } from "@/components/clients/RecordingUpload";
import { logClientView } from "@/lib/clientAudit";

export default function ClientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRecordingDialogOpen, setIsRecordingDialogOpen] = useState(false);

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select(`
          *,
          programs (
            id,
            name,
            is_part2
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: conversations } = useQuery({
    queryKey: ["client-conversations", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("client_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: notes } = useQuery({
    queryKey: ["client-notes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("structured_notes")
        .select("*")
        .eq("client_id", id)
        .order("session_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: recordings } = useQuery({
    queryKey: ["client-recordings", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recordings")
        .select("*")
        .eq("client_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: files } = useQuery({
    queryKey: ["client-files", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("uploaded_files")
        .select("*")
        .eq("client_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // CRITICAL SECURITY: Log client profile view for HIPAA audit trail
  useEffect(() => {
    if (id && client) {
      // Fire and forget - don't block UI rendering
      logClientView(id).catch(err => {
        console.error('Failed to log client view:', err);
      });
    }
  }, [id, client]);

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-8 px-4 max-w-7xl">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid gap-6 md:grid-cols-3">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!client) {
    return (
      <Layout>
        <div className="container mx-auto py-8 px-4 max-w-7xl text-center">
          <h2 className="text-2xl font-bold mb-4">Client not found</h2>
          <Button onClick={() => navigate("/clients")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Clients
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Button
              variant="ghost"
              onClick={() => navigate("/clients")}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Clients
            </Button>
            <h1 className="text-4xl font-bold text-foreground">
              {client.first_name} {client.last_name}
              {client.preferred_name && (
                <span className="text-2xl text-muted-foreground ml-2">
                  ({client.preferred_name})
                </span>
              )}
            </h1>
            <div className="flex items-center gap-4 mt-2">
              {client.programs?.is_part2 && (
                <Badge variant="destructive">Part 2 Protected</Badge>
              )}
              {!client.is_active && (
                <Badge variant="outline">Archived</Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsRecordingDialogOpen(true)}>
              <Mic className="mr-2 h-4 w-4" />
              Upload Recording
            </Button>
            <Button onClick={() => setIsEditDialogOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Client Info Cards */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Basic Information</h3>
            </div>
            <div className="space-y-2 text-sm">
              {client.date_of_birth && (
                <p>
                  <span className="text-muted-foreground">DOB:</span>{" "}
                  {format(new Date(client.date_of_birth), "MM/dd/yyyy")}
                </p>
              )}
              {client.gender && (
                <p>
                  <span className="text-muted-foreground">Gender:</span> {client.gender}
                </p>
              )}
              {client.pronouns && (
                <p>
                  <span className="text-muted-foreground">Pronouns:</span> {client.pronouns}
                </p>
              )}
              {client.email && (
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {client.email}
                </p>
              )}
              {client.phone && (
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {client.phone}
                </p>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Clinical Information</h3>
            </div>
            <div className="space-y-2 text-sm">
              {client.primary_diagnosis && (
                <p>
                  <span className="text-muted-foreground">Diagnosis:</span>{" "}
                  {client.primary_diagnosis}
                </p>
              )}
              {client.programs && (
                <p>
                  <span className="text-muted-foreground">Program:</span>{" "}
                  {client.programs.name}
                </p>
              )}
              {client.insurance_provider && (
                <p>
                  <span className="text-muted-foreground">Insurance:</span>{" "}
                  {client.insurance_provider}
                </p>
              )}
              {client.treatment_goals && (
                <div>
                  <span className="text-muted-foreground">Goals:</span>
                  <p className="mt-1">{client.treatment_goals}</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Emergency Contact</h3>
            </div>
            <div className="space-y-2 text-sm">
              {client.emergency_contact_name ? (
                <>
                  <p>
                    <span className="text-muted-foreground">Name:</span>{" "}
                    {client.emergency_contact_name}
                  </p>
                  {client.emergency_contact_phone && (
                    <p>
                      <span className="text-muted-foreground">Phone:</span>{" "}
                      {client.emergency_contact_phone}
                    </p>
                  )}
                  {client.emergency_contact_relationship && (
                    <p>
                      <span className="text-muted-foreground">Relationship:</span>{" "}
                      {client.emergency_contact_relationship}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground italic">No emergency contact set</p>
              )}
            </div>
          </Card>
        </div>

        {/* Tabs for documents */}
        <Tabs defaultValue="conversations" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="conversations">
              Conversations ({conversations?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="notes">
              Notes ({notes?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="recordings">
              Recordings ({recordings?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="files">
              Files ({files?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="conversations" className="mt-6">
            {conversations && conversations.length > 0 ? (
              <div className="space-y-4">
                {conversations.map((conv) => (
                  <Card
                    key={conv.id}
                    className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/?conversation=${conv.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{conv.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(conv.created_at), "PPP")}
                        </p>
                      </div>
                      {conv.data_classification === "part2_protected" && (
                        <Badge variant="destructive">Part 2</Badge>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No conversations yet</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="notes" className="mt-6">
            {notes && notes.length > 0 ? (
              <div className="space-y-4">
                {notes.map((note) => (
                  <Card key={note.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">
                          {format(new Date(note.session_date), "PPP")}
                        </span>
                      </div>
                      {note.data_classification === "part2_protected" && (
                        <Badge variant="destructive">Part 2</Badge>
                      )}
                    </div>
                    {note.clinical_impression && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {note.clinical_impression}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No clinical notes yet</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="recordings" className="mt-6">
            {recordings && recordings.length > 0 ? (
              <div className="space-y-4">
                {recordings.map((recording) => (
                  <Card key={recording.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Mic className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-semibold">{recording.file_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(recording.created_at), "PPP")}
                            {recording.duration_seconds && (
                              <span className="ml-2">
                                • {Math.floor(recording.duration_seconds / 60)}m{" "}
                                {recording.duration_seconds % 60}s
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      {recording.data_classification === "part2_protected" && (
                        <Badge variant="destructive">Part 2</Badge>
                      )}
                    </div>
                    {recording.transcription_text && (
                      <p className="text-sm text-muted-foreground mt-3 pl-8">
                        {recording.transcription_text.substring(0, 200)}...
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Mic className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No recordings yet</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setIsRecordingDialogOpen(true)}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Recording
                </Button>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="files" className="mt-6">
            {files && files.length > 0 ? (
              <div className="space-y-4">
                {files.map((file) => (
                  <Card key={file.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{file.file_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(file.created_at), "PPP")} • {file.file_type}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No files uploaded yet</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <ClientDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          mode="edit"
          client={client}
        />

        <RecordingUpload
          open={isRecordingDialogOpen}
          onOpenChange={setIsRecordingDialogOpen}
          clientId={client.id}
        />
      </div>
    </Layout>
  );
}
