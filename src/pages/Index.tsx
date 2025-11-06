import { Header } from "@/components/Header";
import { LifeSupportMonitor } from "@/components/LifeSupportMonitor";
import { PowerManagement } from "@/components/PowerManagement";
import { CrewHealth } from "@/components/CrewHealth";
import { AIChat } from "@/components/AIChat";
import { CommandConsole } from "@/components/CommandConsole";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-space">
      <Header />
      
      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main telemetry column */}
          <div className="xl:col-span-2 space-y-6">
            <div className="animate-slide-up">
              <LifeSupportMonitor />
            </div>
            
            <div className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <PowerManagement />
            </div>
            
            <div className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <CrewHealth />
            </div>
          </div>

          {/* AI & Command column */}
          <div className="space-y-6">
            <div className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
              <AIChat />
            </div>
            
            <div className="animate-slide-up" style={{ animationDelay: "0.4s" }}>
              <CommandConsole />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
