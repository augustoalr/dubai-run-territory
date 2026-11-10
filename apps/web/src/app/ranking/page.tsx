import type { Metadata } from "next";
import { RankingContainer } from "@/components/ranking";

export const metadata: Metadata = {
  title: "Ranking de Temporada · Territorio",
  description:
    "Clasificación por ligas de la temporada en la pista de Jumeirah Beach y Kite Beach.",
};

export default function RankingPage() {
  return <RankingContainer />;
}
