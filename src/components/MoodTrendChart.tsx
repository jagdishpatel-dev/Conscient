import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Dot,
} from "recharts";
import { DiaryEntry } from "@/lib/api";
import { getMoodInfo } from "@/lib/moods";

interface MoodTrendChartProps {
  entries: DiaryEntry[];
}

const MoodTrendChart = ({ entries }: MoodTrendChartProps) => {
  const data = entries
    .filter((e) => e.mood)
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((e) => ({
      date: new Date(e.date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      title: e.title,
      mood: e.mood as string,
      valence: getMoodInfo(e.mood).valence,
    }));

  if (data.length < 2) return null;

  return (
    <div className="h-32 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e0d5" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#8a7a63" />
          <YAxis domain={[-1, 1]} hide />
          <Tooltip
            formatter={(_value, _name, props) => {
              const info = getMoodInfo(props.payload.mood);
              return [`${info.emoji} ${props.payload.mood}`, props.payload.title];
            }}
            contentStyle={{
              background: "#fffaf0",
              border: "1px solid #e7e0d5",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="valence"
            stroke="#7a2e2e"
            strokeWidth={2}
            dot={(props) => {
              const { cx, cy, payload, key } = props;
              return (
                <Dot
                  key={key}
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill={getMoodInfo(payload.mood).color}
                  stroke="none"
                />
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MoodTrendChart;
