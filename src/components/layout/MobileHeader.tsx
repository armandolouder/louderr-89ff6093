import { Link } from "react-router-dom";
import { MessageSquare, Bell, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export function MobileHeader({ title = "OmniDesk", rightAction }: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border safe-area-top">
      <div className="flex items-center justify-between h-14 px-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">{title}</span>
        </Link>

        <div className="flex items-center gap-1">
          {rightAction || (
            <>
              <Button variant="ghost" size="icon" asChild className="text-muted-foreground">
                <Link to="/apis">
                  <Zap className="w-5 h-5" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
