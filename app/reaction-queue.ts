export type MascotReaction={key:string;id:string;kind:'happy'|'banter';caption?:string};
type Action={type:'enqueue';reactions:MascotReaction[]}|{type:'finish';key:string}|{type:'reset'};
export function reactionQueue(state:MascotReaction[],action:Action):MascotReaction[]{
 if(action.type==='reset')return [];
 // A late completion may only consume the animation it belongs to.
 if(action.type==='finish')return state[0]?.key===action.key?state.slice(1):state;
 const seen=new Set(state.map(r=>r.key));
 return [...state,...action.reactions.filter(r=>{if(seen.has(r.key))return false;seen.add(r.key);return true;})];
}
