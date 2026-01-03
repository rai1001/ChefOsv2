import React, { useEffect, useState } from 'react';
import { supabase } from '@/config/supabase';
// import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore'; // REMOVED
// import { db } from '@/config/firebase'; // REMOVED
import { useStore } from '@/presentation/store/useStore';
import type { SocialManagerPost } from '@/types/socialManager';
import { Loader2, Calendar, Share2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SocialManagerHistoryProps {
  onSelect: (post: SocialManagerPost) => void;
}

export const SocialManagerHistory: React.FC<SocialManagerHistoryProps> = ({ onSelect }) => {
  const { activeOutletId } = useStore();
  const [posts, setPosts] = useState<SocialManagerPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeOutletId) return;

    const fetchPosts = async () => {
      try {
        // TODO: Validate table name and column names for Supabase
        const { data, error } = await supabase
          .from('social_manager_posts') // Assumption: Table name converted to snake_case
          .select('*')
          .eq('businessId', activeOutletId)
          .order('generatedAt', { ascending: false }) // Keeping camelCase for columns for risk mitigation, change to generated_at if needed
          .limit(10);

        if (error) {
          console.error('Error fetching history:', error);
        } else {
          setPosts(data as unknown as SocialManagerPost[]);
        }
      } catch (err) {
        console.error('Unexpected error fetching history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [activeOutletId]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center p-8 text-slate-500 bg-white/5 rounded-xl border border-white/5">
        <Share2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No has generado contenido aún.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {posts.map((post) => (
        <div
          key={post.id}
          onClick={() => onSelect(post)}
          className="group bg-surface border border-white/5 rounded-xl overflow-hidden hover:border-primary/50 transition-all cursor-pointer hover:shadow-lg hover:translate-y-[-2px]"
        >
          <div className="relative h-32 overflow-hidden">
            <img
              src={post.imageUrl}
              alt={post.contentType}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-white border border-white/10">
              {post.contentType}
            </div>
          </div>

          <div className="p-4 space-y-3">
            <div className="flex justify-between items-start text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <Calendar size={12} />
                {post.generatedAt?.toDate
                  ? format(post.generatedAt.toDate(), 'PPP', { locale: es })
                  : 'Reciente'}
              </div>
            </div>

            <p className="text-sm text-slate-300 line-clamp-2 font-medium">
              {post.data?.instagram?.copy ||
                post.data?.facebook?.copy ||
                post.data?.linkedin?.copy ||
                'Contenido generado'}
            </p>

            <div className="pt-2 border-t border-white/5 flex justify-between items-center">
              <div className="flex gap-2">
                {post.data.metadata.bestPlatforms.includes('instagram') && (
                  <div className="w-2 h-2 rounded-full bg-pink-500" title="Instagram" />
                )}
                {post.data.metadata.bestPlatforms.includes('facebook') && (
                  <div className="w-2 h-2 rounded-full bg-blue-600" title="Facebook" />
                )}
                {post.data.metadata.bestPlatforms.includes('linkedin') && (
                  <div className="w-2 h-2 rounded-full bg-blue-800" title="LinkedIn" />
                )}
              </div>
              <div className="text-primary text-xs font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Ver <Eye size={12} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
