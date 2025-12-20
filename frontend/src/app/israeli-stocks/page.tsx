import IsraeliStocksDashboard from "@/components/IsraeliStocksDashboard";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function IsraeliStocksPage() {
  return (
    <ProtectedRoute>
      <IsraeliStocksDashboard />
    </ProtectedRoute>
  );
}
