
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
      const result = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      return result.text || "<p>No summary generated.</p>";
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
         timeTrials: player.evaluation?.timeTrials,
         overallRating: player.evaluation?.overallRating
     };

     const prompt = `
        As a Senior Technical Director for an Elite Global Football Group (e.g., City Football Group, Barcelona, or Ajax), 
        generate a high-level "Clinical Scout Dossier Verdict" for student athlete ${player.fullName}.
        
        DATA CONTEXT:
        - Position: ${context.position}
        - Performance Index: ${context.overallRating}/100
        - Technical Profile: ${JSON.stringify(context.metrics)}
        - Physical Output: ${JSON.stringify(context.timeTrials)}
        - Participation: ${context.attendanceRate} Attendance
        - Competitive Stats: ${context.matchesPlayed} Match involvements, ${context.goals} Goal contributions, ${context.averageRating} Performance floor
        
        REQUIREMENTS:
        - Tone: Sophisticated, clinical, objective, elite European scouting style.
        - Language: Use advanced tactical terminology (e.g., "spatial geometry", "biomechanical load", "technical ceiling", "tactical cognitive mapping", "transition phase efficiency", "ball-retention architecture").
        - Content: Identify the player's tactical archetype, their current "performance floor", and their projected "elite ceiling".
        - Limit: Exactly 2 highly analytical sentences.
        
        STRUCTURE (HTML ONLY):
        <div class="space-y-6">
          <p class="text-white/90 text-[14px] leading-relaxed italic font-semibold tracking-tight">
            [High-level clinical summary of the player's tactical profile, biomechanical efficiency, and developmental trajectory]
          </p>
          <div class="p-5 bg-brand-500/10 border border-brand-500/20 rounded-[2rem] relative overflow-hidden group">
            <div class="absolute top-0 left-0 w-2 h-full bg-brand-500 shadow-[0_0_20px_rgba(0,200,255,0.4)]"></div>
            <span class="text-brand-500 font-black text-[9px] uppercase tracking-[0.4em] block mb-3 italic">STRATEGIC_UNLOCk_PROTOCOL</span>
            <p class="text-white font-black text-[12px] italic tracking-wide uppercase leading-tight">[One high-impact technical directive to breach the next tier of performance, focused on tactical maturity]</p>
          </div>
        </div>
        
        CRITICAL: Return ONLY the HTML code. No markdown blocks, no preamble, no "Here is the HTML".
     `;

     try {
        const result = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        
        let text = result.text || "";
        // Aggressive cleaning to ensure only HTML is returned
        text = text.replace(/```html/g, "").replace(/```/g, "").replace(/^HTML/i, "").trim();
        
        return text || "<p class='text-white/30 italic text-sm font-black tracking-widest'>SYNCHRONIZATION_ERROR</p>";
     } catch (error) {
        console.error("Gemini Error:", error);
        return "<p class='text-white/30 italic text-sm font-black tracking-widest'>STRATEGIC_RELAY_OFFLINE</p>";
     }
  },

  analyzeMatchPerformance: async (player: Player, match: Match, academyName: string = "Academy Portal") => {
    if (!import.meta.env.VITE_GEMINI_API_KEY) return "<p>API Key missing.</p>";

    const stats = match.playerStats.find(s => s.playerId === player.id);
    if (!stats) return "<p>No stats found.</p>";

    const prompt = `
        Analyze match for ${player.fullName} vs ${match.opponent}.
        Stats: Rating ${stats.rating}, Goals ${stats.goals}, Assists ${stats.assists}.
        Provide a concise HTML analysis using clinical tactical language.
    `;

    try {
        const result = await ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        let text = result.text || "";
        text = text.replace(/```html/g, "").replace(/```/g, "").trim();
        return text || "<p>No analysis generated.</p>";
    } catch (error) {
        return "<p>Analysis unavailable.</p>";
    }
  },

  generateCoachVerdictSuggestion: async (player: Player, evaluationData: any): Promise<string[]> => {
    if (!import.meta.env.VITE_GEMINI_API_KEY) return ["AI Suggestion unavailable. Please input manual verdict."];

    const context = {
        name: player.fullName,
        position: player.position,
        metrics: evaluationData.metrics,
        timeTrials: evaluationData.timeTrials,
        overallRating: evaluationData.overallRating,
        developmentAreas: evaluationData.developmentAreas
    };

    const prompt = `
        As a Lead Technical Scout for an Elite European Academy (Ajax/Benfica model), write 3 distinct clinical tactical verdicts for ${player.fullName}.
        
        PERFORMANCE METRICS:
        - Overall Index: ${context.overallRating}/100
        - Technical Competencies: ${JSON.stringify(context.metrics)}
        - Biomechanical Output: ${JSON.stringify(context.timeTrials)}
        - Development Focus Areas: ${context.developmentAreas.join(', ')}
        
        REQUIREMENTS:
        - Tone: Dispassionate, clinical, data-driven, elite European scouting style.
        - Terminology: Use scouting shorthand and advanced tactical jargon (e.g., "half-space penetration", "inverted-role adaptability", "biomechanical load tolerance", "tactical cognitive speed", "spatial geometry awareness").
        - Content: Each variation should emphasize a different scout perspective:
            1. TACTICAL ARCHETYPE: Define the player's future profile (e.g., "Press-Resistant Playmaker", "Modern Wing-Back", "Clinical Box-Striker").
            2. PERFORMANCE FLOOR vs CEILING: Analyze current stability vs projected elite potential.
            3. STRATEGIC GROWTH: Connect the development focus areas to concrete match-day impact.
        - Constraint: Exactly 2-3 highly professional scouting sentences per variation.
        
        OUTPUT FORMAT:
        Return a JSON object with a "suggestions" key containing an array of 3 strings.
        Example: {"suggestions": ["...", "...", "..."]}
        Return ONLY the JSON.
    `;

    try {
        const result = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        
        const text = result.text?.trim() || "";
        const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        
        try {
            const parsed = JSON.parse(cleanedText);
            if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
                return parsed.suggestions;
            }
        } catch (e) {
            console.error("Failed to parse AI response as JSON", cleanedText);
            // Fallback: split by newlines or just return the raw text as a single suggestion if parsing fails
            return [text || "Awaiting technical synchronization..."];
        }
        
        return ["Awaiting technical synchronization..."];
    } catch (error) {
        console.error("Gemini Error:", error);
        return ["System offline. Please input manual verdict."];
    }
  }
};

