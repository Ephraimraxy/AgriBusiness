import { useState } from "react";
import { useLocation } from "wouter";
import RegistrationWizard from "@/components/registration-wizard";

export default function Register() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      <RegistrationWizard
        isOpen={true}
        onClose={() => setLocation("/")}
      />
    </div>
  );
}
