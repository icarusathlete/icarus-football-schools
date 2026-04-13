import { Player, AttendanceRecord, AttendanceStatus, User, Match, ScheduleEvent, Announcement, FeeRecord, AcademySettings, PlayerEvaluation, Venue, Batch, Drill, BroadcastMessage, SupportTicket } from '../types';
import { db, auth } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDoc, updateDoc, deleteField } from 'firebase/firestore';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  const errorString = JSON.stringify(errInfo);
  console.error('Firestore Error: ', errorString);
  throw new Error(errorString);
}

const PLAYERS_KEY = 'icarus_players';
const ATTENDANCE_KEY = 'icarus_attendance';
const USERS_KEY = 'icarus_users';
const MATCHES_KEY = 'icarus_matches';
const SCHEDULE_KEY = 'icarus_schedule';
const NOTICES_KEY = 'icarus_notices';
const FEES_KEY = 'icarus_fees';
const SETTINGS_KEY = 'icarus_settings';
const DRAFTS_KEY = 'icarus_eval_drafts';
const LAST_INVOICE_KEY = 'icarus_last_invoice_id';
const VENUES_KEY = 'icarus_venues';
const BATCHES_KEY = 'icarus_batches';
const DRILLS_KEY = 'icarus_drills';
const SESSION_MOTM_KEY = 'icarus_session_motm';
const FINALIZED_ROLLCALLS_KEY = 'icarus_finalized_rollcalls';
const MESSAGES_KEY = 'icarus_messages';
const TICKETS_KEY = 'icarus_tickets';

const generateId = () => Math.random().toString(36).substr(2, 9);

const notifyDataChange = () => {
  window.dispatchEvent(new Event('academy_data_update'));
};

const generateSequentialMemberId = (existingPlayers: Player[]): string => {
  if (existingPlayers.length === 0) return 'ICR-0001';
  
  const ids = existingPlayers
    .map(p => {
      const match = p.memberId?.match(/ICR-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(id => !isNaN(id));

  const maxId = ids.length > 0 ? Math.max(...ids) : 0;
  const nextId = maxId + 1;
  return `ICR-${nextId.toString().padStart(4, '0')}`;
};

let syncUnsubscribers: (() => void)[] = [];
let currentSessionUser: User | null = null;

function sanitizeObject(obj: any): any {
  const sanitized: any = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) {
      if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        sanitized[key] = sanitizeObject(obj[key]);
      } else {
        sanitized[key] = obj[key];
      }
    }
  });
  return sanitized;
}

