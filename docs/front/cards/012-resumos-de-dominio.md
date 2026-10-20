# 012 — Resumos de domínio (rota, fatos, andamento; carga, motorista, frete)

| Campo | Valor |
|---|---|
| Itens MVP | base de MVP-09, 11, 12, 14, 15, 16, 17 (CT-07, CT-10, D-PO-07, D-PO-12) |
| Prioridade | MVP |
| Agente / modelo | `dev-front` / **haiku** — componentes de exibição sobre atoms prontos, rótulos e formatadores já testados |
| Branch | `feat/resumos-de-dominio` |
| Estimativa | M (≈3 h) |
| Bloqueado por | 006, 008 · DS (seção 5.2) |
| Bloqueia | 020, 021, 022, 024, 026, 027, 028 |

## Objetivo
Molecules que mostram carga, motorista e frete do mesmo jeito em todas as telas, sempre com rótulo + valor em texto.

## Rotas da API
Nenhuma (tipos de `src/api/tipos.ts` só com `import type`).

## Telas / componentes
`src/components/molecules/`:
- `LinhaRota` (RouteLine): "Coleta em Uberlândia - MG → Entrega em Uberaba - MG"; ≤ 420 px empilha (via `dataSet`); texto "Coleta em / Entrega em" sempre presente.
- `ListaDeFatos` (FactList): `itens: { rotulo, valor }[]` em grade; na web `<dl>`/`<dt>`/`<dd>` (arquivo `.web.tsx` com elementos HTML diretos), no iPhone `View`/`Texto` com rótulo lido junto ("Peso: 8.000 kg").
- `AndamentoFrete` (Stepper): Aceito · Em trânsito · Entregue; concluída/atual/pendente com ícone + texto oculto "(concluído)/(etapa atual)/(pendente)"; `aria-current="step"`; lista ordenada.
- `ResumoCarga`: `tipoCarga`, `empresa?`, `origem`/`destino` como rótulos prontos, `pesoKg?`, `valorOferecido` (`Preco`), `urgencia` (`SeloUrgencia`), `certificacao` (`null` → "Sem exigência"; com valor → `Etiqueta info` "Exige …"), `expiraEm`, `status?` (`Etiqueta`, status efetivo CT-10), `distanciaKm?` (`MarcadorKm`).
- `ResumoMotorista`: nome, veículo, placa, capacidade, certificações (nome, validade só data, `Etiqueta` "Aprovada"/"Não aprovada").
- `ResumoFrete`: tipo, valor final (`Preco`), `AndamentoFrete`, coleta/entrega ("—" se nulo), pagamento (`Etiqueta` com `rotuloPagamento`).
- Nenhum busca dados nem converte coordenadas: a tela passa rótulos de local prontos (`rotuloDoLocal`, card 007).

## Arquivos e pastas
Os arquivos acima + testes.

## Critérios de aceite
- [ ] Valores formatados conforme D-PO-12; urgência com texto conforme D-PO-13.
- [ ] `aberto` com `expiraEm` no passado → "Expirada" (CT-10).
- [ ] Certificação `null` → "Sem exigência"; pagamento `null` → "Aguardando pagamento" (D-PO-07).
- [ ] `ListaDeFatos` gera `<dl>` na web.
- [ ] `AndamentoFrete` com etapa atual por `aria-current` + texto, não só cor.
- [ ] 320 px: itens empilham, sem rolagem horizontal.

## Testes exigidos
- RNTL: cada molecule com fixture completa e com nulos; texto acessível da rota; status efetivo com relógio fixo; etapas do andamento.

## Checklist de acessibilidade e performance
- [ ] Textos curtos (o `h1` da tela continua o maior elemento, LCP).
- [ ] Dynamic Type sem corte.
- [ ] Ordem de títulos sem saltos quando usados dentro de cartões (`h2`/`h3` decididos pelo organism).
