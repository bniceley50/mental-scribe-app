import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Edit, Archive, FileText, Mic } from "lucide-react";
import { format } from "date-fns";
import { ClientDialog } from "./ClientDialog";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { logClientView, batchLogClientViews } from "@/lib/clientAudit";

interface ClientsListProps {
  searchQuery: string;
}

export function ClientsList({ searchQuery }: ClientsListProps) {
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const navigate = useNavigate();

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients"],
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
        .eq("is_active", true)
        .order("last_name", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const handleArchiveClient = async (clientId: string) => {
    const { error } = await supabase
      .from("clients")
      .update({ is_active: false })
      .eq("id", clientId);

    if (error) {
      toast.error("Failed to archive client");
    } else {
      toast.success("Client archived successfully");
    }
  };

  const filteredClients = clients?.filter((client) => {
    const query = searchQuery.toLowerCase();
    return (
      client.first_name?.toLowerCase().includes(query) ||
      client.last_name?.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query) ||
      client.primary_diagnosis?.toLowerCase().includes(query)
    );
  });

  // HIPAA REQUIREMENT: Log batch audit when client list is displayed
  // This addresses the finding from security reviews about missing list view auditing
  useEffect(() => {
    if (filteredClients && filteredClients.length > 0) {
      const clientIds = filteredClients.map(c => c.id);
      batchLogClientViews(clientIds).catch(err => {
        console.error('Failed to log batch client views:', err);
        // Don't block UI on audit logging failures
      });
    }
  }, [filteredClients]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-6 w-3/4 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </Card>
        ))}
      </div>
    );
  }

  if (!filteredClients || filteredClients.length === 0) {
    return (
      <Card className="p-12 text-center">
        <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">No clients found</h3>
        <p className="text-muted-foreground mb-6">
          {searchQuery
            ? "Try adjusting your search criteria"
            : "Get started by adding your first client"}
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredClients.map((client) => (
          <Card key={client.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-foreground">
                  {client.first_name} {client.last_name}
                  {client.preferred_name && (
                    <span className="text-sm text-muted-foreground ml-2">
                      ({client.preferred_name})
                    </span>
                  )}
                </h3>
                {client.date_of_birth && (
                  <p className="text-sm text-muted-foreground">
                    DOB: {format(new Date(client.date_of_birth), "MM/dd/yyyy")}
                  </p>
                )}
              </div>
              {client.programs?.is_part2 && (
                <Badge variant="destructive">Part 2</Badge>
              )}
            </div>

            {client.primary_diagnosis && (
              <p className="text-sm mb-2">
                <span className="font-medium">Diagnosis:</span>{" "}
                {client.primary_diagnosis}
              </p>
            )}

            {client.programs && (
              <p className="text-sm mb-4">
                <span className="font-medium">Program:</span> {client.programs.name}
              </p>
            )}

            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Log the client view before navigating (HIPAA requirement)
                  logClientView(client.id).catch(err => {
                    console.error('Failed to log client view:', err);
                  });
                  navigate(`/client/${client.id}`);
                }}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-1" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedClient(client);
                  setIsDialogOpen(true);
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleArchiveClient(client.id)}
              >
                <Archive className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {selectedClient && (
        <ClientDialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setSelectedClient(null);
          }}
          mode="edit"
          client={selectedClient}
        />
      )}
    </>
  );
}
