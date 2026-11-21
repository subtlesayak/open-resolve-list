export function updatePresentation(update) {
 const revision=value=>/^[a-f0-9]{40}$/.test(value||'');
 let version=update.from+' → '+update.to;
 if(revision(update.to))version='Source update';
 else if(revision(update.from))version='Published version: '+update.to;
 else if(update.from==='Not established')version='Version now documented: '+update.to;
 return {name:update.display_name||update.name,version:update.display_version||version,
  changes:update.changes?.length?update.changes:[update.summary],
  dateLabel:revision(update.to)?'Source updated':'Provider date'};
}
