/**
 * Textos legais. MINUTA: os textos definitivos de Termos de Uso e Política de
 * Privacidade (LGPD) devem vir do jurídico; aqui ficam os compromissos que o
 * produto já assume na especificação (docs/FAST_STREET_ESPECIFICACAO.md, seção 9).
 */
export type LegalDocId = 'termos' | 'privacidade';

export interface LegalDoc {
  title: string;
  version: string;
  sections: { heading: string; body: string }[];
}

export const LEGAL_DOCS: Record<LegalDocId, LegalDoc> = {
  termos: {
    title: 'Termos de Uso',
    version: '2026-10',
    sections: [
      {
        heading: 'O que é o Fast Street',
        body: 'Uma plataforma para encontrar e organizar eventos automotivos legalizados, em autódromos, pistas de arrancada e áreas privadas autorizadas.',
      },
      {
        heading: 'Segurança',
        body: 'Ao se inscrever em um evento, você confirma que leu as regras e que usará o equipamento de segurança obrigatório. Corridas em vias públicas não são permitidas nem divulgadas no app.',
      },
      {
        heading: 'Pagamentos',
        body: 'O Fast Street não processa pagamentos. Taxas, se houver, são combinadas diretamente com o organizador.',
      },
      {
        heading: 'Organizadores',
        body: 'Organizadores informam CPF ou CNPJ e telefone para verificação. Eventos podem ser denunciados e são analisados pela equipe em até 24 horas.',
      },
    ],
  },
  privacidade: {
    title: 'Política de Privacidade',
    version: '2026-10',
    sections: [
      {
        heading: 'Dados que coletamos',
        body: 'Nome, e-mail, cidade e, se você quiser, foto, bio e redes sociais. Para organizadores, também CPF ou CNPJ e telefone.',
      },
      {
        heading: 'Sua localização',
        body: 'Usada apenas para calcular a distância até eventos e parceiros. Sua posição nunca aparece para outros usuários.',
      },
      {
        heading: 'Seus direitos (LGPD)',
        body: 'Você pode exportar seus dados (arquivo enviado por e-mail em até 48 horas) e excluir sua conta (dados apagados em até 30 dias; resultados já publicados ficam anonimizados no ranking).',
      },
    ],
  },
};
