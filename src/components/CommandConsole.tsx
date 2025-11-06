import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Terminal, Power, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTelemetry } from "@/hooks/use-telemetry";

interface Command {
  id: string;
  name: string;
  status: "idle" | "executing" | "success" | "failed";
  description: string;
}

export const CommandConsole = () => {
  const { toast } = useToast();
  const { optimizePower, boostOxygen } = useTelemetry();
  const [commands, setCommands] = useState<Command[]>([
    { id: "1", name: "Reboot Life Support", status: "idle", description: "Restart ECLSS modules" },
    { id: "2", name: "Optimize Power", status: "idle", description: "Balance solar array output" },
    { id: "3", name: "Emergency O₂ Boost", status: "idle", description: "Activate oxygen reserves" },
    { id: "4", name: "System Diagnostics", status: "idle", description: "Run full system check" }
  ]);

  const executeCommand = (commandId: string) => {
    const targetCommand = commands.find(cmd => cmd.id === commandId);

    setCommands(prev =>
      prev.map(cmd =>
        cmd.id === commandId ? { ...cmd, status: "executing" } : cmd
      )
    );

    toast({
      title: "Command Initiated",
      description: "Executing station command...",
    });

    setTimeout(() => {
      setCommands(prev =>
        prev.map(cmd =>
          cmd.id === commandId ? { ...cmd, status: "success" } : cmd
        )
      );

      if (targetCommand?.name === "Optimize Power") {
        optimizePower();
        toast({
          title: "Power Optimization Complete",
          description: "Solar array efficiency increased and loads rebalanced.",
        });
      } else if (targetCommand?.name === "Emergency O₂ Boost") {
        boostOxygen();
        toast({
          title: "Emergency Oxygen Boost",
          description: "Oxygen reserves vented to hab module. Levels rising.",
        });
      } else {
        toast({
          title: "Command Successful",
          description: "Operation completed successfully",
        });
      }

      setTimeout(() => {
        setCommands(prev =>
          prev.map(cmd =>
            cmd.id === commandId ? { ...cmd, status: "idle" } : cmd
          )
        );
      }, 3000);
    }, 2000);
  };

  const getStatusIcon = (status: Command["status"]) => {
    switch (status) {
      case "executing":
        return <RefreshCw className="w-4 h-4 animate-spin text-[hsl(var(--warning))]" />;
      case "success":
        return <CheckCircle className="w-4 h-4 text-success" />;
      case "failed":
        return <AlertTriangle className="w-4 h-4 text-destructive" />;
      default:
        return <Terminal className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <Card className="p-4 border-2 border-border bg-card/50">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
        <Terminal className="w-5 h-5 text-primary" />
        <h3 className="font-bold">Command Console</h3>
      </div>

      <div className="space-y-2">
        {commands.map(command => (
          <div
            key={command.id}
            className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border hover:border-primary/50 transition-all"
          >
            <div className="flex items-center gap-3">
              {getStatusIcon(command.status)}
              <div>
                <p className="font-semibold text-sm">{command.name}</p>
                <p className="text-xs text-muted-foreground">{command.description}</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => executeCommand(command.id)}
              disabled={command.status !== "idle"}
              className="glow-primary"
            >
              <Power className="w-4 h-4 mr-1" />
              Execute
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};
