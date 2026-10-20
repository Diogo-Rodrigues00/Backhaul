# 006 — Utilitários: formatação, rótulos, vencimento, prazos, validação, armazenamento e a11y

| Campo | Valor |
|---|---|
| Itens MVP | CT-07, CT-10, D-PO-02, D-PO-07, D-PO-09, D-PO-12, D-PO-13, D-PO-14 (base para todas as telas) |
| Prioridade | MVP |
| Agente / modelo | `dev-front` / **haiku** — funções puras com especificação exata nos ADRs 0006, 0007, 0009, 0015 |
| Branch | `feat/lib-utilitarios` |
| Estimativa | M (≈3 h) |
| Bloqueado por | 001 |
| Bloqueia | 008, 009, 012, 013 |

## Objetivo
Funções puras e módulos de plataforma que as telas reutilizam, todos com teste.

## Rotas da API
Nenhuma.

## Telas / componentes
Nenhum.

## Arquivos e pastas
- `src/lib/formatacao.ts`: `formatarMoeda`, `formatarDistancia`, `formatarPeso`, `formatarData`, `formatarDataHora`, `formatarValidade`, `formatarPercentual` (ADR 0015).
- `src/lib/rotulos.ts`: `rotuloUrgencia`, `rotuloStatusCarga`, `rotuloStatusDisponibilidade`, `rotuloStatusProposta`, `rotuloTipoProposta`, `rotuloStatusEntrega`, `rotuloPagamento` (inclui `null` → "Aguardando pagamento"), `proximoPassoFrete` (`aceito` → `{ status: 'em_transito', rotulo: 'Iniciar transporte' }`, `em_transito` → `{ 'entregue', 'Confirmar entrega' }`, `entregue` → `null`).
- `src/lib/vencimento.ts`: `estaVencido(status, expiraEm, agora?)`, `statusEfetivo(status, expiraEm, agora?)` (`aberto` vencido → `expirado`).
- `src/lib/prazos.ts`: `OPCOES_PRAZO = [2, 6, 12, 24, 48]` com rótulos ("Em 2 horas"…), `calcularExpiraEm(horas, agora?)` → ISO.
- `src/lib/validacao.ts`: `obrigatorio`, `email`, `minimo`, `maximo`, `digitos`, `numeroPositivo`, `numeroAte`; constantes `MAX = { email: 150, nome_completo: 150, razao_social: 150, cnh: 20, veiculo_tipo: 50, veiculo_placa: 10, tipo_carga: 80 }`. Mensagens em pt-BR.
- `src/lib/armazenamento.ts` + `.web.ts` + `.native.ts` (ADR 0006; instalar `expo-secure-store`).
- `src/lib/a11y.ts` + `.web.ts` + `.native.ts`: `anunciar(mensagem)` (emissor simples que o atom `RegiaoViva` assina; no nativo também `AccessibilityInfo.announceForAccessibility`), `moverFoco(ref)` (web: `ref.current.focus()`; nativo: `AccessibilityInfo.setAccessibilityFocus(findNodeHandle(ref.current))`), `propsDeCampo({ id, rotulo, erro })` (ADR 0009).
- `src/hooks/useAnunciarNovidades.ts` (ADR 0010).
- Se o 005 criou armazenamento provisório de tema, trocar pelo módulo daqui.

## Critérios de aceite
- [ ] `formatarMoeda(3500)` = "R$ 3.500,00"; `formatarDistancia(12.4)` = "12,4 km"; `formatarPeso(8000)` = "8.000 kg"; `formatarPercentual(5)` = "5%"; `formatarPercentual(2.5)` = "2,5%" (D-PO-12). Aceitam número ou texto numérico.
- [ ] `formatarDataHora` usa `America/Sao_Paulo`; `formatarValidade('2027-05-01')` e `formatarValidade('2027-05-01T03:00:00.000Z')` = "01/05/2027".
- [ ] `statusEfetivo('aberto', ontem)` = `expirado`; `('fechado', ontem)` = `fechado` (CT-10).
- [ ] `calcularExpiraEm(2, agora)` = agora + 2 h em ISO.
- [ ] Validadores devolvem `true` ou mensagem; `digitos(11)` aceita "123.456.789-01".
- [ ] `useAnunciarNovidades` não anuncia na primeira carga e anuncia o texto de `descrever` nas mudanças.
- [ ] Verificação manual no Expo Go: `formatarDataHora` mostra a hora de Brasília (Hermes); se falhar, aplicar o ajuste do ADR 0015 e registrar.

## Testes exigidos
- Unidade para todas as funções acima (casos de borda: `null`, texto numérico, zero, negativo, string vazia). Cobertura ≥ 90% em `src/lib`.

## Checklist de acessibilidade e performance
- [ ] Instâncias de `Intl` criadas uma vez no módulo.
- [ ] Nenhuma dependência nova além de `expo-secure-store`.
- [ ] Rótulos sempre em texto (nunca só cor) — urgência e status.
