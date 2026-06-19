import Image from "next/image";
import { isOptimizableImageUrl } from "@/lib/images/optimizable";

type Props = {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
};

/** next/image for Supabase uploads; plain img for arbitrary external URLs. */
export function OptimizableImage({
  src,
  alt,
  className,
  width,
  height,
  fill,
  sizes = "100vw",
}: Props) {
  if (isOptimizableImageUrl(src)) {
    if (fill) {
      return <Image src={src} alt={alt} fill sizes={sizes} className={className} />;
    }
    return (
      <Image
        src={src}
        alt={alt}
        width={width ?? 320}
        height={height ?? 240}
        sizes={sizes}
        className={className}
      />
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} loading="lazy" decoding="async" />;
}
