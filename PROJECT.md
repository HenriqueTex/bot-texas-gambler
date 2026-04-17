# Projeto: Serviço de Planilhamento de Apostas

## Visão Geral

Plataforma SaaS voltada para **donos de grupos de sinais de apostas** no Telegram. O sistema monitora automaticamente as mensagens do grupo, extrai os dados da aposta (via texto e/ou imagem com IA), persiste no banco de dados e sincroniza com uma planilha Excel — tudo sem intervenção manual do tipster.

---

## Problema que Resolve

Donos de grupos de sinais precisam registrar manualmente cada aposta em planilhas para acompanhar performance, ROI e histórico. Esse processo é repetitivo, propenso a erros e consome tempo que poderia ser dedicado à análise. Além disso, cada casa de apostas exibe mercados com nomes diferentes, dificultando a padronização dos relatórios.

---

## Fluxo Principal

### 1. Captura da Aposta

O tipster envia uma mensagem no grupo do Telegram contendo a aposta — pode ser:
- **Texto puro** com as informações da aposta
- **Imagem/screenshot** da casa de apostas (com ou sem legenda)
- **Ambos** (imagem + texto descritivo)

O bot detecta automaticamente se a mensagem é uma aposta com base em heurísticas (presença de odd, unidades, times, mercado).

### 2. Extração dos Dados

Um modelo de IA (Gemini Vision) analisa o conteúdo e extrai os campos estruturados:

| Campo | Descrição | Exemplo |
|---|---|---|
| `home_team` | Time da casa / primeiro time | `Liquid` |
| `away_team` | Time visitante / segundo time | `FURIA` |
| `market` | Tipo de aposta | `Total Kills Over` |
| `line` | Linha da aposta (quando aplicável) | `25.5` |
| `odd` | Cotação da aposta | `1.87` |
| `units` | Stake em unidades | `2u` |
| `bookmaker` | Casa de apostas identificada | `Betano` |
| `sport` | Esporte / modalidade | `CS2` |
| `league` | Liga / campeonato (quando disponível) | `ESL Pro League` |

### 3. Normalização de Mercados por Casa de Apostas

Cada casa de apostas nomeia os mercados de forma diferente. O sistema mantém um **catálogo de sinônimos por bookmaker** que mapeia nomes variantes para um mercado canônico único.

**Exemplo:**

| Casa | Nome exibido | Mercado Canônico |
|---|---|---|
| Betano | `Mais/Menos Kills` | `Total Kills` |
| Bet365 | `Total Kills Over/Under` | `Total Kills` |
| Pinnacle | `Kills O/U` | `Total Kills` |

Quando um novo nome de mercado é encontrado, o sistema usa IA para tentar associá-lo a um mercado canônico existente. Se não encontrar correspondência, cria um novo mercado e solicita revisão.

### 4. Persistência

Todos os dados extraídos são salvos no banco de dados (PostgreSQL), incluindo:
- Dados da aposta
- Casa de apostas
- Origem (chat_id, message_id, user_id, timestamp)
- Status: `pendente` → aguardando resultado

### 5. Resultado da Aposta

O tipster **edita a mensagem original** no Telegram adicionando um emoji de resultado:

| Emoji | Resultado |
|---|---|
| ✅ ou 🟢 | Green (acertou) |
| ❌ ou 🔴 | Red (errou) |
| 🔁 | Void (aposta cancelada/devolvida) |
| 🟡 | Half Green (meio acerto) |
| 🟠 | Half Red (meio erro) |

O bot detecta a edição, atualiza o registro no banco e sincroniza o resultado na planilha e no frontend.

### 6. Sincronização com Planilha

Cada aposta é refletida em uma linha da planilha Google Sheets (ou Excel exportável), com colunas padronizadas:

```
Data | Casa | Jogo | Liga | Mercado | Linha | Odd | Stake | Status | Lucro/Prejuízo
```

- Uma linha é criada por aposta
- A mesma linha é atualizada quando o resultado chega (nunca duplicada)
- Suporte a múltiplas planilhas: cada bookmaker ou grupo pode ter sua aba

### 7. Frontend / Dashboard

Interface web para visualização e gestão das apostas:

- Histórico completo de apostas com filtros (período, mercado, bookmaker, resultado)
- Estatísticas de performance: ROI, yield, taxa de acerto, unidades ganhas/perdidas
- Gráficos de evolução ao longo do tempo
- Exportação para Excel/CSV
- Visão por bookmaker e por mercado

---

## Multi-Tenant (Multi-Grupo)

O sistema suporta múltiplos grupos de sinais independentes:

- Cada grupo tem sua própria configuração de planilha
- Cada grupo pode ter múltiplas casas de apostas cadastradas
- O catálogo de mercados é compartilhado (global), mas os sinônimos por bookmaker são independentes
- Permissões de acesso ao dashboard por grupo

---

## Casos de Uso Principais

### Tipster
1. Envia aposta normalmente no grupo (sem comandos especiais)
2. Edita a mensagem com o emoji do resultado quando o jogo termina
3. Acessa o dashboard para ver seu histórico e performance

### Dono do Grupo
1. Cadastra o grupo e vincula à planilha
2. Configura quais bookmakers aceita e o modelo de planilha desejado
3. Acompanha performance dos tipsters e do grupo no dashboard
4. Exporta relatórios para clientes/assinantes

---

## Requisitos Técnicos

### Entrada
- Webhook/long-polling resiliente com reconexão automática
- Suporte a: texto, foto, legenda, álbum (media_group)
- Armazenamento de mídia com expiração e fallback

### Extração
- IA principal: Google Gemini Vision (texto + imagem)
- Fallback: Tesseract.js para OCR local
- Detecção de campos ausentes → aposta marcada como `incompleta`
- Deduplicação por hash da mensagem

### Consistência
- Validações: odd > 1, stake > 0, linha numérica quando exigida
- Regras de coerência por mercado (ex.: `Over/Under` requer linha)
- Tratamento de erros de escrita na planilha com fila e retry

### Observabilidade
- Logging estruturado por etapa
- Métricas: total processadas, taxa de sucesso, falhas por tipo
- Alertas via canal admin no Telegram em caso de erro crítico

---

## Diferenciais

- **Zero fricção para o tipster**: nenhum comando especial, o fluxo é 100% natural
- **Multi-bookmaker com normalização automática de mercados**
- **Resultado via edição de mensagem**: intuitivo e já é o comportamento natural dos tipsters
- **Planilha sempre sincronizada**: nenhuma entrada manual necessária
- **Dashboard web** com métricas de performance em tempo real
