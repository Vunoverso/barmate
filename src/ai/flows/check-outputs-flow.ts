'use server';
/**
 * @fileOverview Um agente de IA para conferir saídas de produtos de uma comanda.
 *
 * - checkOutputs - Uma função que compara uma lista de texto com os itens de uma comanda.
 * - CheckOutputsInput - O tipo de entrada para a função.
 * - CheckOutputsOutput - O tipo de retorno para a função.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const CheckOutputsInputSchema = z.object({
  pastedText: z.string().describe("A lista de itens de saída, colada pelo usuário, com um item por linha."),
  orderItemsJson: z.string().describe("Uma string JSON de um array de objetos `OrderItem`, representando os itens oficiais da comanda."),
  orderName: z.string().describe("O nome da comanda que está sendo verificada."),
});
export type CheckOutputsInput = z.infer<typeof CheckOutputsInputSchema>;

const CheckOutputsOutputSchema = z.object({
  isCorrect: z.boolean().describe("Indica se a lista colada corresponde exatamente aos itens da comanda."),
  summary: z.string().describe("Um resumo conciso do resultado da verificação. Ex: 'Tudo certo!' ou 'Encontramos divergências.'"),
  discrepancies: z.array(z.string()).describe("Uma lista de strings descrevendo cada divergência encontrada. Ex: 'Item \"Batata Frita\" está faltando na lista', 'Quantidade de \"Cerveja\" está incorreta (pedido: 2, lista: 1)'.")
});
export type CheckOutputsOutput = z.infer<typeof CheckOutputsOutputSchema>;

export async function checkOutputs(input: CheckOutputsInput): Promise<CheckOutputsOutput> {
  return checkOutputsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'checkOutputsPrompt',
  input: { schema: CheckOutputsInputSchema },
  output: { schema: CheckOutputsOutputSchema },
  prompt: `Você é um assistente de conferência para um bar. Sua tarefa é comparar a lista de produtos de uma comanda com a lista de produtos que estão saindo.

A comanda se chama: "{{orderName}}".

Os itens OFICIAIS da comanda estão neste JSON:
\`\`\`json
{{{orderItemsJson}}}
\`\`\`

A lista de itens que estão saindo (fornecida pelo usuário) é:
\`\`\`
{{{pastedText}}}
\`\`\`

Compare as duas listas e verifique as seguintes condições:
1.  Todos os itens da comanda estão na lista de saída.
2.  Todos os itens da lista de saída estão na comanda.
3.  As quantidades de cada item batem exatamente. Ignore letras maiúsculas/minúsculas na comparação dos nomes.

Se tudo estiver correto, defina \`isCorrect\` como \`true\`, escreva um \`summary\` amigável como "Tudo certo! A saída bate com a comanda '{{orderName}}'." e deixe \`discrepancies\` como um array vazio.

Se houver QUALQUER divergência, defina \`isCorrect\` como \`false\`, escreva um \`summary\` como "Atenção: Foram encontradas divergências na comanda '{{orderName}}'." e preencha o array \`discrepancies\` com uma descrição clara e objetiva de CADA problema encontrado.
Exemplos de divergências:
- "Item 'Batata Frita' está na comanda mas não foi encontrado na lista de saída."
- "Item 'Água com gás' foi encontrado na lista de saída mas não pertence a esta comanda."
- "A quantidade de 'Cerveja Pilsen' está errada. Comanda pedia 2, mas na lista de saída consta 1."
`,
});

const checkOutputsFlow = ai.defineFlow(
  {
    name: 'checkOutputsFlow',
    inputSchema: CheckOutputsInputSchema,
    outputSchema: CheckOutputsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
