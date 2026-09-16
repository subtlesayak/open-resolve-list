import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

// These decisions use only the maintained record description/source URL. Anything
// whose install format is not explicit remains `other` for a later source review.
export const APPROVED_KIND_REVIEW={
  '36-cinematic-film-titles':'template',
  'attribute-spreadsheet':'reactor-package',
  'autoresolvedeb':'workflow-app',
  'boris-fx-syntheyes':'workflow-app',
  'cinepacks-free-samples':'collection',
  'dci-4k-film-grain-plates':'collection',
  'davinci-helper':'workflow-app',
  'davinci-resolve-checker':'workflow-app',
  'davinci-resolve-container':'workflow-app',
  'davinci-resolve-linux':'workflow-app',
  'davincibox':'workflow-app',
  'dec18-plugin-manager':'workflow-app',
  'deliveryqc-beta':'workflow-app',
  'despiller-plus':'reactor-package',
  'feel-free-cinema-luts':'lut',
  'filmconvert-tools':'collection',
  'fringe-fighter-turbo':'reactor-package',
  'fx-library':'collection',
  'mediainfo':'workflow-app',
  'mtitle-refined-dvr':'template',
  'mtransition-movie-dvr':'template',
  'nintendo-direct-graphics-pack':'collection',
  'pluginlibrary-resolve':'collection',
  'postsync':'workflow-app',
  're-vision-effects-for-resolve':'collection',
  'red-giant-tools-for-resolve':'collection',
  'resolvecafe':'collection',
  'resolve-tumbleweed':'workflow-app',
  'retimer-and-retimer3d':'reactor-package',
  'stocksilo':'workflow-app',
  'suck-less-audio':'reactor-package',
  'soundq':'workflow-app',
  'textbox':'template',
  'vstforresolvelinux':'workflow-app',
};

export function applyKindReview(apply=false){
  const results=[];
  for(const [id,nextKind] of Object.entries(APPROVED_KIND_REVIEW)){
    const file=path.join(root,'data/resources',id+'.json');
    const record=JSON.parse(fs.readFileSync(file,'utf8'));
    if(record.kind!== 'other' && record.kind!==nextKind)throw new Error(`${id}: expected other, found ${record.kind}`);
    results.push({id,from:record.kind,to:nextKind});
    if(apply&&record.kind!==nextKind){record.kind=nextKind;fs.writeFileSync(file,JSON.stringify(record,null,2)+'\n');}
  }
  return results;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const apply=process.argv.includes('--apply');
  const results=applyKindReview(apply);
  console.log(JSON.stringify({mode:apply?'apply':'dry-run',count:results.length,results},null,2));
}
