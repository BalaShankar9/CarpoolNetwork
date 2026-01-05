import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  HelpCircle,
  Car,
  MessageSquare,
  Shield,
  User,
  ChevronRight,
  Book,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface HelpArticle {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  content_md: string;
  category: string;
  tags: string[];
}

interface CategoryInfo {
  key: string;
  label: string;
  icon: typeof HelpCircle;
  color: string;
  description: string;
}

const categories: CategoryInfo[] = [
  {
    key: 'getting-started',
    label: 'Getting Started',
    icon: Book,
    color: 'bg-blue-100 text-blue-600',
    description: 'New to Carpool Network? Start here',
  },
  {
    key: 'rides',
    label: 'Rides',
    icon: Car,
    color: 'bg-green-100 text-green-600',
    description: 'Posting, finding, and managing rides',
  },
  {
    key: 'messaging',
    label: 'Messaging',
    icon: MessageSquare,
    color: 'bg-purple-100 text-purple-600',
    description: 'Communicating with drivers and passengers',
  },
  {
    key: 'safety',
    label: 'Safety',
    icon: Shield,
    color: 'bg-red-100 text-red-600',
    description: 'Stay safe while carpooling',
  },
  {
    key: 'account',
    label: 'Account',
    icon: User,
    color: 'bg-orange-100 text-orange-600',
    description: 'Profile, settings, and privacy',
  },
  {
    key: 'faq',
    label: 'FAQ',
    icon: HelpCircle,
    color: 'bg-gray-100 text-gray-600',
    description: 'Frequently asked questions',
  },
];

const quickLinks = [
  { label: 'Post a Ride', path: '/post-ride' },
  { label: 'Find Rides', path: '/find-rides' },
  { label: 'My Rides', path: '/my-rides' },
  { label: 'Messages', path: '/messages' },
  { label: 'Profile Settings', path: '/profile' },
  { label: 'Privacy Controls', path: '/settings' },
];

export default function HelpHub() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [searchResults, setSearchResults] = useState<HelpArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadArticles();
    const articleSlug = searchParams.get('article');
    if (articleSlug) {
      loadArticleBySlug(articleSlug);
    }
  }, [searchParams]);

  const loadArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('help_articles')
        .select('*')
        .eq('is_published', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error('Error loading help articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadArticleBySlug = async (slug: string) => {
    try {
      const { data, error } = await supabase
        .from('help_articles')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();

      if (error) throw error;
      if (data) {
        setSelectedArticle(data);
      }
    } catch (error) {
      console.error('Error loading article:', error);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase.rpc('search_help_articles', {
        p_query: query,
      });

      if (error) throw error;

      const fullArticles = (data || []).map((result: any) => {
        const article = articles.find((a) => a.id === result.id);
        return article || result;
      });

      setSearchResults(fullArticles);
    } catch (error) {
      console.error('Error searching:', error);
      const filtered = articles.filter(
        (a) =>
          a.title.toLowerCase().includes(query.toLowerCase()) ||
          a.summary?.toLowerCase().includes(query.toLowerCase()) ||
          a.content_md.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filtered);
    } finally {
      setSearching(false);
    }
  };

  const openArticle = (article: HelpArticle) => {
    setSelectedArticle(article);
    setSearchParams({ article: article.slug });
  };

  const closeArticle = () => {
    setSelectedArticle(null);
    setSelectedCategory(null);
    setSearchParams({});
  };

  const getCategoryInfo = (key: string) => {
    return categories.find((c) => c.key === key) || categories[5];
  };

  const filteredArticles = selectedCategory
    ? articles.filter((a) => a.category === selectedCategory)
    : articles;

  const displayArticles = searchQuery.length >= 2 ? searchResults : filteredArticles;

  if (selectedArticle) {
    const categoryInfo = getCategoryInfo(selectedArticle.category);
    return (
      <div className="space-y-6">
        <button
          onClick={closeArticle}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Help Center
        </button>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className={`px-6 py-4 ${categoryInfo.color.replace('text-', 'bg-').replace('600', '50')}`}>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <categoryInfo.icon className="w-4 h-4" />
              <span>{categoryInfo.label}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{selectedArticle.title}</h1>
            {selectedArticle.summary && (
              <p className="text-gray-600 mt-2">{selectedArticle.summary}</p>
            )}
          </div>

          <div className="p-6">
            <div className="prose prose-blue max-w-none">
              {selectedArticle.content_md.split('\n').map((line, index) => {
                if (line.startsWith('## ')) {
                  return (
                    <h2 key={index} className="text-xl font-bold text-gray-900 mt-6 mb-3">
                      {line.replace('## ', '')}
                    </h2>
                  );
                }
                if (line.startsWith('### ')) {
                  return (
                    <h3 key={index} className="text-lg font-semibold text-gray-800 mt-4 mb-2">
                      {line.replace('### ', '')}
                    </h3>
                  );
                }
                if (line.startsWith('- ')) {
                  return (
                    <li key={index} className="text-gray-700 ml-4">
                      {line.replace('- ', '')}
                    </li>
                  );
                }
                if (line.match(/^\d+\. /)) {
                  return (
                    <li key={index} className="text-gray-700 ml-4 list-decimal">
                      {line.replace(/^\d+\. /, '')}
                    </li>
                  );
                }
                if (line.startsWith('**') && line.endsWith('**')) {
                  return (
                    <p key={index} className="font-semibold text-gray-900">
                      {line.replace(/\*\*/g, '')}
                    </p>
                  );
                }
                if (line.trim() === '') {
                  return <br key={index} />;
                }
                return (
                  <p key={index} className="text-gray-700 mb-2">
                    {line}
                  </p>
                );
              })}
            </div>

            {selectedArticle.tags && selectedArticle.tags.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex flex-wrap gap-2">
                  {selectedArticle.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Help Center</h1>
        <p className="text-gray-600 mt-1">
          Everything you need to know about using Carpool Network
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search for help..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {searching && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {!selectedCategory && searchQuery.length < 2 && (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <button
                key={category.key}
                onClick={() => setSelectedCategory(category.key)}
                className="bg-white rounded-xl border border-gray-200 p-6 text-left hover:shadow-md transition-shadow group"
              >
                <div className={`w-12 h-12 rounded-xl ${category.color} flex items-center justify-center mb-4`}>
                  <category.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {category.label}
                </h3>
                <p className="text-sm text-gray-600 mt-1">{category.description}</p>
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {quickLinks.map((link) => (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
                >
                  <span className="text-gray-700">{link.label}</span>
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {(selectedCategory || searchQuery.length >= 2) && (
        <>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to categories
            </button>
          )}

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : displayArticles.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <HelpCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="font-medium">No articles found</p>
                <p className="text-sm mt-1">Try a different search term</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {displayArticles.map((article) => {
                  const categoryInfo = getCategoryInfo(article.category);
                  return (
                    <button
                      key={article.id}
                      onClick={() => openArticle(article)}
                      className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors flex items-center gap-4"
                    >
                      <div className={`w-10 h-10 rounded-lg ${categoryInfo.color} flex items-center justify-center flex-shrink-0`}>
                        <categoryInfo.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{article.title}</h3>
                        {article.summary && (
                          <p className="text-sm text-gray-600 truncate">{article.summary}</p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Still need help?</h2>
        <p className="text-gray-600 mb-4">
          Can't find what you're looking for? Our support team is here to help.
        </p>
        <a
          href="mailto:support@carpoolnetwork.co.uk"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          Contact Support
        </a>
      </div>
    </div>
  );
}
