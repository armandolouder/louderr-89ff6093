import { useState, lazy, Suspense } from "react";
import { JourneysList } from "@/components/journeys/JourneysList";
import type { JourneyRow } from "@/hooks/useJourneys";

const JourneyEditor = lazy(() =>
  import("@/components/journeys/JourneyEditor").then((m) => ({ default: m.JourneyEditor }))
);

const EditorFallback = () => (
  <div className="flex items-center justify-center h-screen bg-background">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent animate-spin" />
  </div>
);

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
    return (
      <Suspense fallback={<EditorFallback />}>
        <JourneyEditor journey={editingJourney} onBack={handleBack} />
      </Suspense>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <JourneysList onEdit={handleEdit} onNew={handleNew} />
    </div>
  );
}
