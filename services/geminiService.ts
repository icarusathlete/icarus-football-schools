
import { GoogleGenAI } from "@google/genai";
import { Player, AttendanceRecord, Match } from "../types";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

export const GeminiService = {
  analyzeAttendance: async (players: Player[], attendance: AttendanceRecord[], academyName: string = "Academy Portal") => {
    if (!import.meta.env.VITE_GEMINI_API_KEY) return "<p>Gemini API Key is missing.</p>";

    const summaryData = players.map(p => {
        const records = attendance.filter(a => a.playerId === p.id);
        const present = records.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
        
        return {
            name: p.fullName,
            stats: { total: records.length, present },
        };
    });

    const prompt = `
      Analyze this attendance data for "${academyName}": ${JSON.stringify(summaryData)}
      Provide a professional HTML summary.
    `;

    try {
      const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error("Gemini Error:", error);
      return "<p>Attendance analysis failed.</p>";
    }
  },

  generateReportCard: async (player: Player, attendance: AttendanceRecord[], matches: Match[]) => {
     if (!import.meta.env.VITE_GEMINI_API_KEY) return "<p class='text-white/40 italic text-sm'>AI insights currently offline...</p>";

     const playerMatches = matches.filter(m => m.playerStats.some(s => s.playerId === player.id));
     const totalGoals = playerMatches.reduce((sum, m) => sum + (m.playerStats.find(s => s.playerId === player.id)?.goals || 0), 0);
     const avgRating = playerMatches.length 
        ? (playerMatches.reduce((sum, m) => sum + (m.playerStats.find(s => s.playerId === player.id)?.rating || 0), 0) / playerMatches.length).toFixed(1)
        : 'N/A';
     
     const presence = attendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
     const totalSessions = attendance.length;
     const attendanceRate = totalSessions ? Math.round((presence / totalSessions) * 100) : 0;

     const context = {
         name: player.fullName,
         position: player.position,
         attendanceRate: `${attendanceRate}%`,
         matchesPlayed: playerMatches.length,
         goals: totalGoals,
         averageRating: avgRating,
         metrics: player.evaluation?.metrics,
         timeTrials: player.evaluation?.timeTrials
     };

     const prompt = `
        As a Senior Tactical Scout, generate a "Clinic Verdict" for student athlete ${player.fullName}.
        DATA: ${JSON.stringify(context)}
        
        STRUCTURE (HTML ONLY):
        <div class="space-y-4">
          <p class="text-white/80 text-sm leading-relaxed">[2 sentences on ball mastery and output]</p>
          <div class="p-4 bg-brand-500/10 border border-brand-500/20 rounded-2xl">
            <span class="text-brand-500 font-black text-[9px] uppercase tracking-widest block mb-1">PRO_DIRECTIVE</span>
            <p class="text-white text-xs italic font-bold">[One clinical growth directive]</p>
          </div>
        </div>
     `;

     try {
        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        return result.response.text();
     } catch (error) {
        console.error("Gemini Error:", error);
        return "<p class='text-white/30 italic text-sm'>Strategic sync offline...</p>";
     }
  },

  analyzeMatchPerformance: async (player: Player, match: Match, academyName: string = "Academy Portal") => {
    if (!import.meta.env.VITE_GEMINI_API_KEY) return "<p>API Key missing.</p>";

    const stats = match.playerStats.find(s => s.playerId === player.id);
    if (!stats) return "<p>No stats found.</p>";

    const prompt = `
        Analyze match for ${player.fullName} vs ${match.opponent}.
        Stats: Rating ${stats.rating}, Goals ${stats.goals}, Assists ${stats.assists}.
        Provide a concise HTML analysis.
    `;

    try {
        const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        return "<p>Analysis unavailable.</p>";
    }
  }
};
