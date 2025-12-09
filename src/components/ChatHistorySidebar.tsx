import { MessageSquare, Plus, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useConversations, useDeleteConversation, Conversation } from "@/hooks/useConversations";

interface ChatHistorySidebarProps {
  selectedConversationId: string | null;
  onSelectConversation: (id: string | null) => void;
  onNewChat: () => void;
}

// Group conversations by date
const groupConversationsByDate = (conversations: Conversation[]) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const groups: { label: string; conversations: Conversation[] }[] = [
    { label: "Today", conversations: [] },
    { label: "Yesterday", conversations: [] },
    { label: "Previous 7 Days", conversations: [] },
    { label: "Previous 30 Days", conversations: [] },
    { label: "Older", conversations: [] },
  ];

  conversations.forEach((conv) => {
    const date = new Date(conv.updated_at);
    if (date >= today) {
      groups[0].conversations.push(conv);
    } else if (date >= yesterday) {
      groups[1].conversations.push(conv);
    } else if (date >= lastWeek) {
      groups[2].conversations.push(conv);
    } else if (date >= lastMonth) {
      groups[3].conversations.push(conv);
    } else {
      groups[4].conversations.push(conv);
    }
  });

  return groups.filter((g) => g.conversations.length > 0);
};

export const ChatHistorySidebar = ({
  selectedConversationId,
  onSelectConversation,
  onNewChat,
}: ChatHistorySidebarProps) => {
  const { data: conversations = [], isLoading } = useConversations();
  const deleteConversation = useDeleteConversation();

  const handleDelete = (id: string) => {
    deleteConversation.mutate(id, {
      onSuccess: () => {
        if (selectedConversationId === id) {
          onNewChat();
        }
      },
    });
  };

  const groupedConversations = groupConversationsByDate(conversations);

  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-warm flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-heading font-semibold text-foreground">History</span>
          </div>
          <SidebarTrigger />
        </div>
        <Button
          onClick={onNewChat}
          variant="outline"
          className="w-full mt-3 justify-start gap-2"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </Button>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {isLoading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading...</div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">
            No conversations yet.<br />Start chatting to see your history here.
          </div>
        ) : (
          groupedConversations.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="text-xs text-muted-foreground px-2">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.conversations.map((conv) => (
                    <SidebarMenuItem key={conv.id}>
                      <SidebarMenuButton
                        onClick={() => onSelectConversation(conv.id)}
                        isActive={selectedConversationId === conv.id}
                        className="group justify-between pr-1"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <MessageSquare className="w-4 h-4 shrink-0 text-muted-foreground" />
                          <span className="truncate text-sm">{conv.title}</span>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this conversation and all its messages.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(conv.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))
        )}
      </SidebarContent>
    </Sidebar>
  );
};
