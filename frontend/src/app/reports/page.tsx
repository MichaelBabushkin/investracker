"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { israeliStocksAPI } from "@/services/api";
import { Download, Eye, X, Trash2 } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";

interface Report {
  id: number;
  filename: string;
  file_size: number;
  broker: string;
  upload_batch_id: string;
  upload_date: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewReport, setPreviewReport] = useState<Report | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Report | null>(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await israeliStocksAPI.getReports();
      setReports(data.reports || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (reportId: number, filename: string) => {
    try {
      const blob = await israeliStocksAPI.downloadReport(reportId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to download report");
    }
  };

  const handlePreview = async (report: Report) => {
    try {
      setError(null);
      const blob = await israeliStocksAPI.downloadReport(report.id);
      const url = window.URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewReport(report);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to preview report");
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewReport(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDelete = async (report: Report, deleteTransactions: boolean) => {
    try {
      setDeleting(true);
      setError(null);
      await israeliStocksAPI.deleteReport(report.id, deleteTransactions);
      setDeleteConfirm(null);
      await loadReports(); // Reload the list
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to delete report");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-surface-dark p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-6 sm:mb-8">
                Investment Reports
              </h1>
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-400"></div>
              </div>
            </>
          ) : error ? (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-6 sm:mb-8">
                Investment Reports
              </h1>
              <div className="bg-loss/10 border border-loss/20 rounded-xl p-4 text-loss">
                {error}
              </div>
            </>
          ) : (
            <>
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-100">
                  Investment Reports
                </h1>
                <button
                  onClick={() => router.push("/israeli-stocks")}
                  className="w-full sm:w-auto bg-brand-400 text-surface-dark px-4 py-2 rounded-xl hover:bg-brand-500 whitespace-nowrap"
                >
                  Upload New Report
                </button>
              </div>

              {/* Reports Table */}
        {reports.length === 0 ? (
          <div className="bg-surface-dark-secondary rounded-xl p-8 text-center">
            <p className="text-gray-400 mb-4">No reports uploaded yet</p>
            <button
              onClick={() => router.push("/israeli-stocks")}
              className="text-brand-400 hover:text-brand-500 underline"
            >
              Upload your first report
            </button>
          </div>
        ) : (
          <div className="bg-surface-dark-secondary rounded-xl overflow-hidden">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="min-w-full divide-y divide-white/5">
                <thead className="bg-surface-dark">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Filename
                    </th>
                    <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Broker
                    </th>
                    <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Upload Date
                    </th>
                    <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File Size
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-surface-dark-secondary divide-y divide-white/5">
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-white/5">
                      <td className="px-4 sm:px-6 py-4">
                        <div className="text-sm font-medium text-gray-100">
                          {report.filename}
                        </div>
                        <div className="sm:hidden text-xs text-gray-500 mt-1">
                          {report.broker} • {formatFileSize(report.file_size)}
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-brand-400/10 text-brand-400 capitalize">
                          {report.broker}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(report.upload_date)}
                      </td>
                      <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatFileSize(report.file_size)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-center">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
                          <button
                            onClick={() => handlePreview(report)}
                            className="text-purple-400 hover:text-purple-300 inline-flex items-center text-sm"
                            title="Preview PDF"
                          >
                            <Eye className="h-4 w-4 sm:h-5 sm:w-5 mr-1" />
                            <span className="hidden sm:inline">Preview</span>
                          </button>
                          <button
                            onClick={() =>
                              handleDownload(report.id, report.filename)
                            }
                            className="text-brand-400 hover:text-brand-300 inline-flex items-center text-sm"
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4 sm:h-5 sm:w-5 mr-1" />
                            <span className="hidden sm:inline">Download</span>
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(report)}
                            className="text-loss hover:text-red-400 inline-flex items-center text-sm"
                            title="Delete Report"
                          >
                            <Trash2 className="h-4 w-4 sm:h-5 sm:w-5 mr-1" />
                            <span className="hidden sm:inline">Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary */}
        {reports.length > 0 && (
          <div className="mt-6 text-sm text-gray-400">
            Total Reports: {reports.length}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen p-4">
              <div
                className="fixed inset-0 transition-opacity bg-black/60 backdrop-blur-sm"
                onClick={() => !deleting && setDeleteConfirm(null)}
              ></div>

              <div className="inline-block w-full max-w-md p-6 overflow-hidden text-left align-middle transition-all transform bg-surface-dark-secondary rounded-xl border border-white/10 relative z-10">
                <h3 className="text-lg font-medium text-gray-100 mb-4">
                  Delete Report
                </h3>
                
                <p className="text-sm text-gray-400 mb-4">
                  Are you sure you want to delete <strong>{deleteConfirm.filename}</strong>?
                </p>

                <div className="bg-warn/10 border border-warn/20 rounded-md p-3 mb-4">
                  <p className="text-sm text-warn">
                    This will also delete all pending transactions extracted from this report.
                    Approved transactions will not be affected.
                  </p>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    disabled={deleting}
                    className="px-4 py-2 text-sm font-medium text-gray-300 bg-surface-dark border border-white/10 rounded-md hover:bg-white/5 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirm, true)}
                    disabled={deleting}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 inline-flex items-center"
                  >
                    {deleting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Report
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {previewReport && previewUrl && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen p-4 text-center sm:p-0">
              {/* Background overlay */}
              <div
                className="fixed inset-0 transition-opacity bg-black/60 backdrop-blur-sm"
                onClick={closePreview}
              ></div>

              {/* Modal panel */}
              <div className="inline-block w-full max-w-6xl my-4 sm:my-8 overflow-hidden text-left align-middle transition-all transform bg-surface-dark-secondary rounded-xl border border-white/10">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-white/10 bg-surface-dark">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-medium text-gray-100 truncate">
                      {previewReport.filename}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500">
                      {formatDate(previewReport.upload_date)} • {formatFileSize(previewReport.file_size)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => handleDownload(previewReport.id, previewReport.filename)}
                      className="text-brand-400 hover:text-brand-300 inline-flex items-center px-2 sm:px-3 py-1.5 border border-brand-400/40 rounded-md text-sm"
                    >
                      <Download className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Download</span>
                    </button>
                    <button
                      onClick={closePreview}
                      className="text-gray-500 hover:text-gray-300"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                {/* PDF Viewer */}
                <div className="w-full" style={{ height: "calc(100vh - 180px)", maxHeight: "80vh" }}>
                  <iframe
                    src={previewUrl}
                    className="w-full h-full border-0"
                    title="PDF Preview"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
