// Handlers COM ESTADO do mock "do fluxo" (card 030): as mesmas rotas do MVP, mas lendo e gravando
// mocks/estado.ts. Só atendem quem é "do fluxo" (token `fluxo-*`; no login e no cadastro, e-mail
// `@fluxo.test`). Para os demais, o resolver devolve `undefined` e o MSW cai no próximo handler:
// os handlers sem estado que os outros specs usam seguem exatamente como eram.
//
// Fiel ao backend de hoje: GET /disponibilidades/minhas e GET /propostas/minhas (propostas 4a/4b do
// relatório) NÃO existem lá, então respondem 404 como o Express ("Cannot GET"). O app cai no plano B
// (disponibilidade guardada no aparelho; propostas enviadas guardadas no aparelho).
import { http, HttpResponse } from 'msw';

import type { CargaDaEmpresa, Frete, PropostaRecebida } from '../../src/api/tipos';
import { certificacoesMock } from '../fixtures/certificacoes';
import {
  calcularComissao,
  cargaAbertaENaoVencida,
  distanciaKm,
  DOMINIO_FLUXO,
  estado,
  motoristaPodePegar,
  novoId,
  ORDEM_URGENCIA,
  PERCENTUAL_COMISSAO_FLUXO,
  PREFIXO_TOKEN_FLUXO,
  registrarMotorista,
  reiniciarEstado,
  usuarioPorEmail,
  usuarioPorId,
  usuarioPorToken,
  agoraIso,
  type CargaFluxo,
  type FreteFluxo,
  type PropostaFluxo,
  type UsuarioFluxo,
} from '../estado';
import { respostaErro, respostaErros } from '../respostas';
import { lerCorpo, textoOuVazio, eNumeroPositivo } from './comum';
import { validarCarga } from './cargas';
import { validarDisponibilidade } from './disponibilidades';
import { validarCadastroMotorista } from './sessao';

const TAMANHO_MINIMO_SENHA = 8;
const STATUS_ENTREGA = ['aceito', 'em_transito', 'entregue', 'cancelado'];

type Resolucao =
  | { usuario: UsuarioFluxo; resposta?: undefined; deOutro?: undefined }
  | { usuario?: undefined; resposta: Response; deOutro?: undefined }
  | { usuario?: undefined; resposta?: undefined; deOutro: true };

/** Token `fluxo-*` ausente: pede ao MSW que tente o próximo handler (o sem estado). */
function autenticarFluxo(request: Request, permitidos?: UsuarioFluxo['tipo'][]): Resolucao {
  const cabecalho = request.headers.get('Authorization');
  if (cabecalho === null || !cabecalho.startsWith(`Bearer ${PREFIXO_TOKEN_FLUXO}`)) {
    return { deOutro: true };
  }
  const usuario = usuarioPorToken(cabecalho.slice('Bearer '.length));
  if (usuario === undefined) return { resposta: respostaErro(401, 'token inválido ou expirado') };
  if (permitidos !== undefined && !permitidos.includes(usuario.tipo)) {
    return { resposta: respostaErro(403, 'acesso negado para este tipo de usuário') };
  }
  return { usuario };
}

