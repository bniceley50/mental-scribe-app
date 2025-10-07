import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import ChatInterface from "@/components/ChatInterface";
import { WelcomeGuide } from "@/components/WelcomeGuide";
import { WelcomeBanner } from "@/components/WelcomeBanner";
import { OnboardingTooltip } from "@/components/OnboardingTooltip";
import { OnboardingTour } from "@/components/OnboardingTour";
import { useOnboarding } from "@/hooks/useOnboarding";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const { hasCompletedOnboarding, startOnboarding } = useOnboarding();

  // Do NOT auto-start onboarding; user can trigger from WelcomeBanner
  useEffect(() => {
    // intentionally left blank to avoid unexpected overlays blocking UI
  }, []);

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

  // Session timeout monitoring (30 minutes of inactivity)
  useEffect(() => {
    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.auth.signOut();
          navigate("/auth");
        }
      }, SESSION_TIMEOUT);
    };

    // Reset timer on user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [navigate]);

  return (
    <>
      <OnboardingTour />
      <OnboardingTooltip />
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
        <WelcomeBanner />
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
