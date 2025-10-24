"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "subtle";
type ButtonSize = "sm" | "md";
type ButtonShape = "pill" | "rounded";

export type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const BASE_STYLES =
  "inline-flex items-center justify-center font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 gap-2";

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-slate-900 text-white hover:bg-slate-700 focus-visible:ring-slate-500",
  secondary:
    "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-900 focus-visible:ring-slate-400",
  ghost:
    "text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-300 focus-visible:ring-offset-1",
  destructive:
    "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500",
  subtle: "bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:ring-slate-300",
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
};

const SHAPE_STYLES: Record<ButtonShape, string> = {
  pill: "rounded-full",
  rounded: "rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      shape = "pill",
      fullWidth = false,
      className,
      leadingIcon,
      trailingIcon,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          BASE_STYLES,
          VARIANT_STYLES[variant],
          SIZE_STYLES[size],
          SHAPE_STYLES[shape],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {leadingIcon ? <span aria-hidden>{leadingIcon}</span> : null}
        {children}
        {trailingIcon ? <span aria-hidden>{trailingIcon}</span> : null}
      </button>
    );
  }
);

Button.displayName = "Button";
