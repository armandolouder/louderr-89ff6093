import { useState } from "react";
import { MessageSquareText, Search, Plus, Image, Link, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuickResponses, useIncrementQuickResponseUse, QuickResponse } from "@/hooks/useQuickResponses";
import { cn } from "@/lib/utils";

interface QuickResponsePickerProps {
  onSelect: (response: QuickResponse) => void;
  onManage?: () => void;
}

export function QuickResponsePicker({ onSelect, onManage }: QuickResponsePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  const { data: responses, isLoading } = useQuickResponses();
  const incrementUse = useIncrementQuickResponseUse();

  const filteredResponses = responses?.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.content.toLowerCase().includes(search.toLowerCase()) ||
    r.shortcut?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (response: QuickResponse) => {
    incrementUse.mutate(response.id);
    onSelect(response);
    setOpen(false);
    setSearch("");
  };

  const getMediaIcon = (type: string | null) => {
    switch (type) {
      case "image":
      case "gif":
        return <Image className="w-3 h-3" />;
      case "document":
        return <FileText className="w-3 h-3" />;
      default:
        return null;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <MessageSquareText className="w-5 h-5" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Respostas rápidas</TooltipContent>
      </Tooltip>

      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm text-foreground">Respostas Rápidas</h4>
            {onManage && (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onManage}>
                <Plus className="w-3 h-3 mr-1" />
                Gerenciar
              </Button>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar resposta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        <ScrollArea className="h-64">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredResponses?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center px-4">
              <MessageSquareText className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {search ? "Nenhuma resposta encontrada" : "Nenhuma resposta cadastrada"}
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredResponses?.map((response) => (
                <button
                  key={response.id}
                  onClick={() => handleSelect(response)}
                  className={cn(
                    "w-full text-left p-2.5 rounded-lg hover:bg-secondary transition-colors",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm text-foreground truncate">
                          {response.title}
                        </span>
                        {response.shortcut && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground font-mono">
                            /{response.shortcut}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {response.content}
                      </p>
                    </div>
                    {response.media_type && (
                      <div className="flex-shrink-0 text-muted-foreground">
                        {getMediaIcon(response.media_type)}
                      </div>
                    )}
                  </div>
                  {response.media_url && response.media_type === "image" && (
                    <div className="mt-2">
                      <img 
                        src={response.media_url} 
                        alt="" 
                        className="w-full h-16 object-cover rounded"
                      />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
