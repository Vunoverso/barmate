
"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import type { Testimonial } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MessageSquareHeart, CheckCircle2, XCircle, Trash2, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export default function AdminTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!db) return;
    const testimonialsCol = collection(db, 'testimonials');
    const q = query(testimonialsCol, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      } as Testimonial));
      setTestimonials(data);
      setIsLoading(false);
    }, async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: testimonialsCol.path,
        operation: 'list',
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateStatus = (id: string, status: 'approved' | 'rejected') => {
    if (!db) return;
    const docRef = doc(db, 'testimonials', id);
    const data = { status };
    
    updateDoc(docRef, data)
      .then(() => {
        toast({ title: status === 'approved' ? "Depoimento Aprovado" : "Depoimento Rejeitado" });
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: data,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleDelete = (id: string) => {
    if (!db) return;
    const docRef = doc(db, 'testimonials', id);
    
    deleteDoc(docRef)
      .then(() => {
        toast({ title: "Depoimento Excluído", variant: "destructive" });
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3 text-white">
            <MessageSquareHeart className="h-8 w-8 text-pink-500" /> Moderação de Depoimentos
          </h1>
          <p className="text-zinc-400 font-medium">Aprove o que será exibido na Landing Page oficial.</p>
        </div>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white uppercase font-black">Fila de Moderação</CardTitle>
          <CardDescription className="text-zinc-500">Depoimentos enviados pelos donos de bares.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="uppercase font-bold text-[10px] tracking-widest border-zinc-800">
                <TableHead className="text-zinc-400">Estabelecimento / Autor</TableHead>
                <TableHead className="text-zinc-400">Depoimento</TableHead>
                <TableHead className="text-zinc-400">Nota</TableHead>
                <TableHead className="text-zinc-400">Status</TableHead>
                <TableHead className="text-right text-zinc-400">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testimonials.map((t) => (
                <TableRow key={t.id} className="border-zinc-800 hover:bg-zinc-800/50">
                  <TableCell>
                    <div className="font-black uppercase text-sm text-white">{t.barName}</div>
                    <div className="text-[10px] text-zinc-500">{t.authorName}</div>
                    <div className="text-[9px] text-zinc-600 mt-1 uppercase">
                      {format(t.createdAt, "dd/MM/yy HH:mm", { locale: ptBR })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-zinc-300 text-xs max-w-md italic">"{t.content}"</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < t.rating ? "fill-yellow-500 text-yellow-500" : "text-zinc-700"}`} />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`uppercase text-[9px] font-black ${t.status === 'approved' ? 'bg-green-600' : (t.status === 'pending' ? 'bg-orange-600' : 'bg-zinc-700')}`}>
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {t.status === 'pending' && (
                        <>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500 hover:bg-green-950" onClick={() => handleUpdateStatus(t.id, 'approved')}>
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-orange-500 hover:bg-orange-950" onClick={() => handleUpdateStatus(t.id, 'rejected')}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:bg-red-950" onClick={() => handleDelete(t.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {testimonials.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-zinc-600 font-bold uppercase text-xs">
                    Nenhum depoimento encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
