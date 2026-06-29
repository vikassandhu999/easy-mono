interface AuthLayoutProps {
  children: React.ReactNode;
  description: string;
  title: string;
}

export default function AuthLayout({children, description, title}: AuthLayoutProps) {
  return (
    <div className="flex min-h-dvh items-center justify-center overflow-y-auto px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold md:text-2xl">{title}</h1>
          <p className="mt-2 text-sm text-muted">{description}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
