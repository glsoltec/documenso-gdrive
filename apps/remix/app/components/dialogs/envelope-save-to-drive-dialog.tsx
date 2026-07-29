import { env } from '@documenso/lib/utils/env';
import { Trans } from '@lingui/react/macro';
import { HardDriveIcon } from 'lucide-react';
import { useCallback, useState } from 'react';

export type EnvelopeSaveToDriveDialogProps = {
  envelopeId: string;
  envelopeTitle: string;
  envelopeItems: { id: string; envelopeId: string }[];
};

async function uploadToDrive(pdfBlob: Blob, fileName: string) {
  const clientId = env('NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID') || '';
  if (!clientId) return;

  const scope = 'https://www.googleapis.com/auth/drive.file';

  return new Promise<void>((resolve, reject) => {
    const tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope,
      callback: async (response: { access_token?: string }) => {
        if (!response.access_token) {
          reject(new Error('No access token'));
          return;
        }

        const metadata = {
          name: fileName.replace(/\.[^/.]+$/, '') + '_assinado.pdf',
          mimeType: 'application/pdf',
        };

        const formData = new FormData();
        formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        formData.append('file', pdfBlob);

        try {
          const uploadRes = await fetch(
            `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`,
            {
              method: 'POST',
              headers: { Authorization: `Bearer ${response.access_token}` },
              body: formData,
            },
          );

          if (uploadRes.ok) {
            const file = await uploadRes.json();
            window.open(`https://drive.google.com/file/d/${file.id}/view`, '_blank');
            resolve();
          } else {
            reject(new Error('Upload failed'));
          }
        } catch (err) {
          reject(err);
        }
      },
    });

    tokenClient.requestAccessToken();
  });
}

export const EnvelopeSaveToDriveDialog = ({ envelopeId, envelopeTitle, envelopeItems }: EnvelopeSaveToDriveDialogProps) => {
  const [loading, setLoading] = useState(false);

  const handleSave = useCallback(async () => {
    setLoading(true);
    try {
      const item = envelopeItems[0];
      const url = `/api/v2/envelope/item/${item.id}/download?version=signed`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      await uploadToDrive(blob, envelopeTitle);
    } catch (err) {
      console.error('Save to Drive failed:', err);
    } finally {
      setLoading(false);
    }
  }, [envelopeId, envelopeTitle, envelopeItems]);

  const isConfigured = Boolean(env('NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID'));

  if (!isConfigured) return null;

  return (
    <div onSelect={(e) => e.preventDefault()}>
      <button
        className="relative flex w-full cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
        onClick={handleSave}
        disabled={loading}
      >
        {loading ? (
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <HardDriveIcon className="mr-2 h-4 w-4" />
        )}
        <Trans>Save to Google Drive</Trans>
      </button>
    </div>
  );
};
