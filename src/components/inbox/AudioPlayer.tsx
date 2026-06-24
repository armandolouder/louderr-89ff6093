import { useEffect, useRef, useState } from "react";
import { Play, Pause, Mic, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AudioPlayerProps {
  url: string;
  messageId?: string;
  initialTranscription?: string;
  isAgent: boolean;
}

// Static pseudo-waveform bars for a modern look
const BAR_HEIGHTS = [
  0.4, 0.7, 1, 0.6, 0.85, 0.5, 0.9, 0.65, 0.45, 0.8, 1, 0.55, 0.7, 0.4, 0.6,
  0.9, 0.5, 0.75, 0.95, 0.6, 0.45, 0.8, 0.65, 0.5, 0.85, 0.7, 0.4, 0.6, 0.9, 0.55,
];

function formatTime(s: number) {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

export function AudioPlayer({ url, messageId, initialTranscription, isAgent }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [transcription, setTranscription] = useState<string | null>(initialTranscription || null);
  const [transcribing, setTranscribing] = useState(false);

  useEffect(() => {
    setTranscription(initialTranscription || null);
  }, [initialTranscription, messageId]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play().catch(() => toast.error("Não foi possível reproduzir o áudio"));
    }
  };

  const progress = duration > 0 ? current / duration : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
  };

  const handleTranscribe = async () => {
    if (!messageId) {
      toast.error("Transcrição indisponível para esta mensagem");
      return;
    }
    setTranscribing(true);
    try {
      const { data, error } = await supabase.functions.invoke("transcribe-audio", {
        body: { messageId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setTranscription(data.transcription || "(sem fala detectada)");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Falha ao transcrever");
    } finally {
      setTranscribing(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 min-w-[240px] max-w-[300px]">
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0 transition-colors",
            isAgent
              ? "bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        <div className="flex-1 flex flex-col gap-1">
          <div
            className="flex items-center gap-[2px] h-7 cursor-pointer"
            onClick={handleSeek}
          >
            {BAR_HEIGHTS.map((h, i) => {
              const active = i / BAR_HEIGHTS.length <= progress;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex-1 rounded-full transition-colors",
                    active
                      ? isAgent ? "bg-primary-foreground" : "bg-primary"
                      : isAgent ? "bg-primary-foreground/30" : "bg-muted-foreground/30"
                  )}
                  style={{ height: `${Math.round(h * 100)}%` }}
                />
              );
            })}
          </div>
          <span className={cn("text-[10px] tabular-nums", isAgent ? "text-primary-foreground/70" : "text-muted-foreground")}>
            {formatTime(playing || current > 0 ? current : duration)}
          </span>
        </div>
      </div>

      <button
        onClick={handleTranscribe}
        disabled={transcribing}
        className={cn(
          "flex items-center gap-1.5 self-start text-xs px-2 py-1 rounded-md transition-colors disabled:opacity-60",
          isAgent
            ? "bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground"
            : "bg-muted hover:bg-muted/80 text-foreground"
        )}
      >
        {transcribing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mic className="w-3.5 h-3.5" />}
        {transcribing ? "Transcrevendo..." : transcription ? "Transcrever novamente" : "Transcrever"}
      </button>

      {transcription && (
        <p className={cn(
          "text-xs leading-relaxed whitespace-pre-wrap break-words border-t pt-1.5",
          isAgent ? "border-primary-foreground/20" : "border-border"
        )}>
          {transcription}
        </p>
      )}

      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrent(0); }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />
    </div>
  );
}