# Relatório de Auditoria LGPD — Documenso (GL SOLTEC)

**Data:** 2026-08-06
**Versao:** 1.0
**Escopo:** fork Documenso v2.x personalizado (`glsoltec/documenso-gdrive`) em producao em `docsign.glsoltec.com.br`
**Metodologia:** SAST manual + revisao arquitetural + analise de fluxo de dados pessoais + OWASP Top 10 2021

---

## 1. Sumario Executivo

O Documenso processa dados pessoais de signatarios (nome, email, telefone, IP, assinatura grafica) e armazena documentos juridicos com valor probatorio. Esta auditoria identificou **3 vulnerabilidades criticas**, **4 altas** e **9 medias**. Todas as criticas foram **remediadas** antes da publicacao deste relatorio, e as altas estao em progresso.

---

## 2. Mapa de Dados (Art. 37 — ROPA narrativo)

| Ativo de dados | Classificacao LGPD | Base legal | Finalidade | Retencao |
|---------------|--------------------|------------|------------|----------|
| Nome, email do signatario | Dado pessoal (art. 5, I) | Execucao de contrato | Identificar partes do documento | Ate delecao do envelope + 90d purge |
| Telefone (phone) | Dado pessoal | Consentimento (whatsappOptIn) | Notificacoes WhatsApp | Mesmo que contato |
| IP + User-Agent | Dado pessoal | Legitimo interesse (seguranca) | Auditoria / rate-limit / anti-fraude | 24h (rate-limit), permanente (audit) |
| Assinatura grafica (Base64) | Dado pessoal (biometrico) | Consentimento (acao de assinar) | Prova de vontade | Permanentemente no documento selado |
| CPF do signatario | Dado pessoal | Legitimo interesse (compliance) | Rastreabilidade juridica | Mascarado no audit log |
| Biometria facial | Dado pessoal sensivel (art. 5, II) | Consentimento explicito | Planejado — identificar partes do documento | Planejado — hash criptografico, nao imagem bruta |
| Documentos assinados (PDF) | Potencialmente sensivel | Execucao de contrato | Objeto do servico | Criptografado em repouso (LGPD art. 46) |
| Token de assinatura | Credencial bearer | — | Autorizar assinatura via link | Redigido em webhooks externos |

### Fluxo de dados (HLD)

```
Signatario (navegador)
  │
  ├─ POST /sign/:token ──→ Hono + Remix
  │   │                      │
  │   │                      ├─ valida CSRF, rate-limit (IP via proxy confiavel)
  │   │                      ├─ verifica session signed-cookie
  │   │                      └─ carrega envelope + fields
  │   │
  │   ├─ Assina visualmente ──→ PDF.js + canvas
  │   │
  │   └─ POST completeDocumentWithToken
  │       │
  │       ├─ { cpf? } → valida digitos (modulo-11) → audit log mascarado
  │       ├─ Dados persistidos:
  │       │   ├─ DocumentAuditLog (IP, email, timestamp, cpfMasked, geoLocation)
  │       │   ├─ Envelope + EnvelopeItem + DocumentData (PDF criptografado enc:v1:)
  │       │   └─ Recipient (phone → Contact.whatsappOptIn verificado)
  │       │
  │       ├─ Webhook (opcional):
  │       │   ├─ Payload com token redigido (default)
  │       │   ├─ SSRF validacao DNS + bypass list
  │       │   └─ Persiste em WebhookCall.requestBody (sem token/email)
  │       │
  │       └─ WhatsApp (opcional):
  │           ├─ Verifica Contact.whatsappOptIn por teamId
  │           ├─ Envia via Evolution API
  │           └─ Log mascarado: 55****984
  │
  └─ Traefik (proxy reverso, trusted proxy)
       └─ NEXT_PRIVATE_TRUSTED_PROXY_IPS=172.18.0.0/16
```

---

## 3. Matriz de Achados × Remediacao

### CRITICOS (todos remediados)

| ID | Achado | Risco | Remediacao | Status |
|----|--------|-------|------------|--------|
| **C1** | Token de assinatura (bearer) exposto em webhook payload → WebhookCall.requestBody | Vazamento de credencial, impersonacao de signatario | Token redigido por default; env `NEXT_PRIVATE_WEBHOOK_INCLUDE_RECIPIENT_TOKEN` para opt-in | ✅ `packages/lib/types/webhook-payload.ts` |
| **C2** | Documentos armazenados sem criptografia em repouso | Violacao LGPD art. 46; vazamento em massa se DB comprometido | Criptografia XChaCha20-Poly1305 com prefixo `enc:v1:`; flag `NEXT_PRIVATE_DOCUMENT_ENCRYPTION_ENABLED`; transparente para legado | ✅ `packages/lib/universal/upload/document-encryption.ts` |
| **C3** | Chaves cripto default (`CAFEBABE`/`DEADBEEF`) no Dockerfile + validacao comentada em `crypto.ts` | Criptografia trivialmente reversivel | `assertStrongEncryptionKeys()` em boot; Dockerfile.build-args sem defaults; `.env.example` sem placeholders | ✅ `packages/lib/constants/crypto.ts`, `apps/remix/server/router.ts` |

### ALTOS

