import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { View, type ViewStyle } from 'react-native';

import { usePublicarDisponibilidade } from '@/api/disponibilidades';
import type { CorpoPublicarDisponibilidade } from '@/api/tipos';
import { Botao } from '@/components/atoms/Botao';
import { Link } from '@/components/atoms/Link';
import { Texto } from '@/components/atoms/Texto';
import { Titulo } from '@/components/atoms/Titulo';
import { CampoNumero } from '@/components/molecules/CampoNumero';
import { aplicarErroApi, useEnvioUnico, useResumoErros } from '@/components/molecules/formulario';
import { GrupoOpcoes } from '@/components/molecules/GrupoOpcoes';
import { ResumoErros } from '@/components/molecules/ResumoErros';
import { CartaoFormulario, CelulaFormulario } from '@/components/organisms/CartaoFormulario';
import type { Local } from '@/components/organisms/SeletorLocal';
import { GradeComPrevia } from '@/components/templates/TemplateFormularioComPrevia';
import { anunciar } from '@/lib/a11y';
import { ErroApi } from '@/lib/erros';
import { paraNumero } from '@/lib/numeros';
import { calcularExpiraEm } from '@/lib/prazos';
import type { Urgencia } from '@/lib/rotulos';
import { numeroAte, numeroSemAmbiguidade, obrigatorio } from '@/lib/validacao';
import { useDisponibilidadeAtiva } from '@/state/disponibilidade-ativa/useDisponibilidadeAtiva';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

import { CampoLocal } from './CampoLocal';
import { encadear, OPCOES_DE_PRAZO, OPCOES_URGENCIA, PRAZO_PADRAO } from './camposComuns';

// Corpo da tela Publicar disponibilidade (card 023, MVP-10, D-PO-02/03/14/16). Carregado por
// React.lazy a partir de `app/motorista/disponibilidades/nova.tsx` (ADR 0011).

interface Valores {
  local: Local | null;
  /** Raio em km, como o texto digitado (o campo numérico trabalha com texto). */
  raio: string;
  urgencia: Urgencia;
  /** Horas até `expira_em`, como texto (o `GrupoOpcoes` trabalha com texto). */
  prazo: string;
}

const RAIO_PADRAO = '50';
const RAIO_MAXIMO_KM = 500;

// Campo da API → campo do formulário (ADR 0007, CT-03).
const CAMPOS_DA_API = {
  local: 'local',
  raio_busca_km: 'raio',
  urgencia: 'urgencia',
  expira_em: 'prazo',
} as const;

const ROTULOS = {
  local: 'Onde você está',
  raio: 'Raio de busca (km)',
  urgencia: 'Urgência',
  prazo: 'Prazo',
} as const;

const validarRaio = encadear(obrigatorio, numeroSemAmbiguidade, numeroAte(RAIO_MAXIMO_KM));

function exigirLocal(local: Local | null): true | string {
  return local !== null || 'Escolha onde você está ou use sua localização.';
}

function traduzirErro(erro: unknown): ErroApi {
  return erro instanceof ErroApi ? erro : ErroApi.falha();
}

function criarEstilos({ space }: TemaVisual) {
  return {
    apoio: { gap: space[4] } satisfies ViewStyle,
  } as const;
}

