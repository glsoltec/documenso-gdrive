import { SettingsHeader } from '~/components/general/settings-header';
import { appMetaTags } from '~/utils/meta';
import { redirect } from 'react-router';
import { msg } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useLingui } from '@lingui/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@documenso/ui/primitives/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@documenso/ui/primitives/table';
import { Button } from '@documenso/ui/primitives/button';
import { Input } from '@documenso/ui/primitives/input';
import { Checkbox } from '@documenso/ui/primitives/checkbox';
import { useState, useCallback } from 'react';
import { trpc } from '@documenso/trpc/react';
import { useToast } from '@documenso/ui/primitives/use-toast';
import { getSession } from '@documenso/auth/server/lib/utils/get-session';
import { getTeamByUrl } from '@documenso/lib/server-only/team/get-team';
import { canExecuteTeamAction } from '@documenso/lib/utils/teams';
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

  return {};
}

type EditingState = Record<number, boolean>;

function ContactForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: { name: string; email: string; phone: string; whatsappOptIn: boolean };
  onSave: (data: { name: string; email: string; phone: string; whatsappOptIn: boolean }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone);
  const [whatsappOptIn, setWhatsappOptIn] = useState(initial.whatsappOptIn);

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="h-8" />
      </div>
      <div className="flex-1">
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="h-8" />
      </div>
      <div className="w-[140px]">
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="h-8" maxLength={20} />
      </div>
      <label className="flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground">
        <Checkbox checked={whatsappOptIn} onCheckedChange={(v) => setWhatsappOptIn(Boolean(v))} />
        <Trans>Opt-in WhatsApp</Trans>
      </label>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave({ name, email, phone, whatsappOptIn })}>
          <Trans>Save</Trans>
        </Button>
        <Button size="sm" variant="secondary" onClick={onCancel}>
          <Trans>Cancel</Trans>
        </Button>
      </div>
    </div>
  );
}

export default function ContactsPage(_props: Route.ComponentProps) {
  const { _ } = useLingui();
  const { toast } = useToast();
  const [editing, setEditing] = useState<EditingState>({});
  const [showAdd, setShowAdd] = useState(false);

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.contact.find.useQuery();
  const { mutateAsync: createContact } = trpc.contact.create.useMutation();
  const { mutateAsync: updateContact } = trpc.contact.update.useMutation();
  const { mutateAsync: deleteContact } = trpc.contact.delete.useMutation();
  const { mutateAsync: sendMessage, isPending: isSendingMessage } = trpc.contact.sendMessage.useMutation();

  const contacts = data?.contacts ?? [];

  const handleEdit = useCallback((id: number) => {
    setEditing((prev) => ({ ...prev, [id]: true }));
  }, []);

  const handleCancel = useCallback((id: number) => {
    setEditing((prev) => ({ ...prev, [id]: false }));
  }, []);

  const refresh = useCallback(() => {
    utils.contact.find.invalidate();
  }, [utils]);

  const handleSave = useCallback(
    async (id: number, data: { name: string; email: string; phone: string; whatsappOptIn: boolean }) => {
      try {
        await updateContact({
          id,
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          whatsappOptIn: data.whatsappOptIn,
          whatsappOptInSource: data.whatsappOptIn ? 'manual' : null,
        });

        setEditing((prev) => ({ ...prev, [id]: false }));
        toast({ title: _(msg`Contact updated`), variant: 'default' });
      } catch {
        toast({ title: _(msg`Failed to update contact`), variant: 'destructive' });
      }
    },
    [updateContact, _],
  );

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await deleteContact({ id });
        refresh();
        toast({ title: _(msg`Contact deleted`), variant: 'default' });
      } catch {
        toast({ title: _(msg`Failed to delete contact`), variant: 'destructive' });
      }
    },
    [deleteContact, refresh, _],
  );

  const handleSendMessage = useCallback(
    async (id: number) => {
      try {
        await sendMessage({ id });
        toast({ title: _(msg`Message sent`), variant: 'default' });
      } catch {
        toast({ title: _(msg`Failed to send message`), variant: 'destructive' });
      }
    },
    [sendMessage, _],
  );

  const handleAdd = useCallback(
    async (data: { name: string; email: string; phone: string; whatsappOptIn: boolean }) => {
      try {
        await createContact({
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          whatsappOptIn: data.whatsappOptIn,
          whatsappOptInSource: data.whatsappOptIn ? 'manual' : null,
        });

        setShowAdd(false);
        refresh();
        toast({ title: _(msg`Contact created`), variant: 'default' });
      } catch {
        toast({ title: _(msg`Failed to create contact`), variant: 'destructive' });
      }
    },
    [createContact, refresh, _],
  );

  return (
    <div>
      <SettingsHeader
        title={_(msg`Contacts`)}
        subtitle={_(msg`Manage your contacts and their phone numbers for WhatsApp notifications.`)}
      >
        <Button onClick={() => setShowAdd(true)} disabled={showAdd}>
          <Trans>Add Contact</Trans>
        </Button>
      </SettingsHeader>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>
            <Trans>Phone Numbers</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>
              {contacts.length} contact{contacts.length !== 1 ? 's' : ''} found.
            </Trans>
          </CardDescription>
        </CardHeader>

        <CardContent>
          {showAdd && (
            <div className="mb-4 rounded-lg border p-3">
              <p className="mb-2 text-sm font-medium"><Trans>New Contact</Trans></p>
              <ContactForm
                initial={{ name: '', email: '', phone: '', whatsappOptIn: false }}
                onSave={handleAdd}
                onCancel={() => setShowAdd(false)}
              />
            </div>
          )}

          {isLoading ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              <Trans>Loading...</Trans>
            </p>
          ) : contacts.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              <Trans>
                No contacts yet. Click "Add Contact" to create one.
              </Trans>
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><Trans>Name</Trans></TableHead>
                  <TableHead><Trans>Email</Trans></TableHead>
                  <TableHead><Trans>Phone</Trans></TableHead>
                  <TableHead><Trans>WhatsApp</Trans></TableHead>
                  <TableHead><Trans>Actions</Trans></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((c) =>
                  editing[c.id] ? (
                    <TableRow key={c.id}>
                      <TableCell colSpan={5}>
                        <ContactForm
                          initial={{ name: c.name, email: c.email, phone: c.phone ?? '', whatsappOptIn: !!c.whatsappOptIn }}
                          onSave={(data) => handleSave(c.id, data)}
                          onCancel={() => handleCancel(c.id)}
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.email}</TableCell>
                      <TableCell>{c.phone ?? <span className="text-muted-foreground italic">—</span>}</TableCell>
                      <TableCell>
                        {c.whatsappOptIn ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                            <span className="block h-1.5 w-1.5 rounded-full bg-green-600" />
                            <Trans>Consented</Trans>
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!c.phone || isSendingMessage || !c.whatsappOptIn}
                            onClick={() => handleSendMessage(c.id)}
                          >
                            <Trans>WhatsApp</Trans>
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleEdit(c.id)}>
                            <Trans>Edit</Trans>
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(c.id)}>
                            <Trans>Delete</Trans>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
