"use client";

import Image from "next/image";
import { useState } from "react";

type UnoptimizedRemoteImageProps = {
  src?: string | null;
  alt: string;
  sizes: string;
  className?: string;
  fallback?: React.ReactNode;
  priority?: boolean;
};

// Product images may come from seller uploads or arbitrary import URLs.
// We intentionally bypass the Next image optimizer and render the remote src directly.
export function UnoptimizedRemoteImage({
  src,
  alt,
  sizes,
  className,
  fallback = null,
  priority = false,
}: UnoptimizedRemoteImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) return <>{fallback}</>;

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      unoptimized
      priority={priority}
      className={className}
      onError={() => setFailedSrc(src)}
    />
  );
}
