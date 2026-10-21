import { screen } from '@testing-library/react-native';

import { renderizar } from '@/test-utils/renderComTema';

import { ResumoMotorista } from './ResumoMotorista';

describe('ResumoMotorista', () => {
  it('mostra nome, veículo, placa, capacidade formatada e certificações com situação', async () => {
    await renderizar(
      <ResumoMotorista
        nome="João da Silva"
        veiculo="Caminhão truck"
        placa="ABC1D23"
        capacidadeKg="8000.00"
        certificacoes={[
          { nome: 'MOPP', validade: '2027-05-01', aprovada: true },
          { nome: 'Carga refrigerada', validade: '2027-06-10T12:00:00Z', aprovada: false },
        ]}
      />,
    );
    expect(screen.getByText('João da Silva')).toBeOnTheScreen();
    expect(screen.getByLabelText('Veículo: Caminhão truck')).toBeOnTheScreen();
    expect(screen.getByLabelText('Placa: ABC1D23')).toBeOnTheScreen();
    expect(screen.getByLabelText('Capacidade: 8.000 kg')).toBeOnTheScreen();
    expect(screen.getByText('MOPP')).toBeOnTheScreen();
    expect(screen.getByText('Validade: 01/05/2027')).toBeOnTheScreen();
    expect(screen.getByText('Aprovada')).toBeOnTheScreen();
    expect(screen.getByText('Não aprovada')).toBeOnTheScreen();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('sem certificações mostra o texto de vazio', async () => {
    await renderizar(
      <ResumoMotorista
        nome="Maria Souza"
        veiculo="Van"
        placa="XYZ9W87"
        capacidadeKg={1500}
        certificacoes={[]}
      />,
    );
    expect(screen.getByText('Nenhuma certificação cadastrada.')).toBeOnTheScreen();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });
});
