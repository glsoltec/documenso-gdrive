import { env } from '@documenso/lib/utils/env';
import { Button } from '@documenso/ui/primitives/button';
import { HardDriveIcon } from 'lucide-react';
import { useCallback, useRef } from 'react';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
      picker: {
        PickerBuilder: new () => {
          addView: (view: unknown) => PickerBuilderLike;
          setOAuthToken: (token: string) => PickerBuilderLike;
          setDeveloperKey: (key: string) => PickerBuilderLike;
          setCallback: (callback: (data: PickerCallbackData) => void) => PickerBuilderLike;
          build: () => { setVisible: (visible: boolean) => void };
        };
        ViewId: {
          DOCS: string;
          DOCS_IMAGES: string;
          DOCS_VIDEOS: string;
        };
      };
    };
    gapi?: {
      load: (api: string, callback: () => void) => void;
    };
  }
}

type PickerBuilderLike = {
  addView: (view: unknown) => PickerBuilderLike;
  setOAuthToken: (token: string) => PickerBuilderLike;
  setDeveloperKey: (key: string) => PickerBuilderLike;
  setCallback: (callback: (data: PickerCallbackData) => void) => PickerBuilderLike;
  build: () => { setVisible: (visible: boolean) => void };
};

type PickerCallbackData = {
  action: string;
  documents?: { id: string; name: string; mimeType: string }[];
};

export type GoogleDrivePickerProps = {
  onFileSelect: (file: File) => void;
};

const SCOPES = 'https://www.googleapis.com/auth/drive.file';

export const GoogleDrivePicker = ({ onFileSelect }: GoogleDrivePickerProps) => {
  const pickerLoaded = useRef(false);

  const handlePick = useCallback(async () => {
    const clientId = env('NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID') || '';
    const apiKey = env('NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY') || '';

    if (!clientId || !apiKey) return;

    const google = window.google;
    if (!google?.accounts?.oauth2) return;

    const tokenResponse = await new Promise<string>((resolve, reject) => {
      google.accounts.oauth2
        .initTokenClient({
          client_id: clientId,
          scope: SCOPES,
          callback: (response) => {
            if (response.access_token) resolve(response.access_token);
            else reject(new Error('Failed to get access token'));
          },
        })
        .requestAccessToken();
    });

    if (!pickerLoaded.current) {
      await new Promise<void>((resolve) => window.gapi?.load('picker', () => resolve()));
      pickerLoaded.current = true;
    }

    if (!google.picker) return;

    const picker = new google.picker.PickerBuilder()
      .addView(google.picker.ViewId.DOCS)
      .setOAuthToken(tokenResponse)
      .setDeveloperKey(apiKey)
      .setCallback((data: PickerCallbackData) => {
        if (data.action === 'picked' && data.documents && data.documents.length > 0) {
          const doc = data.documents[0];
          fetch(`https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`, {
            headers: { Authorization: `Bearer ${tokenResponse}` },
          })
            .then((res) => res.blob())
            .then((blob) => {
              onFileSelect(new File([blob], doc.name, { type: blob.type }));
            })
            .catch(() => {});
        }
      })
      .build();

    picker.setVisible(true);
  }, [onFileSelect]);

  return (
    <Button type="button" onClick={handlePick} variant="outline">
      <HardDriveIcon className="mr-2 h-4 w-4" />
      Google Drive
    </Button>
  );
};
