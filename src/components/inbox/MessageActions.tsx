import { useState } from "react";
import { MoreVertical, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useDeleteMessage } from "@/hooks/useDeleteMessage";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface MessageActionsProps {
  messageId: string;
  conversationId: string;
  isVisible: boolean;
}

export function MessageActions({ messageId, conversationId, isVisible }: MessageActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const deleteMessage = useDeleteMessage();
  const isMobile = useIsMobile();

  const handleDelete = () => {
    deleteMessage.mutate({
      messageId,
      conversationId,
      deleteForEveryone: true,
    });
    setShowDeleteDialog(false);
  };

  const handleDeleteClick = () => {
    setDropdownOpen(false);
    // Small delay to ensure dropdown closes first on mobile
    setTimeout(() => {
      setShowDeleteDialog(true);
    }, 100);
  };

  if (!isVisible) return null;

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6 transition-opacity flex-shrink-0",
              isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={5}>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive cursor-pointer"
            onSelect={handleDeleteClick}
            disabled={deleteMessage.isPending}
          >
            {deleteMessage.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Deletar mensagem
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Mobile: Use Drawer for better UX */}
      {isMobile ? (
        <Drawer open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DrawerContent>
            <DrawerHeader className="text-left">
              <DrawerTitle>Deletar mensagem?</DrawerTitle>
              <DrawerDescription>
                Esta ação irá apagar a mensagem permanentemente do sistema e também do WhatsApp (para todos).
              </DrawerDescription>
            </DrawerHeader>
            <DrawerFooter className="pt-2">
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMessage.isPending}
              >
                {deleteMessage.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Deletar
              </Button>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancelar
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deletar mensagem?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação irá apagar a mensagem permanentemente do sistema e também do WhatsApp (para todos).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMessage.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Deletar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
