import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";

const Settings = () => {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  return (
    <Layout
      currentConversationId={selectedConversationId}
      onConversationSelect={setSelectedConversationId}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-3xl font-semibold text-foreground mb-2">Settings</h2>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Account Settings
            </CardTitle>
            <CardDescription>Your account information and preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Settings coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Settings;
