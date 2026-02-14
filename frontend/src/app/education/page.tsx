"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import EducationCenter from "@/components/education/EducationCenter";

export default function EducationPage() {
  return (
    <ProtectedRoute>
      <EducationCenter />
    </ProtectedRoute>
  );
}
