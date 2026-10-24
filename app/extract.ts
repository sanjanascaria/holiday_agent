export const categories = ['Stay','Food','Things to do','Travel','Other'];
export const statuses = ['Option','Chosen','Booked','Archived'];
export function extract(body: string, quoted = '') {
 if (!/(?:^|\s)@pickl\b/i.test(body)) return null;
 const instruction = body.replace(/@pickl\b/ig,'').trim();
 const context = [instruction, quoted].filter(Boolean).join('\n');
 const url = context.match(/https?:\/\/[^\s<>]+/i)?.[0]?.replace(/[),.!?]+$/,'') || '';
 const category = /restaurant|dinner|lunch|breakfast|cafe|café|food|eat|brunch/i.test(context) ? 'Food' : /airbnb|hotel|apartment|accommodation|hostel|villa|stay/i.test(context) ? 'Stay' : /flight|train|airport|bus|ferry|transport/i.test(context) ? 'Travel' : /tour|museum|beach|hike|activity|activities|visit|trip|tickets/i.test(context) ? 'Things to do' : 'Other';
 const negated = /\b(not|haven.t|isn.t|don.t|didn.t|never|maybe|might|should|could|would|if)\b|\?/i.test(instruction);
 const status = !negated && /\b(booked|reserved|paid)\b/i.test(instruction) ? 'Booked' : !negated && /\b(chosen|chose|decided|finalised|finalized|confirmed)\b/i.test(instruction) ? 'Chosen' : 'Option';
 const archive = /\b(remove|delete|archive|cancel)\b/i.test(instruction);
 const update = /\b(change|update|move|replace)\b/i.test(instruction);
 let title = (quoted || instruction).replace(/https?:\/\/\S+/g,'').replace(/@pickl\b/ig,'').replace(/^(please\s+)?(save|add|record|keep|we(?:'ve| have)?\s+(?:booked|chosen)|booked|chosen)\s*/i,'').replace(/\s+(as an? option|to (?:the |our )?list)[.!]?$/i,'').trim();
 const generic = !title || /^(this|that|it|this one|this restaurant|this hotel)[.!]?$/i.test(title);
 if (generic) {try{title = url ? new URL(url).hostname.replace(/^www\./,'') : 'Clarify this plan';}catch{title='Clarify this plan';}}
 return {title:title.slice(0,100), category, status, notes:context, url, review: negated || archive || update || (generic && !url) || (!url && !quoted && instruction.split(/\s+/).length<3) ? 1:0};
}
