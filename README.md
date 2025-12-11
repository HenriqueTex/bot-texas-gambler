# 🤖 Bot Telegram - Texas Gambler (AdonisJS)

Este projeto replica mensagens entre grupos/canais do Telegram utilizando [GramJS (MTProto)](https://github.com/gram-js/gramjs) e roda dentro de um comando personalizado no framework [AdonisJS](https://adonisjs.com/).  
Ele recebe mensagens relacionadas a apostas, extrai os dados (unidades e odd) e calcula os resultados com base em edições de mensagens que contenham os emojis ✅ ou 🔴.

---

## 📦 Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/seu-repo.git
cd seu-repo
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as credenciais do Telegram e os IDs dos chats no arquivo `.env`:
```env
TELEGRAM_API_ID=seu_api_id_do_my.telegram.org
TELEGRAM_API_HASH=seu_api_hash_do_my.telegram.org
TELEGRAM_SESSION=string_de_sessao_gerada_pelo_comando
SOURCE_CHAT_ID=id_ou_username_do_grupo_de_origem
TARGET_CHAT_ID=id_ou_username_do_grupo_de_destino
```
> - Gere `TELEGRAM_API_ID` e `TELEGRAM_API_HASH` em [my.telegram.org](https://my.telegram.org/apps) com a sua conta.  
> - Execute `node ace telegram:session` para autenticar com o seu número e preencher `TELEGRAM_SESSION`.  
> - Use o `@username` do grupo/canal ou o ID numérico (ex: `-100123456`). Para descobrir, abra o chat no Telegram Desktop/Web, copie o link `https://t.me/c/<ID>` ou use bots de utilidade em chats onde você tenha permissão.  
> - Sua conta pessoal precisa estar presente nos dois grupos/canais e possuir permissão de leitura no originador e envio no destino.

### ✏️ Integração com Google Sheets

Adicione ao `.env`:

```env
GOOGLE_SHEETS_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"
GOOGLE_SHEETS_SPREADSHEET_ID=1abcDEF123
```

- Compartilhe a planilha com o e-mail do serviço (`GOOGLE_SHEETS_CLIENT_EMAIL`) com permissão de edição.  
- O `PRIVATE_KEY` deve manter as quebras de linha escapadas com `\\n`.
- Dependência usada: [`googleapis`](https://www.npmjs.com/package/googleapis). Instale rodando `npm install` para atualizar o `package-lock`.

Exemplo de uso do service (`app/services/monitoring/google_sheets_service.ts`):

```ts
import GoogleSheetsService from '#services/monitoring/google_sheets_service'

const sheets = new GoogleSheetsService()

await sheets.updateRange('Planilha1!A2:C2', [
  ['Jogo', 'Odd', 'Unidades'],
  ['Time A x Time B', 1.9, 2],
])

await sheets.appendRows('Planilha1!A:Z', [['Time C x Time D', 2.1, 1.5]])
```

### 🔑 Gerando a sessão da sua conta

1. Preencha `TELEGRAM_API_ID` e `TELEGRAM_API_HASH` no `.env`.
2. Execute:
```bash
node ace telegram:session
```
3. Informe o número com DDI, o código recebido pelo Telegram e (se houver) a senha de 2FA.
4. Copie a string exibida no final e cole em `TELEGRAM_SESSION` no seu `.env`.

> A sessão representa a autorização da sua conta pessoal. Caso troque de servidor ou revogue o login no app oficial, gere uma nova sessão.

### 🔎 Descobrindo o ID dos chats sem enviar mensagens

Se você não consegue enviar mensagens ou adicionar bots no grupo, use a própria sessão MTProto para listar os chats aos quais sua conta tem acesso:

```bash
node ace telegram:list-chats
```

O comando irá conectar usando `TELEGRAM_SESSION` e exibir o nome de cada chat e o `Chat ID sugerido`. Copie o ID desejado e cole em `SOURCE_CHAT_ID` ou `TARGET_CHAT_ID`.

---

## ▶️ Como executar o bot

Para iniciar o bot:

```bash
node ace bot:start
```

Ele conecta usando a sessão da sua conta pessoal e fica escutando mensagens/edições do grupo de origem para replicá-las no destino.

> Em ambientes onde você precisa manter um serviço web ativo (por exemplo, provedores gratuitos que exigem uma porta aberta), basta subir o servidor HTTP padrão (`npm start`, `node ace serve --hmr`, etc.). Durante o boot do servidor o replicador é inicializado automaticamente (desde que todas as variáveis estejam configuradas), então você atende ao requisito do provedor e mantém o espelhamento no mesmo processo.

---

## 🧠 Como funciona

- O serviço conecta usando a **sua própria conta do Telegram** (MTProto) e replica novas mensagens/edições do chat definido em `SOURCE_CHAT_ID` direto para o chat `TARGET_CHAT_ID`.
- Somente mensagens do grupo/canal configurado são replicadas, evitando loops. Garanta que a conta esteja presente e com permissão de leitura no grupo de origem e de envio no destino.
- O bot extrai dados da mensagem usando regex:
  - Quantidade de unidades (ex: `🔜 2 unidades`)
  - Odd da aposta (ex: `@1.90`)
- O resultado da aposta é interpretado via edição da mensagem com:
  - ✅ para acerto
  - 🔴 para erro
- Comando `/day` exibe um resumo:

```text
🎮 Resumo do Dia

🔜 Unidades: 2
📊 Resultado: 1.80
🔢 Quantidade de Bets: 3
✅ Acertos: 2
❌ Erros: 1

🔞 Jogue com responsabilidade!
```

---

## 📝 Exemplo de uso

### Mensagem original:
```
🔥 Entrada confirmada!
🔜 2 unidades
📊 ODD: @1.90
```

### Após edição com resultado:
```
🔥 Entrada confirmada!
🔜 2 unidades
📊 ODD: @1.90
✅ GREEN
```

---

## 🔄 Executando com PM2 (opcional)

Para rodar o bot como serviço contínuo:

```bash
npm install -g pm2
pm2 start node --name texas-bot -- ace bot:start
pm2 save
```

---

## 🧪 Tecnologias

- [AdonisJS v6](https://adonisjs.com/)
- [GramJS (Telegram MTProto)](https://github.com/gram-js/gramjs)
- Node.js
