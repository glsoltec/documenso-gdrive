import { SettingsHeader } from "~/components/general/settings-header";
import { appMetaTags } from "~/utils/meta";
import { getSession } from "@documenso/auth/server/lib/utils/get-session";
import { getTeamByUrl } from "@documenso/lib/server-only/team/get-team";
import { canExecuteTeamAction } from "@documenso/lib/utils/teams";
import { redirect } from "react-router";
import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@documenso/ui/primitives/card";
import { Button } from "@documenso/ui/primitives/button";
import type { Route } from "./+types/settings.integrations";

export function meta() {
  return appMetaTags(msg\`Integrations\`);
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const session = await getSession(request);
  const team = await getTeamByUrl({ userId: session.user.id, teamUrl: params.teamUrl });
  if (!team || !canExecuteTeamAction("MANAGE_TEAM", team.currentTeamRole)) {
    throw redirect(\`/t/\\${params.teamUrl}\`);
  }
  const googleDriveClientId = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID || "";
  const evolutionApiUrl = process.env.EVOLUTION_API_URL || "";
  const evolutionInstance = process.env.EVOLUTION_INSTANCE_NAME || "";
  return { googleDriveConfigured: googleDriveClientId.length > 0, evolutionConfigured: evolutionApiUrl.length > 0 && evolutionInstance.length > 0 };
}

export default function IntegrationsPage({ loaderData }: Route.ComponentProps) {
  const { _ } = useLingui();
  const { googleDriveConfigured, evolutionConfigured } = loaderData;
  return (
    <div>
      <SettingsHeader title={_(msg\`Integrations\`)} subtitle={_(msg\`Manage your third-party integrations.\`)} />
      <div className="mt-8 grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle><Trans>Google Drive</Trans></CardTitle>
            <CardDescription><Trans>Automatically save signed documents to Google Drive.</Trans></CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={\`inline-block h-3 w-3 rounded-full \\${googleDriveConfigured ? "bg-green-500" : "bg-red-500"}\`} />
              <span className="text-sm">{googleDriveConfigured ? _(msg\`Configured\`) : _(msg\`Not configured\`)}</span>
            </div>
            <Button variant="outline" disabled><Trans>Settings</Trans></Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle><Trans>WhatsApp (Evolution API)</Trans></CardTitle>
            <CardDescription><Trans>Send WhatsApp notifications for document events.</Trans></CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={\`inline-block h-3 w-3 rounded-full \\${evolutionConfigured ? "bg-green-500" : "bg-red-500"}\`} />
              <span className="text-sm">{evolutionConfigured ? _(msg\`Connected\`) : _(msg\`Not configured\`)}</span>
            </div>
            <Button variant="outline" disabled><Trans>Settings</Trans></Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
