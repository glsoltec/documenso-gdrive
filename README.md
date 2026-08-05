# Documenso - GLSOLTEC

Fork do [Documenso](https://github.com/documenso/documenso) com customizações GLSOLTEC.

## Customizações Implementadas

### 1. Logo Customizada (App Logo)
- **Upload via Admin**: `/admin/site-settings` — seção para upload de logo
- **API**: `GET /api/branding/logo/app` — serve a logo do banco (base64) com cache ETag
- **Header**: Substitui o logo padrão do Documenso pela logo customizada
- **Login**: Tela de login exibe a logo cadastrada
- **Fallback**: Se nenhuma logo configurada, exibe o BrandingLogo SVG original

### 2. Google Drive Integration
- **Config**: Variáveis de ambiente `NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, etc.
- **Salvar no Drive**: Botão no dropdown de documento finalizado para salvar PDF assinado no Google Drive
- **Upload via Picker**: Google Picker integrado ao upload de documentos

### 3. WhatsApp / Phone Field
- **Campo `phone`**: Adicionado ao modelo `Recipient` no Prisma
- **Editor de envelope**: Campo "Phone" ao adicionar destinatário
- **Embed**: Phone field disponível no embed público
- **Autocomplete**: Ao digitar destinatário, sugestões combinam recipients anteriores, membros do time e contatos — e preenchem automaticamente nome, e-mail e **telefone** ao selecionar
- **Contatos (CRUD)**: Modelo `Contact` (unique `teamId + email`), página `/t/:teamUrl/settings/contacts` com listagem, criar, editar e excluir
- **Envio manual de WhatsApp**: Botão no contato dispara mensagem de teste via Evolution API
- **Sync automático**: Ao enviar um documento, recipients com telefone são sincronizados para a lista de contatos do time (`syncRecipientContact` via upsert)
- **Notificações automáticas Evolution API**: `sendWhatsAppTextToPhone` envia avisos de envio, conclusão, assinatura e rejeição de documentos

### 4. Página de Integrações
- **Rota**: `/t/:teamUrl/settings/integrations`
- Mostra status do Google Drive e Evolution API (configurado/não configurado)

### 5. Site Settings (Admin)
- Seção "App Logo" com upload e preview
- Armazenamento em `SiteSettings` (JSON) no banco de dados

### 6. Logo da Organização no Login
- **Org Signin**: `/o/:orgUrl/signin` exibe o branding logo da organização
- Layout público mostra logo configurada via site settings

### 7. Certificado Digital (ICP-Brasil A1)
- **Carregamento**: Certificado de assinatura via `NEXT_PRIVATE_SIGNING_LOCAL_FILE_CONTENTS` (base64) ou `NEXT_PRIVATE_SIGNING_LOCAL_FILE_PATH`
- **Correção de placeholder**: O libpdf reserva por padrão **12.288 bytes** no `/Contents` da assinatura — insuficiente para certificados ICP-Brasil (chain de 4 certs). Agora `NEXT_PRIVATE_SIGNING_ESTIMATED_SIZE` (ex.: `32768`) é lido e passado a `pdf.sign()`, evitando o erro `PlaceholderError` em certificados com chain grande

## Infraestrutura

- **Domínio**: `docsign.glsoltec.com.br`
- **Deploy**: Docker Compose + Traefik
- **Imagem customizada**: Build via `docker/Dockerfile.custom-full`
- **Banco**: PostgreSQL (pgvector/pgvector:pg17)
- **Servidor**: Contabo VPS (8GB RAM, 4 vCPUs)

## Build

```bash
docker build -f docker/Dockerfile.custom-full -t documenso-custom:latest .
```

O build utiliza `turbo prune --scope=@documenso/remix --docker` para reduzir o contexto e `--concurrency=1` com `--max-old-space-size=3072` para evitar OOM.

## Variáveis de Ambiente

```env
# Google Drive
NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID=
GOOGLE_DRIVE_CLIENT_SECRET=
GOOGLE_DRIVE_REFRESH_TOKEN=
GOOGLE_DRIVE_UPLOAD_FOLDER_ID=

# Evolution API (WhatsApp)
EVOLUTION_API_URL=
EVOLUTION_INSTANCE_NAME=
EVOLUTION_API_KEY=

# Assinatura (certificado local)
NEXT_PRIVATE_SIGNING_TRANSPORT=local
NEXT_PRIVATE_SIGNING_PASSPHRASE=
NEXT_PRIVATE_SIGNING_LOCAL_FILE_PATH=/opt/documenso/cert.p12
# Tamanho do placeholder da assinatura em bytes (certificados ICP-Brasil precisam de mais que o padrão 12288)
NEXT_PRIVATE_SIGNING_ESTIMATED_SIZE=32768
```

## Changelog

Ver histórico de commits em `git log --oneline`.

## Licença

AGPL-3.0 — veja [LICENSE](LICENSE).
