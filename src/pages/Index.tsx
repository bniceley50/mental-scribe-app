import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import ChatInterface from "@/components/ChatInterface";
import { WelcomeGuide } from "@/components/WelcomeGuide";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <>
      <WelcomeGuide />
      <Layout 
        currentConversationId={currentConversationId}
        onConversationSelect={(id) => setCurrentConversationId(id)}
      >
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-semibold text-foreground mb-2">Clinical Note Analysis</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Transform your session notes into professional clinical documentation using AI
          </p>
        </div>
        <ChatInterface 
          conversationId={currentConversationId}
          onConversationCreated={(id) => setCurrentConversationId(id)}
        />
      </div>
    </Layout>
    </>
  );
};

export default Index;
