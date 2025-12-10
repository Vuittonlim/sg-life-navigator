import { useState } from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetTrigger 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Settings, Trash2, Download, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  usePreferences, 
  useDeletePreference, 
  useDeleteAllPreferences,
  exportPreferences,
  UserPreference 
} from "@/hooks/usePreferences";

const confidenceBadgeVariant = (level: string) => {
  switch (level) {
    case "explicit":
      return "default";
    case "inferred":
      return "secondary";
    case "assumed":
      return "outline";
    default:
      return "outline";
  }
};

const formatPreferenceValue = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object" && value !== null) {
    if ("label" in value) return String((value as Record<string, unknown>).label);
    if ("value" in value) return String((value as Record<string, unknown>).value);
  }
  return JSON.stringify(value);
};

export const PreferencesPanel = () => {
  const { data: preferences, isLoading, refetch } = usePreferences();
  const deletePreference = useDeletePreference();
  const deleteAllPreferences = useDeleteAllPreferences();
  const { toast } = useToast();
  const [deleteKey, setDeleteKey] = useState<string | null>(null);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleDelete = async (key: string) => {
    try {
      await deletePreference.mutateAsync(key);
      toast({
        title: "Preference deleted",
        description: "Your preference has been removed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete preference.",
        variant: "destructive",
      });
    }
    setDeleteKey(null);
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllPreferences.mutateAsync();
      toast({
        title: "All preferences deleted",
        description: "All your preferences have been removed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete preferences.",
        variant: "destructive",
      });
    }
    setShowDeleteAll(false);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const jsonData = await exportPreferences();
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sg-life-guide-preferences-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export successful",
        description: "Your preferences have been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export preferences.",
        variant: "destructive",
      });
    }
    setIsExporting(false);
  };

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Preferences
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Your Preferences</SheetTitle>
            <SheetDescription>
              These are the preferences we've learned from your conversations. 
              You have full control over your data.
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-4">
            {/* Action buttons */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExport}
                disabled={isExporting || !preferences?.length}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              {preferences && preferences.length > 0 && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => setShowDeleteAll(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete All
                </Button>
              )}
            </div>

            {/* Preferences list */}
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {isLoading ? (
                <p className="text-muted-foreground text-sm">Loading preferences...</p>
              ) : !preferences || preferences.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No preferences saved yet</p>
                  <p className="text-sm">Your preferences will appear here as you chat</p>
                </div>
              ) : (
                preferences.map((pref: UserPreference) => (
                  <div 
                    key={pref.id} 
                    className="p-4 border rounded-lg space-y-2 bg-card"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-medium text-sm">
                          {pref.preference_key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                        </p>
                        <p className="text-sm text-foreground">
                          {formatPreferenceValue(pref.preference_value)}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => setDeleteKey(pref.preference_key)}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={confidenceBadgeVariant(pref.confidence_level)}>
                        {pref.confidence_level}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        via {pref.source}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Privacy notice */}
            <div className="text-xs text-muted-foreground border-t pt-4 mt-4">
              <p className="font-medium mb-1">🔒 Your Privacy</p>
              <p>
                Your preferences are stored with an anonymous ID that cannot be traced 
                back to your real identity. Singpass data is never stored on our servers.
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete single preference confirmation */}
      <AlertDialog open={!!deleteKey} onOpenChange={() => setDeleteKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete preference?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this preference. You can always add it back through the chat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteKey && handleDelete(deleteKey)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete all confirmation */}
      <AlertDialog open={showDeleteAll} onOpenChange={setShowDeleteAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all preferences?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all your saved preferences. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
