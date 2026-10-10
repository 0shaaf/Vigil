"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Plus,
  ArrowUpRight,
  ChevronsRight,
  Check,
} from "lucide-react";
import { triggerHeartbeat } from "../../actions/switches";
import "../css/dashboard.css";

function calculateRemainingTime(lastCheckIn, interval) {
  if (!lastCheckIn) return "Awaiting Pulse";
  const target = new Date(lastCheckIn);
  if (interval?.months) target.setMonth(target.getMonth() + Number(interval.months));
  if (interval?.days) target.setDate(target.getDate() + Number(interval.days));
  if (interval?.hours) target.setHours(target.getHours() + Number(interval.hours));
  if (interval?.minutes) target.setMinutes(target.getMinutes() + Number(interval.minutes));

  const diffMs = target.getTime() - Date.now();
  if (diffMs <= 0) return "TRIPPED";

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function SlideToPulse({ onPulse, isPulsing }) {
  const trackRef = useRef(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const currentDragXRef = useRef(0);
  const [trackWidth, setTrackWidth] = useState(340);

  const THUMB_WIDTH = 46;
  const PADDING = 5;

  const updateTrackWidth = useCallback(() => {
    if (trackRef.current) {
      setTrackWidth(trackRef.current.clientWidth);
    }
  }, []);

  useEffect(() => {
    updateTrackWidth();
    window.addEventListener("resize", updateTrackWidth);
    return () => window.removeEventListener("resize", updateTrackWidth);
  }, [updateTrackWidth]);

  const maxDrag = Math.max(10, trackWidth - THUMB_WIDTH - PADDING * 2);
  const progress = Math.min(1, Math.max(0, dragX / maxDrag));

  const handleDragStart = (clientX) => {
    if (isPulsing) return;
    isDraggingRef.current = true;
    setIsDragging(true);
    startXRef.current = clientX - currentDragXRef.current;
  };

  const handleDragMove = useCallback(
    (clientX) => {
      if (!isDraggingRef.current || isPulsing) return;
      const newX = Math.max(0, Math.min(maxDrag, clientX - startXRef.current));
      currentDragXRef.current = newX;
      setDragX(newX);
    },
    [maxDrag, isPulsing]
  );

  const handleDragEnd = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);

    if (currentDragXRef.current / maxDrag >= 0.88) {
      // Confirmed pulse action
      setDragX(maxDrag);
      currentDragXRef.current = maxDrag;
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(50);
        } catch (_) {}
      }
      onPulse();

      setTimeout(() => {
        setDragX(0);
        currentDragXRef.current = 0;
      }, 1600);
    } else {
      // Spring back to start
      setDragX(0);
      currentDragXRef.current = 0;
    }
  }, [maxDrag, onPulse]);

  useEffect(() => {
    const onMouseMove = (e) => handleDragMove(e.clientX);
    const onMouseUp = () => handleDragEnd();
    const onTouchMove = (e) => {
      if (e.touches && e.touches[0]) handleDragMove(e.touches[0].clientX);
    };
    const onTouchEnd = () => handleDragEnd();

    if (isDragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      window.addEventListener("touchmove", onTouchMove, { passive: false });
      window.addEventListener("touchend", onTouchEnd);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  return (
    <div className="slide-to-pulse-wrapper">
      <div
        ref={trackRef}
        className={`slide-pulse-track ${isPulsing ? "is-pulsing" : ""} ${isDragging ? "is-dragging" : ""}`}
      >
        {/* Dynamic gradient fill bar */}
        <div
          className="slide-pulse-fill"
          style={{ width: `${dragX + THUMB_WIDTH + PADDING}px` }}
        />

        {/* Shimmer prompt text */}
        <div
          className="slide-pulse-text"
          style={{ opacity: Math.max(0, 1 - progress * 1.5) }}
        >
          {isPulsing ? "Transmitting Heartbeat..." : "Slide to Transmit Pulse"}
        </div>

        {/* Draggable knob handle */}
        <div
          className={`slide-pulse-knob ${isDragging ? "dragging" : ""} ${isPulsing ? "pulsing" : ""}`}
          style={{
            transform: `translateX(${dragX}px)`,
            transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            handleDragStart(e.clientX);
          }}
          onTouchStart={(e) => {
            if (e.touches && e.touches[0]) handleDragStart(e.touches[0].clientX);
          }}
          role="slider"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          tabIndex={0}
        >
          {isPulsing ? (
            <Activity size={20} className="knob-icon pulse-spin" />
          ) : progress > 0.85 ? (
            <Check size={20} className="knob-icon" />
          ) : (
            <ChevronsRight size={20} className="knob-icon" />
          )}
        </div>
      </div>
    </div>
  );
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function connectCardPair(from, to, pairIndex, straightLines, curvatures, terminalPips, STUB, CARD_W, CARD_H) {
  const isToOnRight = to.x > from.x + CARD_W * 0.4;
  const isSignificantlyLateral = Math.abs(to.x - from.x) > 130;

  if (isSignificantlyLateral) {
    if (isToOnRight) {
      const fromX = from.x + CARD_W;
      const fromY = from.y + 44;
      const toX = to.x;
      const toY = to.y + 52;
      const branchMidX = fromX + (toX - fromX) * 0.52;

      // Straight line 1 emerging from Card A with overshoot stub
      straightLines.push({
        id: `str-pair-${pairIndex}-from`,
        x1: fromX,
        y1: fromY,
        x2: branchMidX + STUB,
        y2: fromY,
      });

      // Straight line 2 emerging from Card B with overshoot stub
      straightLines.push({
        id: `str-pair-${pairIndex}-to`,
        x1: toX,
        y1: toY,
        x2: branchMidX - STUB + 10,
        y2: toY,
      });

      const pt1 = { x: branchMidX, y: fromY };
      const pt2 = { x: branchMidX + 10, y: toY };
      const dy = pt2.y - pt1.y;

      // Curvature branching from straight line 1 into straight line 2
      curvatures.push({
        id: `curve-pair-${pairIndex}`,
        d: `M ${pt1.x} ${pt1.y} C ${pt1.x + 30} ${pt1.y + dy * 0.15}, ${pt2.x - 30} ${pt2.y - dy * 0.15}, ${pt2.x} ${pt2.y}`,
      });

      terminalPips.push(
        { id: `pip-pair-${pairIndex}-1`, x: pt1.x, y: pt1.y },
        { id: `pip-pair-${pairIndex}-2`, x: pt2.x, y: pt2.y }
      );
    } else {
      const fromX = from.x;
      const fromY = from.y + 44;
      const toX = to.x + CARD_W;
      const toY = to.y + 52;
      const branchMidX = toX + (fromX - toX) * 0.48;

      // Straight line 1 emerging from Card A with overshoot stub
      straightLines.push({
        id: `str-pair-${pairIndex}-from`,
        x1: fromX,
        y1: fromY,
        x2: branchMidX - STUB,
        y2: fromY,
      });

      // Straight line 2 emerging from Card B with overshoot stub
      straightLines.push({
        id: `str-pair-${pairIndex}-to`,
        x1: toX,
        y1: toY,
        x2: branchMidX + STUB - 10,
        y2: toY,
      });

      const pt1 = { x: branchMidX, y: fromY };
      const pt2 = { x: branchMidX - 10, y: toY };
      const dy = pt2.y - pt1.y;

      // Curvature branching from straight line 1 into straight line 2
      curvatures.push({
        id: `curve-pair-${pairIndex}`,
        d: `M ${pt1.x} ${pt1.y} C ${pt1.x - 30} ${pt1.y + dy * 0.15}, ${pt2.x + 30} ${pt2.y - dy * 0.15}, ${pt2.x} ${pt2.y}`,
      });

      terminalPips.push(
        { id: `pip-pair-${pairIndex}-1`, x: pt1.x, y: pt1.y },
        { id: `pip-pair-${pairIndex}-2`, x: pt2.x, y: pt2.y }
      );
    }
  } else {
    // Orthogonal drop with corner arc and stubs (Card A vertical drop, Card B horizontal)
    const vertX = from.x + 44;
    const startY = from.y + CARD_H;
    const targetY = to.y + 52;
    const branchY = targetY - 26;
    const toIsRight = to.x >= vertX;

    // Vertical line emerging from Card A bottom with downward overshoot stub
    straightLines.push({
      id: `str-pair-${pairIndex}-vert`,
      x1: vertX,
      y1: startY,
      x2: vertX,
      y2: branchY + STUB + 12,
    });

    const horizBranchX = vertX + (toIsRight ? 26 : -26);
    const horizStubEnd = vertX + (toIsRight ? -STUB : STUB);

    // Horizontal line emerging from Card B with overshoot stub
    straightLines.push({
      id: `str-pair-${pairIndex}-horiz`,
      x1: toIsRight ? to.x : to.x + CARD_W,
      y1: targetY,
      x2: horizStubEnd,
      y2: targetY,
    });

    // 90-degree fillet curvature branching between them
    curvatures.push({
      id: `curve-pair-${pairIndex}`,
      d: `M ${vertX} ${branchY} C ${vertX} ${targetY}, ${vertX + (toIsRight ? 8 : -8)} ${targetY}, ${horizBranchX} ${targetY}`,
    });

    terminalPips.push(
      { id: `pip-pair-${pairIndex}-vert`, x: vertX, y: branchY },
      { id: `pip-pair-${pairIndex}-horiz`, x: horizBranchX, y: targetY }
    );
  }
}

export default function ConstellationWeb({ switches = [] }) {
  const router = useRouter();
  const containerRef = useRef(null);

  const [dimensions, setDimensions] = useState({ width: 1000, height: 700 });
  const [pulseActive, setPulseActive] = useState(false);
  const [toast, setToast] = useState({ show: false, leaving: false, message: "", type: "success" });
  const toastTimeoutRef = useRef(null);

  // Resize listener
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth || window.innerWidth,
          height: window.innerHeight,
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const showToast = useCallback((message, type = "success") => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ show: true, leaving: false, message, type });

    toastTimeoutRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, leaving: true }));
      setTimeout(() => {
        setToast({ show: false, leaving: false, message: "", type: "success" });
      }, 350);
    }, 2800);
  }, []);

  const CARD_W = 172;
  const CARD_H = 126;

  // Compute arbitrary descending positions, circuit traces, and dynamic canvas height
  const { nodePositions, totalCanvasHeight, circuitTraces, emptyCardPos } = useMemo(() => {
    const total = switches.length;
    const isMobile = (dimensions.width || 0) < 768;

    if (total === 0) {
      const availW = dimensions.width || 375;
      const canvasHeight = Math.max(dimensions.height || 600, 600);
      const EMPTY_W = Math.min(210, Math.max(180, availW - 32));
      const EMPTY_H = 136;
      const cx = Math.round(availW / 2);
      const cy = Math.round(canvasHeight * 0.44);

      const cardLeft = cx - EMPTY_W / 2;
      const cardRight = cx + EMPTY_W / 2;
      const cardTop = cy - EMPTY_H / 2;
      const cardBottom = cy + EMPTY_H / 2;

      const straightLines = [];
      const curvatures = [];
      const terminalPips = [];

      const maxHorizLen = Math.max(16, cardLeft - 16);
      const lineLen = isMobile ? Math.min(50, maxHorizLen) : 130;

      // 4 straight lines extending outward from card edges
      straightLines.push(
        { id: "empty-str-top", x1: cx, y1: cardTop, x2: cx, y2: cardTop - lineLen },
        { id: "empty-str-right", x1: cardRight, y1: cy, x2: cardRight + lineLen, y2: cy },
        { id: "empty-str-bottom", x1: cx, y1: cardBottom, x2: cx, y2: cardBottom + lineLen },
        { id: "empty-str-left", x1: cardLeft, y1: cy, x2: cardLeft - lineLen, y2: cy }
      );

      // Terminal end pips at the tips of the 4 extending straight lines
      terminalPips.push(
        { id: "empty-pip-end-top", x: cx, y: cardTop - lineLen },
        { id: "empty-pip-end-right", x: cardRight + lineLen, y: cy },
        { id: "empty-pip-end-bottom", x: cx, y: cardBottom + lineLen },
        { id: "empty-pip-end-left", x: cardLeft - lineLen, y: cy }
      );

      return {
        nodePositions: [],
        totalCanvasHeight: canvasHeight,
        circuitTraces: { straightLines, curvatures, terminalPips },
        emptyCardPos: { x: cardLeft, y: cardTop, width: EMPTY_W, height: EMPTY_H },
      };
    }

    const availW = dimensions.width || 375;
    const minX = isMobile ? 16 : 56;
    const maxX = Math.max(minX, availW - CARD_W - (isMobile ? 16 : 56));
    const usableSpan = Math.max(0, maxX - minX);

    const topMargin = isMobile ? 130 : 100;
    const verticalStep = isMobile ? 195 : 185; // Vertical step as cards descend down the screen

    // Staggered anchor zones for arbitrary yet comfortable positioning (not maniacly far)
    const zoneFractions = isMobile
      ? [0.12, 0.88, 0.18, 0.82, 0.10, 0.90]
      : [0.12, 0.72, 0.28, 0.62, 0.18, 0.68, 0.35, 0.52];

    const positions = [];

    for (let i = 0; i < total; i++) {
      const sw = switches[i];
      const key = sw.id || String(i);

      // Arbitrary yet bounded Y offset (+/- 14px on desktop, minimal on mobile)
      const jitterY = isMobile ? 0 : ((hashString(key + "_y") % 29) - 14);
      const y = topMargin + i * verticalStep + jitterY;

      // Anchor zone with deterministic jitter
      const baseZone = zoneFractions[i % zoneFractions.length];
      const jitterX = isMobile ? 0 : (((hashString(key + "_x") % 15) - 7) / 100);
      const finalFraction = Math.max(0, Math.min(1, baseZone + jitterX));
      const x = usableSpan > 0 ? Math.round(minX + finalFraction * usableSpan) : Math.round((availW - CARD_W) / 2);

      positions.push({
        switch: sw,
        index: i,
        x,
        y,
      });
    }

    // Dynamic height calculation so page becomes scrollable as cards increase
    const maxY = Math.max(...positions.map((p) => p.y + CARD_H));
    const canvasHeight = Math.max(dimensions.height, maxY + 150);

    const straightLines = [];
    const curvatures = [];
    const terminalPips = [];

    const STUB = 22; // Straight line overshoot length past curvature branch point

    if (total >= 2) {
      if (isMobile) {
        // Mobile Layout: Clean sequential vertical bus connecting strictly in the open gap between cards.
        // Starts at the bottom edge of Card i and terminates at the top edge of Card i+1,
        // so lines and curvatures NEVER go underneath or behind any switch card.
        for (let i = 0; i < total - 1; i++) {
          const from = positions[i];
          const to = positions[i + 1];

          const fromX = Math.round(from.x + CARD_W / 2);
          const fromY = from.y + CARD_H;
          const toX = Math.round(to.x + CARD_W / 2);
          const toY = to.y;

          const gap = toY - fromY;
          const midY = Math.round(fromY + gap / 2);

          // Terminal connection pips right at card edges
          terminalPips.push(
            { id: `mob-pip-out-${i}`, x: fromX, y: fromY },
            { id: `mob-pip-in-${i + 1}`, x: toX, y: toY }
          );

          if (Math.abs(fromX - toX) < 4) {
            // Straight vertical line connecting the two cards directly
            straightLines.push({
              id: `mob-line-vert-${i}`,
              x1: fromX,
              y1: fromY,
              x2: fromX,
              y2: toY,
            });
          } else {
            // Stepped fillet in the clear open gap between cards
            const filletR = Math.min(16, Math.max(8, Math.floor(gap * 0.25)));
            const yBranch1 = midY - filletR;
            const yBranch2 = midY + filletR;

            straightLines.push({
              id: `mob-drop-${i}`,
              x1: fromX,
              y1: fromY,
              x2: fromX,
              y2: yBranch1,
            });

            curvatures.push({
              id: `mob-curve-${i}`,
              d: `M ${fromX} ${yBranch1} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${yBranch2}`,
            });

            straightLines.push({
              id: `mob-enter-${i}`,
              x1: toX,
              y1: yBranch2,
              x2: toX,
              y2: toY,
            });
          }
        }
      } else {
        // Desktop Layout (total >= 2)
        if (total >= 3) {
          // Reproduce the user's root spine pattern from Card 0 to Card 1 & Card 2
          const c0 = positions[0];
          const c1 = positions[1];
          const c2 = positions[2];

          const c0BottomMidX = c0.x + 44;
          const c0BottomY = c0.y + CARD_H;

          // 1. Continuous vertical straight spine from Card 0 down past c2 branch with downward stub
          const c1BranchY = c0BottomY + 28;
          const c2TargetY = c2.y + 52;
          const c2VertBranchY = c2TargetY - 26;
          const c2VertStubEnd = c2VertBranchY + STUB + 12;

          straightLines.push({
            id: "spine-c0-c2",
            x1: c0BottomMidX,
            y1: c0BottomY,
            x2: c0BottomMidX,
            y2: c2VertStubEnd,
          });

          // 2. Branch to Card 1 (Horizontal S-curve with stubs)
          const c1MidY = c1.y + 52;
          const c1BranchMidX = c0BottomMidX + (c1.x - c0BottomMidX) * 0.52;

          // Top horizontal line emerging from spine going right, overshooting past branch point
          straightLines.push({
            id: "str-c0-c1-top",
            x1: c0BottomMidX,
            y1: c1BranchY,
            x2: c1BranchMidX + STUB,
            y2: c1BranchY,
          });

          // Bottom horizontal line emerging from Card 1 going left, overshooting past branch point
          straightLines.push({
            id: "str-c0-c1-bot",
            x1: c1.x,
            y1: c1MidY,
            x2: c1BranchMidX - STUB + 10,
            y2: c1MidY,
          });

          // S-curve curvature
          const c1TopBranchPt = { x: c1BranchMidX, y: c1BranchY };
          const c1BotBranchPt = { x: c1BranchMidX + 10, y: c1MidY };
          const c1Dy = c1BotBranchPt.y - c1TopBranchPt.y;

          curvatures.push({
            id: "curve-c0-c1",
            d: `M ${c1TopBranchPt.x} ${c1TopBranchPt.y} C ${c1TopBranchPt.x + 32} ${c1TopBranchPt.y + c1Dy * 0.15}, ${c1BotBranchPt.x - 32} ${c1BotBranchPt.y - c1Dy * 0.15}, ${c1BotBranchPt.x} ${c1BotBranchPt.y}`,
          });

          terminalPips.push(
            { id: "pip-c0-c1-top", x: c1TopBranchPt.x, y: c1TopBranchPt.y },
            { id: "pip-c0-c1-bot", x: c1BotBranchPt.x, y: c1BotBranchPt.y }
          );

          // 3. Branch to Card 2 (Orthogonal fillet with stubs)
          const c2MidY = c2TargetY;
          const c2IsRight = c2.x >= c0BottomMidX;
          const c2HorizBranchX = c0BottomMidX + (c2IsRight ? 26 : -26);
          const c2HorizStubEnd = c0BottomMidX + (c2IsRight ? -STUB : STUB);

          straightLines.push({
            id: "str-c0-c2-horiz",
            x1: c2IsRight ? c2.x : c2.x + CARD_W,
            y1: c2MidY,
            x2: c2HorizStubEnd,
            y2: c2MidY,
          });

          curvatures.push({
            id: "curve-c0-c2",
            d: `M ${c0BottomMidX} ${c2VertBranchY} C ${c0BottomMidX} ${c2MidY}, ${c0BottomMidX + (c2IsRight ? 8 : -8)} ${c2MidY}, ${c2HorizBranchX} ${c2MidY}`,
          });

          terminalPips.push(
            { id: "pip-c0-c2-vert", x: c0BottomMidX, y: c2VertBranchY },
            { id: "pip-c0-c2-horiz", x: c2HorizBranchX, y: c2MidY }
          );
        } else {
          // Exactly 2 cards
          connectCardPair(positions[0], positions[1], 0, straightLines, curvatures, terminalPips, STUB, CARD_W, CARD_H);
        }

        // Connect subsequent cards sequentially (2->3, 3->4, etc.)
        const startIndex = total >= 3 ? 2 : 1;
        for (let i = startIndex; i < total - 1; i++) {
          connectCardPair(positions[i], positions[i + 1], i, straightLines, curvatures, terminalPips, STUB, CARD_W, CARD_H);
        }
      }
    }

    return {
      nodePositions: positions,
      totalCanvasHeight: canvasHeight,
      circuitTraces: { straightLines, curvatures, terminalPips },
    };
  }, [switches, dimensions.width, dimensions.height]);

  const handleHeartbeat = async () => {
    setPulseActive(true);

    try {
      const res = await triggerHeartbeat();
      if (res?.error && (res.error === "Unauthorized" || res.error.toLowerCase().includes("log in"))) {
        window.location.href = "/login";
        return;
      }
      if (res?.success) {
        showToast("Heartbeat confirmed — All switches renewed", "success");
        router.refresh();
      } else {
        showToast(res?.error || "Pulse transmission rejected", "error");
      }
    } catch (err) {
      if (err?.message?.toLowerCase().includes("unauthorized") || err?.message?.toLowerCase().includes("log in")) {
        window.location.href = "/login";
        return;
      }
      showToast("GATEWAY TIMEOUT", "error");
    }

    setTimeout(() => setPulseActive(false), 1200);
  };

  const armedCount = switches.filter((s) => s.status === "ARMED").length;

  return (
    <div
      ref={containerRef}
      className="constellation-viewport"
      style={{
        minHeight: `${totalCanvasHeight}px`,
        height: `${totalCanvasHeight}px`,
      }}
    >
      {/* 1. Simple Toast Notification */}
      {toast.show && (
        <div
          className={`toast ${toast.leaving ? "is-leaving" : ""}`}
          role="status"
          aria-live="polite"
        >
          <div className="toast-content">
            {toast.message}
          </div>
          <div className="toast-icon">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 0h24v24H0z" fill="none" />
              <path d="M15.795 8.342l-5.909 9.545a1 1 0 0 1-1.628 0l-3.182-4.909a1 1 0 0 1 1.629-1.165l2.556 3.953L14.165 7.51a1 1 0 0 1 1.63 1.165z" />
            </svg>
          </div>
        </div>
      )}

      {/* 2. Top Right Telemetry & Actions Dock */}
      <aside className="constellation-top-dock">
        <div className="dock-stat-item">
          <span className="dock-stat-label">TOTAL SWITCHES</span>
          <span className="dock-stat-value">{switches.length}</span>
        </div>
        <div className="dock-stat-divider" />
        <div className="dock-stat-item">
          <span className="dock-stat-label">ARMED &amp; ACTIVE</span>
          <span className="dock-stat-value text-[#10b981]">{armedCount}</span>
        </div>
        <div className="dock-stat-divider" />
        <Link
          href="/dashboard/switches/create"
          className="btn-dock-create-plus"
          title="New Switch"
          aria-label="New Switch"
        >
          <Plus size={16} strokeWidth={2.5} />
        </Link>
      </aside>

      {/* 3. Static Light Dotted Grid & PCB Circuit Connecting Lines Canvas */}
      <svg
        width={dimensions.width}
        height={totalCanvasHeight}
        className="constellation-svg"
        aria-hidden="true"
      >
        <defs>
          {/* Static Dotted Grid Pattern with Bloody Orange Accent */}
          <pattern
            id="staticDottedGrid"
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1.3" fill="#ff3b19" opacity="0.45" />
          </pattern>
        </defs>

        {/* Solid Dark Base (Exclusive Constellation Background) */}
        <rect width="100%" height="100%" fill="#08090d" />

        {/* Dotted Grid on Bloody Orange Accent */}
        <rect width="100%" height="100%" fill="url(#staticDottedGrid)" />

        {/* Circuit Straight Lines with Overshoot Stubs */}
        {circuitTraces.straightLines.map((line) => (
          <line
            key={line.id}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            className={`sentinel-straight-line ${pulseActive ? "is-pulsing" : ""}`}
          />
        ))}

        {/* Branching Curvatures Connecting the Straight Lines */}
        {circuitTraces.curvatures.map((curve) => (
          <path
            key={curve.id}
            d={curve.d}
            className={`sentinel-circuit-line ${pulseActive ? "is-pulsing" : ""}`}
          />
        ))}

        {/* Junction & Terminal Pips */}
        {circuitTraces.terminalPips.map((pip) => (
          <circle
            key={pip.id}
            cx={pip.x}
            cy={pip.y}
            r={3}
            className="circuit-terminal-pip"
          />
        ))}
      </svg>

      {/* 4. Small Sentinel Cards Layer */}
      <div className="sentinel-cards-layer">
        {nodePositions.map((pos) => {
          const rawStatus = (pos.switch.status || "ARMED").toUpperCase();
          const remaining = calculateRemainingTime(
            pos.switch.last_check_in,
            pos.switch.check_in_interval
          );

          const isEscalating = rawStatus === "ESCALATING";
          const isTripped =
            rawStatus === "EXHAUSTED" ||
            rawStatus === "TRIPPED" ||
            (rawStatus !== "STANDBY" && rawStatus !== "PAUSED" && remaining === "TRIPPED");
          const isStandby = rawStatus === "STANDBY" || rawStatus === "PAUSED";
          const isResolved = rawStatus === "RESOLVED" || rawStatus === "ACKNOWLEDGED";

          let statusClass = "status-armed";
          if (isEscalating) {
            statusClass = "status-escalating";
          } else if (isTripped) {
            statusClass = "status-tripped";
          } else if (isStandby) {
            statusClass = "status-standby";
          } else if (isResolved) {
            statusClass = "status-resolved";
          }

          return (
            <div
              key={pos.switch.id}
              className={`sentinel-node-card ${statusClass} ${pulseActive ? "is-pulsing" : ""}`}
              style={{
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                width: `${CARD_W}px`,
                height: `${CARD_H}px`,
              }}
              onClick={() => router.push(`/dashboard/switches/${pos.switch.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  router.push(`/dashboard/switches/${pos.switch.id}`);
                }
              }}
            >
              <div className="node-card-top">
                <div className="node-card-title-group">
                  <span className={`node-status-pip ${statusClass}`} />
                  <span className="node-card-title" title={pos.switch.name}>
                    {pos.switch.name}
                  </span>
                </div>
                <ArrowUpRight size={13} className="node-card-link-icon" />
              </div>

              <div className="node-card-middle">
                <span className="node-countdown-val">{remaining}</span>
                <span className="node-countdown-label">TIME REMAINING</span>
              </div>

              <div className="node-card-bottom">
                <span className="node-badge-tier">
                  {pos.switch.criticality || "OPERATIONAL"}
                </span>
              </div>
            </div>
          );
        })}

        {/* Empty State Card styled in the exact same way as Sentinel Node Cards */}
        {switches.length === 0 && emptyCardPos && (
          <div
            className={`sentinel-node-card status-armed constellation-empty-node-card ${pulseActive ? "is-pulsing" : ""}`}
            style={{
              left: `${emptyCardPos.x}px`,
              top: `${emptyCardPos.y}px`,
              width: `${emptyCardPos.width}px`,
              height: `${emptyCardPos.height}px`,
            }}
          >
            <div className="empty-node-content">
              <h3 className="empty-node-title">
                You haven&apos;t configured any switches yet
              </h3>
              <Link
                href="/dashboard/switches/create"
                className="btn-take-setup"
              >
                <span>Take Me to the Setup</span>
                <ArrowUpRight size={13} />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* 5. Fixed Bottom Centered Slide-to-Pulse Control */}
      <SlideToPulse
        onPulse={handleHeartbeat}
        isPulsing={pulseActive}
      />
    </div>
  );
}