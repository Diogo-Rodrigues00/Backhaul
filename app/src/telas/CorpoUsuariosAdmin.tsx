// Corpo dos usuários do admin (card 041): até 200 usuários, mais recentes primeiro, só leitura. Sem
// atualização automática (ADR 0010): só "Atualizar". Só os campos que a API devolve para esta tela
// (nunca senha, CPF, CNPJ nem CNH): cada cartão recebe campos nomeados, nada é espalhado. Abre por
// React.lazy (`CorpoUsuariosAdmin.carregar.ts`), fora do JS inicial da rota.
import { useState } from 'react';
import { View } from 'react-native';

import { useUsuariosAdmin } from '@/api/admin.hooks';
import { useAlterarUsuarioAdmin } from '@/api/alterarUsuarioAdmin.hooks';
import { Link } from '@/components/atoms/Link';
import { Texto } from '@/components/atoms/Texto';
import { Titulo } from '@/components/atoms/Titulo';
import { EstadoErro } from '@/components/molecules/EstadoErro';
import { Lista } from '@/components/molecules/Lista';
import { CartaoUsuarioAdmin } from '@/components/organisms/CartaoUsuarioAdmin';
import { DialogoConfirmacao } from '@/components/organisms/DialogoConfirmacao';
import { useCasca } from '@/components/organisms/useCasca';
import { ConteudoLista, type EstadoLista } from '@/components/templates/TemplateLista';
import { ErroApi, MENSAGEM_FALHA } from '@/lib/erros';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

export const ANUNCIO_USUARIOS_ATUALIZADOS = 'Usuários atualizados';
/** A API devolve no máximo 200 usuários. */
export const LIMITE_USUARIOS_ADMIN = 200;

/** Só a mensagem de erro de negócio (403, 404, 409 com `erro`) aparece; 500 e falhas usam o padrão. */
function mensagemDeErro(erro: unknown): string | undefined {
  return erro instanceof ErroApi && erro.tipo === 'mensagem' ? erro.mensagens.join(' ') : undefined;
}

/** Erro dentro do diálogo: a mensagem da API (403, 404, 409) ou a falha padrão. */
function mensagemDoDialogo(erro: unknown): string {
  return erro instanceof ErroApi ? erro.mensagens.join(' ') : MENSAGEM_FALHA;
}

function criarEstilos({ space }: TemaVisual) {
  return { bloco: { gap: space[4] } } as const;
}

export default function CorpoUsuariosAdmin() {
  const { habilitado } = useCasca();
  const estilos = useEstilos(criarEstilos);
  const consulta = useUsuariosAdmin({ habilitado });
  const usuarios = consulta.data?.usuarios;
  const alterar = useAlterarUsuarioAdmin();
  const [idAlvo, setIdAlvo] = useState<string | null>(null);
  const [erroDoDialogo, setErroDoDialogo] = useState<string | undefined>();
  const alvo = usuarios?.find((usuario) => usuario.id === idAlvo);
  const bloqueando = alvo?.ativo ?? true;

  const confirmar = async () => {
    if (!alvo) return;
    try {
      await alterar.mutateAsync({ id: alvo.id, ativo: !alvo.ativo });
      setIdAlvo(null);
    } catch (falha) {
      setErroDoDialogo(mensagemDoDialogo(falha));
    }
  };
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
              id={usuario.id}
              aoAlterar={(id) => {
                setErroDoDialogo(undefined);
                setIdAlvo(id);
              }}
              nome={usuario.nome}
              email={usuario.email}
              tipo={usuario.tipo}
              ativo={usuario.ativo}
              criadoEm={usuario.criado_em}
            />
          )}
        />
      </View>
      <DialogoConfirmacao
        aberto={alvo !== undefined}
        titulo={bloqueando ? 'Bloquear este usuário?' : 'Reativar este usuário?'}
        descricao={
          bloqueando
            ? `${alvo?.nome ?? alvo?.email ?? ''} não conseguirá mais entrar. As cargas e disponibilidades abertas serão canceladas. Fretes em andamento não mudam.`
            : `${alvo?.nome ?? alvo?.email ?? ''} poderá entrar de novo.`
        }
        rotuloConfirmar={bloqueando ? 'Bloquear usuário' : 'Reativar usuário'}
        rotuloCancelar="Voltar"
        rotuloCarregando={bloqueando ? 'Bloqueando…' : 'Reativando…'}
        variante={bloqueando ? 'perigo' : 'padrao'}
        carregando={alterar.isPending}
        erro={erroDoDialogo}
        aoConfirmar={confirmar}
        aoFechar={() => setIdAlvo(null)}
      />
    </ConteudoLista>
  );
}
