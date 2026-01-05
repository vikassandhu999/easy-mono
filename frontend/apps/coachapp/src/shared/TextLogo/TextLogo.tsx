import React from 'react';

import LogoSrc from '../../../public/logo.png';

type TextLogoProps = React.HTMLAttributes<HTMLElement> & {
  as?: React.ElementType;
  className?: string;
  href?: string;
  onDark?: boolean;
  size?: 'lg' | 'md' | 'sm';
};

/**
 * Renders the "Coach Easy" text logo with support for different sizes and themes.
 * This component requires the corresponding logo CSS to be imported in your project.
 *
 * @param {object} props - The component props.
 * @param {'sm' | 'md' | 'lg'} [props.size='sm'] - The size variant of the logo.
 * @param {React.ElementType} [props.as='a'] - The HTML element to render the logo as (e.g., 'a', 'div', 'span').
 * @param {string} [props.href='/'] - The link destination if the component is rendered as an anchor tag.
 * @param {boolean} [props.onDark=false] - Set to true if the logo is placed on a dark background.
 * @param {string} [props.className] - Allows passing additional CSS classes to the component.
 */
export default function TextLogo({
  as: Component = 'a', // Render as an 'a' tag by default
  className = '',
  href = '/',
  onDark = false,
  size = 'sm',
  ...rest // Pass through any other props like aria-label, etc.
}: TextLogoProps) {
  // Construct the CSS class string based on props
  const logoClasses = ['logo', `logo-${size}`, onDark ? 'on-dark' : '', className].filter(Boolean).join(' '); // .filter(Boolean) removes any empty strings

  // Define image width based on size
  const sizeToWidth = {
    lg: '200px',
    md: '160px',
    sm: '120px',
  };

  // Prepare props for the component, adding href only if it's a link
  const componentProps: any = {
    className: logoClasses,
    ...(Component === 'a' && {href}),
    ...rest,
  };

  return (
    <Component {...componentProps}>
      <img
        alt="Coach Easy Logo"
        src={LogoSrc}
        style={{verticalAlign: 'middle', width: sizeToWidth[size]}}
      />
    </Component>
  );
}
