"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import "../css/drive.css";

export default function DriveFilesClient({ initialFiles = [] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

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
      {/* Header */}
      <div className="drive-vault-header">
        <div>
          <h1 className="drive-vault-title">Drive Asset Vault</h1>
          <p className="drive-vault-subtitle">
            All Google Drive documents currently designated across your sentinels
          </p>
        </div>
        <div className="drive-count-badge">
          <span>{filteredFiles.length} OF {initialFiles.length} ASSETS</span>
        </div>
      </div>

      {initialFiles.length === 0 ? (
        <div className="drive-empty-card">
          <div className="drive-empty-icon">📁</div>
          <h3>No Drive Assets Linked</h3>
          <p>
            You haven't attached any Google Drive documents to your dead man sentinels yet. 
            Assets attached to disclosure rows will appear here.
          </p>
          <Link href="/dashboard/switches" className="drive-cta-btn">
            View Sentinels
          </Link>
        </div>
      ) : (
        <>
          {/* Controls Bar */}
          <div className="drive-toolbar">
            <input
              type="text"
              placeholder="Search by file name or switch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="drive-search-input"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="drive-filter-select"
            >
              <option value="ALL">All Sentinel States</option>
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
                        <span>📄</span>
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
                      title={`Open Sentinel: ${file.switch_name}`}
                    >
                      <span className="link-label">Sentinel:</span>
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
                        ↗
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