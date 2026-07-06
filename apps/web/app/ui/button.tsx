import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../lib/utils"

const buttonVariants = cva(
  "inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-full text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "border border-[var(--btn-primary-border)] bg-[var(--btn-primary-bg)] px-5 py-2.5 text-[var(--btn-primary-text)] shadow-[0_0_28px_rgba(0,214,201,0.1)] dark:shadow-[0_0_28px_rgba(0,214,201,0.18)] hover:bg-[var(--btn-primary-hover)]",
        secondary: "border border-[var(--btn-secondary-border)] bg-[var(--btn-secondary-bg)] px-5 py-2.5 text-[var(--btn-secondary-text)] hover:bg-[var(--btn-secondary-hover)]",
        ghost: "px-3 py-2 text-[var(--btn-ghost-text)] hover:bg-[var(--btn-ghost-hover)] hover:text-[var(--theme-primary)]",
      },
      size: {
        default: "h-11",
        sm: "h-11 px-4",
        icon: "h-11 w-11 p-0",
        lg: "h-12 px-6",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  },
)
Button.displayName = "Button"
