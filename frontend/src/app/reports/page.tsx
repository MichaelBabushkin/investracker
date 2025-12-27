"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { israeliStocksAPI } from "@/services/api";
import { DocumentArrowDownIcon, EyeIcon, XMarkIcon, TrashIcon } from "@heroicons/react/24/outline";
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
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">
                Investment Reports
              </h1>
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            </>
          ) : error ? (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">
                Investment Reports
              </h1>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                {error}
              </div>
            </>
          ) : (
            <>
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Investment Reports
                </h1>
                <button
                  onClick={() => router.push("/israeli-stocks")}
                  className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 whitespace-nowrap"
                >
                  Upload New Report
                </button>
              </div>

              {/* Reports Table */}
        {reports.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">No reports uploaded yet</p>
            <button
              onClick={() => router.push("/israeli-stocks")}
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Upload your first report
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
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
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {report.filename}
                        </div>
                        <div className="sm:hidden text-xs text-gray-500 mt-1">
                          {report.broker} • {formatFileSize(report.file_size)}
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
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
                            className="text-purple-600 hover:text-purple-900 inline-flex items-center text-sm"
                            title="Preview PDF"
                          >
                            <EyeIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-1" />
                            <span className="hidden sm:inline">Preview</span>
                          </button>
                          <button
                            onClick={() =>
                              handleDownload(report.id, report.filename)
                            }
                            className="text-blue-600 hover:text-blue-900 inline-flex items-center text-sm"
                            title="Download PDF"
                          >
                            <DocumentArrowDownIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-1" />
                            <span className="hidden sm:inline">Download</span>
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(report)}
                            className="text-red-600 hover:text-red-900 inline-flex items-center text-sm"
                            title="Delete Report"
                          >
                            <TrashIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-1" />
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
          <div className="mt-6 text-sm text-gray-600">
            Total Reports: {reports.length}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen p-4">
              <div
                className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
                onClick={() => !deleting && setDeleteConfirm(null)}
              ></div>

              <div className="inline-block w-full max-w-md p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg relative z-10">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Delete Report
                </h3>
                
                <p className="text-sm text-gray-600 mb-4">
                  Are you sure you want to delete <strong>{deleteConfirm.filename}</strong>?
                </p>

                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                  <p className="text-sm text-yellow-800">
                    This will also delete all pending transactions extracted from this report.
                    Approved transactions will not be affected.
                  </p>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    disabled={deleting}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
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
                        <TrashIcon className="h-4 w-4 mr-2" />
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
                className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
                onClick={closePreview}
              ></div>

              {/* Modal panel */}
              <div className="inline-block w-full max-w-6xl my-4 sm:my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 truncate">
                      {previewReport.filename}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500">
                      {formatDate(previewReport.upload_date)} • {formatFileSize(previewReport.file_size)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => handleDownload(previewReport.id, previewReport.filename)}
                      className="text-blue-600 hover:text-blue-900 inline-flex items-center px-2 sm:px-3 py-1.5 border border-blue-600 rounded-md text-sm"
                    >
                      <DocumentArrowDownIcon className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Download</span>
                    </button>
                    <button
                      onClick={closePreview}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="h-6 w-6" />
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
