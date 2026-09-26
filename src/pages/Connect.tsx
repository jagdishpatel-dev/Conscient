import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Users, Inbox } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { api, SuggestedUser, IncomingConnectionRequest } from "@/lib/api";
import { getMoodInfo } from "@/lib/moods";

const Connect = () => {
  const { token } = useAuth();
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [incoming, setIncoming] = useState<IncomingConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());

  const load = () => {
    if (!token) return;
    Promise.all([api.getConnectSuggestions(token), api.getIncomingRequests(token)])
      .then(([s, r]) => {
        setSuggestions(s);
        setIncoming(r);
      })
      .catch((error) => console.error("Error loading connect data:", error))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const handleConnect = async (userId: string) => {
    if (!token) return;
    setPendingIds((prev) => new Set(prev).add(userId));
    try {
      await api.sendConnectionRequest(token, userId);
      setSuggestions((prev) =>
        prev.map((s) => (s.user_id === userId ? { ...s, request_sent: true } : s))
      );
      setConfirmedIds((prev) => new Set(prev).add(userId));
      toast.success("Connection request sent");
    } catch (error) {
      console.error("Error sending connection request:", error);
      toast.error("Couldn't send that request. Please try again.");
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  return (
    <div className="container mx-auto px-4 pt-24 min-h-screen bg-cream">
      <div className="grid grid-cols-12 gap-4 min-h-[calc(100vh-8rem)]">
        {/* Suggested Connections */}
        <div className="col-span-12 md:col-span-7">
          <Card className="h-full bg-white/50 backdrop-blur-sm">
            <div className="p-4 border-b flex items-center gap-2">
              <Users className="h-5 w-5 text-brown" />
              <h2 className="text-lg font-semibold text-brown">
                People You May Connect With
              </h2>
            </div>
            <ScrollArea className="h-[calc(100%-4rem)]">
              <div className="p-4 space-y-3">
                {!loading && suggestions.length === 0 && (
                  <p className="text-sm text-brown/60 p-2">
                    Write a few diary entries with AI Access turned on, and
                    we'll match you with people navigating similar feelings.
                    No diary content is ever shared — only that you're both
                    going through something similar.
                  </p>
                )}
                {suggestions.map((user) => (
                  <div
                    key={user.user_id}
                    className="p-4 rounded-lg border border-beige/30"
                  >
                    <p className="font-medium text-brown">{user.username}</p>
                    <p className="text-sm text-brown/80 mt-1">{user.commonality}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {user.shared_moods.map((mood) => (
                        <span
                          key={mood}
                          className="text-xs px-2 py-1 bg-beige/30 rounded-full text-brown"
                        >
                          {getMoodInfo(mood).emoji} {mood}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-xs text-brown/60">
                        {user.last_active
                          ? `Active ${formatDistanceToNow(new Date(user.last_active), { addSuffix: true })}`
                          : ""}
                      </p>
                      <Button
                        size="sm"
                        disabled={user.request_sent || pendingIds.has(user.user_id)}
                        onClick={() => handleConnect(user.user_id)}
                        className="bg-deep-red hover:bg-brown"
                      >
                        {user.request_sent ? "Requested" : "Connect"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </div>

        {/* Incoming Requests */}
        <div className="col-span-12 md:col-span-5">
          <Card className="h-full bg-white/50 backdrop-blur-sm">
            <div className="p-4 border-b flex items-center gap-2">
              <Inbox className="h-5 w-5 text-brown" />
              <h2 className="text-lg font-semibold text-brown">
                Interested in Connecting With You
              </h2>
            </div>
            <ScrollArea className="h-[calc(100%-4rem)]">
              <div className="p-4 space-y-3">
                {!loading && incoming.length === 0 && (
                  <p className="text-sm text-brown/60 p-2">
                    No one has reached out yet. Check back later.
                  </p>
                )}
                {incoming.map((req) => (
                  <div
                    key={req.from_user_id}
                    className="p-4 rounded-lg border border-beige/30"
                  >
                    <p className="font-medium text-brown">{req.from_username}</p>
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-xs text-brown/60">
                        {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          pendingIds.has(req.from_user_id) ||
                          confirmedIds.has(req.from_user_id)
                        }
                        onClick={() => handleConnect(req.from_user_id)}
                      >
                        {confirmedIds.has(req.from_user_id) ? "Requested" : "Connect back"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Connect;
