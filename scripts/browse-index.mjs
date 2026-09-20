import {evidenceCoverage} from '../site/model.mjs';
export function browseEntry(entry){
 const {id,name,creator,url,origin,official,reference,category,kind,tasks,tags,description,access,accessGroup,platforms,unknownFields,recommended,releaseDate,activityDate,stars}=entry;
 const {editions,resolve,architectures,processing,pricing}=entry.requirements;
 const coverage=evidenceCoverage(entry);
 return {id,name,creator,url,origin,official,reference,category,kind,tasks,tags,description,access,accessGroup,platforms,unknownFields,recommended,releaseDate,activityDate,stars,
  requirements:{editions,resolve,architectures,processing,pricing},
  version:{kind:entry.version.kind,version:entry.version.version},
  coverage:{total:coverage.total,established:coverage.established},
  evidenceLevels:[...new Set(entry.evidence.map(e=>e.level))]};
}
