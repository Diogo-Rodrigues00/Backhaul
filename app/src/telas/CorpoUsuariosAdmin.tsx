// Corpo dos usuários do admin (card 041): até 200 usuários, mais recentes primeiro, só leitura. Sem
// atualização automática (ADR 0010): só "Atualizar". Só os campos que a API devolve para esta tela
// (nunca senha, CPF, CNPJ nem CNH): cada cartão recebe campos nomeados, nada é espalhado. Abre por
// React.lazy (`CorpoUsuariosAdmin.carregar.ts`), fora do JS inicial da rota.
import { View } from 'react-native';

import { useUsuariosAdmin } from '@/api/admin.hooks';
import { Link } from '@/components/atoms/Link';
import { Texto } from '@/components/atoms/Texto';
import { Titulo } from '@/components/atoms/Titulo';
import { EstadoErro } from '@/components/molecules/EstadoErro';
import { Lista } from '@/components/molecules/Lista';
import { CartaoUsuarioAdmin } from '@/components/organisms/CartaoUsuarioAdmin';
import { useCasca } from '@/components/organisms/useCasca';
import { ConteudoLista, type EstadoLista } from '@/components/templates/TemplateLista';
import { ErroApi } from '@/lib/erros';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

export const ANUNCIO_USUARIOS_ATUALIZADOS = 'Usuários atualizados';
/** A API devolve no máximo 200 usuários. */
export const LIMITE_USUARIOS_ADMIN = 200;

/** Só a mensagem de erro de negócio (403, 404, 409 com `erro`) aparece; 500 e falhas usam o padrão. */
function mensagemDeErro(erro: unknown): string | undefined {
  return erro instanceof ErroApi && erro.tipo === 'mensagem' ? erro.mensagens.join(' ') : undefined;
}

function criarEstilos({ space }: TemaVisual) {
  return { bloco: { gap: space[4] } } as const;
}

export default function CorpoUsuariosAdmin() {
  const { habilitado } = useCasca();
  const estilos = useEstilos(criarEstilos);
  const consulta = useUsuariosAdmin({ habilitado });
  const usuarios = consulta.data?.usuarios;
  const falhouComDados = consulta.isError && usuarios !== undefined;

  const estado: EstadoLista = usuarios
    ? usuarios.length === 0
      ? 'vazio'
      : 'pronto'
    : consulta.isError
      ? 'erro'
      : 'carregando';

  return (
    <ConteudoLista
      estado={estado}
      textoCarregando="Carregando usuários…"
      vazio={{
        titulo: 'Nenhum usuário cadastrado',
        descricao: 'Os usuários aparecem aqui quando alguém se cadastrar.',
        acao: <Link href="/admin">Voltar ao resumo</Link>,
        icone: 'user',
      }}
      erro={{
        mensagem: mensagemDeErro(consulta.error),
        aoTentarDeNovo: () => void consulta.refetch(),
      }}
      aoAtualizar={() => consulta.refetch()}
      atualizando={consulta.isFetching}
      anuncioAtualizado={falhouComDados ? '' : ANUNCIO_USUARIOS_ATUALIZADOS}
    >
      <View style={estilos.bloco}>
        {falhouComDados ? (
          <EstadoErro
            mensagem={mensagemDeErro(consulta.error)}
            aoTentarDeNovo={() => consulta.refetch()}
            tentando={consulta.isFetching}
          />
        ) : null}
        <Titulo nivel={2}>Usuários cadastrados</Titulo>
        {(usuarios?.length ?? 0) >= LIMITE_USUARIOS_ADMIN ? (
          <Texto cor="secundario">{`Mostrando os ${LIMITE_USUARIOS_ADMIN} mais recentes.`}</Texto>
        ) : null}
        <Lista
          rotulo="Usuários da plataforma"
          itens={usuarios ?? []}
          chave={(usuario) => usuario.id}
          renderizarItem={(usuario) => (
            <CartaoUsuarioAdmin
              nome={usuario.nome}
              email={usuario.email}
              tipo={usuario.tipo}
              ativo={usuario.ativo}
              criadoEm={usuario.criado_em}
            />
          )}
        />
      </View>
    </ConteudoLista>
  );
}
