import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import clsx from 'clsx'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary:
          'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500',
        secondary:
          'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
        outline:
          'border-2 border-blue-500 text-blue-600 hover:bg-blue-50 focus:ring-blue-500',
        ghost:
          'text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
        danger:
          'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
  children: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => (
    <button
      className={clsx(buttonVariants({ variant, size, className }))}
      ref={ref}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="animate-spin inline-block mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
          로딩 중...
        </>
      ) : (
        children
      )}
    </button>
  )
)

Button.displayName = 'Button'

export default Button