/** Express sem a rota: corpo HTML, como o backend de hoje responde às propostas 4a e 4b. */
function respostaRotaInexistente(metodo: string, caminho: string) {
  return new HttpResponse(
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Error</title></head><body><pre>Cannot ${metodo} ${caminho}</pre></body></html>`,
    { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

async function emailDoCorpo(request: Request): Promise<string> {
  const corpo = await lerCorpo(request.clone());
  return textoOuVazio(corpo.email).toLowerCase();
}

function nomeDoUsuario(usuario: UsuarioFluxo) {
  return {
    id: usuario.id,
    email: usuario.email,
    tipo: usuario.tipo,
    ativo: true,
    criado_em: usuario.criadoEm,
    nome: usuario.nome,
  };
}

function cargaDaEmpresa(carga: CargaFluxo): CargaDaEmpresa {
  const certificacao = certificacoesMock.find((c) => c.id === carga.certificacao_requerida_id);
  const { empresaId: _empresaId, ...publica } = carga;
  return {
    ...publica,
    certificacao_exigida: certificacao?.nome ?? null,
    total_propostas: estado.propostas.filter((p) => p.cargaId === carga.id).length,
  };
}

function statusPagamentoDoFrete(freteId: string) {
  return estado.transacoes.find((t) => t.freteId === freteId)?.status_pagamento ?? null;
}

function freteParaLista(frete: FreteFluxo, ladoMotorista: boolean): Frete {
  const carga = estado.cargas.find((c) => c.id === frete.cargaId);
  const base = {
    id: frete.id,
    tipo_carga: carga?.tipo_carga ?? '',
    valor_final: frete.valor_final,
    status_entrega: frete.status_entrega,
    coleta_em: frete.coleta_em,
    entrega_em: frete.entrega_em,
    criado_em: frete.criado_em,
    status_pagamento: statusPagamentoDoFrete(frete.id),
  };
  if (ladoMotorista) {
    const empresa = usuarioPorId(frete.empresaId);
    return { ...base, empresa: { id: frete.empresaId, razao_social: empresa?.nome ?? '' } };
  }
  const motorista = usuarioPorId(frete.motoristaId);
  return {
    ...base,
    motorista: {
      id: frete.motoristaId,
      nome_completo: motorista?.nome ?? '',
      veiculo_tipo: motorista?.veiculoTipo ?? '',
      veiculo_placa: motorista?.veiculoPlaca ?? '',
    },
  };
}

function maisRecentesPrimeiro<T extends { criado_em: string }>(itens: readonly T[]): T[] {
  // `slice().reverse()` desempata criados no mesmo milissegundo: o último inserido vem antes.
  return itens
    .slice()
    .reverse()
    .sort((a, b) => Date.parse(b.criado_em) - Date.parse(a.criado_em));
}

export function criarHandlersComEstado(baseUrl: string) {
  return [
    // Só no servidor de mocks: o app nunca chama. O E2E reinicia o mundo antes de começar.
    http.post(`${baseUrl}/__mock/reset`, () => {
      reiniciarEstado();
      return HttpResponse.json({ ok: true });
    }),

    http.post(`${baseUrl}/login`, async ({ request }) => {
      const email = await emailDoCorpo(request);
      if (!email.endsWith(DOMINIO_FLUXO)) return undefined;
      const corpo = await lerCorpo(request.clone());
      const senha = typeof corpo.senha === 'string' ? corpo.senha : '';
      const usuario = usuarioPorEmail(email);
      if (usuario === undefined || senha.length < TAMANHO_MINIMO_SENHA) {
        return respostaErro(401, 'email ou senha inválidos');
      }
      return HttpResponse.json({ token: usuario.token, tipo: usuario.tipo });
    }),

    http.post(`${baseUrl}/cadastro/motorista`, async ({ request }) => {
      const email = await emailDoCorpo(request);
      if (!email.endsWith(DOMINIO_FLUXO)) return undefined;
      const corpo = await lerCorpo(request);
      const erros = validarCadastroMotorista(corpo);
      if (erros.length > 0) return respostaErros(400, erros);
      const cpf = textoOuVazio(corpo.cpf).replace(/\D/g, '');
      if (
        estado.usuarios.some((u) => u.email === email || (u.cpf !== undefined && u.cpf === cpf))
      ) {
        return respostaErro(409, 'e-mail ou CPF já cadastrado');
      }
      const criado = registrarMotorista({
        email,
        nome: textoOuVazio(corpo.nome_completo),
        cpf,
        veiculoTipo: textoOuVazio(corpo.veiculo_tipo),
        veiculoPlaca: textoOuVazio(corpo.veiculo_placa),
        capacidadeKg: Number(corpo.capacidade_kg),
      });
      return HttpResponse.json(
        {
          usuario: {
            id: criado.id,
            email: criado.email,
            tipo: criado.tipo,
            criado_em: criado.criadoEm,
          },
        },
        { status: 201 },
      );
    }),

    http.get(`${baseUrl}/eu`, ({ request }) => {
      const { usuario, resposta, deOutro } = autenticarFluxo(request);
      if (deOutro) return undefined;
      return resposta ?? HttpResponse.json({ usuario: nomeDoUsuario(usuario) });
    }),

    http.get(`${baseUrl}/certificacoes`, ({ request }) => {
      const { resposta, deOutro } = autenticarFluxo(request);
      if (deOutro) return undefined;
      return resposta ?? HttpResponse.json({ certificacoes: certificacoesMock });
    }),

    // ---- Cargas ----
    http.post(`${baseUrl}/cargas`, async ({ request }) => {
      const { usuario, resposta, deOutro } = autenticarFluxo(request, ['empresa']);
      if (deOutro) return undefined;
      if (resposta) return resposta;
      const corpo = await lerCorpo(request);
      const erros = validarCarga(corpo);
      if (erros.length > 0) return respostaErros(400, erros);
      const carga: CargaFluxo = {
        id: novoId(),
        empresaId: usuario.id,
        tipo_carga: textoOuVazio(corpo.tipo_carga),
        origem: corpo.origem as CargaFluxo['origem'],
        destino: corpo.destino as CargaFluxo['destino'],
        peso_kg: Number(corpo.peso_kg),
        valor_oferecido: Number(corpo.valor_oferecido),
        urgencia: (corpo.urgencia as CargaFluxo['urgencia'] | undefined) ?? 'normal',
        status: 'aberto',
        certificacao_requerida_id: (corpo.certificacao_requerida_id as string | null) ?? null,
        expira_em: String(corpo.expira_em),
        criado_em: agoraIso(),
      };
      estado.cargas.push(carga);
      const { empresaId: _empresaId, ...publica } = carga;
      return HttpResponse.json({ carga: publica }, { status: 201 });
    }),

    http.get(`${baseUrl}/cargas/minhas`, ({ request }) => {
      const { usuario, resposta, deOutro } = autenticarFluxo(request, ['empresa']);
      if (deOutro) return undefined;
      if (resposta) return resposta;
      const minhas = estado.cargas.filter((c) => c.empresaId === usuario.id);
      return HttpResponse.json({ cargas: maisRecentesPrimeiro(minhas).map(cargaDaEmpresa) });
    }),

    http.get(`${baseUrl}/cargas/proximas`, ({ request }) => {
      const { usuario, resposta, deOutro } = autenticarFluxo(request, ['motorista']);
      if (deOutro) return undefined;
      if (resposta) return resposta;
      const url = new URL(request.url);
      const lat = Number(url.searchParams.get('lat'));
      const lng = Number(url.searchParams.get('lng'));
      const raio = Number(url.searchParams.get('raio_km'));
      const erros: string[] = [];
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        erros.push('lat deve ser um número entre -90 e 90');
      }
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        erros.push('lng deve ser um número entre -180 e 180');
      }
      if (!Number.isFinite(raio) || raio <= 0 || raio > 500) {
        erros.push('raio_km deve ser um número maior que zero e até 500');
      }
      if (erros.length > 0) return respostaErros(400, erros);

      const cargas = estado.cargas
        .filter(cargaAbertaENaoVencida)
        .filter((carga) => motoristaPodePegar(usuario, carga))
        .map((carga) => ({ carga, distancia: distanciaKm({ lat, lng }, carga.origem) }))
        .filter(({ distancia }) => distancia <= raio)
        .sort(
          (a, b) =>
            ORDEM_URGENCIA[a.carga.urgencia] - ORDEM_URGENCIA[b.carga.urgencia] ||
            a.distancia - b.distancia,
        )
        .map(({ carga, distancia }) => ({
          id: carga.id,
          tipo_carga: carga.tipo_carga,
          empresa: usuarioPorId(carga.empresaId)?.nome ?? '',
          peso_kg: carga.peso_kg,
          valor_oferecido: carga.valor_oferecido,
          urgencia: carga.urgencia,
          distancia_origem_km: distancia,
          certificacao_exigida:
            certificacoesMock.find((c) => c.id === carga.certificacao_requerida_id)?.nome ?? null,
          origem: carga.origem,
          destino: carga.destino,
          expira_em: carga.expira_em,
        }));
      return HttpResponse.json({ cargas });
    }),

    // ---- Disponibilidades ----
    http.post(`${baseUrl}/disponibilidades`, async ({ request }) => {
      const { usuario, resposta, deOutro } = autenticarFluxo(request, ['motorista']);
      if (deOutro) return undefined;
      if (resposta) return resposta;
      const corpo = await lerCorpo(request);
      const erros = validarDisponibilidade(corpo);
      if (erros.length > 0) return respostaErros(400, erros);
      const disponibilidade = {
        id: novoId(),
        motoristaId: usuario.id,
        local: corpo.local as { lat: number; lng: number },
        raio_busca_km: typeof corpo.raio_busca_km === 'number' ? corpo.raio_busca_km : 50,
        urgencia: (corpo.urgencia as CargaFluxo['urgencia'] | undefined) ?? 'normal',
        status: 'aberto' as const,
        expira_em: String(corpo.expira_em),
        criado_em: agoraIso(),
      };
      estado.disponibilidades.push(disponibilidade);
      const { motoristaId: _motoristaId, ...publica } = disponibilidade;
      return HttpResponse.json({ disponibilidade: publica }, { status: 201 });
    }),

    http.get(`${baseUrl}/disponibilidades/minhas`, ({ request }) => {
      const { resposta, deOutro } = autenticarFluxo(request, ['motorista']);
      if (deOutro) return undefined;
      return resposta ?? respostaRotaInexistente('GET', '/disponibilidades/minhas');
    }),

    // ---- Propostas ----
    http.post(`${baseUrl}/propostas`, async ({ request }) => {
      const { usuario, resposta, deOutro } = autenticarFluxo(request, ['motorista']);
      if (deOutro) return undefined;
      if (resposta) return resposta;
      const corpo = await lerCorpo(request);
      const erros: string[] = [];
      if (typeof corpo.chamado_carga_id !== 'string') {
        erros.push('chamado_carga_id deve ser um UUID válido');
      }
      if (typeof corpo.chamado_disp_id !== 'string') {
        erros.push('chamado_disp_id deve ser um UUID válido');
      }
      if (corpo.tipo !== 'aceite' && corpo.tipo !== 'contraproposta') {
        erros.push('tipo deve ser aceite ou contraproposta');
      } else if (corpo.tipo === 'contraproposta' && !eNumeroPositivo(corpo.valor_proposto)) {
        erros.push('valor_proposto deve ser um número maior que zero');
      }
      if (erros.length > 0) return respostaErros(400, erros);

      const disponibilidade = estado.disponibilidades.find(
        (d) => d.id === corpo.chamado_disp_id && d.motoristaId === usuario.id,
      );
      if (disponibilidade === undefined) return respostaErro(404, 'disponibilidade não encontrada');
      const carga = estado.cargas.find((c) => c.id === corpo.chamado_carga_id);
      if (carga === undefined) return respostaErro(404, 'carga não encontrada');
      if (!cargaAbertaENaoVencida(carga)) {
        return respostaErro(409, 'carga não está mais aberta para propostas');
      }
      if (!motoristaPodePegar(usuario, carga)) {
        return respostaErro(403, 'motorista sem a certificação exigida');
      }
      if (
        corpo.tipo === 'contraproposta' &&
        estado.propostas.some(
          (p) =>
            p.cargaId === carga.id && p.motoristaId === usuario.id && p.tipo === 'contraproposta',
        )
      ) {
        return respostaErro(409, 'você já fez a contraproposta única para esta carga');
      }
      const proposta: PropostaFluxo = {
        id: novoId(),
        cargaId: carga.id,
        dispId: disponibilidade.id,
        motoristaId: usuario.id,
        tipo: corpo.tipo === 'aceite' ? 'aceite' : 'contraproposta',
        valor_proposto:
          corpo.tipo === 'aceite' ? carga.valor_oferecido : Number(corpo.valor_proposto),
        status: 'pendente',
        criado_em: agoraIso(),
      };
      estado.propostas.push(proposta);
      return HttpResponse.json(
        {
          proposta: {
            id: proposta.id,
            chamado_carga_id: proposta.cargaId,
            chamado_disp_id: proposta.dispId,
            tipo: proposta.tipo,
            valor_proposto: proposta.valor_proposto,
            status: proposta.status,
            criado_em: proposta.criado_em,
          },
        },
        { status: 201 },
      );
    }),

    http.get(`${baseUrl}/propostas/minhas`, ({ request }) => {
      const { resposta, deOutro } = autenticarFluxo(request, ['motorista']);
      if (deOutro) return undefined;
      return resposta ?? respostaRotaInexistente('GET', '/propostas/minhas');
    }),

    http.get(`${baseUrl}/cargas/:id/propostas`, ({ request, params }) => {
      const { usuario, resposta, deOutro } = autenticarFluxo(request, ['empresa']);
      if (deOutro) return undefined;
      if (resposta) return resposta;
      const carga = estado.cargas.find((c) => c.id === params.id && c.empresaId === usuario.id);
      if (carga === undefined) return respostaErro(404, 'carga não encontrada');
      // Pendentes primeiro, depois as mais antigas.
      const propostas = estado.propostas
        .filter((p) => p.cargaId === carga.id)
        .slice()
        .sort(
          (a, b) =>
            Number(b.status === 'pendente') - Number(a.status === 'pendente') ||
            Date.parse(a.criado_em) - Date.parse(b.criado_em),
        )
        .map((p): PropostaRecebida => {
          const motorista = usuarioPorId(p.motoristaId);
          return {
            id: p.id,
            tipo: p.tipo,
            valor_proposto: p.valor_proposto,
            status: p.status,
            criado_em: p.criado_em,
            motorista: {
              id: p.motoristaId,
              nome_completo: motorista?.nome ?? '',
              veiculo_tipo: motorista?.veiculoTipo ?? '',
              veiculo_placa: motorista?.veiculoPlaca ?? '',
              capacidade_kg: motorista?.capacidadeKg ?? 0,
              certificacoes: (motorista?.certificacoes ?? []).map((c) => ({
                nome: c.nome,
                validade: c.validade,
                validado_por_admin: c.aprovada,
              })),
            },
          };
        });
      return HttpResponse.json({ propostas });
    }),

    http.post(`${baseUrl}/propostas/:id/responder`, async ({ request, params }) => {
      const { usuario, resposta, deOutro } = autenticarFluxo(request, ['empresa']);
      if (deOutro) return undefined;
      if (resposta) return resposta;
      const corpo = await lerCorpo(request);
      if (corpo.acao !== 'aceitar' && corpo.acao !== 'recusar') {
        return respostaErros(400, ['acao deve ser aceitar ou recusar']);
      }
      const proposta = estado.propostas.find((p) => p.id === params.id);
      const carga = estado.cargas.find((c) => c.id === proposta?.cargaId);
      if (proposta === undefined || carga === undefined || carga.empresaId !== usuario.id) {
        return respostaErro(404, 'proposta não encontrada');
      }
      if (proposta.status !== 'pendente') {
        return respostaErro(409, `proposta já está ${proposta.status}`);
      }
      if (corpo.acao === 'recusar') {
        proposta.status = 'recusada';
        return HttpResponse.json({ proposta: { id: proposta.id, status: 'recusada' } });
      }
      if (carga.status !== 'aberto') return respostaErro(409, 'carga não está mais aberta');
      // Numa só "transação": aceita esta, recusa as outras pendentes, fecha carga e disponibilidade.
      proposta.status = 'aceita';
      for (const outra of estado.propostas) {
        if (outra.cargaId === carga.id && outra.id !== proposta.id && outra.status === 'pendente') {
          outra.status = 'recusada';
        }
      }
      carga.status = 'fechado';
      const disponibilidade = estado.disponibilidades.find((d) => d.id === proposta.dispId);
      if (disponibilidade) disponibilidade.status = 'fechado';
      const frete: FreteFluxo = {
        id: novoId(),
        propostaId: proposta.id,
        cargaId: carga.id,
        empresaId: carga.empresaId,
        motoristaId: proposta.motoristaId,
        valor_final: proposta.valor_proposto,
        status_entrega: 'aceito',
        coleta_em: null,
        entrega_em: null,
        criado_em: agoraIso(),
      };
      estado.fretes.push(frete);
      return HttpResponse.json({
        frete: {
          id: frete.id,
          proposta_id: frete.propostaId,
          valor_final: frete.valor_final,
          status_entrega: frete.status_entrega,
          criado_em: frete.criado_em,
        },
      });
    }),

    // ---- Fretes ----
    http.get(`${baseUrl}/fretes/meus`, ({ request }) => {
      const { usuario, resposta, deOutro } = autenticarFluxo(request, ['motorista', 'empresa']);
      if (deOutro) return undefined;
      if (resposta) return resposta;
      const doMotorista = usuario.tipo === 'motorista';
      const meus = estado.fretes.filter((f) =>
        doMotorista ? f.motoristaId === usuario.id : f.empresaId === usuario.id,
      );
      return HttpResponse.json({
        fretes: maisRecentesPrimeiro(meus).map((f) => freteParaLista(f, doMotorista)),
      });
    }),

    http.patch(`${baseUrl}/fretes/:id/status`, async ({ request, params }) => {
      const { usuario, resposta, deOutro } = autenticarFluxo(request, ['motorista']);
      if (deOutro) return undefined;
      if (resposta) return resposta;
      const corpo = await lerCorpo(request);
      const destino = String(corpo.status_entrega);
      if (!STATUS_ENTREGA.includes(destino)) {
        return respostaErros(400, [`status_entrega deve ser ${STATUS_ENTREGA.join(', ')}`]);
      }
      const frete = estado.fretes.find((f) => f.id === params.id && f.motoristaId === usuario.id);
      if (frete === undefined) return respostaErro(404, 'frete não encontrado');
      const permitido =
        (frete.status_entrega === 'aceito' && destino === 'em_transito') ||
        (frete.status_entrega === 'em_transito' && destino === 'entregue');
      if (!permitido) {
        return respostaErro(
          409,
          `não é possível mudar o frete de ${frete.status_entrega} para ${destino}`,
        );
      }
      const agora = agoraIso();
      const transacao = estado.transacoes.find((t) => t.freteId === frete.id);
      if (destino === 'em_transito') {
        frete.status_entrega = 'em_transito';
        frete.coleta_em = agora;
      } else {
        frete.status_entrega = 'entregue';
        frete.entrega_em = agora;
        // Mesma "transação" do banco: entregue e, se já pago, retido -> liberado.
        if (transacao && transacao.status_pagamento === 'retido') {
          transacao.status_pagamento = 'liberado';
        }
      }
      return HttpResponse.json({
        frete: {
          id: frete.id,
          valor_final: frete.valor_final,
          status_entrega: frete.status_entrega,
          coleta_em: frete.coleta_em,
          entrega_em: frete.entrega_em,
          status_pagamento: transacao?.status_pagamento ?? null,
        },
      });
    }),

    http.post(`${baseUrl}/fretes/:id/pagamento`, ({ request, params }) => {
      const { usuario, resposta, deOutro } = autenticarFluxo(request, ['empresa']);
      if (deOutro) return undefined;
      if (resposta) return resposta;
      const frete = estado.fretes.find((f) => f.id === params.id && f.empresaId === usuario.id);
      if (frete === undefined) return respostaErro(404, 'frete não encontrado');
      if (frete.status_entrega === 'cancelado') {
        return respostaErro(409, 'frete cancelado não pode ser pago');
      }
      if (estado.transacoes.some((t) => t.freteId === frete.id)) {
        return respostaErro(409, 'frete já foi pago');
      }
      const transacao = {
        id: novoId(),
        freteId: frete.id,
        valor_frete: frete.valor_final,
        percentual_comissao: PERCENTUAL_COMISSAO_FLUXO,
        valor_comissao: calcularComissao(frete.valor_final, PERCENTUAL_COMISSAO_FLUXO),
        // Retido até a entrega; se já foi entregue, nasce liberado.
        status_pagamento:
          frete.status_entrega === 'entregue' ? ('liberado' as const) : ('retido' as const),
        criado_em: agoraIso(),
      };
      estado.transacoes.push(transacao);
      return HttpResponse.json(
        {
          transacao: {
            id: transacao.id,
            frete_id: transacao.freteId,
            valor_frete: transacao.valor_frete,
            percentual_comissao: transacao.percentual_comissao,
            valor_comissao: transacao.valor_comissao,
            status_pagamento: transacao.status_pagamento,
            criado_em: transacao.criado_em,
          },
        },
        { status: 201 },
      );
    }),
  ];
}
