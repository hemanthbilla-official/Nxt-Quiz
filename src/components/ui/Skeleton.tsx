"use client";

import { memo } from "react";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton = memo(function Skeleton({ className = "", style }: SkeletonProps) {
  return (
    <div 
      className={`skeleton ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
});

interface SkeletonRowProps {
  className?: string;
}

export const SkeletonRow = memo(function SkeletonRow({ className = "" }: SkeletonRowProps) {
  return (
    <div className={`flex items-center gap-4 p-4 ${className}`}>
      <Skeleton className="h-4 w-1/3 rounded" />
      <Skeleton className="h-4 w-20 rounded" />
      <Skeleton className="h-4 w-24 rounded" />
    </div>
  );
});

export const SkeletonCard = memo(function SkeletonCard({ className = "" }: SkeletonProps) {
  return (
    <div className={`card p-4 ${className}`}>
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-lg" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3 rounded" />
          <Skeleton className="h-3 w-1/4 rounded" />
        </div>
      </div>
    </div>
  );
});

export const SkeletonTable = memo(function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-0">
      <div className="flex items-center gap-4 p-4 border-b border-border bg-muted/30">
        <Skeleton className="h-4 w-1/4 rounded" />
        <Skeleton className="h-4 w-1/4 rounded" />
        <Skeleton className="h-4 w-1/4 rounded" />
        <Skeleton className="h-4 w-1/4 rounded" />
      </div>
      {[...Array(rows)].map((_, i) => (
        <SkeletonRow key={i} className="border-b border-border" />
      ))}
    </div>
  );
});

export const SkeletonList = memo(function SkeletonList({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(items)].map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
});

export const SkeletonChart = memo(function SkeletonChart() {
  return (
    <div className="h-[300px] card p-4 flex items-center justify-center">
      <div className="space-y-4 w-full">
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-4 w-5/6 rounded" />
      </div>
    </div>
  );
});

export const SkeletonText = memo(function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {[...Array(lines)].map((_, i) => (
        <Skeleton 
          key={i} 
          className={`h-4 rounded ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} 
        />
      ))}
    </div>
  );
});

export const SkeletonButton = memo(function SkeletonButton() {
  return (
    <Skeleton className="h-9 w-24 rounded-md" />
  );
});

export const SkeletonAvatar = memo(function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return (
    <Skeleton 
      className="rounded-full" 
      style={{ width: size, height: size }} 
    />
  );
});