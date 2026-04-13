
import { GoogleGenAI } from "@google/genai";
import { Player, AttendanceRecord, Match } from "../types";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

export const GeminiService = {
  analyzeAttendance: async (players: Player[], attendance: AttendanceRecord[], academyName: string = "Academy Portal") => {
    if (!import.meta.env.VITE_GEMINI_API_KEY) throw new Error("Gemini API Key is missing.");

    const summaryData = players.map(p => {
        const records = attendance.filter(a => a.playerId === p.id);
        const present = records.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
        
        return {
            name: p.fullName,
            stats: { total: records.length, present },
        };
    });

    const prompt = `
      You are an AI Assistant for "${academyName}".
      Analyze the following attendance data: ${JSON.stringify(summaryData)}
      Provide an HTML response with:
      1. Executive summary.
      2. At-risk players (<70% attendance).
      3. Star players (high attendance).
      4. Draft email for absentees.
      Use professional yet encouraging tone. Use HTML tags like <h3>, <p>, <ul>, <li>.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      return response.text;
    } catch (error) {
      console.error("Gemini Error:", error);
      throw error;
    }
  },

  generateReportCard: async (player: Player, attendance: AttendanceRecord[], matches: Match[]) => {
     if (!import.meta.env.VITE_GEMINI_API_KEY) throw new Error("Gemini API Key is missing.");

     // Calculate stats
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
         timeTrials: player.evaluation?.timeTrials,
         recentMatches: playerMatches.slice(0,3).map(m => ({ opponent: m.opponent, result: m.result, myRating: m.playerStats.find(s => s.playerId === player.id)?.rating }))
     };

     const prompt = `
        You are a Senior Technical Scout at a professional football academy. 
        Generate an "Elite Player Performance Insight" for a student athlete named ${player.fullName}.
        
        PLAYER DATA:
        ${JSON.stringify(context)}
        
        INSTRUCTIONS:
        1. Write in a professional, clinical yet inspiring tone used in top European academies.
        2. Format as clean HTML (no markdown blocks).
        3. Use the following structure:
           - <div class="mb-6"><h3 class="text-brand-500 font-black text-xs uppercase tracking-[0.3em] mb-2 italic">Technical Assessment</h3><p class="text-brand-950/80 text-sm leading-relaxed font-medium">[2 sentences on ball mastery and tactical metrics]</p></div>
           - <div class="mb-6"><h3 class="text-brand-500 font-black text-xs uppercase tracking-[0.3em] mb-2 italic">Physical Profile</h3><p class="text-brand-950/80 text-sm leading-relaxed font-medium">[1-2 sentences on speed/agility/engine]</p></div>
           - <div class="mb-2"><h3 class="text-brand-500 font-black text-xs uppercase tracking-[0.3em] mb-2 italic">Scout's Recommendation</h3><p class="text-brand-950/80 text-sm leading-relaxed font-bold italic">[One finishing clinical verdict]</p></div>

        Do not use placeholders. Be specific based on the data provided.
     `;

     try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        return response.text;
     } catch (error) {
        return "<p class='text-brand-950/50 italic'>Scout data temporarily offline...</p>";
     }
  },

  analyzeMatchPerformance: async (player: Player, match: Match, academyName: string = "Academy Portal") => {
    if (!import.meta.env.VITE_GEMINI_API_KEY) throw new Error("Gemini API Key is missing.");

    const stats = match.playerStats.find(s => s.playerId === player.id);
    if (!stats) return "<p>No stats found for this match.</p>";

    const prompt = `
        You are a tactical football analyst for ${academyName}.
        Analyze the specific match performance for:
        Player: ${player.fullName} (${player.position})
        Match: vs ${match.opponent} (${match.result} ${match.scoreFor}-${match.scoreAgainst})
        Date: ${match.date}
        
        Player Stats:
        - Rating: ${stats.rating}/10
        - Goals: ${stats.goals}
        - Assists: ${stats.assists}
        
        Write a concise, professional post-match analysis in HTML.
        Include:
        1. <h4 class="text-white font-bold mb-2 text-sm uppercase tracking-wide">Tactical Breakdown</h4> (A paragraph on their impact)
        2. <h4 class="text-white font-bold mt-4 mb-2 text-sm uppercase tracking-wide">Key Contributions</h4> (Hypothetical positive reinforcement based on stats)
        3. <div class="mt-4 p-3 bg-white/10 rounded-lg border border-white/10"><span class="text-cyan-400 font-bold text-xs uppercase tracking-wider">Coach's Verdict:</span> <span class="text-gray-300 text-sm italic">[One sentence summary]</span></div>
        
        Keep it under 150 words. Use styling classes compatible with Tailwind (text-gray-200, text-sm, etc.). Do not include <html> or <body> tags.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        return "<p>Analysis unavailable. Please check API Key.</p>";
    }
  }
};
