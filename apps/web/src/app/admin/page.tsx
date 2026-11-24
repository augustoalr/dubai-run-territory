import type { Metadata } from "next";
import { AdminContainer } from "@/components/admin";

export const metadata: Metadata = {
  title: "Panel de revisión — Dubai Run Territory",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return <AdminContainer />;
}
