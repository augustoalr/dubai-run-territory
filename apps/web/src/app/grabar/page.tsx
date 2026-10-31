import type { Metadata } from "next";
import { RecordingContainer } from "@/components/recording/RecordingContainer";

export const metadata: Metadata = {
  title: "Grabar Carrera · Territorio",
  description:
    "Graba tu carrera con GPS en alta precisión, manteniendo la pantalla encendida y guardando la carrera directamente en tu teléfono.",
};

export default function GrabarPage() {
  return <RecordingContainer />;
}
