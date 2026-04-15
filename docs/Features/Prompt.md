Você é um desenvolvedor sênior em Next.js 16 (App Router) e PWA.
Quero que você implemente no meu projeto um fluxo para baixar/instalar o app PWA no celular (Android e iOS), com botão visível no sistema.

# Contexto do projeto:

- Stack: Next.js (App Router), React, Prisma, Supabase
- Objetivo: manter o sistema web atual e adicionar experiência de app instalável (PWA), sem criar app nativo
- Preciso de uma opção de download/instalação dentro da interface

# Requisitos obrigatórios:

## Configurar PWA corretamente para produção:
- manifest.webmanifest
- ícones necessários (192x192 e 512x512)
- theme_color e background_color
- display standalone
- start_url correto
- service worker funcionando para cache básico

## Criar botão Instalar App no frontend:
- Detectar beforeinstallprompt no Android/Chrome
- Salvar o evento e chamar prompt() ao clicar no botão
- Esconder ou desabilitar botão quando não for instalável
- Após instalação, tratar appinstalled

## Compatibilidade iOS:
- Como beforeinstallprompt não funciona no Safari iOS, mostrar instruções de instalação manual:
- “Compartilhar” > “Adicionar à Tela de Início”
- Exibir esse guia apenas em iOS/Safari quando necessário

## UX:
- Botão claro e acessível na navbar ou área visível
- Mensagem de sucesso após instalação
- Não quebrar layout desktop/mobile

## Regras técnicas:
- Não quebrar APIs existentes
- Não alterar lógica de Prisma/Supabase
- Não remover funcionalidades atuais
- Garantir build e deploy na Vercel

## Entrega:
- Faça as alterações diretamente nos arquivos necessários
- Mostre lista de arquivos alterados
- Explique o que cada alteração faz
- Inclua comandos para testar localmente
- Inclua checklist de validação em Android e iOS

## Critérios de aceite:
- Usuário Android consegue instalar pelo botão
- Usuário iOS recebe instrução manual correta
- App abre em modo standalone após instalado
- Projeto continua buildando normalmente

Se houver mais de uma abordagem possível, escolha a mais estável para Next.js 16 e explique por que escolheu.