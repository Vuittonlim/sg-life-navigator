import { createContext, useContext, useState, ReactNode } from "react";

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

  const login = () => {
    // Simulate successful Singpass login
    setUser(mockSingpassUser);
  };

  const logout = () => {
    setUser(null);
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
