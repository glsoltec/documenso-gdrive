import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@documenso/ui/primitives/card';

export type AdminGoogleDriveSectionProps = {
  clientId: string;
  apiKey: string;
};

export const AdminGoogleDriveSection = ({ clientId, apiKey }: AdminGoogleDriveSectionProps) => {
  const { _ } = useLingui();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Trans>Google Drive Integration</Trans>
        </CardTitle>
        <CardDescription>
          <Trans>Configure Google Drive to import documents and save signed files.</Trans>
        </CardDescription>
      </CardHeader>

      <CardContent>
        <fieldset className="flex w-full flex-col gap-y-4">
          <div>
            <label className="text-foreground text-sm font-semibold">
              <Trans>Client ID</Trans>
            </label>
            <p className="text-muted-foreground mt-1 text-xs">
              {clientId ? (
                <Trans>Configured: {clientId.substring(0, 20)}...</Trans>
              ) : (
                <Trans>Not configured. Set NEXT_PRIVATE_GOOGLE_DRIVE_CLIENT_ID in your .env file.</Trans>
              )}
            </p>
          </div>

          <div>
            <label className="text-foreground text-sm font-semibold">
              <Trans>API Key</Trans>
            </label>
            <p className="text-muted-foreground mt-1 text-xs">
              {apiKey ? (
                <Trans>Configured</Trans>
              ) : (
                <Trans>Not configured. Set NEXT_PRIVATE_GOOGLE_DRIVE_API_KEY in your .env file.</Trans>
              )}
            </p>
          </div>
        </fieldset>
      </CardContent>
    </Card>
  );
};
