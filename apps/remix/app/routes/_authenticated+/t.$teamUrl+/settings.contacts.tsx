import { prisma } from '@documenso/prisma';
import { SettingsHeader } from '~/components/general/settings-header';
import { appMetaTags } from '~/utils/meta';
import { getSession } from '@documenso/auth/server/lib/utils/get-session';
import { getTeamByUrl } from '@documenso/lib/server-only/team/get-team';
import { canExecuteTeamAction } from '@documenso/lib/utils/teams';
import { redirect } from 'react-router';
import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@documenso/ui/primitives/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@documenso/ui/primitives/table';
import type { Route } from './+types/settings.contacts';

export function meta() {
  return appMetaTags(msg`Contacts`);
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const session = await getSession(request);

  const team = await getTeamByUrl({
    userId: session.user.id,
    teamUrl: params.teamUrl,
  });

  if (!team || !canExecuteTeamAction('MANAGE_TEAM', team.currentTeamRole)) {
    throw redirect(`/t/${params.teamUrl}`);
  }

  const recipients = await prisma.recipient.findMany({
    where: {
      envelope: {
        teamId: team.id,
      },
      phone: {
        not: null,
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      envelope: {
        select: {
          title: true,
          status: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });

  return { recipients };
}

export default function ContactsPage({ loaderData }: Route.ComponentProps) {
  const { _ } = useLingui();
  const { recipients } = loaderData;

  return (
    <div>
      <SettingsHeader
        title={_(msg`Contacts`)}
        subtitle={_(msg`Manage your contacts and their phone numbers for WhatsApp notifications.`)}
      />

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>
            <Trans>Phone Numbers</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>
              {recipients.length} contact{recipients.length !== 1 ? 's' : ''} with phone number
              registered.
            </Trans>
          </CardDescription>
        </CardHeader>

        <CardContent>
          {recipients.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              <Trans>
                No contacts with phone numbers yet. Phone numbers are added when you fill the
                "Phone" field for a recipient in the document editor.
              </Trans>
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><Trans>Name</Trans></TableHead>
                  <TableHead><Trans>Email</Trans></TableHead>
                  <TableHead><Trans>Phone</Trans></TableHead>
                  <TableHead><Trans>Document</Trans></TableHead>
                  <TableHead><Trans>Status</Trans></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.email}</TableCell>
                    <TableCell>{r.phone}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{r.envelope.title}</TableCell>
                    <TableCell>{r.envelope.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
