'use strict';
class CloseGate {
 constructor(){this.pending=false;this.allowed=false;}
 request(){if(this.allowed)return true;this.pending=true;return false;}
 async ready(flush){if(!this.pending)return false;await flush();this.allowed=true;return true;}
}
module.exports={CloseGate};
