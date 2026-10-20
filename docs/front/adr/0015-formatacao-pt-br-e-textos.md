# ADR 0015 — Formatação pt-BR e textos (sem biblioteca de i18n)

- **Data:** 2026-10-20 · **Status:** proposto · **Autor:** tech-lead

## Contexto
Interface só em pt-BR (decisão fechada). D-PO-12: moeda `R$ 3.500,00`, distância `12,4 km`, peso `8.000 kg`, datas no fuso `America/Sao_Paulo`, validade de certificação só como data aceitando `YYYY-MM-DD` ou ISO. D-PO-13 e D-PO-07: rótulos de urgência e pagamento. CT-10: aberto + `expira_em` ≤ agora = "Expirada".

## Decisão
- **Sem biblioteca de i18n nem de datas.** Textos escritos em pt-BR no componente ou tela.
- `src/lib/formatacao.ts` com `Intl` (instâncias criadas uma vez no módulo):
  - `formatarMoeda(v)` → `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
  - `formatarDistancia(km)` → 1 casa decimal + " km".
  - `formatarPeso(kg)` → sem casas + " kg".
  - `formatarDataHora(iso)` / `formatarData(iso)` → `Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', … })`.
  - `formatarValidade(valor)` → se `YYYY-MM-DD`, monta a data sem conversão de fuso; se ISO com hora, usa a parte de data no fuso `America/Sao_Paulo`.
  - `formatarPercentual(n)` → `5,00` vira "5%" (sem casas quando inteiro), só para exibir o que a API devolveu.
  - Entradas numéricas passam por `paraNumero` (ADR 0005).
- `src/lib/rotulos.ts`: mapas tipados `rotuloUrgencia`, `rotuloStatusCarga`, `rotuloStatusDisponibilidade`, `rotuloStatusProposta`, `rotuloTipoProposta`, `rotuloStatusEntrega`, `rotuloPagamento` (D-PO-07, inclui `null`), `proximoPassoFrete` (D-PO-09).
- `src/lib/vencimento.ts`: `estaVencido(status, expiraEm, agora = new Date())` e `statusEfetivo(...)` (CT-10). Relógio injetável para teste.
- `src/lib/prazos.ts`: opções rápidas (2 h, 6 h, 12 h, 24 h, 48 h) e `calcularExpiraEm(horas, agora)` em ISO (D-PO-02).
- **Hermes (iPhone):** o card 006 verifica no Expo Go se `Intl.DateTimeFormat` com `timeZone` funciona; se não, `formatarDataHora` cai num ajuste manual de −03:00 (o Brasil não tem horário de verão desde 2019), documentado no código.

## Alternativas
- **i18next / expo-localization:** sem segundo idioma, é peso sem uso.
- **date-fns-tz / dayjs:** `Intl` já resolve na web e no Hermes.

## Consequências
- Nenhum `toFixed` ou concatenação de "R$" nas telas: o revisor reprova.
- Comissão nunca é calculada: só `formatarMoeda`/`formatarPercentual` sobre o que veio da API (RNF-11).
