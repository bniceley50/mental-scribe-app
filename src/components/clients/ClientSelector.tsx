import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";

interface ClientSelectorProps {
  value?: string;
  onChange: (clientId: string) => void;
  className?: string;
}

export function ClientSelector({ value, onChange, className }: ClientSelectorProps) {
  const { data: clients, isLoading } = useQuery({
    queryKey: ["active-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select(`
          id,
          first_name,
          last_name,
          preferred_name,
          programs (
            is_part2
          )
        `)
        .eq("is_active", true)
        .order("last_name", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className={className}>
        <Label className="text-sm font-medium flex items-center gap-2">
          <User className="h-4 w-4" />
          Client
        </Label>
        <Select disabled>
          <SelectTrigger>
            <SelectValue placeholder="Loading clients..." />
          </SelectTrigger>
        </Select>
      </div>
    );
  }

  if (!clients || clients.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <Label className="text-sm font-medium flex items-center gap-2 mb-2">
        <User className="h-4 w-4" />
        Client (Optional)
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select a client..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          {clients.map((client) => (
            <SelectItem key={client.id} value={client.id}>
              <div className="flex items-center gap-2">
                <span>
                  {client.last_name}, {client.first_name}
                  {client.preferred_name && ` (${client.preferred_name})`}
                </span>
                {client.programs?.is_part2 && (
                  <Badge variant="destructive" className="text-xs">
                    Part 2
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
