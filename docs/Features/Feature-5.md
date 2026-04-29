# Adições de funcionalidades
- Adicionar filtro de período nas exportações da tela de métricas, aplicável tanto ao fluxo "Exportar XLSX" quanto ao fluxo "Exportar Arquivadas", com seleção de data inicial e data final e validação de intervalo válido;
- Adicionar suporte a check-list na descrição das tarefas (formato lista de marcação), com persistência do estado de cada item e atualização automática no histórico da tarefa contendo data/hora da marcação/desmarcação e usuário responsável;
- Adicionar coluna fixa "Arquivadas" no board (visível somente para perfis de Líder), com regra de entrada exclusivamente via ação "Arquivar tarefa" executada pelo responsável da tarefa ou por um Líder;
- Adicionar política de retenção para tarefas na coluna "Arquivadas": após 7 dias corridos sem movimentação, a tarefa deve sair da visualização do board e permanecer acessível apenas via exportação em "Exportar Arquivadas";
- Adicionar possibilidade de reativação de tarefa arquivada durante a janela de 7 dias, permitindo que o Líder arraste a tarefa para coluna anterior para torná-la novamente visível a todos os membros do projeto;
- Adicionar funcionalidade de edição e exclusão de comentários em tarefas, com controle de permissão para autor do comentário e/ou Líder do projeto;
- Adicionar validação de lembretes para impedir seleção de data de lembrete anterior à data atual, exibindo mensagem de aviso quando o usuário tentar salvar valor inválido;
- Adicionar menu de ações ("3 pontos") na coluna "Finalizadas" para arquivamento em lote de todas as tarefas da coluna, com confirmação antes da execução;
- Adicionar opção "Excluir tarefa" como botão vermelho no modal/cartão da tarefa, posicionada abaixo do botão "Arquivar tarefa" (amarelo), com confirmação explícita antes da exclusão.

# Correções/Modificações de funcionalidades
- Ajustar exportação XLSX para remover a coluna "E-mail" do arquivo gerado;
- Ajustar cabeçalho/campo de "Prioridade" no arquivo exportado para nomenclatura em pt-BR.
