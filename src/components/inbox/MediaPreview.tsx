import { Image, FileText, Play, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { LinkPreview, extractUrls } from "./LinkPreview";

interface MediaPreviewProps {
  type: "image" | "audio" | "video" | "document" | "text";
  url: string | null;
  content: string;
  isAgent: boolean;
}

export function MediaPreview({ type, url, content, isAgent }: MediaPreviewProps) {
  // For text messages, check if there are URLs to preview
  if (type === "text" || !url) {
    const urls = extractUrls(content);
    
    if (urls.length > 0) {
      return (
        <div className="space-y-2">
          <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
          {urls.slice(0, 2).map((linkUrl, index) => (
            <LinkPreview key={index} url={linkUrl} isAgent={isAgent} />
          ))}
        </div>
      );
    }
    
    return <p className="text-sm whitespace-pre-wrap break-words">{content}</p>;
  }

  const handleClick = () => {
    if (url) {
      window.open(url, "_blank");
    }
  };

  if (type === "image") {
    return (
      <div className="space-y-1">
        <div 
          className="relative cursor-pointer rounded-lg overflow-hidden max-w-[240px]"
          onClick={handleClick}
        >
          <img 
            src={url} 
            alt={content || "Imagem"} 
            className="w-full h-auto object-cover rounded-lg"
            loading="lazy"
            crossOrigin="anonymous"
            onError={(e) => {
              // Fallback if image fails to load - replace img with placeholder
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              const parent = target.parentElement;
              if (parent) {
                const fallback = parent.querySelector('.image-fallback') as HTMLElement;
                if (fallback) fallback.style.display = "flex";
              }
            }}
          />
          <div 
            className={cn(
              "image-fallback hidden items-center justify-center gap-2 p-6 rounded-lg min-w-[120px]",
              isAgent ? "bg-primary-foreground/10" : "bg-background/50"
            )}
          >
            <Image className="w-8 h-8" />
            <span className="text-sm">📷 Imagem</span>
          </div>
        </div>
        {content && content !== "[Imagem]" && (
          <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
        )}
      </div>
    );
  }

  if (type === "video") {
    return (
      <div className="space-y-1">
        <div 
          className={cn(
            "flex items-center gap-2 p-3 rounded-lg cursor-pointer",
            isAgent ? "bg-primary-foreground/10" : "bg-background/50"
          )}
          onClick={handleClick}
        >
          <Play className="w-8 h-8" />
          <span className="text-sm">Vídeo - Clique para ver</span>
        </div>
        {content && content !== "[Vídeo]" && (
          <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
        )}
      </div>
    );
  }

  if (type === "audio") {
    return (
      <div 
        className={cn(
          "flex items-center gap-2 p-3 rounded-lg cursor-pointer",
          isAgent ? "bg-primary-foreground/10" : "bg-background/50"
        )}
        onClick={handleClick}
      >
        <Volume2 className="w-6 h-6" />
        <div className="flex-1">
          <div className="h-1 bg-current/20 rounded-full">
            <div className="h-1 w-1/3 bg-current rounded-full" />
          </div>
        </div>
        <span className="text-xs">Áudio</span>
      </div>
    );
  }

  if (type === "document") {
    return (
      <div 
        className={cn(
          "flex items-center gap-2 p-3 rounded-lg cursor-pointer",
          isAgent ? "bg-primary-foreground/10" : "bg-background/50"
        )}
        onClick={handleClick}
      >
        <FileText className="w-6 h-6" />
        <span className="text-sm">{content || "Documento"}</span>
      </div>
    );
  }

  return <p className="text-sm whitespace-pre-wrap break-words">{content}</p>;
}
