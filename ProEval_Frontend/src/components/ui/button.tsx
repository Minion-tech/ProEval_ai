import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent text-sm font-semibold whitespace-nowrap transition-all duration-200 outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/60 active:translate-y-[0.5px] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-foreground hover:bg-primary/90 font-bold [&_svg]:translate-x-0.5 hover:[&_svg]:translate-x-1",
        primary: "bg-primary text-foreground hover:bg-primary/90 font-bold [&_svg]:translate-x-0.5 hover:[&_svg]:translate-x-1",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90 font-bold [&_svg]:translate-x-0.5 hover:[&_svg]:translate-x-1",
        outline: "border-input bg-card text-foreground hover:bg-muted hover:text-foreground transition-colors duration-200 dark:bg-popover dark:text-foreground dark:hover:bg-muted [&_svg]:translate-x-0.5 hover:[&_svg]:translate-x-1",
        ghost: "text-foreground hover:bg-muted/50 hover:text-foreground dark:text-foreground dark:hover:bg-muted [&_svg]:translate-x-0.5 hover:[&_svg]:translate-x-1",
        destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
        link: "text-primary underline-offset-2 hover:underline font-semibold transition-all duration-200 [&_svg]:translate-x-0.5 hover:[&_svg]:translate-x-1",
      },
      size: {
        default: "h-9 gap-2 px-4 py-2",
        xs: "h-6 gap-1 rounded-md px-2 text-xs",
        sm: "h-8 gap-1.5 rounded-md px-3 text-xs",
        lg: "h-11 gap-2 rounded-lg px-6 text-base",
        icon: "size-9 rounded-md",
        "icon-xs": "size-6 rounded-md text-xs",
        "icon-sm": "size-8 rounded-md text-xs",
        "icon-lg": "size-11 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
