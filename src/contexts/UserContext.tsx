import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SingpassUserProfile {
  // Personal Info
  nric: string;
  name: string;
  dateOfBirth: string;
  age: number;
  gender: string;
  race: string;
  nationality: string;
  countryOfBirth: string;
  residentialStatus: string;
  
  // Contact
  email: string;
  mobileNumber: string;
  registeredAddress: string;
  postalCode: string;
  
  // Family
  maritalStatus: string;
  marriageDate: string | null;
  marriageCertNumber: string | null;
  
  // Housing
  hdbType: string;
  hdbOwnership: string;
  
  // Employment
  employmentStatus: string;
  occupation: string;
  employer: string;
  employmentSector: string;
  monthlyIncome: number;
  
  // Education
  highestEducation: string;
  
  // CPF
  cpfContributionHistory: string;
  cpfOrdinaryAccount: number;
  cpfSpecialAccount: number;
  cpfMediSaveAccount: number;
  
  // Vehicles
  vehicleOwnership: boolean;
  vehicleDetails: string | null;
  
  // NS (for males)
  nsStatus: string | null;
  nsMrcDate: string | null;
}

interface UserContextType {
  user: SingpassUserProfile | null;
  isLoggedIn: boolean;
  login: () => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const SESSION_STORAGE_KEY = "sg-life-guide-singpass-session";

// Mock Singpass user data for Terence
const mockSingpassUser: SingpassUserProfile = {
  // Personal Info
  nric: "S9912345A",
  name: "Terence Tan Wei Ming",
  dateOfBirth: "2001-08-15",
  age: 23,
  gender: "Male",
  race: "Chinese",
  nationality: "Singaporean",
  countryOfBirth: "Singapore",
  residentialStatus: "Citizen",
  
  // Contact
  email: "terence.tan@gmail.com",
  mobileNumber: "+65 9123 4567",
  registeredAddress: "Blk 456 Tampines Street 42, #12-345",
  postalCode: "520456",
  
  // Family
  maritalStatus: "Single",
  marriageDate: null,
  marriageCertNumber: null,
  
  // Housing
  hdbType: "4-Room",
  hdbOwnership: "Staying with Parents",
  
  // Employment
  employmentStatus: "Employed",
  occupation: "Software Engineer",
  employer: "DBS Bank Ltd",
  employmentSector: "Financial Services",
  monthlyIncome: 5500,
  
  // Education
  highestEducation: "Bachelor's Degree",
  
  // CPF
  cpfContributionHistory: "2 years",
  cpfOrdinaryAccount: 18500,
  cpfSpecialAccount: 6200,
  cpfMediSaveAccount: 4800,
  
  // Vehicles
  vehicleOwnership: false,
  vehicleDetails: null,
  
  // NS
  nsStatus: "Completed",
  nsMrcDate: "2028-08-14",
};

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<SingpassUserProfile | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const storedSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession);
        setUser(parsed);
      } catch {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }
  }, []);

  const login = () => {
    // Simulate successful Singpass login
    // Store in sessionStorage (client-only, cleared when tab closes)
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(mockSingpassUser));
    setUser(mockSingpassUser);
  };

  const logout = async () => {
    // Clear from sessionStorage
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setUser(null);
    
    // Also sign out from Supabase to get a fresh anonymous session
    // This ensures chat history is cleared when user logs out
    await supabase.auth.signOut();
  };

  return (
    <UserContext.Provider value={{ user, isLoggedIn: !!user, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

// Format user context for AI with brackets (not stored, sent on each request)
export const formatSingpassContext = (user: SingpassUserProfile): string => {
  return `[SINGPASS_USER: ${user.name}, Age: ${user.age}, Status: ${user.residentialStatus}, Housing: ${user.hdbOwnership}, Income: S$${user.monthlyIncome}, CPF-OA: S$${user.cpfOrdinaryAccount}]`;
};