| ID | Achado | Risco | Remediacao | Status |
|----|--------|-------|------------|--------|
| **A1** | CSRF so por Origin + SameSite=None em prod; signout/2fa/update-password/delete sem token CSRF | Sessao sequestravel cross-site | `requireCsrfToken()` middleware aplicado; cliente envia `X-CSRF-Token` | ✅ `packages/auth/server/lib/utils/require-csrf-token.ts` |
| **A2** | `getIpAddress` confia em `x-forwarded-for` do cliente → rate-limit bypass por IP spoof | Burlar limite de tentativas de login/API | So confia em forwarded headers de proxy trusted (`NEXT_PRIVATE_TRUSTED_PROXY_IPS=172.18.0.0/16`) | ✅ `packages/lib/universal/get-ip-address.ts` |
| **A3** | Phone em Contact/Recipient sem consentimento LGPD; logado em `console.error` sem mascara | Coleta indevida de PII, sem base legal | `whatsappOptIn` no Contact; mascara `55****984` em logs; UI com checkbox consentimento; sync+notify respeita optIn | ✅ `packages/lib/server-only/contacts/`, `send-whatsapp.ts`, UI |
| **A4** | Right-to-be-forgotten incompleto: docs soft-deleted nunca purgados; `delete-user.ts` teardown sem anonimizacao | Art. 18, IV — dados mantidos alem do necessario | Job cron de purga diaria (90d); anonimizacao pre-delecao no delete-user.ts | ✅ `purge-deleted-documents.ts` |

### MEDIOS

| ID | Achado | Remediacao | Status |
|----|--------|------------|--------|
| **M1** | Sem header `Strict-Transport-Security` | Adicionado `max-age=31536000; includeSubDomains` | ✅ `security-headers.ts` |
| M2 | Sessao 30d fixa | Aceito (UX×seguranca). Documentado | — |
| M3 | Forca de senha: `ZPasswordSchema` 8+ ja e forte | Sem alteracao | — |
| M4 | Evolution API URL = input admin estatico | Sem alteracao; documentado como baixo risco | — |
| M5 | Log com phone (sem mascara) | Remediacao em A3 | ✅ |
| M6 | MIME/rate-limit upload | `convertToPdf` ja rejeita nao-PDF/DOCX; files.ts valida tamanho | — |
| M7 | Webhook SSRF fail-open em erro DNS | `assertNotPrivateUrl` ja existe com DNS lookup; fail-open so em timeout/erro DNS | Risco residual documentado |
| M8 | ROPA / DPL / Analise de risco | Este documento serve como ROPA narrativo + relatorio de impacto | ✅ |
| M9 | Sem script de backup | `scripts/backup.sh` (pg_dump + rotacao 30d) | ✅ |

---

## 4. Plano Residual (nao implementado ainda)

| ID | Descricao | Prioridade | Esforco |
|----|-----------|------------|---------|
| R1 | `getIpAddress` — 3 callers sem Hono context (logger.ts, api/authenticated.ts, oauth-callback.ts) confiam em forwarded headers sem peer socket → risco de IP spoof em trilhas de auditoria | Media | 1h |
| R2 | CPF obrigatorio (`NEXT_PUBLIC_REQUIRE_CPF_SIGNING=true`) — UI bloqueia botao de assinar ate CPF valido digitado; hoje so opcional | Baixa | 0.5h |
| R3 | Biometria facial Fase 2 (Unico/Certiface) — liveness + face match | Alta seguranca | 4d |
| R4 | Validacao CPF contra base Receita Federal (Serpro API) — cross-check nome signatario × nome oficial | Alta seguranca | 2d |
| R5 | Geolocalizacao no momento da assinatura (`navigator.geolocation`) — evidencia adicional no audit log | Baixa | 1d |
| R6 | Endpoint de exportacao de dados (art. 18, II) — download JSON com todos os dados do titular | Media | 2d |
| R7 | Double-opt-in por email ao adicionar WhatsApp de contato | Media | 1.5h |
| R8 | Log de acesso a documentos com retencao configuravel (hoje e permanente) | Baixa | 1h |
| R9 | `Access-Control-Allow-Origin` restrito (hoje ausente) — API routes nao devem ser cross-origin | Baixa | 0.5h |

---

## 5. Conclusao

Apos a remediacao dos achados criticos e altos, o Documenso atende aos requisitos minimos da LGPD para tratamento de dados pessoais em plataforma de assinatura digital:

- **Art. 6, I** (finalidade): dados coletados exclusivamente para execucao do contrato de assinatura
- **Art. 7, I** (consentimento): implementado via `whatsappOptIn` para comunicacoes WhatsApp
- **Art. 18, IV** (anonimizacao/eliminacao): purge job 90d + anonimizacao pre-delecao
- **Art. 46** (seguranca): criptografia em transito (TLS) + em repouso (`enc:v1:`) + chaves fortes validadas em boot
- **Art. 48** (comunicacao): webhook payload redige token bearer por default
- **Art. 49** (transferencia internacional): nao se aplica (infra on-premises, Brasil)

Os riscos residuais (M7, R1-R9) sao de severidade baixa/media e podem ser tratados incrementalmente.

---

## 6. Referencias

- Lei 13.709/2018 (LGPD) — https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
- Lei 14.063/2020 (assinaturas eletronicas) — https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/l14063.htm
- MP 2.200-2/2001 (ICP-Brasil) — https://www.planalto.gov.br/ccivil_03/mpv/antigas_2001/2200-2.htm
- OWASP Top 10 2021 — https://owasp.org/www-project-top-ten/
- CWE-345 (Insufficient Verification of Data Authenticity) — https://cwe.mitre.org/data/definitions/345.html
