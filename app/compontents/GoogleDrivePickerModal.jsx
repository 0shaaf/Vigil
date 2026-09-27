"use client";

import { useState, useEffect, useCallback } from "react";

export default function GoogleDrivePickerModal({
    isOpen,
    onClose,
    onConfirm,
    initialSelected = [],
}) {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [notConnected, setNotConnected] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedMap, setSelectedMap] = useState({});
    const [errorMsg, setErrorMsg] = useState(null);

    // Sync incoming selected files
    useEffect(() => {
        if (isOpen) {
            const map = {};
            (initialSelected || []).forEach((f) => {
                if (f?.id) map[f.id] = f;
            });
            setSelectedMap(map);
            fetchFiles("");
        }
    }, [isOpen, initialSelected]);

    const fetchFiles = useCallback(async (query = "") => {
        setLoading(true);
        setErrorMsg(null);
        try {
            const params = new URLSearchParams();
            if (query.trim()) params.set("q", query.trim());

            const res = await fetch(`/api/drive/files?${params.toString()}`);

            if (res.status === 403) {
                setNotConnected(true);
                setFiles([]);
                return;
            }

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Failed to load files from Google Drive.");
            }

            const data = await res.json();
            setFiles(data.files || []);
            setNotConnected(false);
        } catch (err) {
            console.error("[Drive Modal Fetch Error]:", err);
            setErrorMsg(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchFiles(searchQuery);
    };

    const toggleSelect = (file) => {
        setSelectedMap((prev) => {
            const next = { ...prev };
            if (next[file.id]) {
                delete next[file.id];
            } else {
                next[file.id] = {
                    id: file.id,
                    name: file.name,
                    mimeType: file.mimeType,
                    webViewLink: file.webViewLink,
                    iconLink: file.iconLink,
                    size: file.size,
                };
            }
            return next;
        });
    };

    const handleConfirm = () => {
        onConfirm(Object.values(selectedMap));
        onClose();
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return "—";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            fetchFiles(searchQuery);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="drive-modal-overlay">
            <div className="drive-modal-card">
                {/* Modal Header */}
                <div className="drive-modal-header">
                    <div>
                        <h3 className="drive-modal-title">Select Drive Attachments</h3>
                        <p className="drive-modal-subtitle">
                            Choose assets to associate with this disclosure package
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="drive-modal-close-btn">
                        ✕
                    </button>
                </div>

                {/* Modal Body */}
                <div className="drive-modal-body">
                    {notConnected ? (
                        <div className="drive-empty-state">
                            <div className="drive-status-badge warn">AUTH REQUIRED</div>
                            <h4>Google Drive Not Linked</h4>
                            <p>
                                Connect your Google account to grant Vigil read permissions and
                                release files during switch escalation.
                            </p>
                            <a href="/api/auth/google" className="drive-connect-btn">
                                Connect Google Drive
                            </a>
                        </div>
                    ) : (
                        <>
                            {/* Search Toolbar - rendered as div to avoid nested <form> */}
                            <div className="drive-search-bar">
                                <input
                                    type="text"
                                    placeholder="Filter by file name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="drive-search-input"
                                />
                                <button
                                    type="button"
                                    onClick={() => fetchFiles(searchQuery)}
                                    disabled={loading}
                                    className="drive-search-btn"
                                >
                                    {loading ? "Searching..." : "Search"}
                                </button>
                            </div>

                            {errorMsg && <div className="drive-error-banner">{errorMsg}</div>}

                            {/* File Listing */}
                            <div className="drive-file-list">
                                {loading ? (
                                    <div className="drive-loading-box">Querying Drive assets...</div>
                                ) : files.length === 0 ? (
                                    <div className="drive-loading-box">No files found matching criteria.</div>
                                ) : (
                                    files.map((file) => {
                                        const isSelected = Boolean(selectedMap[file.id]);
                                        return (
                                            <div
                                                key={file.id}
                                                onClick={() => toggleSelect(file)}
                                                className={`drive-file-item ${isSelected ? "selected" : ""}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => { }} // Managed by item onClick
                                                    className="drive-checkbox"
                                                />
                                                {file.iconLink ? (
                                                    <img src={file.iconLink} alt="" className="drive-file-icon" />
                                                ) : (
                                                    <span className="drive-file-icon-placeholder">📄</span>
                                                )}
                                                <div className="drive-file-info">
                                                    <span className="drive-file-name" title={file.name}>
                                                        {file.name}
                                                    </span>
                                                    <span className="drive-file-meta">
                                                        {formatFileSize(file.size)} •{" "}
                                                        {file.modifiedTime
                                                            ? new Date(file.modifiedTime).toLocaleDateString()
                                                            : "Unknown"}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Modal Footer */}
                {!notConnected && (
                    <div className="drive-modal-footer">
                        <span className="drive-selected-count">
                            {Object.keys(selectedMap).length} file(s) selected
                        </span>
                        <div className="drive-footer-actions">
                            <button type="button" onClick={onClose} className="drive-cancel-btn">
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                className="drive-confirm-btn"
                                disabled={loading}
                            >
                                Confirm Selection
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
        .drive-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }
        .drive-modal-card {
          width: 100%;
          max-width: 620px;
          background: #0d111a;
          border: 1px solid #1e293b;
          border-radius: 10px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.9);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          max-height: 85vh;
        }
        .drive-modal-header {
          padding: 16px 20px;
          border-bottom: 1px solid #1e293b;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          background: #111622;
        }
        .drive-modal-title {
          margin: 0;
          font-size: 16px;
          color: #f1f5f9;
          font-weight: 600;
          letter-spacing: -0.01em;
        }
        .drive-modal-subtitle {
          margin: 4px 0 0 0;
          font-size: 12px;
          color: #64748b;
        }
        .drive-modal-close-btn {
          background: transparent;
          border: none;
          color: #64748b;
          font-size: 16px;
          cursor: pointer;
          padding: 4px;
        }
        .drive-modal-close-btn:hover {
          color: #f1f5f9;
        }
        .drive-modal-body {
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          overflow-y: auto;
        }
        .drive-search-bar {
          display: flex;
          gap: 8px;
        }
        .drive-search-input {
          flex: 1;
          background: #161b26;
          border: 1px solid #1e293b;
          border-radius: 6px;
          padding: 8px 12px;
          color: #f1f5f9;
          font-size: 13px;
          outline: none;
        }
        .drive-search-input:focus {
          border-color: #38bdf8;
        }
        .drive-search-btn {
          background: #1e293b;
          border: 1px solid #334155;
          color: #e2e8f0;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
        }
        .drive-search-btn:hover {
          background: #334155;
        }
        .drive-file-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 340px;
          overflow-y: auto;
          border: 1px solid #1e293b;
          border-radius: 6px;
          background: #090c13;
          padding: 4px;
        }
        .drive-file-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 10px;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .drive-file-item:hover {
          background: #161b26;
        }
        .drive-file-item.selected {
          background: rgba(56, 189, 248, 0.08);
          border: 1px solid rgba(56, 189, 248, 0.25);
        }
        .drive-checkbox {
          cursor: pointer;
          accent-color: #38bdf8;
        }
        .drive-file-icon {
          width: 16px;
          height: 16px;
        }
        .drive-file-icon-placeholder {
          font-size: 14px;
        }
        .drive-file-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .drive-file-name {
          font-size: 13px;
          color: #f1f5f9;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .drive-file-meta {
          font-size: 11px;
          color: #64748b;
        }
        .drive-empty-state {
          padding: 40px 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .drive-empty-state h4 {
          margin: 12px 0 6px 0;
          color: #f1f5f9;
          font-size: 16px;
        }
        .drive-empty-state p {
          margin: 0 0 20px 0;
          font-size: 13px;
          color: #94a3b8;
          max-width: 360px;
        }
        .drive-connect-btn {
          display: inline-block;
          background: #2563eb;
          color: #ffffff;
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          text-decoration: none;
          transition: background 0.15s;
        }
        .drive-connect-btn:hover {
          background: #1d4ed8;
        }
        .drive-status-badge {
          font-family: monospace;
          font-size: 10px;
          padding: 3px 8px;
          border-radius: 4px;
          letter-spacing: 0.05em;
        }
        .drive-status-badge.warn {
          background: rgba(245, 158, 11, 0.1);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }
        .drive-modal-footer {
          padding: 14px 20px;
          border-top: 1px solid #1e293b;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #111622;
        }
        .drive-selected-count {
          font-size: 12px;
          color: #64748b;
          font-family: monospace;
        }
        .drive-footer-actions {
          display: flex;
          gap: 10px;
        }
        .drive-cancel-btn {
          background: transparent;
          border: 1px solid #334155;
          color: #94a3b8;
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
        }
        .drive-confirm-btn {
          background: #38bdf8;
          border: none;
          color: #08090c;
          font-weight: 600;
          padding: 6px 16px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
        }
        .drive-confirm-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .drive-loading-box {
          padding: 30px;
          text-align: center;
          color: #64748b;
          font-size: 13px;
        }
        .drive-error-banner {
          background: rgba(244, 63, 94, 0.1);
          border: 1px solid rgba(244, 63, 94, 0.3);
          color: #fb7185;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
        }
      `}</style>
        </div>
    );
}