import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

const History = () => {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  return (
    <Layout
      currentConversationId={selectedConversationId}
      onConversationSelect={setSelectedConversationId}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-3xl font-semibold text-foreground mb-2">Analysis History</h2>
          <p className="text-muted-foreground">View your previous clinical note analyses</p>
        </div>

        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Recent Sessions
            </CardTitle>
            <CardDescription>Your analysis history will appear here</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a conversation from the sidebar to view its history</p>
              <p className="text-sm mt-2">All your conversations are saved automatically</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default History;
