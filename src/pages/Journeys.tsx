import { useState } from "react";
import { JourneysList } from "@/components/journeys/JourneysList";
import { JourneyEditor } from "@/components/journeys/JourneyEditor";
import type { JourneyRow } from "@/hooks/useJourneys";

export default function Journeys() {
  const [view, setView] = useState<"list" | "editor">("list");
  const [editingJourney, setEditingJourney] = useState<JourneyRow | null>(null);

  const handleNew = () => {
    setEditingJourney(null);
    setView("editor");
  };

  const handleEdit = (journey: JourneyRow) => {
    setEditingJourney(journey);
    setView("editor");
  };

  const handleBack = () => {
    setEditingJourney(null);
    setView("list");
  };

  if (view === "editor") {
    return <JourneyEditor journey={editingJourney} onBack={handleBack} />;
  }

  return (
    <div className="p-4 md:p-6">
      <JourneysList onEdit={handleEdit} onNew={handleNew} />
    </div>
  );
}
