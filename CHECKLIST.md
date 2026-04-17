# Checklist

## 1.1 Entrada e captura (Telegram)

- [x] Webhook/long polling resiliente (reconexao, retry). Status: concluido.
- [x] Recebe mensagens de texto, foto, legenda, documento (arquivo). Status: concluido.
- [ ] Suporta album (media_group) e escolhe a melhor imagem ou combina. Status: nao.
- [ ] Captura metadados: user_id, chat_id, message_id, timestamp, username/nome. Status: parcial (chat_id, message_id).
- [ ] Baixa e armazena midia (ou link/ID) com expiracao e fallback. Status: nao (download temporario apenas).

## 1.2 Extracao de dados (parsing)

- [ ] Casa / bookmaker. Status: nao.
- [ ] Esporte / liga (quando possivel). Status: parcial (sport via Gemini quando ha texto extra; sem liga).
- [x] Evento (time A vs time B). Status: concluido (homeTeam/awayTeam).
- [x] Mercado (Over/Under, Handicap, Moneyline). Status: concluido (market + resolver).
- [ ] Linha (ex.: 2.5, -1.5, 25.5). Status: nao.
- [x] Odd. Status: concluido.
- [x] Stake/unidades/valor (se houver). Status: concluido (units).
- [ ] Data/hora do jogo (se houver). Status: nao.
- [x] Suporta entrada so-texto, so-imagem e ambos. Status: concluido.
- [x] Normaliza textos (acentos, case, simbolos, "@1.90", virgula decimal). Status: concluido.

## 1.3 Validacao e consistencia

- [ ] Validacoes basicas: odd > 1, stake > 0, linha numerica quando exigida. Status: parcial (odd/stake).
- [ ] Detecta campos ausentes e marca como "incompleto" para revisao. Status: nao.
- [ ] Regras de coerencia (ex.: mercado "Over" deve ter linha; "Moneyline" nao). Status: nao.
- [ ] Tratamento de duplicidade: mesma bet enviada duas vezes (hash/assinatura). Status: nao.

## 1.5 Espelhamento na planilha

- [ ] Cria/atualiza linha na planilha com colunas padrao (data, casa, jogo, mercado, linha, odd, stake, status). Status: parcial (data, jogo, mercado, odd, stake).
- [x] Atualiza a mesma linha quando houver correcao/resultado (nao cria outra). Status: concluido.
- [x] Resiliencia: fila/retry quando API da planilha falhar (quota/timeout). Status: concluido.
- [ ] Controle de concorrencia (evitar duas escritas simultaneas duplicando linhas). Status: nao.

## 1.6 Operacao e observabilidade

- [ ] Logging estruturado por etapa (download, OCR, parse, DB, sheet). Status: parcial (logs soltos via console).
- [ ] Metricas minimas: total processadas, taxa de sucesso, falhas por tipo. Status: nao.
- [ ] Alertas simples (ex.: canal admin no Telegram em caso de erro critico). Status: nao.
- [x] Painel minimo (endpoint /health e /metrics). Status: concluido.
