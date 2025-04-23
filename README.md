# 🤖 Bot Telegram - Texas Gambler (AdonisJS)

Este projeto é um bot do Telegram desenvolvido com [Telegraf](https://telegraf.js.org/) e rodando dentro de um comando personalizado no framework [AdonisJS](https://adonisjs.com/).  
Ele recebe mensagens relacionadas a apostas, extrai os dados (unidades e odd), e calcula os resultados com base em edições de mensagens que contenham os emojis ✅ ou 🔴.

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

3. Configure o token do bot no arquivo `.env`:
```env
BOT_TOKEN=seu_token_do_telegram_aqui
```

---

## ▶️ Como executar o bot

Para iniciar o bot:

```bash
node ace bot:start
```

Ele ficará escutando mensagens e edições no grupo/canal configurado.

---

## 🧠 Como funciona

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
- [Telegraf](https://telegraf.js.org/)
- Node.js