import type { Metadata } from "next";
import { RankingContainer } from "@/components/ranking";

export const metadata: Metadata = {
  title: "Ranking · Territorio / Territory",
  description: "Clasificación de temporada por ligas · Season leaderboard by league.",
};

export default function RankingPage() {
  return <RankingContainer />;
}
