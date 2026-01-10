import {PropsWithChildren} from 'react';

type Props = PropsWithChildren<{
  bottomGutter?: boolean;
  topGutter?: boolean;
}>;

export default function PageWrapper({bottomGutter = false, children, topGutter = false}: Props) {
  return (
    <div
      style={{
        marginBottom: `env(safe-area-inset-bottom) + ${bottomGutter ? 'var(--ce-appbar-height,0px)' : 'var(--ce-space-md,0px)'})`,
        marginTop: topGutter ? `calc(env(safe-area-inset-top)` : 0,
        minHeight: '90vh',
        paddingBottom: `env(safe-area-inset-bottom)`,
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      {children}
    </div>
  );
}

export function PageSection({children, className}: PropsWithChildren<{className?: string}>) {
  return <section className={`max-w-4xl mx-auto w-full px-4 sm:px-6 ${className ?? ''}`}>{children}</section>;
}
