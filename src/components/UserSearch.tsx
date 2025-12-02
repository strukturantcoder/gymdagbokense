import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Search, UserPlus, Loader2 } from 'lucide-react';
import { UserProfile, useSocial } from '@/hooks/useSocial';
import { useDebounce } from '@/hooks/useDebounce';

interface UserSearchProps {
  onSelectUser?: (user: UserProfile) => void;
  showAddFriend?: boolean;
}

export default function UserSearch({ onSelectUser, showAddFriend = true }: UserSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const { searchUsers, sendFriendRequest, friends } = useSocial();
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const search = async () => {
      if (debouncedQuery.length < 2) {
        setResults([]);
        return;
      }
      
      setSearching(true);
      const users = await searchUsers(debouncedQuery);
      setResults(users);
      setSearching(false);
    };
    
    search();
  }, [debouncedQuery]);

  const isFriend = (userId: string) => {
    return friends.some(f => 
      f.friend_profile?.user_id === userId || 
      f.user_id === userId || 
      f.friend_id === userId
    );
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Sök efter användare..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>
      
      {searching && (
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}
      
      {!searching && results.length > 0 && (
        <div className="space-y-2">
          {results.map((user) => (
            <Card key={user.user_id} className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardContent className="p-3 flex items-center justify-between">
                <div 
                  className="flex items-center gap-3 flex-1"
                  onClick={() => onSelectUser?.(user)}
                >
                  <Avatar>
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>
                      {user.display_name?.slice(0, 2).toUpperCase() || '??'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{user.display_name || 'Anonym'}</span>
                </div>
                
                {showAddFriend && !isFriend(user.user_id) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      sendFriendRequest(user.user_id);
                    }}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Lägg till
                  </Button>
                )}
                
                {isFriend(user.user_id) && (
                  <span className="text-sm text-muted-foreground">Redan vän</span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {!searching && query.length >= 2 && results.length === 0 && (
        <p className="text-center text-muted-foreground py-4">
          Inga användare hittades
        </p>
      )}
    </div>
  );
}