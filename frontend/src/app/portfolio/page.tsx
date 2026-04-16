import PortfolioDashboard from "@/components/PortfolioDashboard";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function PortfolioPage() {
  return (
    <ProtectedRoute>
      <PortfolioDashboard />
    </ProtectedRoute>
  );
}
