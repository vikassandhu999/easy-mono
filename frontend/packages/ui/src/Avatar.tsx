import { tv } from 'tailwind-variants';
import { twMerge } from 'tailwind-merge';

export interface AvatarProps {
  src: string;
  alt: string;
  size?: 'small' | 'medium' | 'large' | 'extraLarge';
  className?: string;
  border?: boolean;
}

const avatar = tv({
  base: 'inline-block align-middle bg-neutral rounded-full',
  variants: {
    size: {
      small: 'w-form-box-small h-form-box-small',
      medium: 'w-form-box-normal h-form-box-normal',
      large: 'w-form-box-large w-form-box-large',
      extraLarge: 'w-[80px] h-[80px]',
    },
    border: {
      true: 'border border-neutral-light',
      false: '',
    },
  },
  defaultVariants: {
    size: 'medium',
    border: false,
  },
});

export function Avatar({ src, alt, size, border, className, ...props }: AvatarProps) {
  const computedClasses = twMerge(avatar({ size, border }), className);
  return <img {...props} src={src} alt={alt} className={computedClasses} />;
}
