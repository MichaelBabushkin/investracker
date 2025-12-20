import WorldStocksDashboard from "@/components/WorldStocksDashboard";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function WorldStocksPage() {
  return (
    <ProtectedRoute>
      <WorldStocksDashboard />
    </ProtectedRoute>
  );
}
