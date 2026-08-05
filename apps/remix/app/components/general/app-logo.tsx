import { useOptionalCurrentOrganisation } from '@documenso/lib/client-only/providers/organisation';
import { useState } from 'react';
import { BrandingLogo } from '~/components/general/branding-logo';

export type AppLogoProps = {
  className?: string;
};

export const AppLogo = ({ className = 'h-6 w-auto' }: AppLogoProps) => {
  const organisation = useOptionalCurrentOrganisation();

  const [useOrgLogo, setUseOrgLogo] = useState(true);
  const [useAppLogo, setUseAppLogo] = useState(true);

  if (!useOrgLogo || !useAppLogo) {
    return <BrandingLogo className={className} />;
  }

  if (organisation) {
    return (
      <img
        src={`/api/branding/logo/organisation/${organisation.id}`}
        alt="Logo"
        className={className}
        onError={() => setUseOrgLogo(false)}
      />
    );
  }

  return (
    <img
      src="/api/branding/logo/app"
      alt="Logo"
      className={className}
      onError={() => setUseAppLogo(false)}
    />
  );
};
