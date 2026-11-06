import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { privacyPolicyContent } from "@/lib/legal/legal-content";

export const metadata: Metadata = {
  title: "Privacidad · Territorio",
  description:
    "Explicamos de forma sencilla y transparente qué datos guardamos, para qué los usamos y cómo protegemos tu privacidad en Dubái.",
};

export default function PrivacidadPage() {
  return <LegalPageLayout docEs={privacyPolicyContent.es} docEn={privacyPolicyContent.en} />;
}
