import {PropsWithChildren} from 'react';

type Props = PropsWithChildren<{
  bottomGutter?: boolean;
  topGutter?: boolean;
}>;

export default function PageWrapper({bottomGutter = true, children, topGutter = true}: Props) {
  return (
    <div
      style={{
        marginBottom: `calc(var(--ce-space-12,0px) + env(safe-area-inset-bottom) + ${bottomGutter ? 'var(--ce-appbar-height,0px)' : 'var(--ce-space-md,0px)'})`,
        marginTop: topGutter ? `calc(env(safe-area-inset-top) + var(--ce-space-12,0px))` : 0,
        minHeight: '90vh',
        paddingBottom: `env(safe-area-inset-bottom)`,
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <div className={'max-w-4xl mx-auto w-full px-4 sm:px-6`'}>{children}</div>
    </div>
  );
}
