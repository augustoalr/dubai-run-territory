import type { Metadata } from "next";
import { RunsPageContainer } from "@/components/runs/RunsPageContainer";

export const metadata: Metadata = {
  title: "Mis Carreras · Territorio",
  description:
    "Revisa tus carreras guardadas en este teléfono, consulta los recorridos en el mapa y descarga tus actividades.",
};

export default function CarrerasPage() {
  return <RunsPageContainer />;
}
