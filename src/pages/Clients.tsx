import { useState } from "react";
import { Plus, Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientsList } from "@/components/clients/ClientsList";
import { ClientDialog } from "@/components/clients/ClientDialog";
import Layout from "@/components/Layout";

export default function Clients() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-foreground">Client Profiles</h1>
              <p className="text-muted-foreground mt-2">
                Manage your client information and organize their clinical records
              </p>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} size="lg">
              <UserPlus className="mr-2 h-5 w-5" />
              Add Client
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search clients by name, email, or diagnosis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 py-6 text-lg"
            />
          </div>
        </div>

        <ClientsList searchQuery={searchQuery} />

        <ClientDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          mode="create"
        />
      </div>
    </Layout>
  );
}
