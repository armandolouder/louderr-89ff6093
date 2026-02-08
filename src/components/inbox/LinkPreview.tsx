import { useState, useEffect } from "react";
import { ExternalLink, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface LinkPreviewData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
}

interface LinkPreviewProps {
  url: string;
  isAgent: boolean;
}

// Simple cache to avoid re-fetching
const previewCache = new Map<string, LinkPreviewData | null>();

export function LinkPreview({ url, isAgent }: LinkPreviewProps) {
  const [preview, setPreview] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchPreview = async () => {
      // Check cache first
      if (previewCache.has(url)) {
        const cached = previewCache.get(url);
        setPreview(cached || null);
        setLoading(false);
        setError(!cached);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase.functions.invoke("fetch-link-preview", {
          body: { url },
        });

        if (fetchError || !data?.success) {
          previewCache.set(url, null);
          setError(true);
        } else {
          previewCache.set(url, data.data);
          setPreview(data.data);
        }
      } catch (e) {
        console.error("Error fetching link preview:", e);
        previewCache.set(url, null);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [url]);

  const handleClick = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Show loading skeleton
  if (loading) {
    return (
      <div 
        className={cn(
          "rounded-lg overflow-hidden border mt-2 animate-pulse",
          isAgent ? "border-primary-foreground/20" : "border-border"
        )}
      >
        <div className={cn(
          "h-32 w-full",
          isAgent ? "bg-primary-foreground/10" : "bg-muted"
        )} />
        <div className="p-3 space-y-2">
          <div className={cn(
            "h-4 rounded w-3/4",
            isAgent ? "bg-primary-foreground/10" : "bg-muted"
          )} />
          <div className={cn(
            "h-3 rounded w-full",
            isAgent ? "bg-primary-foreground/10" : "bg-muted"
          )} />
        </div>
      </div>
    );
  }

  // Show simple link if error or no preview data
  if (error || !preview || (!preview.title && !preview.description && !preview.image)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-center gap-2 text-sm underline",
          isAgent ? "text-primary-foreground/80 hover:text-primary-foreground" : "text-primary hover:text-primary/80"
        )}
      >
        <ExternalLink className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">{url}</span>
      </a>
    );
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        "rounded-lg overflow-hidden border mt-2 cursor-pointer transition-all hover:opacity-90",
        isAgent ? "border-primary-foreground/20 bg-primary-foreground/5" : "border-border bg-card"
      )}
    >
      {/* Image */}
      {preview.image && (
        <div className="relative w-full h-32 overflow-hidden">
          <img
            src={preview.image}
            alt={preview.title || "Link preview"}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        {/* Site info */}
        <div className="flex items-center gap-2 mb-1">
          {preview.favicon ? (
            <img
              src={preview.favicon}
              alt=""
              className="w-4 h-4 rounded-sm"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <Globe className="w-4 h-4 opacity-50" />
          )}
          <span className={cn(
            "text-xs truncate",
            isAgent ? "text-primary-foreground/60" : "text-muted-foreground"
          )}>
            {preview.siteName || new URL(url).hostname}
          </span>
        </div>

        {/* Title */}
        {preview.title && (
          <h4 className={cn(
            "font-medium text-sm line-clamp-2",
            isAgent ? "text-primary-foreground" : "text-foreground"
          )}>
            {preview.title}
          </h4>
        )}

        {/* Description */}
        {preview.description && (
          <p className={cn(
            "text-xs mt-1 line-clamp-2",
            isAgent ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            {preview.description}
          </p>
        )}
      </div>
    </div>
  );
}

// Helper to detect URLs in text
export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;
  const matches = text.match(urlRegex);
  return matches || [];
}
