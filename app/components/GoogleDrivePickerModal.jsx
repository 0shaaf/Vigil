"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Search, FileText, FolderOpen, AlertCircle, Check, ArrowUpRight } from "lucide-react";
import "@/app/dashboard/css/drive-picker-modal.css";

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
        <div
            className="drive-picker-overlay"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="drive-picker-card" role="dialog" aria-modal="true">
                {/* Modal Header */}
                <div className="drive-picker-header">
                    <div>
                        <h3 className="drive-picker-title">Select Drive Attachments</h3>
                        <p className="drive-picker-subtitle">
                            Choose assets to associate with this disclosure package
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="drive-picker-close-btn"
                        title="Close modal"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="drive-picker-body">
                    {notConnected ? (
                        <div className="drive-picker-empty-state">
                            <div className="drive-picker-status-badge">AUTH REQUIRED</div>
                            <h4>Google Drive Not Linked</h4>
                            <p>
                                Connect your Google account to grant Vigil read permissions and
                                release files during switch escalation.
                            </p>
                            <a href="/api/auth/google" className="drive-picker-connect-btn">
                                <span>Connect Google Drive</span>
                                <ArrowUpRight size={14} />
                            </a>
                        </div>
                    ) : (
                        <>
                            {/* Search Toolbar */}
                            <div className="drive-picker-search-bar">
                                <div className="drive-picker-search-input-wrap">
                                    <Search size={14} className="drive-picker-search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Filter by file name..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className="drive-picker-search-input"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearchQuery("");
                                                fetchFiles("");
                                            }}
                                            className="drive-picker-search-clear"
                                            title="Clear search"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => fetchFiles(searchQuery)}
                                    disabled={loading}
                                    className="drive-picker-search-btn"
                                >
                                    {loading ? "Searching..." : "Search"}
                                </button>
                            </div>

                            {errorMsg && (
                                <div className="drive-picker-error-banner">
                                    <AlertCircle size={14} />
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            {/* File Listing */}
                            <div className="drive-picker-file-list">
                                {loading ? (
                                    <div className="drive-picker-loading-box">
                                        <div className="drive-picker-spinner" />
                                        <span>Querying Drive assets...</span>
                                    </div>
                                ) : files.length === 0 ? (
                                    <div className="drive-picker-empty-files">
                                        <FolderOpen size={24} className="text-white/40" />
                                        <span>No files found matching criteria.</span>
                                    </div>
                                ) : (
                                    files.map((file) => {
                                        const isSelected = Boolean(selectedMap[file.id]);
                                        return (
                                            <div
                                                key={file.id}
                                                onClick={() => toggleSelect(file)}
                                                className={`drive-picker-file-item ${isSelected ? "selected" : ""}`}
                                            >
                                                <div
                                                    className={`drive-picker-checkbox ${isSelected ? "checked" : ""}`}
                                                >
                                                    {isSelected && <Check size={12} strokeWidth={3} />}
                                                </div>
                                                {file.iconLink ? (
                                                    <img
                                                        src={file.iconLink}
                                                        alt=""
                                                        className="drive-picker-file-icon"
                                                    />
                                                ) : (
                                                    <FileText size={16} className="text-[#ff3b19]" />
                                                )}
                                                <div className="drive-picker-file-info">
                                                    <span className="drive-picker-file-name" title={file.name}>
                                                        {file.name}
                                                    </span>
                                                    <span className="drive-picker-file-meta">
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
                    <div className="drive-picker-footer">
                        <span className="drive-picker-selected-count">
                            <span style={{ color: "#ff3b19", fontWeight: 600 }}>
                                {Object.keys(selectedMap).length}
                            </span>{" "}
                            asset(s) selected
                        </span>
                        <div className="drive-picker-footer-actions">
                            <button
                                type="button"
                                onClick={onClose}
                                className="drive-picker-cancel-btn"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                className="drive-picker-confirm-btn"
                                disabled={loading}
                            >
                                Confirm Selection
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}