export const StorageService = {
  init: () => {
    // Basic local init if needed, but we rely on Firebase sync now
  },

  startFirebaseSync: (user: User) => {
    currentSessionUser = user;
    // Clear previous listeners
    syncUnsubscribers.forEach(unsub => unsub());
    syncUnsubscribers = [];

    const syncCollection = (collectionName: string, storageKey: string, isMap = false) => {
      const unsub = onSnapshot(collection(db, collectionName), (snapshot) => {
        if (isMap) {
            const data: any = {};
            snapshot.docs.forEach(doc => {
                data[doc.id] = doc.data();
            });
            localStorage.setItem(storageKey, JSON.stringify(data));
        } else {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            localStorage.setItem(storageKey, JSON.stringify(data));
        }
        notifyDataChange();
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, collectionName);
      });
      syncUnsubscribers.push(unsub);
    };

    const syncQuery = (q: any, storageKey: string, isMap = false) => {
      const unsub = onSnapshot(q, (snapshot) => {
        if (isMap) {
            const data: any = {};
            snapshot.docs.forEach(doc => {
                data[doc.id] = doc.data();
            });
            localStorage.setItem(storageKey, JSON.stringify(data));
        } else {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            localStorage.setItem(storageKey, JSON.stringify(data));
        }
        notifyDataChange();
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, storageKey);
      });
      syncUnsubscribers.push(unsub);
    };

    syncCollection('players', PLAYERS_KEY);
    syncCollection('matches', MATCHES_KEY);
    syncCollection('attendance', ATTENDANCE_KEY);
    syncCollection('schedule', SCHEDULE_KEY);
    syncCollection('notices', NOTICES_KEY);
    syncCollection('venues', VENUES_KEY);
    syncCollection('batches', BATCHES_KEY);
    syncCollection('drills', DRILLS_KEY);
    syncCollection('session_motm', SESSION_MOTM_KEY, true);
    syncCollection('finalized_rollcalls', FINALIZED_ROLLCALLS_KEY, true);
    syncCollection('messages', MESSAGES_KEY);
    syncCollection('tickets', TICKETS_KEY);

    if (user.role === 'admin' || user.role === 'coach') {
        syncCollection('users', USERS_KEY);
        syncCollection('fees', FEES_KEY);
    } else {
        // For players, sync only their own user doc and coaches
        import('firebase/firestore').then(({ query, where, or, documentId }) => {
            const usersQuery = query(collection(db, 'users'), or(where('role', '==', 'coach'), where(documentId(), '==', user.id)));
            syncQuery(usersQuery, USERS_KEY);

            if (user.linkedPlayerId) {
                const feesQuery = query(collection(db, 'fees'), where('playerId', '==', user.linkedPlayerId));
                syncQuery(feesQuery, FEES_KEY);
            } else {
                localStorage.setItem(FEES_KEY, JSON.stringify([]));
            }
        });
    }

    const unsubSettings = onSnapshot(doc(db, 'settings', 'academy'), (docSnap) => {
      if (docSnap.exists()) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(docSnap.data()));
        window.dispatchEvent(new Event('settingsChanged'));
        notifyDataChange();
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/academy');
    });
    syncUnsubscribers.push(unsubSettings);
  },

  stopFirebaseSync: () => {
    currentSessionUser = null;
    syncUnsubscribers.forEach(unsub => unsub());
    syncUnsubscribers = [];
  },

  getCurrentUser: () => {
    return currentSessionUser;
  },

  getPlayers: (): Player[] => {
    try {
      const data = localStorage.getItem(PLAYERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Failed to parse players", e);
      return [];
    }
  },

  addPlayer: async (player: Omit<Player, 'id' | 'memberId' | 'registeredAt'>): Promise<Player> => {
    console.log("StorageService.addPlayer called with:", player);
    const players = StorageService.getPlayers();
    const newMemberId = generateSequentialMemberId(players);
    const newId = generateId();
    const newPlayer: Player = sanitizeObject({
      ...player,
      id: newId,
      memberId: newMemberId,
      registeredAt: new Date().toISOString(),
    });
    
    try {
        await setDoc(doc(db, 'players', newId), newPlayer);
        
        // Update local storage to ensure immediate availability
        const currentPlayers = StorageService.getPlayers();
        currentPlayers.push(newPlayer);
        localStorage.setItem(PLAYERS_KEY, JSON.stringify(currentPlayers));
        
        console.log("Player successfully added to Firestore:", newId);
        return newPlayer;
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `players/${newId}`);
        throw error;
    }
  },

  findPlayerByName: (name: string): Player | undefined => {
    const players = StorageService.getPlayers();
    return players.find(p => p.fullName.toLowerCase().trim() === name.toLowerCase().trim());
  },

  deduplicatePlayers: async () => {
    const players = StorageService.getPlayers();
    const uniqueMap = new Map<string, Player>();
    const toDelete: string[] = [];

    players.forEach(p => {
        const key = `${p.fullName.toLowerCase().trim()}-${p.contactNumber.trim()}`;
        if (uniqueMap.has(key)) {
            // If already exists, mark this ID for deletion
            toDelete.push(p.id);
        } else {
            uniqueMap.set(key, p);
        }
    });

    if (toDelete.length > 0) {
        console.log(`Deduplicating: Removing ${toDelete.length} redundant records.`);
        for (const id of toDelete) {
            await StorageService.deletePlayer(id);
        }
        return true;
    }
    return false;
  },

  deletePlayer: async (playerId: string) => {
    try {
      await deleteDoc(doc(db, 'players', playerId));
      
      // Update local storage
      const currentPlayers = StorageService.getPlayers();
      const filtered = currentPlayers.filter(p => p.id !== playerId);
      localStorage.setItem(PLAYERS_KEY, JSON.stringify(filtered));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `players/${playerId}`);
    }
  },

  updatePlayer: async (player: Player) => {
    try {
      const sanitized = sanitizeObject(player);
      await setDoc(doc(db, 'players', player.id), sanitized);
      
      // Update local storage
      const currentPlayers = StorageService.getPlayers();
      const index = currentPlayers.findIndex(p => p.id === player.id);
      if (index !== -1) {
          currentPlayers[index] = sanitized as Player;
          localStorage.setItem(PLAYERS_KEY, JSON.stringify(currentPlayers));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `players/${player.id}`);
    }
  },

  saveEvaluation: async (playerId: string, evaluation: PlayerEvaluation) => {
    const players = StorageService.getPlayers();
    const index = players.findIndex(p => p.id === playerId);
    if (index >= 0) {
      const player = players[index];
      if (!player.evaluationHistory) player.evaluationHistory = [];
      if (player.evaluation) {
          const isSameDay = player.evaluation.evaluationDate === evaluation.evaluationDate;
          if (!isSameDay) {
              player.evaluationHistory.push(player.evaluation);
              player.evaluationHistory.sort((a, b) => new Date(b.evaluationDate).getTime() - new Date(a.evaluationDate).getTime());
          }
      }
      player.evaluation = evaluation;
      try {
        await setDoc(doc(db, 'players', playerId), player);
        StorageService.clearDraft(playerId);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `players/${playerId}`);
      }
    }
  },

  deleteEvaluation: async (playerId: string) => {
    try {
      const playerRef = doc(db, 'players', playerId);
      await updateDoc(playerRef, {
        evaluation: deleteField()
      });
      StorageService.clearDraft(playerId);
      notifyDataChange();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `players/${playerId}/evaluation`);
    }
  },

  clearEvaluationHistory: async (playerId: string) => {
    try {
      const playerRef = doc(db, 'players', playerId);
      await updateDoc(playerRef, {
        evaluationHistory: deleteField()
      });
      notifyDataChange();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `players/${playerId}/evaluationHistory`);
    }
  },

  getDrafts: (): Record<string, PlayerEvaluation> => {
      try {
        const data = localStorage.getItem(DRAFTS_KEY);
        return data ? JSON.parse(data) : {};
      } catch (e) {
        return {};
      }
  },

  saveDraft: (playerId: string, evaluation: PlayerEvaluation) => {
      const drafts = StorageService.getDrafts();
      drafts[playerId] = evaluation;
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  },

  getDraft: (playerId: string): PlayerEvaluation | null => {
      const drafts = StorageService.getDrafts();
      return drafts[playerId] || null;
  },

  clearDraft: (playerId: string) => {
      const drafts = StorageService.getDrafts();
      if (drafts[playerId]) {
          delete drafts[playerId];
          localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
      }
  },

  setMOTM: async (playerId: string, date: string, venue?: string, batch?: string) => {
      const key = (venue && batch) ? `${date}_${venue}_${batch}` : date;
      try {
        await setDoc(doc(db, 'session_motm', key), { playerId, timestamp: Date.now(), venue, batch });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `session_motm/${key}`);
      }
  },

  getMOTM: (date: string, venue?: string, batch?: string): { playerId: string, timestamp: number } | null => {
      const key = (venue && batch) ? `${date}_${venue}_${batch}` : date;
      const storageRaw = localStorage.getItem(SESSION_MOTM_KEY);
      if (!storageRaw) return null;
      try {
          const storage = JSON.parse(storageRaw);
          return storage[key] || null;
      } catch (e) {
          console.error("Failed to parse MOTM", e);
          return null;
      }
  },

  getNextInvoiceId: (): string => {
      const fees = StorageService.getFees();
      let maxNum = 0;
      fees.forEach(fee => {
          if (fee.invoice && fee.invoice.invoiceNo) {
              const match = fee.invoice.invoiceNo.match(/INV-(\d+)/);
              if (match) {
                  const num = parseInt(match[1], 10);
                  if (num > maxNum) maxNum = num;
              }
          }
      });
      const nextNum = maxNum + 1;
      return `INV-${nextNum.toString().padStart(3, '0')}`;
  },

  saveLastInvoiceId: (id: string) => {
      // No longer needed, calculated dynamically
  },

  getVenues: (): Venue[] => {
    try {
      return JSON.parse(localStorage.getItem(VENUES_KEY) || '[]');
    } catch (e) {
      return [];
    }
  },
  
  addVenue: async (name: string) => {
      const newId = generateId();
      try {
        await setDoc(doc(db, 'venues', newId), { id: newId, name });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `venues/${newId}`);
      }
  },

  updateVenue: async (id: string, name: string) => {
      try {
        await setDoc(doc(db, 'venues', id), { id, name });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `venues/${id}`);
      }
  },

  deleteVenue: async (id: string) => {
      try {
        await deleteDoc(doc(db, 'venues', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `venues/${id}`);
      }
  },

  getBatches: (): Batch[] => {
    try {
      return JSON.parse(localStorage.getItem(BATCHES_KEY) || '[]');
    } catch (e) {
      return [];
    }
  },

  addBatch: async (name: string) => {
      const newId = generateId();
      try {
        await setDoc(doc(db, 'batches', newId), { id: newId, name });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `batches/${newId}`);
      }
  },

  updateBatch: async (id: string, name: string) => {
      try {
        await setDoc(doc(db, 'batches', id), { id, name });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `batches/${id}`);
      }
  },

  deleteBatch: async (id: string) => {
      try {
        await deleteDoc(doc(db, 'batches', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `batches/${id}`);
      }
  },

  getDrills: (): Drill[] => JSON.parse(localStorage.getItem(DRILLS_KEY) || '[]'),

  addDrill: async (drill: Omit<Drill, 'id'>) => {
      const newId = generateId();
      try {
        const sanitized = sanitizeObject({ ...drill, id: newId });
        await setDoc(doc(db, 'drills', newId), sanitized);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `drills/${newId}`);
      }
  },

  deleteDrill: async (id: string) => {
      try {
        await deleteDoc(doc(db, 'drills', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `drills/${id}`);
      }
  },

  getAttendance: (): AttendanceRecord[] => {
    try {
      return JSON.parse(localStorage.getItem(ATTENDANCE_KEY) || '[]');
    } catch (e) {
      console.error("Failed to parse attendance", e);
      return [];
    }
  },
  
  getDailyAttendance: (date: string) => StorageService.getAttendance().filter(r => r.date === date),
  
  saveAttendanceBatch: async (records: AttendanceRecord[]) => {
    // Write each record to Firestore
    const promises = records.map(r => {
        const id = r.id || generateId();
        const sanitized = sanitizeObject({ ...r, id });
        return setDoc(doc(db, 'attendance', id), sanitized).catch(error => {
          handleFirestoreError(error, OperationType.WRITE, `attendance/${id}`);
        });
    });
    await Promise.all(promises);
  },

  savePlayerSelfCheckIn: async (playerId: string, date: string) => {
    const id = `${date}_${playerId}`;
    const record: AttendanceRecord = {
      id,
      playerId,
      date,
      status: AttendanceStatus.PRESENT,
      notes: 'Self Check-In'
    };
    try {
      await setDoc(doc(db, 'attendance', id), record);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `attendance/${id}`);
    }
  },

  isRollcallFinalized: (date: string, venue?: string, batch?: string): boolean => {
      const key = (venue && batch) ? `${date}_${venue}_${batch}` : date;
      const storageRaw = localStorage.getItem(FINALIZED_ROLLCALLS_KEY);
      if (!storageRaw) return false;
      try {
          const storage = JSON.parse(storageRaw);
          return !!storage[key];
      } catch (e) {
          return false;
      }
  },

  finalizeRollcall: async (date: string, venue?: string, batch?: string) => {
      const key = (venue && batch) ? `${date}_${venue}_${batch}` : date;
      try {
          await setDoc(doc(db, 'finalized_rollcalls', key), { finalized: true, timestamp: Date.now(), venue, batch });
      } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `finalized_rollcalls/${key}`);
      }
  },

  unfinalizeRollcall: async (date: string, venue?: string, batch?: string) => {
      const key = (venue && batch) ? `${date}_${venue}_${batch}` : date;
      try {
          await deleteDoc(doc(db, 'finalized_rollcalls', key));
      } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `finalized_rollcalls/${key}`);
      }
  },
  
  getUsers: (): User[] => JSON.parse(localStorage.getItem(USERS_KEY) || '[]'),
  
  addUser: async (u: Omit<User, 'id'>) => {
    const newId = generateId();
    const newUser = sanitizeObject({...u, id: newId});
    try {
      await setDoc(doc(db, 'users', newId), newUser);
      
      // Update local storage to ensure immediate availability
      const currentUsers = StorageService.getUsers();
      currentUsers.push(newUser);
      localStorage.setItem(USERS_KEY, JSON.stringify(currentUsers));
      
      notifyDataChange();
      return newUser;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${newId}`);
    }
  },
  
  deleteUser: async (id: string) => {
      try {
        await deleteDoc(doc(db, 'users', id));
        
        // Update local storage
        const currentUsers = StorageService.getUsers();
        const filtered = currentUsers.filter(u => u.id !== id);
        localStorage.setItem(USERS_KEY, JSON.stringify(filtered));
        notifyDataChange();
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
      }
  },

  updateUser: async (updatedUser: User) => {
      try {
        const sanitized = sanitizeObject(updatedUser);
        await setDoc(doc(db, 'users', updatedUser.id), sanitized);
        
        // Update local storage
        const currentUsers = StorageService.getUsers();
        const index = currentUsers.findIndex(u => u.id === updatedUser.id);
        if (index !== -1) {
            currentUsers[index] = sanitized;
            localStorage.setItem(USERS_KEY, JSON.stringify(currentUsers));
            notifyDataChange();
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${updatedUser.id}`);
      }
  },
  
  getMatches: (): Match[] => {
    try {
      return JSON.parse(localStorage.getItem(MATCHES_KEY) || '[]');
    } catch (e) {
      console.error("Failed to parse matches", e);
      return [];
    }
  },
  
  addMatch: async (m: Omit<Match, 'id'>) => {
    const newId = generateId();
    const newMatch = sanitizeObject({...m, id: newId});
    try {
      await setDoc(doc(db, 'matches', newId), newMatch);
      return newMatch;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `matches/${newId}`);
    }
  },

  updateMatch: async (m: Match) => {
    try {
      const sanitized = sanitizeObject(m);
      await setDoc(doc(db, 'matches', m.id), sanitized);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `matches/${m.id}`);
    }
  },

  deleteMatch: async (id: string) => {
    try {
      await deleteDoc(doc(db, 'matches', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `matches/${id}`);
    }
  },
  
  getSchedule: (): ScheduleEvent[] => JSON.parse(localStorage.getItem(SCHEDULE_KEY) || '[]'),
  
  addEvent: async (e: Omit<ScheduleEvent, 'id'>) => {
      const newId = generateId();
      try {
        const sanitized = sanitizeObject({ ...e, id: newId });
        await setDoc(doc(db, 'schedule', newId), sanitized);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `schedule/${newId}`);
      }
  },
  
  updateEvent: async (updatedEvent: ScheduleEvent) => {
      try {
        const sanitized = sanitizeObject(updatedEvent);
        await setDoc(doc(db, 'schedule', updatedEvent.id), sanitized);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `schedule/${updatedEvent.id}`);
      }
  },

  deleteEvent: async (id: string) => {
      try {
        await deleteDoc(doc(db, 'schedule', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `schedule/${id}`);
      }
  },
  
  toggleRSVP: async (eventId: string, playerId: string, status: 'attending' | 'declined') => {
      const schedule = StorageService.getSchedule();
      const eventIndex = schedule.findIndex(e => e.id === eventId);
      if (eventIndex >= 0) {
          const event = schedule[eventIndex];
          if (!event.rsvps) event.rsvps = {};
          if (event.rsvps[playerId] === status) {
              delete event.rsvps[playerId];
          } else {
              event.rsvps[playerId] = status;
          }
          try {
            await setDoc(doc(db, 'schedule', eventId), event);
            return event;
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, `schedule/${eventId}`);
          }
      }
      return null;
  },

  getNotices: (): Announcement[] => JSON.parse(localStorage.getItem(NOTICES_KEY) || '[]'),
  
  addNotice: async (n: Omit<Announcement, 'id' | 'date'>) => {
      const newId = generateId();
      try {
        const sanitized = sanitizeObject({ ...n, id: newId, date: new Date().toISOString() });
        await setDoc(doc(db, 'notices', newId), sanitized);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `notices/${newId}`);
      }
  },
  
  deleteNotice: async (id: string) => {
      try {
        await deleteDoc(doc(db, 'notices', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `notices/${id}`);
      }
  },
  
  getFees: (): FeeRecord[] => {
    try {
      return JSON.parse(localStorage.getItem(FEES_KEY) || '[]');
    } catch (e) {
      return [];
    }
  },
  
  updateFee: async (f: FeeRecord) => {
    const id = f.id || generateId();
    try {
      const sanitized = sanitizeObject({ ...f, id });
      await setDoc(doc(db, 'fees', id), sanitized);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `fees/${id}`);
    }
  },

  deleteFee: async (id: string) => {
    try {
      await deleteDoc(doc(db, 'fees', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `fees/${id}`);
    }
  },

  getSettings: (): AcademySettings => {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error("Failed to parse local settings", e);
      }
    }
    return {
      name: 'ACADEMY PORTAL',
      logoUrl: '',
      primaryColor: '#0066FF', // Tactical Blue
      secondaryColor: '#0D1B8A', // Deep Midnight
      fontFamily: 'Orbitron' 
    };
  },
  
  saveSettings: async (s: AcademySettings) => { 
    try {
      await setDoc(doc(db, 'settings', 'academy'), s);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/academy');
    }
  },
  
  exportData: () => {
    const data: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('icarus_')) {
            try {
                data[key] = JSON.parse(localStorage.getItem(key) || 'null');
            } catch (e) {
                data[key] = localStorage.getItem(key);
            }
        }
    }
    return JSON.stringify(data, null, 2);
  },
  
  triggerBackupDownload: () => {
    const dataStr = StorageService.exportData();
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `icarus_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
  
  analyzeBackup: (jsonStr: string) => {
      try {
          const data = JSON.parse(jsonStr);
          const stats: any = { valid: false, details: {} };
          
          if (data[PLAYERS_KEY]) stats.details.players = data[PLAYERS_KEY].length;
          if (data[MATCHES_KEY]) stats.details.matches = data[MATCHES_KEY].length;
          
          if (Object.keys(data).some(k => k.startsWith('icarus_'))) {
              stats.valid = true;
          }
          return stats;
      } catch (e) {
          return { valid: false, error: 'Invalid JSON format' };
      }
  },

  restoreBackup: async (jsonStr: string) => { 
    try { 
      const data = JSON.parse(jsonStr); 
      if (!data.icarus_players && !data.icarus_settings) return false;

      // Restore to Firebase
      if (data[PLAYERS_KEY]) {
          for (const p of data[PLAYERS_KEY]) {
            try {
              await setDoc(doc(db, 'players', p.id), p);
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, `players/${p.id}`);
            }
          }
      }
      if (data[USERS_KEY]) {
          for (const u of data[USERS_KEY]) {
            try {
              await setDoc(doc(db, 'users', u.id), u);
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, `users/${u.id}`);
            }
          }
      }
      if (data[MATCHES_KEY]) {
          for (const m of data[MATCHES_KEY]) {
            try {
              await setDoc(doc(db, 'matches', m.id), m);
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, `matches/${m.id}`);
            }
          }
      }
      if (data[ATTENDANCE_KEY]) {
          for (const a of data[ATTENDANCE_KEY]) {
            const id = a.id || generateId();
            try {
              await setDoc(doc(db, 'attendance', id), { ...a, id });
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, `attendance/${id}`);
            }
          }
      }
      if (data[SCHEDULE_KEY]) {
          for (const s of data[SCHEDULE_KEY]) {
            try {
              await setDoc(doc(db, 'schedule', s.id), s);
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, `schedule/${s.id}`);
            }
          }
      }
      if (data[NOTICES_KEY]) {
          for (const n of data[NOTICES_KEY]) {
            try {
              await setDoc(doc(db, 'notices', n.id), n);
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, `notices/${n.id}`);
            }
          }
      }
      if (data[FEES_KEY]) {
          for (const f of data[FEES_KEY]) {
            const id = f.id || generateId();
            try {
              await setDoc(doc(db, 'fees', id), { ...f, id });
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, `fees/${id}`);
            }
          }
      }
      if (data[VENUES_KEY]) {
          for (const v of data[VENUES_KEY]) {
            try {
              await setDoc(doc(db, 'venues', v.id), v);
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, `venues/${v.id}`);
            }
          }
      }
      if (data[BATCHES_KEY]) {
          for (const b of data[BATCHES_KEY]) {
            try {
              await setDoc(doc(db, 'batches', b.id), b);
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, `batches/${b.id}`);
            }
          }
      }
      if (data[DRILLS_KEY]) {
          for (const d of data[DRILLS_KEY]) {
            try {
              await setDoc(doc(db, 'drills', d.id), d);
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, `drills/${d.id}`);
            }
          }
      }
      if (data[SETTINGS_KEY]) {
          try {
            await setDoc(doc(db, 'settings', 'academy'), data[SETTINGS_KEY]);
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, 'settings/academy');
          }
      }
      if (data[SESSION_MOTM_KEY]) {
          for (const date of Object.keys(data[SESSION_MOTM_KEY])) {
              try {
                await setDoc(doc(db, 'session_motm', date), data[SESSION_MOTM_KEY][date]);
              } catch (error) {
                handleFirestoreError(error, OperationType.WRITE, `session_motm/${date}`);
              }
          }
      }

      return true; 
    } catch(e) {
      console.error("Restore failed:", e);
      return false;
    } 
  },
  
  clearData: () => { 
    // Clearing Firebase data programmatically is dangerous and usually not done client-side.
    // We'll leave this as a no-op or just clear local storage for now.
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('icarus_')) {
            localStorage.removeItem(key);
        }
    });
    window.dispatchEvent(new Event('settingsChanged')); 
    notifyDataChange();
  },

  // --- Local Backups (IndexedDB) ---
  saveLocalBackup: async (name?: string): Promise<any> => {
    const dataStr = StorageService.exportData();
    const backup = {
      id: generateId(),
      name: name || `Backup ${new Date().toLocaleString()}`,
      timestamp: Date.now(),
      data: dataStr
    };
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('IcarusBackupsDB', 1);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('backups')) {
          db.createObjectStore('backups', { keyPath: 'id' });
        }
      };
      request.onsuccess = (e: any) => {
        const db = e.target.result;
        const tx = db.transaction('backups', 'readwrite');
        const store = tx.objectStore('backups');
        store.put(backup);
        tx.oncomplete = () => resolve(backup);
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });
  },

  getLocalBackups: async (): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('IcarusBackupsDB', 1);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('backups')) {
          db.createObjectStore('backups', { keyPath: 'id' });
        }
      };
      request.onsuccess = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('backups')) {
            resolve([]);
            return;
        }
        const tx = db.transaction('backups', 'readonly');
        const store = tx.objectStore('backups');
        const getAll = store.getAll();
        getAll.onsuccess = () => resolve(getAll.result.sort((a: any, b: any) => b.timestamp - a.timestamp));
        getAll.onerror = () => reject(getAll.error);
      };
      request.onerror = () => reject(request.error);
    });
  },

  deleteLocalBackup: async (id: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('IcarusBackupsDB', 1);
      request.onsuccess = (e: any) => {
        const db = e.target.result;
        const tx = db.transaction('backups', 'readwrite');
        const store = tx.objectStore('backups');
        store.delete(id);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });
  },

  seedSampleData: async () => {
      console.log("Seeding sample data...");
      
      // 1. Mock Players
      const players = [
          { fullName: 'Marcus Rashford', squadId: 'U13', position: 'Forward', username: 'rashy10' },
          { fullName: 'Jude Bellingham', squadId: 'U15', position: 'Midfielder', username: 'jude5' },
          { fullName: 'Bukayo Saka', squadId: 'U13', position: 'Winger', username: 'saka7' },
          { fullName: 'Phil Foden', squadId: 'U15', position: 'Midfielder', username: 'phil47' },
          { fullName: 'Kobbie Mainoo', squadId: 'U13', position: 'Midfielder', username: 'kobbie37' },
      ];

      for (const p of players) {
          await StorageService.addPlayer({
              ...p as any, 
              contactNumber: '555-0100', 
              dateOfBirth: '2010-01-01', 
              parentName: 'Guardian', 
              photoUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.username}`
          });
      }

      const freshPlayers = StorageService.getPlayers();

      // 2. Mock Matches (Past)
      const matches = [
          { date: '2024-03-20', opponent: 'Nexus Academy', scoreFor: 3, scoreAgainst: 1, isLive: false, highlightsUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ' },
          { date: '2024-03-25', opponent: 'Crestwood FC', scoreFor: 2, scoreAgainst: 2, isLive: false },
          { date: '2024-03-28', opponent: 'Titan Academy', scoreFor: 0, scoreAgainst: 2, isLive: false },
          { date: '2024-04-01', opponent: 'Solar Hawks', scoreFor: 4, scoreAgainst: 0, isLive: false },
      ];

      for (const m of matches) {
          const stats = freshPlayers.map(p => ({
              playerId: p.id,
              goals: Math.floor(Math.random() * 2),
              assists: Math.floor(Math.random() * 1),
              rating: 6 + Math.floor(Math.random() * 4),
              minutesPlayed: 90,
              isStarter: true
          }));
          await StorageService.addMatch({
              ...m,
              result: m.scoreFor > m.scoreAgainst ? 'W' : m.scoreFor < m.scoreAgainst ? 'L' : 'D',
              playerStats: stats,
              possession: 45 + Math.floor(Math.random() * 15),
              shotsOnTarget: m.scoreFor + Math.floor(Math.random() * 5),
              report: 'Strong performance on the break. Tactical discipline was maintained throughout the second half.'
          } as any);
      }

      // 3. Mock Venues & Batches
      await StorageService.addVenue('Icarus Pro Complex');
      await StorageService.addVenue('Olympic Grounds');
      await StorageService.addBatch('Performance Elite');
      await StorageService.addBatch('Development Pro');

      // 4. Mock Schedule (Past & Future)
      const now = new Date();
      const schedule = [
          { title: 'Match against Rovers FC', date: new Date(now.getTime() + 86400000 * 3).toISOString().split('T')[0], time: '10:00', type: 'match', location: 'Icarus Pro Complex' },
          { title: 'Training: Tactical Positioning', date: new Date(now.getTime() + 86400000 * 5).toISOString().split('T')[0], time: '16:00', type: 'training', location: 'Olympic Grounds' },
          { title: 'Match against Zenith United', date: new Date(now.getTime() + 86400000 * 10).toISOString().split('T')[0], time: '14:00', type: 'match', location: 'Icarus Pro Complex' },
      ];

      for (const s of schedule) {
          await StorageService.addEvent(s as any);
      }

      // 5. Mock Notices
      await StorageService.addNotice({ 
          title: 'New Training Kits Available', 
          content: 'Please collect your new Icarus brand kits from the office after practice.', 
          author: 'Academy Director',
          priority: 'normal'
      });
      await StorageService.addNotice({ 
          title: 'Spring Tournament Update', 
          content: 'Tournament brackets have been finalized. Check the Match Center for upcoming fixtures.', 
          author: 'Head Coach',
          priority: 'high'
      });

      console.log("Seeding complete.");
  },

  // --- COMMUNICATION & SUPPORT METHODS ---
  getMessages: (): BroadcastMessage[] => {
    try {
      return JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]');
    } catch (e) {
      return [];
    }
  },

  sendBroadcast: async (message: Omit<BroadcastMessage, 'id' | 'timestamp' | 'status'>) => {
    const id = generateId();
    const newMessage: BroadcastMessage = sanitizeObject({
      ...message,
      id,
      timestamp: new Date().toISOString(),
      status: 'sent' // Defaulting to sent for this demo scope
    });

    try {
      await setDoc(doc(db, 'messages', id), newMessage);
      return newMessage;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `messages/${id}`);
    }
  },

  deleteMessage: async (id: string) => {
    try {
      await deleteDoc(doc(db, 'messages', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `messages/${id}`);
    }
  },

  getTickets: (): SupportTicket[] => {
    try {
      return JSON.parse(localStorage.getItem(TICKETS_KEY) || '[]');
    } catch (e) {
      return [];
    }
  },

  addTicket: async (ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'messages'>) => {
    const id = generateId();
    const now = new Date().toISOString();
    const newTicket: SupportTicket = sanitizeObject({
      ...ticket,
      id,
      createdAt: now,
      updatedAt: now,
      messages: []
    });

    try {
      await setDoc(doc(db, 'tickets', id), newTicket);
      return newTicket;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tickets/${id}`);
    }
  },

  updateTicket: async (ticket: SupportTicket) => {
    const updatedTicket = {
      ...ticket,
      updatedAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'tickets', ticket.id), sanitizeObject(updatedTicket));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tickets/${ticket.id}`);
    }
  },

  deleteTicket: async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tickets', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tickets/${id}`);
    }
  }
};
