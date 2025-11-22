import React from "react";
import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  linkTo?: string;
}

const sizeMap = {
  sm: { height: 32, width: 32 },
  md: { height: 40, width: 40 },
  lg: { height: 48, width: 48 },
};

export default function Logo({ size = "md", className = "", linkTo = "/" }: LogoProps) {
  const { height, width } = sizeMap[size];

  const logoImage = (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/images/investracker_logo.svg"
        alt="Investracker Logo"
        height={height}
        width={width}
        priority
        className="object-contain"
      />
      <span className="text-2xl font-bold text-gray-900 hidden sm:inline">
        <span className="text-primary-600">Invest</span>racker
      </span>
    </div>
  );

  if (linkTo) {
    return (
      <Link href={linkTo} className="hover:opacity-80 transition-opacity">
        {logoImage}
      </Link>
    );
  }

  return logoImage;
}
