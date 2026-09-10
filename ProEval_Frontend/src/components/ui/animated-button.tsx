"use client"

import * as React from "react"
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"

export interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

const animatedButtonBase =
  "relative overflow-hidden group inline-flex items-center justify-center cursor-pointer rounded-lg border border-transparent bg-primary text-primary-foreground hover:text-white transition-colors duration-200 ease-out outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50"

const animatedLayerClasses =
  "absolute left-1/2 top-1/2 h-[160%] w-[160%] -translate-x-1/2 -translate-y-1/2 translate-y-[120%] bg-[#171717] transition-transform duration-[900ms] ease-out group-hover:-translate-y-2/3 motion-reduce:transition-none motion-reduce:group-hover:translate-y-[120%]"

const contentClasses =
  "relative z-10 inline-flex items-center justify-center gap-2 whitespace-nowrap text-primary-foreground transition-colors duration-200 group-hover:text-white motion-reduce:transition-none"

export const AnimatedButton = React.forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ className, children, asChild = false, ...props }, ref) => {
    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{
        className?: string
        children?: React.ReactNode
      }>

      const innerContent = child.props.children

      return (
        <Slot.Root
          ref={ref as React.Ref<HTMLElement>}
          className={cn(animatedButtonBase, "group-hover:text-white", className)}
          {...props}
        >
          {React.cloneElement(child, {
            className: cn(child.props.className),
            children: (
              <>
                <span aria-hidden="true" className={cn(animatedLayerClasses)} />
                <span className={cn(contentClasses)}>{innerContent}</span>
              </>
            ),
          } as never)}
        </Slot.Root>
      )
    }

    return (
      <button
        ref={ref}
        className={cn(animatedButtonBase, className)}
        {...props}
      >
        <span aria-hidden="true" className={cn(animatedLayerClasses)} />
        <span className={cn(contentClasses)}>{children}</span>
      </button>
    )
  }
)
AnimatedButton.displayName = "AnimatedButton"
