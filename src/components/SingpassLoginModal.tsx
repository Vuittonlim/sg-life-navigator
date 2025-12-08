import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, CheckCircle2 } from "lucide-react";
import { useUser } from "@/contexts/UserContext";

interface SingpassLoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const SingpassLoginModal = ({ open, onOpenChange, onSuccess }: SingpassLoginModalProps) => {
  const [step, setStep] = useState<"initial" | "loading" | "success">("initial");
  const { login } = useUser();

  const handleLogin = () => {
    setStep("loading");
    
    // Simulate Singpass authentication flow
    setTimeout(() => {
      setStep("success");
      login();
      
      // Close modal and redirect after showing success
      setTimeout(() => {
        setStep("initial");
        onOpenChange(false);
        onSuccess();
      }, 1500);
    }, 2000);
  };

  const handleClose = () => {
    if (step !== "loading") {
      setStep("initial");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-center font-heading text-xl">
            {step === "success" ? "Login Successful" : "Login with Singpass"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center py-6 space-y-6">
          {step === "initial" && (
            <>
              {/* Singpass branding */}
              <div className="w-full bg-[#CF0024] rounded-xl p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                    <span className="text-[#CF0024] font-bold text-lg">S</span>
                  </div>
                  <span className="text-white font-bold text-2xl tracking-tight">Singpass</span>
                </div>
                <p className="text-white/80 text-sm">Your Trusted Digital Identity</p>
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-muted-foreground text-sm">
                  Securely verify your identity using Singpass
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  <span>End-to-end encrypted</span>
                </div>
              </div>
              
              <Button 
                onClick={handleLogin}
                className="w-full bg-[#CF0024] hover:bg-[#A50020] text-white"
                size="lg"
              >
                Login with Singpass App
              </Button>
              
              <p className="text-xs text-muted-foreground text-center">
                By logging in, you consent to share your Singpass data with SG Life Guide for personalised assistance.
              </p>
            </>
          )}
          
          {step === "loading" && (
            <div className="py-8 space-y-6 text-center">
              <div className="w-20 h-20 mx-auto bg-[#CF0024]/10 rounded-full flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-[#CF0024] animate-spin" />
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-foreground">Verifying your identity...</p>
                <p className="text-sm text-muted-foreground">Please wait while we authenticate with Singpass</p>
              </div>
              
              {/* Simulated progress steps */}
              <div className="space-y-3 text-left max-w-xs mx-auto">
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-muted-foreground">Connected to Singpass</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  <span className="text-foreground">Retrieving your profile...</span>
                </div>
              </div>
            </div>
          )}
          
          {step === "success" && (
            <div className="py-8 space-y-4 text-center">
              <div className="w-20 h-20 mx-auto bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-foreground text-lg">Welcome, Terence!</p>
                <p className="text-sm text-muted-foreground">Your Singpass profile has been verified</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
