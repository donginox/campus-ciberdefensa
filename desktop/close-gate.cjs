'use strict';
class CloseGate {
 constructor(){this.pending=false;this.allowed=false;this.finishing=null;}
 request(){if(this.allowed)return true;this.pending=true;return false;}
 async ready(flush){if(!this.pending||this.allowed||this.finishing)return false;this.finishing=Promise.resolve().then(flush);try{await this.finishing;this.allowed=true;return true;}finally{this.finishing=null;}}
}
module.exports={CloseGate};
