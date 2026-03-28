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
import { uploadMediaFile, deleteMediaFile, isValidMediaFile, validateFileSize } from '@/lib/storage-upload';
import { Plus, Trash2, Save, Upload, X } from 'lucide-react';

export default function SiteContentPage() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [heroImagePreview, setHeroImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      setIsLoading(true);
      const savedContent = await loadSiteContent();
      const contentToSet = savedContent || getDefaultContent();
      setContent(contentToSet);
      
      // Carregar previews se existirem URLs
      if (contentToSet.hero.heroImageUrl) {
        setHeroImagePreview(contentToSet.hero.heroImageUrl);
      }
      if (contentToSet.hero.videoUrl && !contentToSet.hero.videoUrl.includes('youtube')) {
        setVideoPreview(contentToSet.hero.videoUrl);
      }
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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !content) return;

    // Validar
    if (!isValidMediaFile(file, 'image')) {
      toast({
        title: 'Erro',
        description: 'Apenas JPG, PNG, WebP e GIF são aceitos.',
        variant: 'destructive'
      });
      return;
    }

    const sizeCheck = validateFileSize(file, 10); // 10MB para imagem
    if (!sizeCheck.valid) {
      toast({
        title: 'Erro',
        description: sizeCheck.error,
        variant: 'destructive'
      });
      return;
    }

    try {
      setUploadingImage(true);
      
      // Deletar imagem antiga se existir
      if (content.hero.heroImageUrl) {
        await deleteMediaFile(content.hero.heroImageUrl);
      }

      // Upload
      const url = await uploadMediaFile(file, 'image');
      
      // Atualizar conteúdo
      setContent({
        ...content,
        hero: {
          ...content.hero,
          heroImageUrl: url
        }
      });

      // Preview
      setHeroImagePreview(url);
      
      toast({
        title: 'Sucesso!',
        description: 'Imagem enviada com sucesso.'
      });
    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao fazer upload da imagem.',
        variant: 'destructive'
      });
    } finally {
      setUploadingImage(false);
      event.target.value = '';
    }
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !content) return;

    // Validar
    if (!isValidMediaFile(file, 'video')) {
      toast({
        title: 'Erro',
        description: 'Apenas MP4, WebM e MOV são aceitos.',
        variant: 'destructive'
      });
      return;
    }

    const sizeCheck = validateFileSize(file, 100); // 100MB para vídeo
    if (!sizeCheck.valid) {
      toast({
        title: 'Erro',
        description: sizeCheck.error,
        variant: 'destructive'
      });
      return;
    }

    try {
      setUploadingVideo(true);
      
      // Deletar vídeo antigo se existir (e não for YouTube)
      if (content.hero.videoUrl && !content.hero.videoUrl.includes('youtube')) {
        await deleteMediaFile(content.hero.videoUrl);
      }

      // Upload
      const url = await uploadMediaFile(file, 'video');
      
      // Atualizar conteúdo
      setContent({
        ...content,
        hero: {
          ...content.hero,
          videoUrl: url
        }
      });

      // Preview
      setVideoPreview(url);
      
      toast({
        title: 'Sucesso!',
        description: 'Vídeo enviado com sucesso.'
      });
    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao fazer upload do vídeo.',
        variant: 'destructive'
      });
    } finally {
      setUploadingVideo(false);
      event.target.value = '';
    }
  };

  const removeImage = async () => {
    if (!content) return;
    try {
      if (content.hero.heroImageUrl) {
        await deleteMediaFile(content.hero.heroImageUrl);
      }
      setContent({
        ...content,
        hero: {
          ...content.hero,
          heroImageUrl: undefined
        }
      });
      setHeroImagePreview(null);
      toast({
        title: 'Removido',
        description: 'Imagem removida com sucesso.'
      });
    } catch (error) {
      console.error('Erro ao remover imagem:', error);
    }
  };

  const removeVideo = async () => {
    if (!content) return;
    try {
      if (content.hero.videoUrl && !content.hero.videoUrl.includes('youtube')) {
        await deleteMediaFile(content.hero.videoUrl);
      }
      setContent({
        ...content,
        hero: {
          ...content.hero,
          videoUrl: ''
        }
      });
      setVideoPreview(null);
      toast({
        title: 'Removido',
        description: 'Vídeo removido com sucesso.'
      });
    } catch (error) {
      console.error('Erro ao remover vídeo:', error);
    }
  }

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
                <Label>Imagem de Fundo do Hero</Label>
                <div className="border-2 border-dashed border-muted-foreground rounded-lg p-6 text-center space-y-4">
                  {heroImagePreview ? (
                    <div className="relative inline-block">
                      <img 
                        src={heroImagePreview} 
                        alt="Preview da imagem" 
                        className="max-w-xs h-auto rounded-lg"
                      />
                      <button
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="py-4">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Clique para fazer upload</p>
                      <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP, GIF | Máx 10MB</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    style={{ position: 'absolute' }}
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="block w-full mt-2 text-sm"
                  />
                  {uploadingImage && <p className="text-sm text-primary">Enviando imagem...</p>}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="hero-video-youtube">URL do Vídeo (YouTube)</Label>
                  <Input
                    id="hero-video-youtube"
                    value={content.hero.videoUrl && content.hero.videoUrl.includes('youtube') ? content.hero.videoUrl : ''}
                    onChange={(e) => updateHero('videoUrl', e.target.value)}
                    placeholder="Ex: https://www.youtube.com/watch?v=..."
                    type="url"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Deixe em branco se preferir usar upload local</p>
                </div>

                <div className="border-t pt-4">
                  <Label>Ou Fazer Upload de Vídeo Local</Label>
                  <div className="border-2 border-dashed border-muted-foreground rounded-lg p-6 text-center space-y-4 mt-2">
                    {videoPreview && !content.hero.videoUrl?.includes('youtube') ? (
                      <div className="relative inline-block">
                        <video 
                          src={videoPreview}
                          className="max-w-xs h-auto rounded-lg"
                          controls
                        />
                        <button
                          onClick={removeVideo}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="py-4">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Clique para fazer upload</p>
                        <p className="text-xs text-muted-foreground mt-1">MP4, WebM, MOV | Máx 100MB</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      disabled={uploadingVideo}
                      className="block w-full mt-2 text-sm"
                    />
                    {uploadingVideo && <p className="text-sm text-primary">Enviando vídeo...</p>}
                  </div>
                </div>
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
