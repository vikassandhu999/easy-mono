import type {ReactNode} from 'react';

export function AuthLayout({title, description, children}: {title: string; description: string; children: ReactNode}) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center gap-2 px-6 py-7">
        <span className="text-xl font-semibold tracking-tight">easy</span>
        <span className="border-l border-border pl-2 text-sm text-muted-foreground">Coach</span>
      </header>
      <main className="mx-auto w-full max-w-md px-6 pb-12 pt-8 sm:pt-20">
        <div className="mb-8 space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="text-base leading-relaxed text-muted-foreground">{description}</p>
        </div>
        {children}
      </main>
    </div>
  );
}

export function FormError({message}: {message: string | undefined}) {
  return message ? (
    <p
      role="alert"
      className="rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"
    >
      {message}
    </p>
  ) : null;
}
