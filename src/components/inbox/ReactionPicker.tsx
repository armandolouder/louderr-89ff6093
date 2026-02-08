import { useState } from "react";
import { Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSendReaction } from "@/hooks/useReactions";
import { cn } from "@/lib/utils";

interface ReactionPickerProps {
  messageId: string;
  conversationId: string;
}

const COMMON_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "👏"];

export function ReactionPicker({ messageId, conversationId }: ReactionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const sendReaction = useSendReaction();

  const handleReaction = (emoji: string) => {
    sendReaction.mutate({
      messageId,
      emoji,
      conversationId,
    });
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn(
            "h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity",
            sendReaction.isPending && "opacity-50"
          )}
          disabled={sendReaction.isPending}
        >
          <Smile className="w-4 h-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" side="top">
        <div className="flex gap-1">
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className="text-xl hover:scale-125 transition-transform p-1"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
