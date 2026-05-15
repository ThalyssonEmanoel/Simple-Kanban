# Bug-Fix 2

## Escopo
- Fechar modal de tarefa com ESC e clique fora
- Comentários no modal não quebram linha
- Drag de tarefa falha com filtros ativos
- Multi-responsável deve poder arrastar tarefa
- Checklist precisa marcar vários itens e ficar mais rápido

## Roteiro por problema

### 1) Fechar modal com ESC e clique fora
- Arquivo: src/components/board/CardModal.js
- Adicionar listener de keydown (Escape) com cleanup.
- Fechar ao clicar no backdrop usando target === currentTarget.
- Garantir que cliques dentro do modal não fechem (stopPropagation no container).

### 2) Comentários não quebram linha
- Arquivo: src/components/board/CardModal.js (tab comments)
- O texto do comentário usa whitespace-pre-wrap, mas precisa quebrar palavras longas.
- Adicionar break-words no <p> do comentário e min-w-0 no container flex.
- Validar com comentário longo e URL grande.

### 3) Drag com filtros (prioridade e responsável)
- Arquivo: src/components/board/Board.js
- Problema: o DnD usa índices da lista filtrada, mas o splice usa a lista completa.
- Ajuste: localizar o card real pelo draggableId e mapear destination.index para o índice real.
  - Remover o card do source pelo id.
  - Montar a lista visível com filterCards(destCol.cards).
  - Se destination.index aponta para um card visível, inserir antes dele (índice real).
  - Se for no fim, inserir após o último visível ou no fim da lista completa.
- Enviar newPosition com o índice real para /api/cards/move.

### 4) Multi-responsável pode arrastar
- Arquivo: src/app/api/cards/move/route.js
- Hoje o MEMBER só pode mover se card.assigneeId ou creatorId = user.
- Incluir card.assignees (userId) na query e liberar se o user estiver na lista.

### 5) Checklist: marcar vários itens e performance
- Arquivos: src/components/board/CardModal.js, src/app/api/cards/[cardId]/route.js, src/lib/utils.js
- Hoje o toggle bloqueia tudo (togglingChecklist) e faz loadCard + onRefresh por item.
- Passos:
  1) Trocar togglingChecklist por Set/mapa por linha (permitir vários cliques).
  2) Adicionar modo de multi-seleção no checklist com botões "Marcar" e "Desmarcar".
  3) Criar payload batch no endpoint (ex: toggleChecklistIndices ou checklistUpdates).
  4) Aplicar update otimista via mutateCard, sem onRefresh por item.
  5) Opcional: fila/debounce de 200-300ms para agrupar cliques rápidos.

## Validação
- ESC e clique fora fecham o modal sem perder edições não salvas.
- Comentários longos quebram linha e não estouram o layout.
- Drag funciona com filtros ativos (mesma coluna e colunas diferentes).
- Usuário com qualquer responsável consegue mover a tarefa.
- Checklist permite marcar vários itens rapidamente sem travar o modal.
