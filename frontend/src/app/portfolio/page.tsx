import PortfolioOverview from "@/components/PortfolioOverview";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function PortfolioPage() {
  return (
    <ProtectedRoute>
      <PortfolioOverview />
    </ProtectedRoute>
  );
}
