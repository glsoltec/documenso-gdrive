import { env } from '@documenso/lib/utils/env';
import { cn } from '@documenso/ui/lib/utils';
import { Trans } from '@lingui/react/macro';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '../primitives/button';

export type GoogleDrivePickerProps = {
  className?: string;
  disabled?: boolean;
  onFileSelect?: (file: File) => void;
};

let pickerApiLoaded = false;
const pendingCallbacks: (() => void)[] = [];

function loadPickerApi(callback: () => void) {
  if (pickerApiLoaded) {
    callback();
    return;
  }

  pendingCallbacks.push(callback);
  if (pendingCallbacks.length > 1) return;

  const script = document.createElement('script');
  script.src = 'https://apis.google.com/js/api.js';
  script.async = true;
  script.onload = () => {
    window.gapi.load('picker', () => {
      pickerApiLoaded = true;
      pendingCallbacks.splice(0).forEach((cb) => cb());
    });
  };
  document.body.appendChild(script);
}

async function downloadDriveFile(accessToken: string, fileId: string, fileName: string): Promise<File> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Drive download failed: ${res.statusText}`);
  return new File([await res.blob()], fileName, { type: 'application/pdf' });
}

export const GoogleDrivePicker = ({ className, disabled, onFileSelect }: GoogleDrivePickerProps) => {
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const clientId = env('NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID') || '';
  const apiKey = env('NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY') || '';

  useEffect(() => {
    if (clientId && apiKey) {
      loadPickerApi(() => setReady(true));
    }
  }, [clientId, apiKey]);

  const openPicker = useCallback(() => {
    if (!clientId || !apiKey) return;
    setLoading(true);

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: (response: { access_token: string }) => {
        if (!response.access_token) {
          setLoading(false);
          return;
        }

        new window.google.picker.PickerBuilder()
          .addView(window.google.picker.ViewId.DOCS)
          .setOAuthToken(response.access_token)
          .setDeveloperKey(apiKey)
          .setCallback(async (data: { action: string; docs?: { id: string; name: string; mimeType: string }[] }) => {
            if (data.action === 'picked' && data.docs?.[0]) {
              const doc = data.docs[0];
              try {
                const file = await downloadDriveFile(response.access_token, doc.id, doc.name);
                onFileSelect?.(file);
              } catch (err) {
                console.error('Drive download error:', err);
              }
            }
            setLoading(false);
          })
          .build()
          .setVisible(true);
      },
    });

    tokenClient.requestAccessToken();
  }, [clientId, apiKey, onFileSelect]);

  if (!clientId || !apiKey) return null;

  return (
    <Button
      type="button"
      variant="outline"
      className={cn('gap-2', className)}
      disabled={disabled || loading || !ready}
      onClick={openPicker}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 4h7l7 7v9H4V4z" fill="#4285F4" />
          <path d="M11 4v7h7" fill="#34A853" />
          <path d="M4 4l7 7 4-4" fill="#FBBC05" />
        </svg>
      )}
      <Trans>Google Drive</Trans>
    </Button>
  );
};
