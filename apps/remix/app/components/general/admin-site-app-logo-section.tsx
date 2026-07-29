import { SITE_SETTINGS_APP_LOGO_ID, type TSiteSettingsAppLogoSchema } from '@documenso/lib/server-only/site-settings/schemas/app-logo';
import { trpc as trpcReact } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@documenso/ui/primitives/card';
import { Input } from '@documenso/ui/primitives/input';
import { useToast } from '@documenso/ui/primitives/use-toast';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { Loader, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useRevalidator } from 'react-router';

export type AdminSiteAppLogoSectionProps = {
  appLogo: TSiteSettingsAppLogoSchema | undefined;
};

export const AdminSiteAppLogoSection = ({ appLogo }: AdminSiteAppLogoSectionProps) => {
  const { toast } = useToast();
  const { _ } = useLingui();
  const { revalidate } = useRevalidator();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const { mutateAsync: updateSiteSetting } = trpcReact.admin.updateSiteSetting.useMutation();

  const hasLogo = appLogo?.enabled && appLogo?.data?.contentType && appLogo?.data?.content;

  const logoUrl = `/api/branding/logo/app?v=${Date.now()}`;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast({
        title: _(msg`Invalid file type`),
        description: _(msg`Only PNG, JPG, and WebP images are accepted.`),
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: _(msg`File too large`),
        description: _(msg`Maximum file size is 5MB.`),
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = () => {
    if (!selectedFile) return;

    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];

        await updateSiteSetting({
          id: SITE_SETTINGS_APP_LOGO_ID,
          enabled: true,
          data: {
            contentType: selectedFile.type,
            content: base64,
          },
        });

        toast({
          title: _(msg`Logo Updated`),
          description: _(msg`The app logo has been updated successfully.`),
          duration: 5000,
        });

        setSelectedFile(null);
        await revalidate();
      } catch {
        toast({
          title: _(msg`An unknown error occurred`),
          variant: 'destructive',
          description: _(msg`Failed to update the app logo. Please try again.`),
        });
      } finally {
        setIsUploading(false);
      }
    };

    reader.onerror = () => {
      setIsUploading(false);
      toast({
        title: _(msg`Error reading file`),
        variant: 'destructive',
        description: _(msg`Failed to read the selected file.`),
      });
    };

    reader.readAsDataURL(selectedFile);
  };

  const handleRemove = async () => {
    setIsUploading(true);
    try {
      await updateSiteSetting({
        id: SITE_SETTINGS_APP_LOGO_ID,
        enabled: false,
        data: {
          contentType: '',
          content: '',
        },
      });

      toast({
        title: _(msg`Logo Removed`),
        description: _(msg`The app logo has been removed.`),
        duration: 5000,
      });

      setSelectedFile(null);
      setPreviewUrl('');
      await revalidate();
    } catch {
      toast({
        title: _(msg`An unknown error occurred`),
        variant: 'destructive',
        description: _(msg`Failed to remove the app logo. Please try again.`),
      });
    } finally {
      setIsUploading(false);
    }
  };

  const displayUrl = previewUrl || logoUrl;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Trans>App Logo</Trans>
        </CardTitle>
        <CardDescription>
          <Trans>Upload a custom logo to replace the Documenso logo in the app header.</Trans>
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="relative flex h-24 w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-background">
            {hasLogo || previewUrl ? (
              <img src={displayUrl} alt="App Logo" className="h-full w-auto max-w-full object-contain p-2" />
            ) : (
              <span className="text-muted-foreground text-sm">
                <Trans>No custom logo configured</Trans>
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              className="h-auto p-2 file:text-primary hover:file:bg-primary/90 file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:p-2 file:py-2 file:font-medium file:bg-primary file:text-primary-foreground"
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleSave}
              loading={isUploading}
              disabled={!selectedFile}
            >
              {isUploading ? (
                <Loader className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              <Trans>Save Logo</Trans>
            </Button>

            {hasLogo && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleRemove}
                loading={isUploading}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <Trans>Remove</Trans>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
