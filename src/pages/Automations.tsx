import { useState } from "react";
import { FlowsList } from "@/components/automations/FlowsList";
import { FlowEditor } from "@/components/automations/FlowEditor";
import { AutomationFlow } from "@/hooks/useAutomationFlows";

export default function Automations() {
  const [view, setView] = useState<"list" | "editor">("list");
  const [editingFlow, setEditingFlow] = useState<AutomationFlow | null>(null);

  const handleNew = () => {
    setEditingFlow(null);
    setView("editor");
  };

  const handleEdit = (flow: AutomationFlow) => {
    setEditingFlow(flow);
    setView("editor");
  };

  const handleBack = () => {
    setEditingFlow(null);
    setView("list");
  };

  if (view === "editor") {
    return <FlowEditor flow={editingFlow} onBack={handleBack} />;
  }

  return (
    <div className="p-4 md:p-6">
      <FlowsList onEdit={handleEdit} onNew={handleNew} />
    </div>
  );
}
