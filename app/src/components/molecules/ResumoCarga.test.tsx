import { screen } from '@testing-library/react-native';

import { renderizar } from '@/test-utils/renderComTema';

import { ResumoCarga, type PropsResumoCarga } from './ResumoCarga';

// Relógio fixo (21/10/2026, 12:00 de Brasília). Prazo de 28/10 às 10:00 de Brasília (13:00 UTC).
const agora = new Date('2026-10-21T12:00:00-03:00');

const cargaCompleta: PropsResumoCarga = {
  tipoCarga: 'Eletrônicos',
  empresa: 'Transportes Triângulo Ltda',
  origem: 'Uberlândia - MG',
  destino: 'Uberaba - MG',
  pesoKg: '8000.00',
  valorOferecido: '3500.00',
  urgencia: 'critico',
  certificacao: 'MOPP',
  expiraEm: '2026-10-28T13:00:00Z',
  status: 'aberto',
  distanciaKm: '12.4',
  agora,
};

const cargaComNulos: PropsResumoCarga = {
  tipoCarga: 'Grãos',
  origem: 'Uberlândia - MG',
  destino: 'Uberaba - MG',
  valorOferecido: 1200,
  urgencia: 'normal',
  certificacao: null,
  expiraEm: '2026-10-28T13:00:00Z',
  agora,
};

describe('ResumoCarga', () => {
  it('mostra selo, tipo, rota, valor, fatos e distância formatados (D-PO-12, D-PO-13)', async () => {
    await renderizar(<ResumoCarga {...cargaCompleta} />);
    expect(screen.getByText('Crítico')).toBeOnTheScreen();
    expect(screen.getByText('Eletrônicos')).toBeOnTheScreen();
    expect(screen.getByText('Coleta em')).toBeOnTheScreen();
    expect(screen.getByText('R$ 3.500,00')).toBeOnTheScreen();
    expect(screen.getByText('Transportes Triângulo Ltda')).toBeOnTheScreen();
    expect(screen.getByLabelText('Peso: 8.000 kg')).toBeOnTheScreen();
    expect(screen.getByText('Exige MOPP')).toBeOnTheScreen();
    expect(screen.getByText('Expira em')).toBeOnTheScreen();
    expect(screen.getByText('28/10/2026, 10:00')).toBeOnTheScreen();
    expect(screen.getByText('12,4 km')).toBeOnTheScreen();
    expect(screen.getByText('Aberta')).toBeOnTheScreen();
  });

  it.each([
    ['normal', 'Normal'],
    ['urgente', 'Urgente'],
    ['critico', 'Crítico'],
  ] as const)('urgência %s aparece com o texto "%s"', async (urgencia, rotulo) => {
    await renderizar(<ResumoCarga {...cargaCompleta} urgencia={urgencia} />);
    expect(screen.getByText(rotulo)).toBeOnTheScreen();
  });

  it('certificação null mostra "Sem exigência", sem etiqueta de exigência', async () => {
    await renderizar(<ResumoCarga {...cargaComNulos} />);
    expect(screen.getByText('Sem exigência')).toBeOnTheScreen();
    expect(screen.queryByText(/^Exige /)).toBeNull();
  });

  it('nulos: sem peso, sem distância, sem empresa e sem status', async () => {
    await renderizar(<ResumoCarga {...cargaComNulos} />);
    expect(screen.queryByText('Peso')).toBeNull();
    expect(screen.queryByText(/km$/)).toBeNull();
    expect(screen.queryByText('Empresa')).toBeNull();
    expect(screen.queryByText('Aberta')).toBeNull();
  });

  it('CT-10: aberta com prazo passado aparece como "Expirada" e o prazo vira "vencido em"', async () => {
    await renderizar(
      <ResumoCarga {...cargaCompleta} agora={new Date('2026-10-29T12:00:00-03:00')} />,
    );
    expect(screen.getByText('Expirada')).toBeOnTheScreen();
    expect(screen.getByText('Prazo vencido em')).toBeOnTheScreen();
    expect(screen.queryByText('Aberta')).toBeNull();
  });

  it('CT-10 não vale para status fechado: continua "Fechada"', async () => {
    await renderizar(
      <ResumoCarga
        {...cargaCompleta}
        status="fechado"
        agora={new Date('2026-10-29T12:00:00-03:00')}
      />,
    );
    expect(screen.getByText('Fechada')).toBeOnTheScreen();
    expect(screen.queryByText('Expirada')).toBeNull();
  });

  it('sem status e com prazo no futuro: nenhuma etiqueta de status', async () => {
    await renderizar(<ResumoCarga {...cargaComNulos} />);
    expect(screen.queryByText('Aberta')).toBeNull();
    expect(screen.queryByText('Expirada')).toBeNull();
  });

  it('sem status e com prazo vencido (cargas próximas): mostra "Expirada"', async () => {
    await renderizar(
      <ResumoCarga {...cargaComNulos} agora={new Date('2026-10-29T12:00:00-03:00')} />,
    );
    expect(screen.getByText('Expirada')).toBeOnTheScreen();
  });
});
