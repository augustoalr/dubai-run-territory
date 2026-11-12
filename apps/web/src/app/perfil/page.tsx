import type { Metadata } from "next";
import { ProfileContainer } from "@/components/profile";

export const metadata: Metadata = {
  title: "Mi perfil — Dubai Run Territory",
  description:
    "Consulta tu liga vigente, ritmo de referencia, baldosas en posesión, avisos de robo e historial de carreras.",
};

export default function PerfilPage() {
  return <ProfileContainer />;
}
