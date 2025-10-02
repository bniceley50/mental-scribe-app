import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import ChatInterface from "@/components/ChatInterface";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();

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
    <Layout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-semibold text-foreground mb-3">Clinical Note Analysis</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Transform your session notes into professional SOAP notes and clinical summaries
            using AI-powered analysis
          </p>
        </div>
        <ChatInterface />
      </div>
    </Layout>
  );
};

export default Index;
