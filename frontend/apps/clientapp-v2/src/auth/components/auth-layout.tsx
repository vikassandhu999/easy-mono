interface AuthLayoutProps {
  children: React.ReactNode;
  description: string;
  title: string;
}

export default function AuthLayout({children, description, title}: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-8">
      <div className="w-full max-w-sm">
        <img
          alt="CoachEasy"
          className="mx-auto mb-8 h-[26px] w-auto"
          src="/TextLogo.webp"
        />
        <div className="mb-6 text-center">
          <h1 className="text-[28px] font-extrabold tracking-[-0.025em]">{title}</h1>
          <p className="mx-auto mt-2 max-w-72 text-sm leading-6 text-muted">{description}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
