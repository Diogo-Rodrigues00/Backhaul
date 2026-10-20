# ADR 0006 — Sessão e armazenamento do token (web e iPhone)

- **Data:** 2026-10-20 · **Status:** proposto · **Autor:** tech-lead

## Contexto
JWT de 7 dias no corpo do `POST /login`, enviado como Bearer. Sem refresh, sem logout no servidor. Sessão deve sobreviver a recarregar (web) e reabrir (iPhone). 401 apaga o token e volta ao login com aviso (CT-04). A web é pré-renderizada em Node, sem acesso a `localStorage`.

## Decisão
**Armazenamento** (`src/lib/armazenamento.ts` + `.web.ts`/`.native.ts`), API assíncrona única: `ler(chave)`, `gravar(chave, valor)`, `apagar(chave)`.
- iPhone: `expo-secure-store` (Keychain).
- Web: `localStorage` (envolto em `try/catch`; sem `localStorage` vira memória).
- Chaves fixas em `src/lib/armazenamento.ts`: `backhaul.token`, `backhaul.tema`, `backhaul.disponibilidadeAtiva`.

**Sessão** (`src/state/sessao/`): `SessaoProvider` + `useSessao()` expõe
`{ estado: 'restaurando' | 'anonimo' | 'autenticado', usuario: Usuario | null, entrar(email, senha), sair(aviso?), }`.
- Primeiro render sempre `restaurando` (igual ao HTML estático, sem erro de hidratação). Em efeito: lê o token; se existe, chama `GET /eu`; 200 → `autenticado`; 401/404 → apaga token e vai a `anonimo` com aviso.
- `entrar`: `POST /login` → grava token → `GET /eu` → `autenticado` → `router.replace` para a área do tipo (empresa `/empresa/cargas`, motorista `/motorista/cargas`, admin `/admin`).
- `sair(aviso?)`: apaga token e disponibilidade ativa, `queryClient.clear()`, `router.replace('/entrar' + (aviso ? '?aviso=' + aviso : ''))`. Avisos: `sessao-expirada` ("Sua sessão expirou. Entre de novo."), `conta-nao-encontrada`.
- Registra no cliente (`configurarCliente`) `obterToken` e `aoSessaoExpirada = () => sair('sessao-expirada')`.
- Guardas nos `_layout.tsx` de `empresa/`, `motorista/`, `admin/`: em efeito, `anonimo` → `/entrar`; tipo errado → área do próprio tipo. Enquanto `restaurando`, a casca e o `<Slot />` renderizam (h1 estático aparece), mas as queries ficam desabilitadas.
- Rotas públicas (`/`, `/entrar`, `/cadastro/*`) com sessão `autenticado` redirecionam para a área do tipo.
- Voltar no navegador após sair não mostra dados: `queryClient.clear()` + guarda.

## Alternativas
- **Cookie httpOnly:** mais seguro na web, mas a API não emite cookie (só Bearer) e não podemos mudar o backend.
- **AsyncStorage no iPhone:** sem criptografia; o SecureStore já vem no Expo Go.
- **Decodificar o JWT para saber a expiração:** desnecessário; o 401 já resolve e evita lógica de relógio.

## Consequências
- Token na web fica exposto a XSS (mitigado: sem HTML vindo da API, sem `dangerouslySetInnerHTML` com dado externo).
- Testes de sessão usam o armazenamento em memória (mock do módulo).
