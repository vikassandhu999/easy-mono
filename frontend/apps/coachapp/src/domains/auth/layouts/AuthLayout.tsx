import {Button} from '@heroui/react';
import {IconArrowLeft} from '@tabler/icons-react';
import {PropsWithChildren} from 'react';

import useScreenSize from '@/hooks/useScreenSize';
import TextLogo from '@/shared/TextLogo/TextLogo';

// eslint-disable-next-line prettier/prettier, import/no-absolute-path
import AuthIllustration from "/auth-background.png";

interface AuthLayoutProps extends PropsWithChildren {
  illustrationAlt?: string;
  loading?: boolean;
  onBack?: () => void;
  subtitle?: string;
  title?: string;
}

export default function AuthLayout({
  children,
  illustrationAlt = 'Authentication background illustration',
  loading = false,
  subtitle,
  title,
  onBack,
}: AuthLayoutProps) {
  const {screen, isTab} = useScreenSize();

  const titleSize = screen === 'mobile' ? '2xl' : '2xl';
  const subtitleSize = screen === 'mobile' ? 'base' : 'lg';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 min-h-screen">
      <div
        className="flex items-center justify-center bg-linear-to-br from-blue-50 to-pink-50 min-h-screen p-0 relative"
        style={{minHeight: '100dvh'}}
      >
        <div className="w-full max-w-120 px-4 sm:px-8">
          <div className="flex flex-col gap-2 pb-6 w-full">
            <div className="absolute top-4 left-4 text-left">
              <TextLogo
                aria-label="Coach Easy Logo"
                as="div"
                size="lg"
              />
            </div>

            {onBack && (
              <div className="flex">
                <Button
                  isIconOnly
                  onPress={onBack}
                  size="lg"
                  variant="secondary"
                >
                  <IconArrowLeft size={20} />
                </Button>
              </div>
            )}

            {(title || subtitle) && (
              <div className="flex flex-col gap-2 text-start">
                {title && <h2 className={`font-bold text-${titleSize} text-gray-900 m-0`}>{title}</h2>}
                {subtitle && <p className={`text-${subtitleSize} text-muted m-0`}>{subtitle}</p>}
              </div>
            )}

            {loading && (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
              </div>
            )}

            {!loading && <div className="w-full">{children}</div>}
          </div>
        </div>
      </div>

      {!isTab && (
        <div className="flex items-center justify-center bg-linear-to-br from-primary-50 to-primary-100 min-h-screen overflow-hidden">
          <img
            alt={illustrationAlt}
            className="w-full h-full object-cover"
            loading="lazy"
            src={AuthIllustration}
          />
        </div>
      )}
    </div>
  );
}
