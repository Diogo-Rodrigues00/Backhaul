// Consulta `GET /disponibilidades/minhas` da área do motorista (MVP-11). Fica fora do JS inicial: abre
// por React.lazy (`ConsultaDasDisponibilidades.carregar.ts`), já com o cliente de dados (ADR 0004,
// adendo). Entrega o resultado ao `DisponibilidadeAtivaProvider` por `aoMudar`.
import { useEffect } from 'react';

import { useMinhasDisponibilidades } from '@/api/disponibilidades.hooks';

import { SEM_CONSULTA, type ResultadoConsulta } from './resultadoConsulta';

/**
 * Faz a consulta e entrega o resultado ao provider. Só existe montado com o motorista autenticado
 * (ADR 0004): fora disso nenhuma consulta é criada, e ao sair o cache limpo continua vazio.
 */
export function ConsultaDasDisponibilidades({
  aoMudar,
}: {
  aoMudar: (resultado: ResultadoConsulta) => void;
}) {
  const { data, error, isError, isPending, isFetching, refetch } = useMinhasDisponibilidades();

  useEffect(() => {
    aoMudar({ data, error, isError, isPending, isFetching, refetch });
  }, [aoMudar, data, error, isError, isPending, isFetching, refetch]);

  useEffect(() => () => aoMudar(SEM_CONSULTA), [aoMudar]);

  return null;
}

export default ConsultaDasDisponibilidades;
