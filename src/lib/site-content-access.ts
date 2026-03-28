import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

export interface HeroContent {
  title: string;
  subtitle: string;
  ctaText: string;
  videoUrl: string; // YouTube URL ou Firebase Storage URL
  heroImageUrl?: string; // Firebase Storage URL para imagem de fundo
  heroImageFile?: File; // Para upload temporário
  videoFile?: File; // Para upload temporário de vídeo
}

export interface PlanFeature {
  text: string;
  checked?: boolean;
}

export interface Plan {
  id: string;
  name: string;
  subtitle: string;
  price: string;
  icon: 'zap' | 'flame' | 'crown';
  badge?: string;
  isFeatured?: boolean;
  features: PlanFeature[];
}

export interface SiteContent {
  hero: HeroContent;
  plans: Plan[];
  updatedAt?: any;
}

const SITE_CONTENT_DOC = 'default';

// Carrega o conteúdo do site do Firestore
export async function loadSiteContent(): Promise<SiteContent | null> {
  try {
    const docRef = doc(db, 'site_content', SITE_CONTENT_DOC);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as SiteContent;
    }
    return null;
  } catch (error) {
    console.error("Erro ao carregar site_content:", error);
    return null;
  }
}

// Salva o conteúdo do site no Firestore
export async function saveSiteContent(content: SiteContent): Promise<void> {
  try {
    const docRef = doc(db, 'site_content', SITE_CONTENT_DOC);
    await setDoc(docRef, {
      ...content,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error("Erro ao salvar site_content:", error);
    throw error;
  }
}

// Retorna conteúdo padrão se nenhum existir no Firestore
export function getDefaultContent(): SiteContent {
  return {
    hero: {
      title: 'Gestão de Bar \nFeita Simples',
      subtitle: 'Controle total do seu bar na palma da sua mão. Pedidos, mesas, cozinha e financeiro em um só lugar.',
      ctaText: 'Teste Grátis',
      videoUrl: ''
    },
    plans: [
      {
        id: 'essential',
        name: 'Essencial',
        subtitle: 'Para bares iniciantes e pequenos.',
        price: '99',
        icon: 'zap',
        features: [
          { text: 'Até 10 Mesas Ativas' },
          { text: 'Cadastro de 50 Produtos' },
          { text: 'Relatórios Básicos' },
          { text: '1 Usuário Admin' },
          { text: 'Suporte via Email' }
        ]
      },
      {
        id: 'pro',
        name: 'Profissional',
        subtitle: 'Gestão completa para crescer.',
        price: '199',
        icon: 'flame',
        badge: 'Mais Vendido',
        isFeatured: true,
        features: [
          { text: 'Mesas Ilimitadas', checked: true },
          { text: 'Produtos Ilimitados', checked: true },
          { text: 'Relatórios Financeiros Avançados', checked: true },
          { text: 'Até 5 Usuários (Garçons)', checked: true },
          { text: 'Monitor de Cozinha', checked: true },
          { text: 'Suporte Prioritário', checked: true }
        ]
      }
    ]
  };
}
