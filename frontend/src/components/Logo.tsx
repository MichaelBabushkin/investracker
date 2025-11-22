import React from "react";
import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  linkTo?: string;
}

const sizeMap = {
  sm: { height: 40, width: 160 },
  md: { height: 50, width: 200 },
  lg: { height: 60, width: 240 },
};

export default function Logo({ size = "md", className = "", linkTo = "/" }: LogoProps) {
  const { height, width } = sizeMap[size];

  const logoImage = (
    <div className={`flex items-center ${className}`}>
      <Image
        src="/images/investracker_logo.svg"
        alt="Investracker"
        height={height}
        width={width}
        priority
        className="object-contain"
      />
    </div>
  );

  if (linkTo) {
    return (
      <Link href={linkTo} className="hover:opacity-90 transition-opacity">
        {logoImage}
      </Link>
    );
  }

  return logoImage;
}