export default function FormularioPublicarDisponibilidade() {
  const estilos = useEstilos(criarEstilos);
  const router = useRouter();
  const publicar = usePublicarDisponibilidade();
  const { registrarPublicada } = useDisponibilidadeAtiva();

  const { control, handleSubmit, setError, setFocus, formState } = useForm<Valores>({
    defaultValues: { local: null, raio: RAIO_PADRAO, urgencia: 'normal', prazo: PRAZO_PADRAO },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    // O foco vai ao resumo de erros (CT-03), não ao primeiro campo: sem isto o react-hook-form
    // tira o foco do resumo logo depois de `aoInvalidar`. Os links do resumo focam cada campo.
    shouldFocusError: false,
  });
  const { isSubmitting } = formState;

  const resumo = useResumoErros<Valores>({
    setFocus,
    aoTentarDeNovo: (): Promise<void> => enviarUnico(),
    tentando: isSubmitting,
    rotulos: ROTULOS,
  });

  const enviar = handleSubmit(
    async (valores): Promise<void> => {
      resumo.limpar();
      const { local } = valores;
      const raio = paraNumero(valores.raio);
      // A validação já garantiu os dois; a checagem satisfaz o TypeScript sem `!`.
      if (local === null || raio === null) return;
      // Coordenadas e raio seguem como número (MVP-10); só lat e lng vão, sem o rótulo da cidade.
      const corpo: CorpoPublicarDisponibilidade = {
        local: { lat: local.lat, lng: local.lng },
        raio_busca_km: raio,
        urgencia: valores.urgencia,
        expira_em: calcularExpiraEm(Number(valores.prazo)),
      };
      let publicada;
      try {
        publicada = await publicar.mutateAsync(corpo);
      } catch (erro) {
        aplicarErroApi(traduzirErro(erro), {
          setError,
          campos: CAMPOS_DA_API,
          definirResumo: resumo.definirResumo,
          focarResumo: resumo.focarResumo,
        });
        return;
      }
      // A nova vira a ativa e fica guardada no aparelho (D-PO-03); "Cargas próximas" já busca com ela.
      registrarPublicada(publicada.disponibilidade);
      anunciar('Disponibilidade publicada');
      router.replace('/motorista/cargas');
    },
    (erros) => resumo.aoInvalidar(erros),
  );
  // Clique duplo, Enter + clique e "Tentar de novo" = uma requisição por vez (CT-01).
  const enviarUnico = useEnvioUnico((): Promise<void> => enviar());

  return (
    <GradeComPrevia
      previa={
        <View style={estilos.apoio}>
          <Titulo nivel={2}>Como funciona</Titulo>
          <Texto nivel="sm" cor="secundario">
            Ao publicar, esta disponibilidade passa a ser a ativa e você vê as cargas dentro do raio
            escolhido, da mais urgente para a menos urgente.
          </Texto>
          <Texto nivel="sm" cor="secundario">
            Depois do prazo ela deixa de valer. Você pode ter mais de uma e trocar a ativa em Minhas
            disponibilidades.
          </Texto>
        </View>
      }
    >
      <CartaoFormulario
        nome="Publicar disponibilidade"
        resumo={<ResumoErros {...resumo.props} />}
        aoEnviar={enviarUnico}
        acoes={
          <>
            <Link
              href="/motorista/disponibilidades"
              variante="botao"
              aparencia={{ variante: 'secundario', tamanho: 'lg' }}
            >
              Cancelar
            </Link>
            <Botao
              tamanho="lg"
              icone="plus"
              carregando={isSubmitting}
              rotuloCarregando="Publicando…"
              aoPressionar={enviarUnico}
            >
              Publicar disponibilidade
            </Botao>
          </>
        }
      >
        <CelulaFormulario cheia>
          <Controller
            control={control}
            name="local"
            rules={{ validate: exigirLocal }}
            render={({ field, fieldState }) => (
              <CampoLocal
                id="disponibilidade-local"
                rotulo={ROTULOS.local}
                campo={field}
                erro={fieldState.error?.message}
                permitirGps
              />
            )}
          />
        </CelulaFormulario>
        <CelulaFormulario cheia>
          <Controller
            control={control}
            name="raio"
            rules={{ validate: validarRaio }}
            render={({ field, fieldState }) => (
              <CampoNumero
                rotulo={ROTULOS.raio}
                ajuda="Até onde você aceita buscar carga. De 1 a 500 km."
                sufixo="km"
                modo="decimal"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
                erro={fieldState.error?.message}
              />
            )}
          />
        </CelulaFormulario>
        <CelulaFormulario cheia>
          <Controller
            control={control}
            name="urgencia"
            render={({ field, fieldState }) => (
              <GrupoOpcoes
                legenda={ROTULOS.urgencia}
                opcoes={OPCOES_URGENCIA}
                valor={field.value}
                aoMudar={field.onChange}
                erro={fieldState.error?.message}
              />
            )}
          />
        </CelulaFormulario>
        <CelulaFormulario cheia>
          <Controller
            control={control}
            name="prazo"
            render={({ field, fieldState }) => (
              <GrupoOpcoes
                legenda={ROTULOS.prazo}
                ajuda="Depois deste prazo a disponibilidade deixa de valer."
                opcoes={OPCOES_DE_PRAZO}
                valor={field.value}
                aoMudar={field.onChange}
                erro={fieldState.error?.message}
              />
            )}
          />
        </CelulaFormulario>
      </CartaoFormulario>
    </GradeComPrevia>
  );
}
