// Esqueleto dos handlers de mock. O card 004 instala o MSW e troca estas
// descrições por `http.get(...)`; aqui só fixamos a forma de `criarHandlers`.
// Contrato: docs/api.md (GET /saude).

export type DescricaoHandler = {
  metodo: 'GET' | 'POST' | 'PATCH';
  url: string;
  status: number;
  corpo: unknown;
};

export function criarHandlers(baseUrl: string): DescricaoHandler[] {
  return [
    {
      metodo: 'GET',
      url: `${baseUrl}/saude`,
      status: 200,
      corpo: { status: 'ok', banco: 'conectado' },
    },
  ];
}
