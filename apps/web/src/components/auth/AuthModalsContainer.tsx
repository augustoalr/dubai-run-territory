"use client";

import { useAuth } from "@/lib/supabase";
import { AliasOnboardingModal } from "./AliasOnboardingModal";
import { AuthModal } from "./AuthModal";

export function AuthModalsContainer() {
  const { isAuthModalOpen, closeAuthModal } = useAuth();

  return (
    <>
      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
      <AliasOnboardingModal />
    </>
  );
}
