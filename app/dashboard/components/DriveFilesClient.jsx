"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, FileText, ArrowUpRight, FolderOpen, Shield } from "lucide-react";
import "../css/drive.css";

export default function DriveFilesClient({ initialFiles = [], isDriveConnected = false }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [toast, setToast] = useState({ show: false, leaving: false, message: "" });
  const toastTimeoutRef = useRef(null);

  useEffect(() => {
    if (searchParams.get("integration") === "google_connected") {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      setToast({ show: true, leaving: false, message: "Drive connection successful" });

      toastTimeoutRef.current = setTimeout(() => {
        setToast((prev) => ({ ...prev, leaving: true }));
        setTimeout(() => {
          setToast({ show: false, leaving: false, message: "" });
        }, 300);
      }, 4500);

      router.replace("/dashboard/drive", { scroll: false });
    }

    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [searchParams, router]);

  const filteredFiles = useMemo(() => {
    return initialFiles.filter((file) => {
      const matchesSearch =
        file.name?.toLowerCase().includes(search.toLowerCase()) ||
        file.switch_name?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" ||
        file.switch_status?.toUpperCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [initialFiles, search, statusFilter]);

  const formatFileSize = (bytes) => {
    if (!bytes) return "—";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="drive-vault-container">
      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`toast ${toast.leaving ? "is-leaving" : ""}`}
          role="status"
          aria-live="polite"
        >
          <div className="toast-content">{toast.message}</div>
          <div className="toast-icon">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 0h24v24H0z" fill="none" />
              <path d="M15.795 8.342l-5.909 9.545a1 1 0 0 1-1.628 0l-3.182-4.909a1 1 0 0 1 1.629-1.165l2.556 3.953L14.165 7.51a1 1 0 0 1 1.63 1.165z" />
            </svg>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="drive-vault-header">
        <div>
          <h1 className="drive-vault-title">Drive Asset Vault</h1>
          <p className="drive-vault-subtitle">
            Google Drive documents designated across your fail-safe switches for automated post-trip disclosure.
          </p>
        </div>
        <div className="drive-count-badge">
          <span>{filteredFiles.length} OF {initialFiles.length} ASSETS</span>
        </div>
      </div>

      {initialFiles.length === 0 ? (
        <div className="drive-empty-card">
          <div className="drive-empty-icon">
            <FolderOpen size={40} className="text-[#ff3b19]" />
          </div>
          <h3>No Drive Assets Linked</h3>
          <p>
            You haven't attached any Google Drive documents to your dead man switches yet. 
            Assets attached to disclosure rows will appear here.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            {isDriveConnected ? (
              <Link href="/dashboard/switches" className="drive-oauth-link">
                View Switches
              </Link>
            ) : (
              <>
                <Link href="/dashboard/switches" className="drive-cta-btn">
                  View Switches
                </Link>
                <a href="/api/auth/google" className="drive-oauth-link">
                  Connect Google Drive ↗
                </a>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Controls Bar */}
          <div className="drive-toolbar">
            <div className="drive-search-wrap">
              <Search size={15} className="text-white/40" />
              <input
                type="text"
                placeholder="Search by file name or switch..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="drive-search-input"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="drive-filter-select"
            >
              <option value="ALL">All Switch States</option>
              <option value="ARMED">Armed</option>
              <option value="ESCALATING">Escalating</option>
              <option value="RESOLVED">Resolved</option>
              <option value="EXHAUSTED">Exhausted</option>
            </select>
          </div>

          {filteredFiles.length === 0 ? (
            <div className="drive-empty-card" style={{ padding: "3rem 1.5rem" }}>
              <h3>No Matching Assets</h3>
              <p>No attachments found matching "{search}".</p>
            </div>
          ) : (
            <div className="drive-files-grid">
              {filteredFiles.map((file, idx) => (
                <div key={`${file.id}-${file.switch_id}-${idx}`} className="file-vault-card">
                  <div className="file-card-top">
                    <div className="file-type-icon">
                      {file.iconLink ? (
                        <img src={file.iconLink} alt="" width={18} height={18} />
                      ) : (
                        <FileText size={18} className="text-[#ff3b19]" />
                      )}
                    </div>
                    <span
                      className={`switch-status-pill ${(
                        file.switch_status || "armed"
                      ).toLowerCase()}`}
                    >
                      {file.switch_status || "ARMED"}
                    </span>
                  </div>

                  <div className="file-main-info">
                    <span className="file-title" title={file.name}>
                      {file.name}
                    </span>
                    <span className="file-specs">
                      {formatFileSize(file.size)}
                      {file.modifiedTime &&
                        ` • ${new Date(file.modifiedTime).toLocaleDateString()}`}
                    </span>
                  </div>

                  <div className="file-card-footer">
                    <Link
                      href={`/dashboard/switches/${file.switch_id}`}
                      className="switch-link-button"
                      title={`Open Switch: ${file.switch_name}`}
                    >
                      <span className="link-label">Switch:</span>
                      <span className="switch-name-truncate">{file.switch_name}</span>
                      <span className="arrow-icon">→</span>
                    </Link>

                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="drive-external-link"
                        title="Open file in Google Drive"
                      >
                        <ArrowUpRight size={14} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}