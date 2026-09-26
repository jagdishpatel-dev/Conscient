import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Calendar, InfoIcon } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useAuth } from "@/context/AuthContext";
import { api, DiaryEntry } from "@/lib/api";
import { getMoodInfo } from "@/lib/moods";
import MoodTrendChart from "@/components/MoodTrendChart";

const Diary = () => {
  const { token } = useAuth();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [aiAccess, setAiAccess] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);

  const loadEntries = () => {
    if (!token) return;
    api
      .listDiaryEntries(token)
      .then(setEntries)
      .catch((error) => console.error("Error loading entries:", error));
  };

  useEffect(loadEntries, [token]);

  const handleSaveEntry = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Please fill in both title and content");
      return;
    }
    if (!token) return;

    try {
      const saved = await api.createDiaryEntry(token, {
        title,
        content,
        ai_access: aiAccess,
      });
      setEntries((prev) => [saved, ...prev]);
      setTitle("");
      setContent("");
      toast.success("Diary entry saved");

      // Mood is classified asynchronously on the backend; refresh once it's
      // likely done so the badge/chart pick it up without a manual reload.
      if (saved.ai_access) {
        setTimeout(loadEntries, 4000);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Couldn't save your entry. Please try again.");
    }
  };

  return (
    <div className="w-full min-h-screen bg-cream">
      <div className="max-w-[2000px] mx-auto px-4 pt-24">
        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-8rem)]">
          {/* Entries Sidebar */}
          <div className="col-span-12 md:col-span-3">
            <Card className="h-full bg-white/50 backdrop-blur-sm">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold text-brown flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Diary Entries
                </h2>
              </div>
              <div className="px-2 pt-2">
                <MoodTrendChart entries={entries} />
              </div>
              <ScrollArea className="h-[calc(100%-4rem)]">
                <div className="p-4 space-y-2">
                  {entries.map((entry) => (
                    <button
                      key={entry._id}
                      onClick={() => setSelectedEntry(entry)}
                      className="w-full p-3 text-left rounded-lg hover:bg-beige/20 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-brown truncate">
                          {entry.title}
                        </p>
                        {entry.mood && (
                          <span title={entry.mood}>
                            {getMoodInfo(entry.mood).emoji}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-brown/60 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(entry.date).toLocaleDateString()}
                      </p>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="col-span-12 md:col-span-9">
            <Card className="h-full bg-white/50 backdrop-blur-sm flex flex-col p-6">
              <div className="mb-6 flex justify-between items-center">
                {/* <h2 className="text-2xl font-bold text-deep-red">
                  {selectedEntry ? selectedEntry.title : "New Diary Entry"}
                </h2> */}
                <div className="flex items-center gap-3">
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <div className="flex items-center gap-2 cursor-help">
                        <span className="text-sm text-brown/60">AI Access</span>
                        <InfoIcon className="h-4 w-4 text-brown/60" />
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <p className="text-sm text-brown">
                      This is your personal diary that you're free to write entries in. When this AI access is turned on, it helps reflect on your feelings and experiences, offering gentle insights while keeping your thoughts private and secure.                      </p>
                    </HoverCardContent>
                  </HoverCard>
                  <Switch checked={aiAccess} onCheckedChange={setAiAccess} />
                </div>
              </div>

              {selectedEntry ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-deep-red">
                      {selectedEntry.title}
                    </h2>
                    {selectedEntry.mood && (
                      <Badge variant="outline" className="text-brown border-beige">
                        {getMoodInfo(selectedEntry.mood).emoji} {selectedEntry.mood}
                      </Badge>
                    )}
                  </div>
                  <p className="text-brown whitespace-pre-wrap">
                    {selectedEntry.content}
                  </p>
                  <Button
                    onClick={() => setSelectedEntry(null)}
                    variant="outline"
                    className="mt-4"
                  >
                    Write New Entry
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-deep-red">
                    New Diary Entry
                  </h2>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Entry Title"
                    className="w-full"
                  />
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your thoughts..."
                    className="w-full min-h-[300px]"
                  />
                  <Button
                    onClick={handleSaveEntry}
                    className="bg-deep-red hover:bg-brown"
                  >
                    Save Entry
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Diary;
