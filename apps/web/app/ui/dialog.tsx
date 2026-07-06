import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import * as React from "react"

import { cn } from "../lib/utils"

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-white/12 bg-slate-950 p-6 shadow-2xl shadow-black/40 focus:outline-none",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-5 top-5 rounded-full p-2 text-violet-100/60 hover:bg-white/10 hover:text-white">
        <X className="h-4 w-4" />
        <span className="sr-only">关闭</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("space-y-2 pr-10", className)} {...props} />
)

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("text-2xl font-bold text-white", className)} {...props} />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm leading-6 text-violet-100/65", className)} {...props} />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName
