import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { termsOfServiceContent } from "@/lib/legal/legal-content";

export const metadata: Metadata = {
  title: "Términos y Condiciones · Territorio",
  description:
    "Normas de la comunidad, juego limpio, prohibición de trampas y condiciones de uso para correr en la pista de Jumeirah – Kite Beach.",
};

export default function TerminosPage() {
  return (
    <LegalPageLayout
      docEs={termsOfServiceContent.es}
      docEn={termsOfServiceContent.en}
      initialLocale="es"
    />
  );
}
