import { useState } from 'react';
import { BrandingLogo } from '~/components/general/branding-logo';

export type AppLogoProps = {
  className?: string;
};

export const AppLogo = ({ className = 'h-6 w-auto' }: AppLogoProps) => {
  const [useCustomLogo, setUseCustomLogo] = useState(true);

  if (!useCustomLogo) {
    return <BrandingLogo className={className} />;
  }

  return (
    <img
      src="/api/branding/logo/app"
      alt="Logo"
      className={className}
      onError={() => setUseCustomLogo(false)}
    />
  );
};
