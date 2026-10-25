/** Hide standalone AI boilerplate in older notes without changing saved data. */
export function conciseNotes(text:string):string {
 const field='(?:exact |specific )?(?:time|date|price|cost|budget|venue|shop|address|duration|availability|booking|reservation|booking requirements|reservation requirements|booking details|reservation details)';
 const placeholder='(?:not (?:yet )?(?:specified|provided|decided|confirmed|known)|unknown|unspecified|undecided|unconfirmed|missing|TBD|to be (?:decided|confirmed|determined|set))';
 const emptyField=new RegExp(`^${field}(?: (?:is|are|was|were))?\\s*:?\\s*${placeholder}[.!]?$`,'i');
 const noField=new RegExp(`^No ${field}(?: (?:was|were|has been|have been))? (?:specified|provided|decided|confirmed)[.!]?$`,'i');
 const toneAside=/^(?:(?:playful|aggressive|teasing|joking|hostile|rude|insulting|sarcastic|humorous|banter)[\s/,–-]*)+tone (?:toward|towards|directed (?:at|toward)) @?Pickl (?:noted|acknowledged)[.!]?$/i;
 return text.split(/\n+|(?<=[.!?])\s+(?=[A-Z])|;\s+/).map(s=>s.trim()).filter(s=>s&&!emptyField.test(s)&&!noField.test(s)&&!toneAside.test(s)).join('\n');
}
