import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export type MediaType = 'image' | 'video';

interface UploadOptions {
  onProgress?: (progress: number) => void;
  maxSizeMB?: number;
}

// Validar tipo de arquivo
export function isValidMediaFile(file: File, type: MediaType): boolean {
  if (type === 'image') {
    return file.type.startsWith('image/') && ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type);
  }
  if (type === 'video') {
    return file.type.startsWith('video/') && ['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type);
  }
  return false;
}

// Validar tamanho do arquivo
export function validateFileSize(file: File, maxSizeMB: number = 50): { valid: boolean; error?: string } {
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `Arquivo muito grande. Máximo: ${maxSizeMB}MB. Seu arquivo: ${(file.size / 1024 / 1024).toFixed(2)}MB`
    };
  }
  return { valid: true };
}

// Upload de arquivo para Firebase Storage
export async function uploadMediaFile(
  file: File,
  type: MediaType,
  organizationId?: string,
  options?: UploadOptions
): Promise<string> {
  const { maxSizeMB = 50 } = options || {};

  // Validar tipo
  if (!isValidMediaFile(file, type)) {
    throw new Error(`Tipo de arquivo inválido. Aceitos: ${type === 'image' ? 'JPG, PNG, WebP, GIF' : 'MP4, WebM, MOV'}`);
  }

  // Validar tamanho
  const sizeValidation = validateFileSize(file, maxSizeMB);
  if (!sizeValidation.valid) {
    throw new Error(sizeValidation.error);
  }

  // Gerar caminho único
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  const folder = organizationId ? `org_${organizationId}` : 'public';
  const fileName = `${type}/${folder}/${timestamp}_${randomId}_${file.name}`;

  try {
    const storageRef = ref(storage, fileName);
    
    // Upload
    await uploadBytes(storageRef, file);

    // Obter URL de download
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    throw new Error('Erro ao fazer upload do arquivo. Tente novamente.');
  }
}

// Deletar arquivo do Storage
export async function deleteMediaFile(fileUrl: string): Promise<void> {
  try {
    // Extrair o caminho do arquivo da URL
    const url = new URL(fileUrl);
    const pathSegments = url.pathname.split('/');
    
    // Encontrar 'o/' que indica o início do caminho do arquivo
    const oIndex = pathSegments.indexOf('o');
    if (oIndex === -1) {
      throw new Error('URL inválida');
    }

    // Reconstruir o caminho do arquivo (entre 'o/' e '?alt=media')
    const filePath = pathSegments.slice(oIndex + 1).join('/').split('?')[0];
    const decodedPath = decodeURIComponent(filePath);

    const fileRef = ref(storage, decodedPath);
    await deleteObject(fileRef);
  } catch (error) {
    console.error('Erro ao deletar arquivo:', error);
    // Não lançar erro, pois o arquivo pode ter sido deletado manualmente
  }
}

// Obter URL de thumbnail para vídeo (usando primeiro frame)
export function getVideoThumbnailUrl(videoUrl: string): string {
  // Se for YouTube, retornar thumbnail do YouTube
  if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
    let videoId = '';
    if (videoUrl.includes('v=')) {
      videoId = videoUrl.split('v=')[1].split('&')[0];
    } else if (videoUrl.includes('youtu.be/')) {
      videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
    }
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }
  // Para vídeos do Storage, retornar imagem padrão
  return '/video-placeholder.svg';
}
