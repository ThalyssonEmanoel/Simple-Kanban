# Sistema Kanban

Sistema simples de Kanban feito com Next.js, Supabase Auth e PostgreSQL via Prisma.

Esse projeto tem as seguintes funcionalidades:

- Criação de projetos;
- Entrar em projetos com código de convite;
- Organizar tarefas em colunas;
- Filtragem de cards por texto, responsável e prioridade;
- Comentários, anexo de arquivos e acompanhamento atividades;
- Visualização de métricas do projeto.

## Ferramentas

- Next.js 16;
- Javascript;
- Prisma Client;
- Supabase(autenticação por email/senha e Google próprios dele).

## Pré-requisitos

- Node.js 20+
- npm
- Docker (Logo terá imagens para subir o projeto locamente)

## Configuração do ambiente

Criar um arquivo `.env` na raiz com essas variáveis e utilizar as variáveis presentes no arquivo `.env.example`
substituindo os valores dela.

## Instalação

```bash
npm install
```
## Conexão com o Banco de dados

Seguir os passos estabelecido em **/docs/Connection**.

## Rodando localmente

```bash
npm run dev
```
e clicar em:

```text
http://localhost:3000
```

## Fluxo básico de uso

1. Crie uma conta ou entre com email/senha ou com a autenticação com o google;
2. Crie um projeto novo;
3. Compartilhe o código do projeto com outras pessoas;
4. Crie colunas e cards;
5. Arraste cards entre colunas para atualizar o status;
6. Acompanhe métricas na página de métricas do projeto.

## Estrutura principal

```text
src/
	app/
		api/                 # rotas da API (cards, colunas, projetos, métricas...)
		login/               # tela de login
		register/            # tela de cadastro
		project/[projectId]/ # quadro, métricas e configurações
	components/
		board/               # componentes do kanban
		layout/              # navbar e notificações
	lib/
		auth.js              # controle de sessão/autorização
		prisma.js            # cliente prisma
		supabase/            # clientes supabase
prisma/
	schema.prisma          # schema do banco
```

## Observações

- Uploads são salvos localmente em `public/uploads`
