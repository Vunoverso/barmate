'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { loadSiteContent, saveSiteContent, getDefaultContent, type SiteContent, type Plan, type PlanFeature } from '@/lib/site-content-access';
import { Plus, Trash2, Save } from 'lucide-react';

export default function SiteContentPage() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      setIsLoading(true);
      const savedContent = await loadSiteContent();
      setContent(savedContent || getDefaultContent());
    } catch (error) {
      console.error("Erro ao carregar conteúdo:", error);
      toast({
        title: 'Erro',
        description: 'Não consegui carregar o conteúdo. Usando valores padrão.',
        variant: 'destructive'
      });
      setContent(getDefaultContent());
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!content) return;
    
    try {
      setIsSaving(true);
      await saveSiteContent(content);
      toast({
        title: 'Sucesso!',
        description: 'Conteúdo do site salvo com sucesso.'
      });
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: 'Erro',
        description: 'Não consegui salvar o conteúdo. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateHero = (field: string, value: string) => {
    if (!content) return;
    const currentContent = content;
    setContent({
      ...currentContent,
      hero: {
        ...currentContent.hero,
        [field]: value
      }
    });
  };

  const updatePlan = (planId: string, field: string, value: any) => {
    if (!content) return;
    setContent({
      ...content,
      plans: content.plans.map(plan =>
        plan.id === planId ? { ...plan, [field]: value } : plan
      )
    });
  };

  const updatePlanFeature = (planId: string, featureIndex: number, field: string, value: any) => {
    if (!content) return;
    setContent({
      ...content,
      plans: content.plans.map(plan =>
        plan.id === planId
          ? {
              ...plan,
              features: plan.features.map((feature, idx) =>
                idx === featureIndex ? { ...feature, [field]: value } : feature
              )
            }
          : plan
      )
    });
  };

  const addPlanFeature = (planId: string) => {
    if (!content) return;
    setContent({
      ...content,
      plans: content.plans.map(plan =>
        plan.id === planId
          ? {
              ...plan,
              features: [...plan.features, { text: '', checked: false }]
            }
          : plan
      )
    });
  };

  const removePlanFeature = (planId: string, featureIndex: number) => {
    if (!content) return;
    setContent({
      ...content,
      plans: content.plans.map(plan =>
        plan.id === planId
          ? {
              ...plan,
              features: plan.features.filter((_, idx) => idx !== featureIndex)
            }
          : plan
      )
    });
  };

  if (isLoading) {
    return <div className="p-8 text-center">Carregando conteúdo...</div>;
  }

  if (!content) {
    return <div className="p-8 text-center text-red-500">Erro ao carregar conteúdo</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Conteúdo do Site</h1>
          <p className="text-muted-foreground mt-1">Edite o hero, planos e conteúdo sem código</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} size="lg" className="gap-2">
          <Save className="h-4 w-4" />
          {isSaving ? 'Salvando...' : 'Publicar Alterações'}
        </Button>
      </div>

      <Tabs defaultValue="hero" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="hero">Hero da Página Inicial</TabsTrigger>
          <TabsTrigger value="plans">Planos e Preços</TabsTrigger>
        </TabsList>

        {/* TAB HERO */}
        <TabsContent value="hero" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Seção Hero (Topo da Página Inicial)</CardTitle>
              <CardDescription>Edite o título, subtítulo e vídeo de apresentação</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="hero-title">Título Principal</Label>
                <Textarea
                  id="hero-title"
                  value={content.hero.title}
                  onChange={(e) => updateHero('title', e.target.value)}
                  placeholder="Ex: Gestão de Bar Feita Simples"
                  rows={3}
                  className="font-bold text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hero-subtitle">Subtítulo</Label>
                <Textarea
                  id="hero-subtitle"
                  value={content.hero.subtitle}
                  onChange={(e) => updateHero('subtitle', e.target.value)}
                  placeholder="Ex: Controle total do seu bar na palma da sua mão..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hero-cta">Texto do Botão CTA</Label>
                <Input
                  id="hero-cta"
                  value={content.hero.ctaText}
                  onChange={(e) => updateHero('ctaText', e.target.value)}
                  placeholder="Ex: Teste Grátis"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hero-video">URL do Vídeo (YouTube)</Label>
                <Input
                  id="hero-video"
                  value={content.hero.videoUrl}
                  onChange={(e) => updateHero('videoUrl', e.target.value)}
                  placeholder="Ex: https://www.youtube.com/watch?v=..."
                  type="url"
                />
                <p className="text-sm text-muted-foreground">
                  Deixe em branco para não mostrar vídeo. Aceita URLs completas do YouTube.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB PLANOS */}
        <TabsContent value="plans" className="space-y-6">
          {content.plans.map((plan) => (
            <Card key={plan.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Plano: {plan.name}</CardTitle>
                    <CardDescription>{plan.subtitle}</CardDescription>
                  </div>
                  {plan.isFeatured && (
                    <span className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm font-bold">
                      Destaque
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`plan-name-${plan.id}`}>Nome do Plano</Label>
                    <Input
                      id={`plan-name-${plan.id}`}
                      value={plan.name}
                      onChange={(e) => updatePlan(plan.id, 'name', e.target.value)}
                      placeholder="Ex: Essencial"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`plan-price-${plan.id}`}>Preço (R$)</Label>
                    <Input
                      id={`plan-price-${plan.id}`}
                      value={plan.price}
                      onChange={(e) => updatePlan(plan.id, 'price', e.target.value)}
                      placeholder="Ex: 99"
                      type="number"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`plan-subtitle-${plan.id}`}>Descrição</Label>
                  <Textarea
                    id={`plan-subtitle-${plan.id}`}
                    value={plan.subtitle}
                    onChange={(e) => updatePlan(plan.id, 'subtitle', e.target.value)}
                    placeholder="Ex: Para bares iniciantes..."
                    rows={2}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Funcionalidades</Label>
                    <Button
                      onClick={() => addPlanFeature(plan.id)}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar Feature
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex gap-3">
                        <Input
                          value={feature.text}
                          onChange={(e) =>
                            updatePlanFeature(plan.id, idx, 'text', e.target.value)
                          }
                          placeholder="Ex: Até 10 Mesas Ativas"
                          className="flex-1"
                        />
                        <button
                          onClick={() => {
                            const newChecked = !feature.checked;
                            updatePlanFeature(plan.id, idx, 'checked', newChecked);
                          }}
                          className={`px-3 py-2 rounded border-2 font-bold text-sm transition-colors ${
                            feature.checked
                              ? 'bg-green-100 border-green-500 text-green-700'
                              : 'bg-gray-100 border-gray-300 text-gray-600'
                          }`}
                        >
                          {feature.checked ? '✓' : '○'}
                        </button>
                        <Button
                          onClick={() => removePlanFeature(plan.id, idx)}
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {plan.badge && (
                  <div className="space-y-2">
                    <Label htmlFor={`plan-badge-${plan.id}`}>Badge/Label (opcional)</Label>
                    <Input
                      id={`plan-badge-${plan.id}`}
                      value={plan.badge}
                      onChange={(e) => updatePlan(plan.id, 'badge', e.target.value)}
                      placeholder="Ex: Mais Vendido"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={loadContent}>
          Descartar Alterações
        </Button>
        <Button onClick={handleSave} disabled={isSaving} size="lg" className="gap-2">
          <Save className="h-4 w-4" />
          {isSaving ? 'Salvando...' : 'Publicar Alterações'}
        </Button>
      </div>
    </div>
  );
}
