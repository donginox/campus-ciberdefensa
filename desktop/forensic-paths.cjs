'use strict';
const path=require('node:path');
// Strict descriptor readers need physical file identities, not ASAR virtual stats.
function forensicMaterialsDir(appRoot){return path.join(appRoot.endsWith('.asar')?appRoot+'.unpacked':appRoot,'assets','materials','forensic-alameda');}
module.exports={forensicMaterialsDir};
