'use server';
/**
 * @fileOverview Um agente de IA para conferir se uma despesa já foi lançada.
 *
 * - checkExpense - Uma função que verifica se um texto de despesa corresponde a alguma entrada financeira.
 * - CheckExpenseInput - O tipo de entrada para a função.
 * - CheckExpenseOutput - O tipo de retorno para a função.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const CheckExpenseInputSchema = z.object({
  pastedText: z.string().describe("O texto da despesa colado pelo usuário, contendo valor e descrição. Ex: '135,90 mercado' ou 'Luz 250,00'"),
  financialEntriesJson: z.string().describe("Uma string JSON de um array de objetos `FinancialEntry` do tipo 'expense', representando as despesas já lançadas no período."),
  dateRange: z.object({
    from: z.string().describe("Data de início do período de busca no formato ISO."),
    to: z.string().describe("Data de fim do período de busca no formato ISO."),
  }).describe("O período de datas em que a busca está sendo feita.")
});
export type CheckExpenseInput = z.infer<typeof CheckExpenseInputSchema>;

const FoundEntrySchema = z.object({
  id: z.string().describe("O ID da despesa encontrada."),
  date: z.string().describe("A data da despesa encontrada."),
  description: z.string().describe("A descrição da despesa encontrada."),
  amount: z.number().describe("O valor da despesa encontrada."),
});

const CheckExpenseOutputSchema = z.object({
  isDuplicate: z.boolean().describe("Indica se uma ou mais despesas parecidas foram encontradas."),
  summary: z.string().describe("Um resumo conciso do resultado da verificação. Ex: 'Nenhuma despesa parecida encontrada.' ou 'Atenção: Encontrei uma despesa que parece ser a mesma.'"),
  foundEntries: z.array(FoundEntrySchema).describe("Uma lista de objetos descrevendo cada despesa similar encontrada.")
});
export type CheckExpenseOutput = z.infer<typeof CheckExpenseOutputSchema>;

export async function checkExpense(input: CheckExpenseInput): Promise<CheckExpenseOutput> {
  return checkExpenseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'checkExpensePrompt',
  input: { schema: CheckExpenseInputSchema },
  output: { schema: CheckExpenseOutputSchema },
  prompt: `Você é um assistente financeiro de um bar. Sua tarefa é verificar se uma nova despesa, informada pelo usuário, já foi lançada anteriormente em um período específico.

A nova despesa informada é: "{{pastedText}}".

As despesas JÁ LANÇADAS no período de {{dateRange.from}} a {{dateRange.to}} são:
\`\`\`json
{{{financialEntriesJson}}}
\`\`\`

Analise o texto "{{pastedText}}". Extraia o valor e a descrição. Por exemplo, em "135,90 mercado", o valor é 135.90 e a descrição é "mercado".

Compare o valor e a descrição extraídos com a lista de despesas já lançadas.
- A comparação de valor deve ser EXATA. Considere uma pequena margem de centavos se for o caso, mas prefira exatidão.
- A comparação da descrição deve ser por similaridade semântica (ex: "mercado" é similar a "compras mercado"). Ignore maiúsculas/minúsculas.

Se você encontrar UMA OU MAIS despesas que pareçam ser a mesma:
- Defina \`isDuplicate\` como \`true\`.
- Defina o \`summary\` como "Atenção: Encontrei uma ou mais despesas que podem ser a mesma.".
- Preencha \`foundEntries\` com os detalhes da(s) despesa(s) encontrada(s).

Se você não encontrar nenhuma despesa parecida:
- Defina \`isDuplicate\` como \`false\`.
- Defina o \`summary\` como "Nenhuma despesa parecida foi encontrada neste período.".
- Deixe \`foundEntries\` como um array vazio.
`,
});

const checkExpenseFlow = ai.defineFlow(
  {
    name: 'checkExpenseFlow',
    inputSchema: CheckExpenseInputSchema,
    outputSchema: CheckExpenseOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
