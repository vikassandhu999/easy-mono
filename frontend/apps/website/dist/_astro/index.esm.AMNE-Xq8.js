import{g as Re,a as ul,_ as ll,b as cl,F as hl,i as Xo,p as fl,u as dl,d as ml,c as pl,L as gl,e as Ft,f as _l,h as yl,S as El,j as Tl,C as vl,r as Hi,k as Il}from"./hero.astro_astro_type_script_index_0_lang.D7s-iFnO.js";var Xi=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var Qt,Yo;(function(){var r;/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/function t(T,m){function g(){}g.prototype=m.prototype,T.D=m.prototype,T.prototype=new g,T.prototype.constructor=T,T.C=function(y,E,I){for(var p=Array(arguments.length-2),Mt=2;Mt<arguments.length;Mt++)p[Mt-2]=arguments[Mt];return m.prototype[E].apply(y,p)}}function e(){this.blockSize=-1}function n(){this.blockSize=-1,this.blockSize=64,this.g=Array(4),this.B=Array(this.blockSize),this.o=this.h=0,this.s()}t(n,e),n.prototype.s=function(){this.g[0]=1732584193,this.g[1]=4023233417,this.g[2]=2562383102,this.g[3]=271733878,this.o=this.h=0};function i(T,m,g){g||(g=0);var y=Array(16);if(typeof m=="string")for(var E=0;16>E;++E)y[E]=m.charCodeAt(g++)|m.charCodeAt(g++)<<8|m.charCodeAt(g++)<<16|m.charCodeAt(g++)<<24;else for(E=0;16>E;++E)y[E]=m[g++]|m[g++]<<8|m[g++]<<16|m[g++]<<24;m=T.g[0],g=T.g[1],E=T.g[2];var I=T.g[3],p=m+(I^g&(E^I))+y[0]+3614090360&4294967295;m=g+(p<<7&4294967295|p>>>25),p=I+(E^m&(g^E))+y[1]+3905402710&4294967295,I=m+(p<<12&4294967295|p>>>20),p=E+(g^I&(m^g))+y[2]+606105819&4294967295,E=I+(p<<17&4294967295|p>>>15),p=g+(m^E&(I^m))+y[3]+3250441966&4294967295,g=E+(p<<22&4294967295|p>>>10),p=m+(I^g&(E^I))+y[4]+4118548399&4294967295,m=g+(p<<7&4294967295|p>>>25),p=I+(E^m&(g^E))+y[5]+1200080426&4294967295,I=m+(p<<12&4294967295|p>>>20),p=E+(g^I&(m^g))+y[6]+2821735955&4294967295,E=I+(p<<17&4294967295|p>>>15),p=g+(m^E&(I^m))+y[7]+4249261313&4294967295,g=E+(p<<22&4294967295|p>>>10),p=m+(I^g&(E^I))+y[8]+1770035416&4294967295,m=g+(p<<7&4294967295|p>>>25),p=I+(E^m&(g^E))+y[9]+2336552879&4294967295,I=m+(p<<12&4294967295|p>>>20),p=E+(g^I&(m^g))+y[10]+4294925233&4294967295,E=I+(p<<17&4294967295|p>>>15),p=g+(m^E&(I^m))+y[11]+2304563134&4294967295,g=E+(p<<22&4294967295|p>>>10),p=m+(I^g&(E^I))+y[12]+1804603682&4294967295,m=g+(p<<7&4294967295|p>>>25),p=I+(E^m&(g^E))+y[13]+4254626195&4294967295,I=m+(p<<12&4294967295|p>>>20),p=E+(g^I&(m^g))+y[14]+2792965006&4294967295,E=I+(p<<17&4294967295|p>>>15),p=g+(m^E&(I^m))+y[15]+1236535329&4294967295,g=E+(p<<22&4294967295|p>>>10),p=m+(E^I&(g^E))+y[1]+4129170786&4294967295,m=g+(p<<5&4294967295|p>>>27),p=I+(g^E&(m^g))+y[6]+3225465664&4294967295,I=m+(p<<9&4294967295|p>>>23),p=E+(m^g&(I^m))+y[11]+643717713&4294967295,E=I+(p<<14&4294967295|p>>>18),p=g+(I^m&(E^I))+y[0]+3921069994&4294967295,g=E+(p<<20&4294967295|p>>>12),p=m+(E^I&(g^E))+y[5]+3593408605&4294967295,m=g+(p<<5&4294967295|p>>>27),p=I+(g^E&(m^g))+y[10]+38016083&4294967295,I=m+(p<<9&4294967295|p>>>23),p=E+(m^g&(I^m))+y[15]+3634488961&4294967295,E=I+(p<<14&4294967295|p>>>18),p=g+(I^m&(E^I))+y[4]+3889429448&4294967295,g=E+(p<<20&4294967295|p>>>12),p=m+(E^I&(g^E))+y[9]+568446438&4294967295,m=g+(p<<5&4294967295|p>>>27),p=I+(g^E&(m^g))+y[14]+3275163606&4294967295,I=m+(p<<9&4294967295|p>>>23),p=E+(m^g&(I^m))+y[3]+4107603335&4294967295,E=I+(p<<14&4294967295|p>>>18),p=g+(I^m&(E^I))+y[8]+1163531501&4294967295,g=E+(p<<20&4294967295|p>>>12),p=m+(E^I&(g^E))+y[13]+2850285829&4294967295,m=g+(p<<5&4294967295|p>>>27),p=I+(g^E&(m^g))+y[2]+4243563512&4294967295,I=m+(p<<9&4294967295|p>>>23),p=E+(m^g&(I^m))+y[7]+1735328473&4294967295,E=I+(p<<14&4294967295|p>>>18),p=g+(I^m&(E^I))+y[12]+2368359562&4294967295,g=E+(p<<20&4294967295|p>>>12),p=m+(g^E^I)+y[5]+4294588738&4294967295,m=g+(p<<4&4294967295|p>>>28),p=I+(m^g^E)+y[8]+2272392833&4294967295,I=m+(p<<11&4294967295|p>>>21),p=E+(I^m^g)+y[11]+1839030562&4294967295,E=I+(p<<16&4294967295|p>>>16),p=g+(E^I^m)+y[14]+4259657740&4294967295,g=E+(p<<23&4294967295|p>>>9),p=m+(g^E^I)+y[1]+2763975236&4294967295,m=g+(p<<4&4294967295|p>>>28),p=I+(m^g^E)+y[4]+1272893353&4294967295,I=m+(p<<11&4294967295|p>>>21),p=E+(I^m^g)+y[7]+4139469664&4294967295,E=I+(p<<16&4294967295|p>>>16),p=g+(E^I^m)+y[10]+3200236656&4294967295,g=E+(p<<23&4294967295|p>>>9),p=m+(g^E^I)+y[13]+681279174&4294967295,m=g+(p<<4&4294967295|p>>>28),p=I+(m^g^E)+y[0]+3936430074&4294967295,I=m+(p<<11&4294967295|p>>>21),p=E+(I^m^g)+y[3]+3572445317&4294967295,E=I+(p<<16&4294967295|p>>>16),p=g+(E^I^m)+y[6]+76029189&4294967295,g=E+(p<<23&4294967295|p>>>9),p=m+(g^E^I)+y[9]+3654602809&4294967295,m=g+(p<<4&4294967295|p>>>28),p=I+(m^g^E)+y[12]+3873151461&4294967295,I=m+(p<<11&4294967295|p>>>21),p=E+(I^m^g)+y[15]+530742520&4294967295,E=I+(p<<16&4294967295|p>>>16),p=g+(E^I^m)+y[2]+3299628645&4294967295,g=E+(p<<23&4294967295|p>>>9),p=m+(E^(g|~I))+y[0]+4096336452&4294967295,m=g+(p<<6&4294967295|p>>>26),p=I+(g^(m|~E))+y[7]+1126891415&4294967295,I=m+(p<<10&4294967295|p>>>22),p=E+(m^(I|~g))+y[14]+2878612391&4294967295,E=I+(p<<15&4294967295|p>>>17),p=g+(I^(E|~m))+y[5]+4237533241&4294967295,g=E+(p<<21&4294967295|p>>>11),p=m+(E^(g|~I))+y[12]+1700485571&4294967295,m=g+(p<<6&4294967295|p>>>26),p=I+(g^(m|~E))+y[3]+2399980690&4294967295,I=m+(p<<10&4294967295|p>>>22),p=E+(m^(I|~g))+y[10]+4293915773&4294967295,E=I+(p<<15&4294967295|p>>>17),p=g+(I^(E|~m))+y[1]+2240044497&4294967295,g=E+(p<<21&4294967295|p>>>11),p=m+(E^(g|~I))+y[8]+1873313359&4294967295,m=g+(p<<6&4294967295|p>>>26),p=I+(g^(m|~E))+y[15]+4264355552&4294967295,I=m+(p<<10&4294967295|p>>>22),p=E+(m^(I|~g))+y[6]+2734768916&4294967295,E=I+(p<<15&4294967295|p>>>17),p=g+(I^(E|~m))+y[13]+1309151649&4294967295,g=E+(p<<21&4294967295|p>>>11),p=m+(E^(g|~I))+y[4]+4149444226&4294967295,m=g+(p<<6&4294967295|p>>>26),p=I+(g^(m|~E))+y[11]+3174756917&4294967295,I=m+(p<<10&4294967295|p>>>22),p=E+(m^(I|~g))+y[2]+718787259&4294967295,E=I+(p<<15&4294967295|p>>>17),p=g+(I^(E|~m))+y[9]+3951481745&4294967295,T.g[0]=T.g[0]+m&4294967295,T.g[1]=T.g[1]+(E+(p<<21&4294967295|p>>>11))&4294967295,T.g[2]=T.g[2]+E&4294967295,T.g[3]=T.g[3]+I&4294967295}n.prototype.u=function(T,m){m===void 0&&(m=T.length);for(var g=m-this.blockSize,y=this.B,E=this.h,I=0;I<m;){if(E==0)for(;I<=g;)i(this,T,I),I+=this.blockSize;if(typeof T=="string"){for(;I<m;)if(y[E++]=T.charCodeAt(I++),E==this.blockSize){i(this,y),E=0;break}}else for(;I<m;)if(y[E++]=T[I++],E==this.blockSize){i(this,y),E=0;break}}this.h=E,this.o+=m},n.prototype.v=function(){var T=Array((56>this.h?this.blockSize:2*this.blockSize)-this.h);T[0]=128;for(var m=1;m<T.length-8;++m)T[m]=0;var g=8*this.o;for(m=T.length-8;m<T.length;++m)T[m]=g&255,g/=256;for(this.u(T),T=Array(16),m=g=0;4>m;++m)for(var y=0;32>y;y+=8)T[g++]=this.g[m]>>>y&255;return T};function o(T,m){var g=c;return Object.prototype.hasOwnProperty.call(g,T)?g[T]:g[T]=m(T)}function u(T,m){this.h=m;for(var g=[],y=!0,E=T.length-1;0<=E;E--){var I=T[E]|0;y&&I==m||(g[E]=I,y=!1)}this.g=g}var c={};function f(T){return-128<=T&&128>T?o(T,function(m){return new u([m|0],0>m?-1:0)}):new u([T|0],0>T?-1:0)}function d(T){if(isNaN(T)||!isFinite(T))return A;if(0>T)return b(d(-T));for(var m=[],g=1,y=0;T>=g;y++)m[y]=T/g|0,g*=4294967296;return new u(m,0)}function _(T,m){if(T.length==0)throw Error("number format error: empty string");if(m=m||10,2>m||36<m)throw Error("radix out of range: "+m);if(T.charAt(0)=="-")return b(_(T.substring(1),m));if(0<=T.indexOf("-"))throw Error('number format error: interior "-" character');for(var g=d(Math.pow(m,8)),y=A,E=0;E<T.length;E+=8){var I=Math.min(8,T.length-E),p=parseInt(T.substring(E,E+I),m);8>I?(I=d(Math.pow(m,I)),y=y.j(I).add(d(p))):(y=y.j(g),y=y.add(d(p)))}return y}var A=f(0),P=f(1),C=f(16777216);r=u.prototype,r.m=function(){if(M(this))return-b(this).m();for(var T=0,m=1,g=0;g<this.g.length;g++){var y=this.i(g);T+=(0<=y?y:4294967296+y)*m,m*=4294967296}return T},r.toString=function(T){if(T=T||10,2>T||36<T)throw Error("radix out of range: "+T);if(k(this))return"0";if(M(this))return"-"+b(this).toString(T);for(var m=d(Math.pow(T,6)),g=this,y="";;){var E=yt(g,m).g;g=K(g,E.j(m));var I=((0<g.g.length?g.g[0]:g.h)>>>0).toString(T);if(g=E,k(g))return I+y;for(;6>I.length;)I="0"+I;y=I+y}},r.i=function(T){return 0>T?0:T<this.g.length?this.g[T]:this.h};function k(T){if(T.h!=0)return!1;for(var m=0;m<T.g.length;m++)if(T.g[m]!=0)return!1;return!0}function M(T){return T.h==-1}r.l=function(T){return T=K(this,T),M(T)?-1:k(T)?0:1};function b(T){for(var m=T.g.length,g=[],y=0;y<m;y++)g[y]=~T.g[y];return new u(g,~T.h).add(P)}r.abs=function(){return M(this)?b(this):this},r.add=function(T){for(var m=Math.max(this.g.length,T.g.length),g=[],y=0,E=0;E<=m;E++){var I=y+(this.i(E)&65535)+(T.i(E)&65535),p=(I>>>16)+(this.i(E)>>>16)+(T.i(E)>>>16);y=p>>>16,I&=65535,p&=65535,g[E]=p<<16|I}return new u(g,g[g.length-1]&-2147483648?-1:0)};function K(T,m){return T.add(b(m))}r.j=function(T){if(k(this)||k(T))return A;if(M(this))return M(T)?b(this).j(b(T)):b(b(this).j(T));if(M(T))return b(this.j(b(T)));if(0>this.l(C)&&0>T.l(C))return d(this.m()*T.m());for(var m=this.g.length+T.g.length,g=[],y=0;y<2*m;y++)g[y]=0;for(y=0;y<this.g.length;y++)for(var E=0;E<T.g.length;E++){var I=this.i(y)>>>16,p=this.i(y)&65535,Mt=T.i(E)>>>16,Oe=T.i(E)&65535;g[2*y+2*E]+=p*Oe,z(g,2*y+2*E),g[2*y+2*E+1]+=I*Oe,z(g,2*y+2*E+1),g[2*y+2*E+1]+=p*Mt,z(g,2*y+2*E+1),g[2*y+2*E+2]+=I*Mt,z(g,2*y+2*E+2)}for(y=0;y<m;y++)g[y]=g[2*y+1]<<16|g[2*y];for(y=m;y<2*m;y++)g[y]=0;return new u(g,0)};function z(T,m){for(;(T[m]&65535)!=T[m];)T[m+1]+=T[m]>>>16,T[m]&=65535,m++}function G(T,m){this.g=T,this.h=m}function yt(T,m){if(k(m))throw Error("division by zero");if(k(T))return new G(A,A);if(M(T))return m=yt(b(T),m),new G(b(m.g),b(m.h));if(M(m))return m=yt(T,b(m)),new G(b(m.g),m.h);if(30<T.g.length){if(M(T)||M(m))throw Error("slowDivide_ only works with positive integers.");for(var g=P,y=m;0>=y.l(T);)g=St(g),y=St(y);var E=ct(g,1),I=ct(y,1);for(y=ct(y,2),g=ct(g,2);!k(y);){var p=I.add(y);0>=p.l(T)&&(E=E.add(g),I=p),y=ct(y,1),g=ct(g,1)}return m=K(T,E.j(m)),new G(E,m)}for(E=A;0<=T.l(m);){for(g=Math.max(1,Math.floor(T.m()/m.m())),y=Math.ceil(Math.log(g)/Math.LN2),y=48>=y?1:Math.pow(2,y-48),I=d(g),p=I.j(m);M(p)||0<p.l(T);)g-=y,I=d(g),p=I.j(m);k(I)&&(I=P),E=E.add(I),T=K(T,p)}return new G(E,T)}r.A=function(T){return yt(this,T).h},r.and=function(T){for(var m=Math.max(this.g.length,T.g.length),g=[],y=0;y<m;y++)g[y]=this.i(y)&T.i(y);return new u(g,this.h&T.h)},r.or=function(T){for(var m=Math.max(this.g.length,T.g.length),g=[],y=0;y<m;y++)g[y]=this.i(y)|T.i(y);return new u(g,this.h|T.h)},r.xor=function(T){for(var m=Math.max(this.g.length,T.g.length),g=[],y=0;y<m;y++)g[y]=this.i(y)^T.i(y);return new u(g,this.h^T.h)};function St(T){for(var m=T.g.length+1,g=[],y=0;y<m;y++)g[y]=T.i(y)<<1|T.i(y-1)>>>31;return new u(g,T.h)}function ct(T,m){var g=m>>5;m%=32;for(var y=T.g.length-g,E=[],I=0;I<y;I++)E[I]=0<m?T.i(I+g)>>>m|T.i(I+g+1)<<32-m:T.i(I+g);return new u(E,T.h)}n.prototype.digest=n.prototype.v,n.prototype.reset=n.prototype.s,n.prototype.update=n.prototype.u,Yo=n,u.prototype.add=u.prototype.add,u.prototype.multiply=u.prototype.j,u.prototype.modulo=u.prototype.A,u.prototype.compare=u.prototype.l,u.prototype.toNumber=u.prototype.m,u.prototype.toString=u.prototype.toString,u.prototype.getBits=u.prototype.i,u.fromNumber=d,u.fromString=_,Qt=u}).apply(typeof Xi<"u"?Xi:typeof self<"u"?self:typeof window<"u"?window:{});var Un=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var Jo,Ze,Zo,$n,Zr,ta,ea,na;(function(){var r,t=typeof Object.defineProperties=="function"?Object.defineProperty:function(s,a,l){return s==Array.prototype||s==Object.prototype||(s[a]=l.value),s};function e(s){s=[typeof globalThis=="object"&&globalThis,s,typeof window=="object"&&window,typeof self=="object"&&self,typeof Un=="object"&&Un];for(var a=0;a<s.length;++a){var l=s[a];if(l&&l.Math==Math)return l}throw Error("Cannot find global object")}var n=e(this);function i(s,a){if(a)t:{var l=n;s=s.split(".");for(var h=0;h<s.length-1;h++){var v=s[h];if(!(v in l))break t;l=l[v]}s=s[s.length-1],h=l[s],a=a(h),a!=h&&a!=null&&t(l,s,{configurable:!0,writable:!0,value:a})}}function o(s,a){s instanceof String&&(s+="");var l=0,h=!1,v={next:function(){if(!h&&l<s.length){var w=l++;return{value:a(w,s[w]),done:!1}}return h=!0,{done:!0,value:void 0}}};return v[Symbol.iterator]=function(){return v},v}i("Array.prototype.values",function(s){return s||function(){return o(this,function(a,l){return l})}});/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/var u=u||{},c=this||self;function f(s){var a=typeof s;return a=a!="object"?a:s?Array.isArray(s)?"array":a:"null",a=="array"||a=="object"&&typeof s.length=="number"}function d(s){var a=typeof s;return a=="object"&&s!=null||a=="function"}function _(s,a,l){return s.call.apply(s.bind,arguments)}function A(s,a,l){if(!s)throw Error();if(2<arguments.length){var h=Array.prototype.slice.call(arguments,2);return function(){var v=Array.prototype.slice.call(arguments);return Array.prototype.unshift.apply(v,h),s.apply(a,v)}}return function(){return s.apply(a,arguments)}}function P(s,a,l){return P=Function.prototype.bind&&Function.prototype.bind.toString().indexOf("native code")!=-1?_:A,P.apply(null,arguments)}function C(s,a){var l=Array.prototype.slice.call(arguments,1);return function(){var h=l.slice();return h.push.apply(h,arguments),s.apply(this,h)}}function k(s,a){function l(){}l.prototype=a.prototype,s.aa=a.prototype,s.prototype=new l,s.prototype.constructor=s,s.Qb=function(h,v,w){for(var S=Array(arguments.length-2),Q=2;Q<arguments.length;Q++)S[Q-2]=arguments[Q];return a.prototype[v].apply(h,S)}}function M(s){const a=s.length;if(0<a){const l=Array(a);for(let h=0;h<a;h++)l[h]=s[h];return l}return[]}function b(s,a){for(let l=1;l<arguments.length;l++){const h=arguments[l];if(f(h)){const v=s.length||0,w=h.length||0;s.length=v+w;for(let S=0;S<w;S++)s[v+S]=h[S]}else s.push(h)}}class K{constructor(a,l){this.i=a,this.j=l,this.h=0,this.g=null}get(){let a;return 0<this.h?(this.h--,a=this.g,this.g=a.next,a.next=null):a=this.i(),a}}function z(s){return/^[\s\xa0]*$/.test(s)}function G(){var s=c.navigator;return s&&(s=s.userAgent)?s:""}function yt(s){return yt[" "](s),s}yt[" "]=function(){};var St=G().indexOf("Gecko")!=-1&&!(G().toLowerCase().indexOf("webkit")!=-1&&G().indexOf("Edge")==-1)&&!(G().indexOf("Trident")!=-1||G().indexOf("MSIE")!=-1)&&G().indexOf("Edge")==-1;function ct(s,a,l){for(const h in s)a.call(l,s[h],h,s)}function T(s,a){for(const l in s)a.call(void 0,s[l],l,s)}function m(s){const a={};for(const l in s)a[l]=s[l];return a}const g="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function y(s,a){let l,h;for(let v=1;v<arguments.length;v++){h=arguments[v];for(l in h)s[l]=h[l];for(let w=0;w<g.length;w++)l=g[w],Object.prototype.hasOwnProperty.call(h,l)&&(s[l]=h[l])}}function E(s){var a=1;s=s.split(":");const l=[];for(;0<a&&s.length;)l.push(s.shift()),a--;return s.length&&l.push(s.join(":")),l}function I(s){c.setTimeout(()=>{throw s},0)}function p(){var s=wr;let a=null;return s.g&&(a=s.g,s.g=s.g.next,s.g||(s.h=null),a.next=null),a}class Mt{constructor(){this.h=this.g=null}add(a,l){const h=Oe.get();h.set(a,l),this.h?this.h.next=h:this.g=h,this.h=h}}var Oe=new K(()=>new Pu,s=>s.reset());class Pu{constructor(){this.next=this.g=this.h=null}set(a,l){this.h=a,this.g=l,this.next=null}reset(){this.next=this.g=this.h=null}}let Le,Fe=!1,wr=new Mt,Hs=()=>{const s=c.Promise.resolve(void 0);Le=()=>{s.then(Su)}};var Su=()=>{for(var s;s=p();){try{s.h.call(s.g)}catch(l){I(l)}var a=Oe;a.j(s),100>a.h&&(a.h++,s.next=a.g,a.g=s)}Fe=!1};function Bt(){this.s=this.s,this.C=this.C}Bt.prototype.s=!1,Bt.prototype.ma=function(){this.s||(this.s=!0,this.N())},Bt.prototype.N=function(){if(this.C)for(;this.C.length;)this.C.shift()()};function ht(s,a){this.type=s,this.g=this.target=a,this.defaultPrevented=!1}ht.prototype.h=function(){this.defaultPrevented=!0};var Cu=(function(){if(!c.addEventListener||!Object.defineProperty)return!1;var s=!1,a=Object.defineProperty({},"passive",{get:function(){s=!0}});try{const l=()=>{};c.addEventListener("test",l,a),c.removeEventListener("test",l,a)}catch{}return s})();function Ue(s,a){if(ht.call(this,s?s.type:""),this.relatedTarget=this.g=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.state=null,this.pointerId=0,this.pointerType="",this.i=null,s){var l=this.type=s.type,h=s.changedTouches&&s.changedTouches.length?s.changedTouches[0]:null;if(this.target=s.target||s.srcElement,this.g=a,a=s.relatedTarget){if(St){t:{try{yt(a.nodeName);var v=!0;break t}catch{}v=!1}v||(a=null)}}else l=="mouseover"?a=s.fromElement:l=="mouseout"&&(a=s.toElement);this.relatedTarget=a,h?(this.clientX=h.clientX!==void 0?h.clientX:h.pageX,this.clientY=h.clientY!==void 0?h.clientY:h.pageY,this.screenX=h.screenX||0,this.screenY=h.screenY||0):(this.clientX=s.clientX!==void 0?s.clientX:s.pageX,this.clientY=s.clientY!==void 0?s.clientY:s.pageY,this.screenX=s.screenX||0,this.screenY=s.screenY||0),this.button=s.button,this.key=s.key||"",this.ctrlKey=s.ctrlKey,this.altKey=s.altKey,this.shiftKey=s.shiftKey,this.metaKey=s.metaKey,this.pointerId=s.pointerId||0,this.pointerType=typeof s.pointerType=="string"?s.pointerType:Du[s.pointerType]||"",this.state=s.state,this.i=s,s.defaultPrevented&&Ue.aa.h.call(this)}}k(Ue,ht);var Du={2:"touch",3:"pen",4:"mouse"};Ue.prototype.h=function(){Ue.aa.h.call(this);var s=this.i;s.preventDefault?s.preventDefault():s.returnValue=!1};var Tn="closure_listenable_"+(1e6*Math.random()|0),Nu=0;function bu(s,a,l,h,v){this.listener=s,this.proxy=null,this.src=a,this.type=l,this.capture=!!h,this.ha=v,this.key=++Nu,this.da=this.fa=!1}function vn(s){s.da=!0,s.listener=null,s.proxy=null,s.src=null,s.ha=null}function In(s){this.src=s,this.g={},this.h=0}In.prototype.add=function(s,a,l,h,v){var w=s.toString();s=this.g[w],s||(s=this.g[w]=[],this.h++);var S=Vr(s,a,h,v);return-1<S?(a=s[S],l||(a.fa=!1)):(a=new bu(a,this.src,w,!!h,v),a.fa=l,s.push(a)),a};function Rr(s,a){var l=a.type;if(l in s.g){var h=s.g[l],v=Array.prototype.indexOf.call(h,a,void 0),w;(w=0<=v)&&Array.prototype.splice.call(h,v,1),w&&(vn(a),s.g[l].length==0&&(delete s.g[l],s.h--))}}function Vr(s,a,l,h){for(var v=0;v<s.length;++v){var w=s[v];if(!w.da&&w.listener==a&&w.capture==!!l&&w.ha==h)return v}return-1}var Pr="closure_lm_"+(1e6*Math.random()|0),Sr={};function Xs(s,a,l,h,v){if(Array.isArray(a)){for(var w=0;w<a.length;w++)Xs(s,a[w],l,h,v);return null}return l=Zs(l),s&&s[Tn]?s.K(a,l,d(h)?!!h.capture:!1,v):ku(s,a,l,!1,h,v)}function ku(s,a,l,h,v,w){if(!a)throw Error("Invalid event type");var S=d(v)?!!v.capture:!!v,Q=Dr(s);if(Q||(s[Pr]=Q=new In(s)),l=Q.add(a,l,h,S,w),l.proxy)return l;if(h=xu(),l.proxy=h,h.src=s,h.listener=l,s.addEventListener)Cu||(v=S),v===void 0&&(v=!1),s.addEventListener(a.toString(),h,v);else if(s.attachEvent)s.attachEvent(Js(a.toString()),h);else if(s.addListener&&s.removeListener)s.addListener(h);else throw Error("addEventListener and attachEvent are unavailable.");return l}function xu(){function s(l){return a.call(s.src,s.listener,l)}const a=Mu;return s}function Ys(s,a,l,h,v){if(Array.isArray(a))for(var w=0;w<a.length;w++)Ys(s,a[w],l,h,v);else h=d(h)?!!h.capture:!!h,l=Zs(l),s&&s[Tn]?(s=s.i,a=String(a).toString(),a in s.g&&(w=s.g[a],l=Vr(w,l,h,v),-1<l&&(vn(w[l]),Array.prototype.splice.call(w,l,1),w.length==0&&(delete s.g[a],s.h--)))):s&&(s=Dr(s))&&(a=s.g[a.toString()],s=-1,a&&(s=Vr(a,l,h,v)),(l=-1<s?a[s]:null)&&Cr(l))}function Cr(s){if(typeof s!="number"&&s&&!s.da){var a=s.src;if(a&&a[Tn])Rr(a.i,s);else{var l=s.type,h=s.proxy;a.removeEventListener?a.removeEventListener(l,h,s.capture):a.detachEvent?a.detachEvent(Js(l),h):a.addListener&&a.removeListener&&a.removeListener(h),(l=Dr(a))?(Rr(l,s),l.h==0&&(l.src=null,a[Pr]=null)):vn(s)}}}function Js(s){return s in Sr?Sr[s]:Sr[s]="on"+s}function Mu(s,a){if(s.da)s=!0;else{a=new Ue(a,this);var l=s.listener,h=s.ha||s.src;s.fa&&Cr(s),s=l.call(h,a)}return s}function Dr(s){return s=s[Pr],s instanceof In?s:null}var Nr="__closure_events_fn_"+(1e9*Math.random()>>>0);function Zs(s){return typeof s=="function"?s:(s[Nr]||(s[Nr]=function(a){return s.handleEvent(a)}),s[Nr])}function ft(){Bt.call(this),this.i=new In(this),this.M=this,this.F=null}k(ft,Bt),ft.prototype[Tn]=!0,ft.prototype.removeEventListener=function(s,a,l,h){Ys(this,s,a,l,h)};function Et(s,a){var l,h=s.F;if(h)for(l=[];h;h=h.F)l.push(h);if(s=s.M,h=a.type||a,typeof a=="string")a=new ht(a,s);else if(a instanceof ht)a.target=a.target||s;else{var v=a;a=new ht(h,s),y(a,v)}if(v=!0,l)for(var w=l.length-1;0<=w;w--){var S=a.g=l[w];v=An(S,h,!0,a)&&v}if(S=a.g=s,v=An(S,h,!0,a)&&v,v=An(S,h,!1,a)&&v,l)for(w=0;w<l.length;w++)S=a.g=l[w],v=An(S,h,!1,a)&&v}ft.prototype.N=function(){if(ft.aa.N.call(this),this.i){var s=this.i,a;for(a in s.g){for(var l=s.g[a],h=0;h<l.length;h++)vn(l[h]);delete s.g[a],s.h--}}this.F=null},ft.prototype.K=function(s,a,l,h){return this.i.add(String(s),a,!1,l,h)},ft.prototype.L=function(s,a,l,h){return this.i.add(String(s),a,!0,l,h)};function An(s,a,l,h){if(a=s.i.g[String(a)],!a)return!0;a=a.concat();for(var v=!0,w=0;w<a.length;++w){var S=a[w];if(S&&!S.da&&S.capture==l){var Q=S.listener,ot=S.ha||S.src;S.fa&&Rr(s.i,S),v=Q.call(ot,h)!==!1&&v}}return v&&!h.defaultPrevented}function ti(s,a,l){if(typeof s=="function")l&&(s=P(s,l));else if(s&&typeof s.handleEvent=="function")s=P(s.handleEvent,s);else throw Error("Invalid listener argument");return 2147483647<Number(a)?-1:c.setTimeout(s,a||0)}function ei(s){s.g=ti(()=>{s.g=null,s.i&&(s.i=!1,ei(s))},s.l);const a=s.h;s.h=null,s.m.apply(null,a)}class Ou extends Bt{constructor(a,l){super(),this.m=a,this.l=l,this.h=null,this.i=!1,this.g=null}j(a){this.h=arguments,this.g?this.i=!0:ei(this)}N(){super.N(),this.g&&(c.clearTimeout(this.g),this.g=null,this.i=!1,this.h=null)}}function qe(s){Bt.call(this),this.h=s,this.g={}}k(qe,Bt);var ni=[];function ri(s){ct(s.g,function(a,l){this.g.hasOwnProperty(l)&&Cr(a)},s),s.g={}}qe.prototype.N=function(){qe.aa.N.call(this),ri(this)},qe.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented")};var br=c.JSON.stringify,Lu=c.JSON.parse,Fu=class{stringify(s){return c.JSON.stringify(s,void 0)}parse(s){return c.JSON.parse(s,void 0)}};function kr(){}kr.prototype.h=null;function si(s){return s.h||(s.h=s.i())}function ii(){}var je={OPEN:"a",kb:"b",Ja:"c",wb:"d"};function xr(){ht.call(this,"d")}k(xr,ht);function Mr(){ht.call(this,"c")}k(Mr,ht);var ne={},oi=null;function wn(){return oi=oi||new ft}ne.La="serverreachability";function ai(s){ht.call(this,ne.La,s)}k(ai,ht);function Be(s){const a=wn();Et(a,new ai(a))}ne.STAT_EVENT="statevent";function ui(s,a){ht.call(this,ne.STAT_EVENT,s),this.stat=a}k(ui,ht);function Tt(s){const a=wn();Et(a,new ui(a,s))}ne.Ma="timingevent";function li(s,a){ht.call(this,ne.Ma,s),this.size=a}k(li,ht);function ze(s,a){if(typeof s!="function")throw Error("Fn must not be null and must be a function");return c.setTimeout(function(){s()},a)}function Ge(){this.g=!0}Ge.prototype.xa=function(){this.g=!1};function Uu(s,a,l,h,v,w){s.info(function(){if(s.g)if(w)for(var S="",Q=w.split("&"),ot=0;ot<Q.length;ot++){var B=Q[ot].split("=");if(1<B.length){var dt=B[0];B=B[1];var mt=dt.split("_");S=2<=mt.length&&mt[1]=="type"?S+(dt+"="+B+"&"):S+(dt+"=redacted&")}}else S=null;else S=w;return"XMLHTTP REQ ("+h+") [attempt "+v+"]: "+a+`
`+l+`
`+S})}function qu(s,a,l,h,v,w,S){s.info(function(){return"XMLHTTP RESP ("+h+") [ attempt "+v+"]: "+a+`
`+l+`
`+w+" "+S})}function me(s,a,l,h){s.info(function(){return"XMLHTTP TEXT ("+a+"): "+Bu(s,l)+(h?" "+h:"")})}function ju(s,a){s.info(function(){return"TIMEOUT: "+a})}Ge.prototype.info=function(){};function Bu(s,a){if(!s.g)return a;if(!a)return null;try{var l=JSON.parse(a);if(l){for(s=0;s<l.length;s++)if(Array.isArray(l[s])){var h=l[s];if(!(2>h.length)){var v=h[1];if(Array.isArray(v)&&!(1>v.length)){var w=v[0];if(w!="noop"&&w!="stop"&&w!="close")for(var S=1;S<v.length;S++)v[S]=""}}}}return br(l)}catch{return a}}var Rn={NO_ERROR:0,gb:1,tb:2,sb:3,nb:4,rb:5,ub:6,Ia:7,TIMEOUT:8,xb:9},ci={lb:"complete",Hb:"success",Ja:"error",Ia:"abort",zb:"ready",Ab:"readystatechange",TIMEOUT:"timeout",vb:"incrementaldata",yb:"progress",ob:"downloadprogress",Pb:"uploadprogress"},Or;function Vn(){}k(Vn,kr),Vn.prototype.g=function(){return new XMLHttpRequest},Vn.prototype.i=function(){return{}},Or=new Vn;function zt(s,a,l,h){this.j=s,this.i=a,this.l=l,this.R=h||1,this.U=new qe(this),this.I=45e3,this.H=null,this.o=!1,this.m=this.A=this.v=this.L=this.F=this.S=this.B=null,this.D=[],this.g=null,this.C=0,this.s=this.u=null,this.X=-1,this.J=!1,this.O=0,this.M=null,this.W=this.K=this.T=this.P=!1,this.h=new hi}function hi(){this.i=null,this.g="",this.h=!1}var fi={},Lr={};function Fr(s,a,l){s.L=1,s.v=Dn(Ot(a)),s.m=l,s.P=!0,di(s,null)}function di(s,a){s.F=Date.now(),Pn(s),s.A=Ot(s.v);var l=s.A,h=s.R;Array.isArray(h)||(h=[String(h)]),Pi(l.i,"t",h),s.C=0,l=s.j.J,s.h=new hi,s.g=$i(s.j,l?a:null,!s.m),0<s.O&&(s.M=new Ou(P(s.Y,s,s.g),s.O)),a=s.U,l=s.g,h=s.ca;var v="readystatechange";Array.isArray(v)||(v&&(ni[0]=v.toString()),v=ni);for(var w=0;w<v.length;w++){var S=Xs(l,v[w],h||a.handleEvent,!1,a.h||a);if(!S)break;a.g[S.key]=S}a=s.H?m(s.H):{},s.m?(s.u||(s.u="POST"),a["Content-Type"]="application/x-www-form-urlencoded",s.g.ea(s.A,s.u,s.m,a)):(s.u="GET",s.g.ea(s.A,s.u,null,a)),Be(),Uu(s.i,s.u,s.A,s.l,s.R,s.m)}zt.prototype.ca=function(s){s=s.target;const a=this.M;a&&Lt(s)==3?a.j():this.Y(s)},zt.prototype.Y=function(s){try{if(s==this.g)t:{const mt=Lt(this.g);var a=this.g.Ba();const _e=this.g.Z();if(!(3>mt)&&(mt!=3||this.g&&(this.h.h||this.g.oa()||xi(this.g)))){this.J||mt!=4||a==7||(a==8||0>=_e?Be(3):Be(2)),Ur(this);var l=this.g.Z();this.X=l;e:if(mi(this)){var h=xi(this.g);s="";var v=h.length,w=Lt(this.g)==4;if(!this.h.i){if(typeof TextDecoder>"u"){re(this),$e(this);var S="";break e}this.h.i=new c.TextDecoder}for(a=0;a<v;a++)this.h.h=!0,s+=this.h.i.decode(h[a],{stream:!(w&&a==v-1)});h.length=0,this.h.g+=s,this.C=0,S=this.h.g}else S=this.g.oa();if(this.o=l==200,qu(this.i,this.u,this.A,this.l,this.R,mt,l),this.o){if(this.T&&!this.K){e:{if(this.g){var Q,ot=this.g;if((Q=ot.g?ot.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!z(Q)){var B=Q;break e}}B=null}if(l=B)me(this.i,this.l,l,"Initial handshake response via X-HTTP-Initial-Response"),this.K=!0,qr(this,l);else{this.o=!1,this.s=3,Tt(12),re(this),$e(this);break t}}if(this.P){l=!0;let Rt;for(;!this.J&&this.C<S.length;)if(Rt=zu(this,S),Rt==Lr){mt==4&&(this.s=4,Tt(14),l=!1),me(this.i,this.l,null,"[Incomplete Response]");break}else if(Rt==fi){this.s=4,Tt(15),me(this.i,this.l,S,"[Invalid Chunk]"),l=!1;break}else me(this.i,this.l,Rt,null),qr(this,Rt);if(mi(this)&&this.C!=0&&(this.h.g=this.h.g.slice(this.C),this.C=0),mt!=4||S.length!=0||this.h.h||(this.s=1,Tt(16),l=!1),this.o=this.o&&l,!l)me(this.i,this.l,S,"[Invalid Chunked Response]"),re(this),$e(this);else if(0<S.length&&!this.W){this.W=!0;var dt=this.j;dt.g==this&&dt.ba&&!dt.M&&(dt.j.info("Great, no buffering proxy detected. Bytes received: "+S.length),Kr(dt),dt.M=!0,Tt(11))}}else me(this.i,this.l,S,null),qr(this,S);mt==4&&re(this),this.o&&!this.J&&(mt==4?ji(this.j,this):(this.o=!1,Pn(this)))}else ol(this.g),l==400&&0<S.indexOf("Unknown SID")?(this.s=3,Tt(12)):(this.s=0,Tt(13)),re(this),$e(this)}}}catch{}finally{}};function mi(s){return s.g?s.u=="GET"&&s.L!=2&&s.j.Ca:!1}function zu(s,a){var l=s.C,h=a.indexOf(`
`,l);return h==-1?Lr:(l=Number(a.substring(l,h)),isNaN(l)?fi:(h+=1,h+l>a.length?Lr:(a=a.slice(h,h+l),s.C=h+l,a)))}zt.prototype.cancel=function(){this.J=!0,re(this)};function Pn(s){s.S=Date.now()+s.I,pi(s,s.I)}function pi(s,a){if(s.B!=null)throw Error("WatchDog timer not null");s.B=ze(P(s.ba,s),a)}function Ur(s){s.B&&(c.clearTimeout(s.B),s.B=null)}zt.prototype.ba=function(){this.B=null;const s=Date.now();0<=s-this.S?(ju(this.i,this.A),this.L!=2&&(Be(),Tt(17)),re(this),this.s=2,$e(this)):pi(this,this.S-s)};function $e(s){s.j.G==0||s.J||ji(s.j,s)}function re(s){Ur(s);var a=s.M;a&&typeof a.ma=="function"&&a.ma(),s.M=null,ri(s.U),s.g&&(a=s.g,s.g=null,a.abort(),a.ma())}function qr(s,a){try{var l=s.j;if(l.G!=0&&(l.g==s||jr(l.h,s))){if(!s.K&&jr(l.h,s)&&l.G==3){try{var h=l.Da.g.parse(a)}catch{h=null}if(Array.isArray(h)&&h.length==3){var v=h;if(v[0]==0){t:if(!l.u){if(l.g)if(l.g.F+3e3<s.F)On(l),xn(l);else break t;$r(l),Tt(18)}}else l.za=v[1],0<l.za-l.T&&37500>v[2]&&l.F&&l.v==0&&!l.C&&(l.C=ze(P(l.Za,l),6e3));if(1>=yi(l.h)&&l.ca){try{l.ca()}catch{}l.ca=void 0}}else ie(l,11)}else if((s.K||l.g==s)&&On(l),!z(a))for(v=l.Da.g.parse(a),a=0;a<v.length;a++){let B=v[a];if(l.T=B[0],B=B[1],l.G==2)if(B[0]=="c"){l.K=B[1],l.ia=B[2];const dt=B[3];dt!=null&&(l.la=dt,l.j.info("VER="+l.la));const mt=B[4];mt!=null&&(l.Aa=mt,l.j.info("SVER="+l.Aa));const _e=B[5];_e!=null&&typeof _e=="number"&&0<_e&&(h=1.5*_e,l.L=h,l.j.info("backChannelRequestTimeoutMs_="+h)),h=l;const Rt=s.g;if(Rt){const Fn=Rt.g?Rt.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(Fn){var w=h.h;w.g||Fn.indexOf("spdy")==-1&&Fn.indexOf("quic")==-1&&Fn.indexOf("h2")==-1||(w.j=w.l,w.g=new Set,w.h&&(Br(w,w.h),w.h=null))}if(h.D){const Qr=Rt.g?Rt.g.getResponseHeader("X-HTTP-Session-Id"):null;Qr&&(h.ya=Qr,H(h.I,h.D,Qr))}}l.G=3,l.l&&l.l.ua(),l.ba&&(l.R=Date.now()-s.F,l.j.info("Handshake RTT: "+l.R+"ms")),h=l;var S=s;if(h.qa=Gi(h,h.J?h.ia:null,h.W),S.K){Ei(h.h,S);var Q=S,ot=h.L;ot&&(Q.I=ot),Q.B&&(Ur(Q),Pn(Q)),h.g=S}else Ui(h);0<l.i.length&&Mn(l)}else B[0]!="stop"&&B[0]!="close"||ie(l,7);else l.G==3&&(B[0]=="stop"||B[0]=="close"?B[0]=="stop"?ie(l,7):Gr(l):B[0]!="noop"&&l.l&&l.l.ta(B),l.v=0)}}Be(4)}catch{}}var Gu=class{constructor(s,a){this.g=s,this.map=a}};function gi(s){this.l=s||10,c.PerformanceNavigationTiming?(s=c.performance.getEntriesByType("navigation"),s=0<s.length&&(s[0].nextHopProtocol=="hq"||s[0].nextHopProtocol=="h2")):s=!!(c.chrome&&c.chrome.loadTimes&&c.chrome.loadTimes()&&c.chrome.loadTimes().wasFetchedViaSpdy),this.j=s?this.l:1,this.g=null,1<this.j&&(this.g=new Set),this.h=null,this.i=[]}function _i(s){return s.h?!0:s.g?s.g.size>=s.j:!1}function yi(s){return s.h?1:s.g?s.g.size:0}function jr(s,a){return s.h?s.h==a:s.g?s.g.has(a):!1}function Br(s,a){s.g?s.g.add(a):s.h=a}function Ei(s,a){s.h&&s.h==a?s.h=null:s.g&&s.g.has(a)&&s.g.delete(a)}gi.prototype.cancel=function(){if(this.i=Ti(this),this.h)this.h.cancel(),this.h=null;else if(this.g&&this.g.size!==0){for(const s of this.g.values())s.cancel();this.g.clear()}};function Ti(s){if(s.h!=null)return s.i.concat(s.h.D);if(s.g!=null&&s.g.size!==0){let a=s.i;for(const l of s.g.values())a=a.concat(l.D);return a}return M(s.i)}function $u(s){if(s.V&&typeof s.V=="function")return s.V();if(typeof Map<"u"&&s instanceof Map||typeof Set<"u"&&s instanceof Set)return Array.from(s.values());if(typeof s=="string")return s.split("");if(f(s)){for(var a=[],l=s.length,h=0;h<l;h++)a.push(s[h]);return a}a=[],l=0;for(h in s)a[l++]=s[h];return a}function Ku(s){if(s.na&&typeof s.na=="function")return s.na();if(!s.V||typeof s.V!="function"){if(typeof Map<"u"&&s instanceof Map)return Array.from(s.keys());if(!(typeof Set<"u"&&s instanceof Set)){if(f(s)||typeof s=="string"){var a=[];s=s.length;for(var l=0;l<s;l++)a.push(l);return a}a=[],l=0;for(const h in s)a[l++]=h;return a}}}function vi(s,a){if(s.forEach&&typeof s.forEach=="function")s.forEach(a,void 0);else if(f(s)||typeof s=="string")Array.prototype.forEach.call(s,a,void 0);else for(var l=Ku(s),h=$u(s),v=h.length,w=0;w<v;w++)a.call(void 0,h[w],l&&l[w],s)}var Ii=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");function Qu(s,a){if(s){s=s.split("&");for(var l=0;l<s.length;l++){var h=s[l].indexOf("="),v=null;if(0<=h){var w=s[l].substring(0,h);v=s[l].substring(h+1)}else w=s[l];a(w,v?decodeURIComponent(v.replace(/\+/g," ")):"")}}}function se(s){if(this.g=this.o=this.j="",this.s=null,this.m=this.l="",this.h=!1,s instanceof se){this.h=s.h,Sn(this,s.j),this.o=s.o,this.g=s.g,Cn(this,s.s),this.l=s.l;var a=s.i,l=new We;l.i=a.i,a.g&&(l.g=new Map(a.g),l.h=a.h),Ai(this,l),this.m=s.m}else s&&(a=String(s).match(Ii))?(this.h=!1,Sn(this,a[1]||"",!0),this.o=Ke(a[2]||""),this.g=Ke(a[3]||"",!0),Cn(this,a[4]),this.l=Ke(a[5]||"",!0),Ai(this,a[6]||"",!0),this.m=Ke(a[7]||"")):(this.h=!1,this.i=new We(null,this.h))}se.prototype.toString=function(){var s=[],a=this.j;a&&s.push(Qe(a,wi,!0),":");var l=this.g;return(l||a=="file")&&(s.push("//"),(a=this.o)&&s.push(Qe(a,wi,!0),"@"),s.push(encodeURIComponent(String(l)).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),l=this.s,l!=null&&s.push(":",String(l))),(l=this.l)&&(this.g&&l.charAt(0)!="/"&&s.push("/"),s.push(Qe(l,l.charAt(0)=="/"?Xu:Hu,!0))),(l=this.i.toString())&&s.push("?",l),(l=this.m)&&s.push("#",Qe(l,Ju)),s.join("")};function Ot(s){return new se(s)}function Sn(s,a,l){s.j=l?Ke(a,!0):a,s.j&&(s.j=s.j.replace(/:$/,""))}function Cn(s,a){if(a){if(a=Number(a),isNaN(a)||0>a)throw Error("Bad port number "+a);s.s=a}else s.s=null}function Ai(s,a,l){a instanceof We?(s.i=a,Zu(s.i,s.h)):(l||(a=Qe(a,Yu)),s.i=new We(a,s.h))}function H(s,a,l){s.i.set(a,l)}function Dn(s){return H(s,"zx",Math.floor(2147483648*Math.random()).toString(36)+Math.abs(Math.floor(2147483648*Math.random())^Date.now()).toString(36)),s}function Ke(s,a){return s?a?decodeURI(s.replace(/%25/g,"%2525")):decodeURIComponent(s):""}function Qe(s,a,l){return typeof s=="string"?(s=encodeURI(s).replace(a,Wu),l&&(s=s.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),s):null}function Wu(s){return s=s.charCodeAt(0),"%"+(s>>4&15).toString(16)+(s&15).toString(16)}var wi=/[#\/\?@]/g,Hu=/[#\?:]/g,Xu=/[#\?]/g,Yu=/[#\?@]/g,Ju=/#/g;function We(s,a){this.h=this.g=null,this.i=s||null,this.j=!!a}function Gt(s){s.g||(s.g=new Map,s.h=0,s.i&&Qu(s.i,function(a,l){s.add(decodeURIComponent(a.replace(/\+/g," ")),l)}))}r=We.prototype,r.add=function(s,a){Gt(this),this.i=null,s=pe(this,s);var l=this.g.get(s);return l||this.g.set(s,l=[]),l.push(a),this.h+=1,this};function Ri(s,a){Gt(s),a=pe(s,a),s.g.has(a)&&(s.i=null,s.h-=s.g.get(a).length,s.g.delete(a))}function Vi(s,a){return Gt(s),a=pe(s,a),s.g.has(a)}r.forEach=function(s,a){Gt(this),this.g.forEach(function(l,h){l.forEach(function(v){s.call(a,v,h,this)},this)},this)},r.na=function(){Gt(this);const s=Array.from(this.g.values()),a=Array.from(this.g.keys()),l=[];for(let h=0;h<a.length;h++){const v=s[h];for(let w=0;w<v.length;w++)l.push(a[h])}return l},r.V=function(s){Gt(this);let a=[];if(typeof s=="string")Vi(this,s)&&(a=a.concat(this.g.get(pe(this,s))));else{s=Array.from(this.g.values());for(let l=0;l<s.length;l++)a=a.concat(s[l])}return a},r.set=function(s,a){return Gt(this),this.i=null,s=pe(this,s),Vi(this,s)&&(this.h-=this.g.get(s).length),this.g.set(s,[a]),this.h+=1,this},r.get=function(s,a){return s?(s=this.V(s),0<s.length?String(s[0]):a):a};function Pi(s,a,l){Ri(s,a),0<l.length&&(s.i=null,s.g.set(pe(s,a),M(l)),s.h+=l.length)}r.toString=function(){if(this.i)return this.i;if(!this.g)return"";const s=[],a=Array.from(this.g.keys());for(var l=0;l<a.length;l++){var h=a[l];const w=encodeURIComponent(String(h)),S=this.V(h);for(h=0;h<S.length;h++){var v=w;S[h]!==""&&(v+="="+encodeURIComponent(String(S[h]))),s.push(v)}}return this.i=s.join("&")};function pe(s,a){return a=String(a),s.j&&(a=a.toLowerCase()),a}function Zu(s,a){a&&!s.j&&(Gt(s),s.i=null,s.g.forEach(function(l,h){var v=h.toLowerCase();h!=v&&(Ri(this,h),Pi(this,v,l))},s)),s.j=a}function tl(s,a){const l=new Ge;if(c.Image){const h=new Image;h.onload=C($t,l,"TestLoadImage: loaded",!0,a,h),h.onerror=C($t,l,"TestLoadImage: error",!1,a,h),h.onabort=C($t,l,"TestLoadImage: abort",!1,a,h),h.ontimeout=C($t,l,"TestLoadImage: timeout",!1,a,h),c.setTimeout(function(){h.ontimeout&&h.ontimeout()},1e4),h.src=s}else a(!1)}function el(s,a){const l=new Ge,h=new AbortController,v=setTimeout(()=>{h.abort(),$t(l,"TestPingServer: timeout",!1,a)},1e4);fetch(s,{signal:h.signal}).then(w=>{clearTimeout(v),w.ok?$t(l,"TestPingServer: ok",!0,a):$t(l,"TestPingServer: server error",!1,a)}).catch(()=>{clearTimeout(v),$t(l,"TestPingServer: error",!1,a)})}function $t(s,a,l,h,v){try{v&&(v.onload=null,v.onerror=null,v.onabort=null,v.ontimeout=null),h(l)}catch{}}function nl(){this.g=new Fu}function rl(s,a,l){const h=l||"";try{vi(s,function(v,w){let S=v;d(v)&&(S=br(v)),a.push(h+w+"="+encodeURIComponent(S))})}catch(v){throw a.push(h+"type="+encodeURIComponent("_badmap")),v}}function Nn(s){this.l=s.Ub||null,this.j=s.eb||!1}k(Nn,kr),Nn.prototype.g=function(){return new bn(this.l,this.j)},Nn.prototype.i=(function(s){return function(){return s}})({});function bn(s,a){ft.call(this),this.D=s,this.o=a,this.m=void 0,this.status=this.readyState=0,this.responseType=this.responseText=this.response=this.statusText="",this.onreadystatechange=null,this.u=new Headers,this.h=null,this.B="GET",this.A="",this.g=!1,this.v=this.j=this.l=null}k(bn,ft),r=bn.prototype,r.open=function(s,a){if(this.readyState!=0)throw this.abort(),Error("Error reopening a connection");this.B=s,this.A=a,this.readyState=1,Xe(this)},r.send=function(s){if(this.readyState!=1)throw this.abort(),Error("need to call open() first. ");this.g=!0;const a={headers:this.u,method:this.B,credentials:this.m,cache:void 0};s&&(a.body=s),(this.D||c).fetch(new Request(this.A,a)).then(this.Sa.bind(this),this.ga.bind(this))},r.abort=function(){this.response=this.responseText="",this.u=new Headers,this.status=0,this.j&&this.j.cancel("Request was aborted.").catch(()=>{}),1<=this.readyState&&this.g&&this.readyState!=4&&(this.g=!1,He(this)),this.readyState=0},r.Sa=function(s){if(this.g&&(this.l=s,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=s.headers,this.readyState=2,Xe(this)),this.g&&(this.readyState=3,Xe(this),this.g)))if(this.responseType==="arraybuffer")s.arrayBuffer().then(this.Qa.bind(this),this.ga.bind(this));else if(typeof c.ReadableStream<"u"&&"body"in s){if(this.j=s.body.getReader(),this.o){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=[]}else this.response=this.responseText="",this.v=new TextDecoder;Si(this)}else s.text().then(this.Ra.bind(this),this.ga.bind(this))};function Si(s){s.j.read().then(s.Pa.bind(s)).catch(s.ga.bind(s))}r.Pa=function(s){if(this.g){if(this.o&&s.value)this.response.push(s.value);else if(!this.o){var a=s.value?s.value:new Uint8Array(0);(a=this.v.decode(a,{stream:!s.done}))&&(this.response=this.responseText+=a)}s.done?He(this):Xe(this),this.readyState==3&&Si(this)}},r.Ra=function(s){this.g&&(this.response=this.responseText=s,He(this))},r.Qa=function(s){this.g&&(this.response=s,He(this))},r.ga=function(){this.g&&He(this)};function He(s){s.readyState=4,s.l=null,s.j=null,s.v=null,Xe(s)}r.setRequestHeader=function(s,a){this.u.append(s,a)},r.getResponseHeader=function(s){return this.h&&this.h.get(s.toLowerCase())||""},r.getAllResponseHeaders=function(){if(!this.h)return"";const s=[],a=this.h.entries();for(var l=a.next();!l.done;)l=l.value,s.push(l[0]+": "+l[1]),l=a.next();return s.join(`\r
`)};function Xe(s){s.onreadystatechange&&s.onreadystatechange.call(s)}Object.defineProperty(bn.prototype,"withCredentials",{get:function(){return this.m==="include"},set:function(s){this.m=s?"include":"same-origin"}});function Ci(s){let a="";return ct(s,function(l,h){a+=h,a+=":",a+=l,a+=`\r
`}),a}function zr(s,a,l){t:{for(h in l){var h=!1;break t}h=!0}h||(l=Ci(l),typeof s=="string"?l!=null&&encodeURIComponent(String(l)):H(s,a,l))}function J(s){ft.call(this),this.headers=new Map,this.o=s||null,this.h=!1,this.v=this.g=null,this.D="",this.m=0,this.l="",this.j=this.B=this.u=this.A=!1,this.I=null,this.H="",this.J=!1}k(J,ft);var sl=/^https?$/i,il=["POST","PUT"];r=J.prototype,r.Ha=function(s){this.J=s},r.ea=function(s,a,l,h){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.D+"; newUri="+s);a=a?a.toUpperCase():"GET",this.D=s,this.l="",this.m=0,this.A=!1,this.h=!0,this.g=this.o?this.o.g():Or.g(),this.v=this.o?si(this.o):si(Or),this.g.onreadystatechange=P(this.Ea,this);try{this.B=!0,this.g.open(a,String(s),!0),this.B=!1}catch(w){Di(this,w);return}if(s=l||"",l=new Map(this.headers),h)if(Object.getPrototypeOf(h)===Object.prototype)for(var v in h)l.set(v,h[v]);else if(typeof h.keys=="function"&&typeof h.get=="function")for(const w of h.keys())l.set(w,h.get(w));else throw Error("Unknown input type for opt_headers: "+String(h));h=Array.from(l.keys()).find(w=>w.toLowerCase()=="content-type"),v=c.FormData&&s instanceof c.FormData,!(0<=Array.prototype.indexOf.call(il,a,void 0))||h||v||l.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");for(const[w,S]of l)this.g.setRequestHeader(w,S);this.H&&(this.g.responseType=this.H),"withCredentials"in this.g&&this.g.withCredentials!==this.J&&(this.g.withCredentials=this.J);try{ki(this),this.u=!0,this.g.send(s),this.u=!1}catch(w){Di(this,w)}};function Di(s,a){s.h=!1,s.g&&(s.j=!0,s.g.abort(),s.j=!1),s.l=a,s.m=5,Ni(s),kn(s)}function Ni(s){s.A||(s.A=!0,Et(s,"complete"),Et(s,"error"))}r.abort=function(s){this.g&&this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1,this.m=s||7,Et(this,"complete"),Et(this,"abort"),kn(this))},r.N=function(){this.g&&(this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1),kn(this,!0)),J.aa.N.call(this)},r.Ea=function(){this.s||(this.B||this.u||this.j?bi(this):this.bb())},r.bb=function(){bi(this)};function bi(s){if(s.h&&typeof u<"u"&&(!s.v[1]||Lt(s)!=4||s.Z()!=2)){if(s.u&&Lt(s)==4)ti(s.Ea,0,s);else if(Et(s,"readystatechange"),Lt(s)==4){s.h=!1;try{const S=s.Z();t:switch(S){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var a=!0;break t;default:a=!1}var l;if(!(l=a)){var h;if(h=S===0){var v=String(s.D).match(Ii)[1]||null;!v&&c.self&&c.self.location&&(v=c.self.location.protocol.slice(0,-1)),h=!sl.test(v?v.toLowerCase():"")}l=h}if(l)Et(s,"complete"),Et(s,"success");else{s.m=6;try{var w=2<Lt(s)?s.g.statusText:""}catch{w=""}s.l=w+" ["+s.Z()+"]",Ni(s)}}finally{kn(s)}}}}function kn(s,a){if(s.g){ki(s);const l=s.g,h=s.v[0]?()=>{}:null;s.g=null,s.v=null,a||Et(s,"ready");try{l.onreadystatechange=h}catch{}}}function ki(s){s.I&&(c.clearTimeout(s.I),s.I=null)}r.isActive=function(){return!!this.g};function Lt(s){return s.g?s.g.readyState:0}r.Z=function(){try{return 2<Lt(this)?this.g.status:-1}catch{return-1}},r.oa=function(){try{return this.g?this.g.responseText:""}catch{return""}},r.Oa=function(s){if(this.g){var a=this.g.responseText;return s&&a.indexOf(s)==0&&(a=a.substring(s.length)),Lu(a)}};function xi(s){try{if(!s.g)return null;if("response"in s.g)return s.g.response;switch(s.H){case"":case"text":return s.g.responseText;case"arraybuffer":if("mozResponseArrayBuffer"in s.g)return s.g.mozResponseArrayBuffer}return null}catch{return null}}function ol(s){const a={};s=(s.g&&2<=Lt(s)&&s.g.getAllResponseHeaders()||"").split(`\r
`);for(let h=0;h<s.length;h++){if(z(s[h]))continue;var l=E(s[h]);const v=l[0];if(l=l[1],typeof l!="string")continue;l=l.trim();const w=a[v]||[];a[v]=w,w.push(l)}T(a,function(h){return h.join(", ")})}r.Ba=function(){return this.m},r.Ka=function(){return typeof this.l=="string"?this.l:String(this.l)};function Ye(s,a,l){return l&&l.internalChannelParams&&l.internalChannelParams[s]||a}function Mi(s){this.Aa=0,this.i=[],this.j=new Ge,this.ia=this.qa=this.I=this.W=this.g=this.ya=this.D=this.H=this.m=this.S=this.o=null,this.Ya=this.U=0,this.Va=Ye("failFast",!1,s),this.F=this.C=this.u=this.s=this.l=null,this.X=!0,this.za=this.T=-1,this.Y=this.v=this.B=0,this.Ta=Ye("baseRetryDelayMs",5e3,s),this.cb=Ye("retryDelaySeedMs",1e4,s),this.Wa=Ye("forwardChannelMaxRetries",2,s),this.wa=Ye("forwardChannelRequestTimeoutMs",2e4,s),this.pa=s&&s.xmlHttpFactory||void 0,this.Xa=s&&s.Tb||void 0,this.Ca=s&&s.useFetchStreams||!1,this.L=void 0,this.J=s&&s.supportsCrossDomainXhr||!1,this.K="",this.h=new gi(s&&s.concurrentRequestLimit),this.Da=new nl,this.P=s&&s.fastHandshake||!1,this.O=s&&s.encodeInitMessageHeaders||!1,this.P&&this.O&&(this.O=!1),this.Ua=s&&s.Rb||!1,s&&s.xa&&this.j.xa(),s&&s.forceLongPolling&&(this.X=!1),this.ba=!this.P&&this.X&&s&&s.detectBufferingProxy||!1,this.ja=void 0,s&&s.longPollingTimeout&&0<s.longPollingTimeout&&(this.ja=s.longPollingTimeout),this.ca=void 0,this.R=0,this.M=!1,this.ka=this.A=null}r=Mi.prototype,r.la=8,r.G=1,r.connect=function(s,a,l,h){Tt(0),this.W=s,this.H=a||{},l&&h!==void 0&&(this.H.OSID=l,this.H.OAID=h),this.F=this.X,this.I=Gi(this,null,this.W),Mn(this)};function Gr(s){if(Oi(s),s.G==3){var a=s.U++,l=Ot(s.I);if(H(l,"SID",s.K),H(l,"RID",a),H(l,"TYPE","terminate"),Je(s,l),a=new zt(s,s.j,a),a.L=2,a.v=Dn(Ot(l)),l=!1,c.navigator&&c.navigator.sendBeacon)try{l=c.navigator.sendBeacon(a.v.toString(),"")}catch{}!l&&c.Image&&(new Image().src=a.v,l=!0),l||(a.g=$i(a.j,null),a.g.ea(a.v)),a.F=Date.now(),Pn(a)}zi(s)}function xn(s){s.g&&(Kr(s),s.g.cancel(),s.g=null)}function Oi(s){xn(s),s.u&&(c.clearTimeout(s.u),s.u=null),On(s),s.h.cancel(),s.s&&(typeof s.s=="number"&&c.clearTimeout(s.s),s.s=null)}function Mn(s){if(!_i(s.h)&&!s.s){s.s=!0;var a=s.Ga;Le||Hs(),Fe||(Le(),Fe=!0),wr.add(a,s),s.B=0}}function al(s,a){return yi(s.h)>=s.h.j-(s.s?1:0)?!1:s.s?(s.i=a.D.concat(s.i),!0):s.G==1||s.G==2||s.B>=(s.Va?0:s.Wa)?!1:(s.s=ze(P(s.Ga,s,a),Bi(s,s.B)),s.B++,!0)}r.Ga=function(s){if(this.s)if(this.s=null,this.G==1){if(!s){this.U=Math.floor(1e5*Math.random()),s=this.U++;const v=new zt(this,this.j,s);let w=this.o;if(this.S&&(w?(w=m(w),y(w,this.S)):w=this.S),this.m!==null||this.O||(v.H=w,w=null),this.P)t:{for(var a=0,l=0;l<this.i.length;l++){e:{var h=this.i[l];if("__data__"in h.map&&(h=h.map.__data__,typeof h=="string")){h=h.length;break e}h=void 0}if(h===void 0)break;if(a+=h,4096<a){a=l;break t}if(a===4096||l===this.i.length-1){a=l+1;break t}}a=1e3}else a=1e3;a=Fi(this,v,a),l=Ot(this.I),H(l,"RID",s),H(l,"CVER",22),this.D&&H(l,"X-HTTP-Session-Id",this.D),Je(this,l),w&&(this.O?a="headers="+encodeURIComponent(String(Ci(w)))+"&"+a:this.m&&zr(l,this.m,w)),Br(this.h,v),this.Ua&&H(l,"TYPE","init"),this.P?(H(l,"$req",a),H(l,"SID","null"),v.T=!0,Fr(v,l,null)):Fr(v,l,a),this.G=2}}else this.G==3&&(s?Li(this,s):this.i.length==0||_i(this.h)||Li(this))};function Li(s,a){var l;a?l=a.l:l=s.U++;const h=Ot(s.I);H(h,"SID",s.K),H(h,"RID",l),H(h,"AID",s.T),Je(s,h),s.m&&s.o&&zr(h,s.m,s.o),l=new zt(s,s.j,l,s.B+1),s.m===null&&(l.H=s.o),a&&(s.i=a.D.concat(s.i)),a=Fi(s,l,1e3),l.I=Math.round(.5*s.wa)+Math.round(.5*s.wa*Math.random()),Br(s.h,l),Fr(l,h,a)}function Je(s,a){s.H&&ct(s.H,function(l,h){H(a,h,l)}),s.l&&vi({},function(l,h){H(a,h,l)})}function Fi(s,a,l){l=Math.min(s.i.length,l);var h=s.l?P(s.l.Na,s.l,s):null;t:{var v=s.i;let w=-1;for(;;){const S=["count="+l];w==-1?0<l?(w=v[0].g,S.push("ofs="+w)):w=0:S.push("ofs="+w);let Q=!0;for(let ot=0;ot<l;ot++){let B=v[ot].g;const dt=v[ot].map;if(B-=w,0>B)w=Math.max(0,v[ot].g-100),Q=!1;else try{rl(dt,S,"req"+B+"_")}catch{h&&h(dt)}}if(Q){h=S.join("&");break t}}}return s=s.i.splice(0,l),a.D=s,h}function Ui(s){if(!s.g&&!s.u){s.Y=1;var a=s.Fa;Le||Hs(),Fe||(Le(),Fe=!0),wr.add(a,s),s.v=0}}function $r(s){return s.g||s.u||3<=s.v?!1:(s.Y++,s.u=ze(P(s.Fa,s),Bi(s,s.v)),s.v++,!0)}r.Fa=function(){if(this.u=null,qi(this),this.ba&&!(this.M||this.g==null||0>=this.R)){var s=2*this.R;this.j.info("BP detection timer enabled: "+s),this.A=ze(P(this.ab,this),s)}},r.ab=function(){this.A&&(this.A=null,this.j.info("BP detection timeout reached."),this.j.info("Buffering proxy detected and switch to long-polling!"),this.F=!1,this.M=!0,Tt(10),xn(this),qi(this))};function Kr(s){s.A!=null&&(c.clearTimeout(s.A),s.A=null)}function qi(s){s.g=new zt(s,s.j,"rpc",s.Y),s.m===null&&(s.g.H=s.o),s.g.O=0;var a=Ot(s.qa);H(a,"RID","rpc"),H(a,"SID",s.K),H(a,"AID",s.T),H(a,"CI",s.F?"0":"1"),!s.F&&s.ja&&H(a,"TO",s.ja),H(a,"TYPE","xmlhttp"),Je(s,a),s.m&&s.o&&zr(a,s.m,s.o),s.L&&(s.g.I=s.L);var l=s.g;s=s.ia,l.L=1,l.v=Dn(Ot(a)),l.m=null,l.P=!0,di(l,s)}r.Za=function(){this.C!=null&&(this.C=null,xn(this),$r(this),Tt(19))};function On(s){s.C!=null&&(c.clearTimeout(s.C),s.C=null)}function ji(s,a){var l=null;if(s.g==a){On(s),Kr(s),s.g=null;var h=2}else if(jr(s.h,a))l=a.D,Ei(s.h,a),h=1;else return;if(s.G!=0){if(a.o)if(h==1){l=a.m?a.m.length:0,a=Date.now()-a.F;var v=s.B;h=wn(),Et(h,new li(h,l)),Mn(s)}else Ui(s);else if(v=a.s,v==3||v==0&&0<a.X||!(h==1&&al(s,a)||h==2&&$r(s)))switch(l&&0<l.length&&(a=s.h,a.i=a.i.concat(l)),v){case 1:ie(s,5);break;case 4:ie(s,10);break;case 3:ie(s,6);break;default:ie(s,2)}}}function Bi(s,a){let l=s.Ta+Math.floor(Math.random()*s.cb);return s.isActive()||(l*=2),l*a}function ie(s,a){if(s.j.info("Error code "+a),a==2){var l=P(s.fb,s),h=s.Xa;const v=!h;h=new se(h||"//www.google.com/images/cleardot.gif"),c.location&&c.location.protocol=="http"||Sn(h,"https"),Dn(h),v?tl(h.toString(),l):el(h.toString(),l)}else Tt(2);s.G=0,s.l&&s.l.sa(a),zi(s),Oi(s)}r.fb=function(s){s?(this.j.info("Successfully pinged google.com"),Tt(2)):(this.j.info("Failed to ping google.com"),Tt(1))};function zi(s){if(s.G=0,s.ka=[],s.l){const a=Ti(s.h);(a.length!=0||s.i.length!=0)&&(b(s.ka,a),b(s.ka,s.i),s.h.i.length=0,M(s.i),s.i.length=0),s.l.ra()}}function Gi(s,a,l){var h=l instanceof se?Ot(l):new se(l);if(h.g!="")a&&(h.g=a+"."+h.g),Cn(h,h.s);else{var v=c.location;h=v.protocol,a=a?a+"."+v.hostname:v.hostname,v=+v.port;var w=new se(null);h&&Sn(w,h),a&&(w.g=a),v&&Cn(w,v),l&&(w.l=l),h=w}return l=s.D,a=s.ya,l&&a&&H(h,l,a),H(h,"VER",s.la),Je(s,h),h}function $i(s,a,l){if(a&&!s.J)throw Error("Can't create secondary domain capable XhrIo object.");return a=s.Ca&&!s.pa?new J(new Nn({eb:l})):new J(s.pa),a.Ha(s.J),a}r.isActive=function(){return!!this.l&&this.l.isActive(this)};function Ki(){}r=Ki.prototype,r.ua=function(){},r.ta=function(){},r.sa=function(){},r.ra=function(){},r.isActive=function(){return!0},r.Na=function(){};function Ln(){}Ln.prototype.g=function(s,a){return new It(s,a)};function It(s,a){ft.call(this),this.g=new Mi(a),this.l=s,this.h=a&&a.messageUrlParams||null,s=a&&a.messageHeaders||null,a&&a.clientProtocolHeaderRequired&&(s?s["X-Client-Protocol"]="webchannel":s={"X-Client-Protocol":"webchannel"}),this.g.o=s,s=a&&a.initMessageHeaders||null,a&&a.messageContentType&&(s?s["X-WebChannel-Content-Type"]=a.messageContentType:s={"X-WebChannel-Content-Type":a.messageContentType}),a&&a.va&&(s?s["X-WebChannel-Client-Profile"]=a.va:s={"X-WebChannel-Client-Profile":a.va}),this.g.S=s,(s=a&&a.Sb)&&!z(s)&&(this.g.m=s),this.v=a&&a.supportsCrossDomainXhr||!1,this.u=a&&a.sendRawJson||!1,(a=a&&a.httpSessionIdParam)&&!z(a)&&(this.g.D=a,s=this.h,s!==null&&a in s&&(s=this.h,a in s&&delete s[a])),this.j=new ge(this)}k(It,ft),It.prototype.m=function(){this.g.l=this.j,this.v&&(this.g.J=!0),this.g.connect(this.l,this.h||void 0)},It.prototype.close=function(){Gr(this.g)},It.prototype.o=function(s){var a=this.g;if(typeof s=="string"){var l={};l.__data__=s,s=l}else this.u&&(l={},l.__data__=br(s),s=l);a.i.push(new Gu(a.Ya++,s)),a.G==3&&Mn(a)},It.prototype.N=function(){this.g.l=null,delete this.j,Gr(this.g),delete this.g,It.aa.N.call(this)};function Qi(s){xr.call(this),s.__headers__&&(this.headers=s.__headers__,this.statusCode=s.__status__,delete s.__headers__,delete s.__status__);var a=s.__sm__;if(a){t:{for(const l in a){s=l;break t}s=void 0}(this.i=s)&&(s=this.i,a=a!==null&&s in a?a[s]:void 0),this.data=a}else this.data=s}k(Qi,xr);function Wi(){Mr.call(this),this.status=1}k(Wi,Mr);function ge(s){this.g=s}k(ge,Ki),ge.prototype.ua=function(){Et(this.g,"a")},ge.prototype.ta=function(s){Et(this.g,new Qi(s))},ge.prototype.sa=function(s){Et(this.g,new Wi)},ge.prototype.ra=function(){Et(this.g,"b")},Ln.prototype.createWebChannel=Ln.prototype.g,It.prototype.send=It.prototype.o,It.prototype.open=It.prototype.m,It.prototype.close=It.prototype.close,na=function(){return new Ln},ea=function(){return wn()},ta=ne,Zr={mb:0,pb:1,qb:2,Jb:3,Ob:4,Lb:5,Mb:6,Kb:7,Ib:8,Nb:9,PROXY:10,NOPROXY:11,Gb:12,Cb:13,Db:14,Bb:15,Eb:16,Fb:17,ib:18,hb:19,jb:20},Rn.NO_ERROR=0,Rn.TIMEOUT=8,Rn.HTTP_ERROR=6,$n=Rn,ci.COMPLETE="complete",Zo=ci,ii.EventType=je,je.OPEN="a",je.CLOSE="b",je.ERROR="c",je.MESSAGE="d",ft.prototype.listen=ft.prototype.K,Ze=ii,J.prototype.listenOnce=J.prototype.L,J.prototype.getLastError=J.prototype.Ka,J.prototype.getLastErrorCode=J.prototype.Ba,J.prototype.getStatus=J.prototype.Z,J.prototype.getResponseJson=J.prototype.Oa,J.prototype.getResponseText=J.prototype.oa,J.prototype.send=J.prototype.ea,J.prototype.setWithCredentials=J.prototype.Ha,Jo=J}).apply(typeof Un<"u"?Un:typeof self<"u"?self:typeof window<"u"?window:{});const Yi="@firebase/firestore",Ji="4.9.1";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class gt{constructor(t){this.uid=t}isAuthenticated(){return this.uid!=null}toKey(){return this.isAuthenticated()?"uid:"+this.uid:"anonymous-user"}isEqual(t){return t.uid===this.uid}}gt.UNAUTHENTICATED=new gt(null),gt.GOOGLE_CREDENTIALS=new gt("google-credentials-uid"),gt.FIRST_PARTY=new gt("first-party-uid"),gt.MOCK_USER=new gt("mock-user");/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let be="12.2.0";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ae=new gl("@firebase/firestore");function ye(){return ae.logLevel}function N(r,...t){if(ae.logLevel<=Ft.DEBUG){const e=t.map(ps);ae.debug(`Firestore (${be}): ${r}`,...e)}}function qt(r,...t){if(ae.logLevel<=Ft.ERROR){const e=t.map(ps);ae.error(`Firestore (${be}): ${r}`,...e)}}function Ve(r,...t){if(ae.logLevel<=Ft.WARN){const e=t.map(ps);ae.warn(`Firestore (${be}): ${r}`,...e)}}function ps(r){if(typeof r=="string")return r;try{/**
* @license
* Copyright 2020 Google LLC
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/return(function(e){return JSON.stringify(e)})(r)}catch{return r}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function O(r,t,e){let n="Unexpected state";typeof t=="string"?n=t:e=t,ra(r,n,e)}function ra(r,t,e){let n=`FIRESTORE (${be}) INTERNAL ASSERTION FAILED: ${t} (ID: ${r.toString(16)})`;if(e!==void 0)try{n+=" CONTEXT: "+JSON.stringify(e)}catch{n+=" CONTEXT: "+e}throw qt(n),new Error(n)}function $(r,t,e,n){let i="Unexpected state";typeof e=="string"?i=e:n=e,r||ra(t,i,n)}function F(r,t){return r}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const R={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class D extends hl{constructor(t,e){super(t,e),this.code=t,this.message=e,this.toString=()=>`${this.name}: [code=${this.code}]: ${this.message}`}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Wt{constructor(){this.promise=new Promise(((t,e)=>{this.resolve=t,this.reject=e}))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class sa{constructor(t,e){this.user=e,this.type="OAuth",this.headers=new Map,this.headers.set("Authorization",`Bearer ${t}`)}}class Al{getToken(){return Promise.resolve(null)}invalidateToken(){}start(t,e){t.enqueueRetryable((()=>e(gt.UNAUTHENTICATED)))}shutdown(){}}class wl{constructor(t){this.token=t,this.changeListener=null}getToken(){return Promise.resolve(this.token)}invalidateToken(){}start(t,e){this.changeListener=e,t.enqueueRetryable((()=>e(this.token.user)))}shutdown(){this.changeListener=null}}class Rl{constructor(t){this.t=t,this.currentUser=gt.UNAUTHENTICATED,this.i=0,this.forceRefresh=!1,this.auth=null}start(t,e){$(this.o===void 0,42304);let n=this.i;const i=f=>this.i!==n?(n=this.i,e(f)):Promise.resolve();let o=new Wt;this.o=()=>{this.i++,this.currentUser=this.u(),o.resolve(),o=new Wt,t.enqueueRetryable((()=>i(this.currentUser)))};const u=()=>{const f=o;t.enqueueRetryable((async()=>{await f.promise,await i(this.currentUser)}))},c=f=>{N("FirebaseAuthCredentialsProvider","Auth detected"),this.auth=f,this.o&&(this.auth.addAuthTokenListener(this.o),u())};this.t.onInit((f=>c(f))),setTimeout((()=>{if(!this.auth){const f=this.t.getImmediate({optional:!0});f?c(f):(N("FirebaseAuthCredentialsProvider","Auth not yet detected"),o.resolve(),o=new Wt)}}),0),u()}getToken(){const t=this.i,e=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(e).then((n=>this.i!==t?(N("FirebaseAuthCredentialsProvider","getToken aborted due to token change."),this.getToken()):n?($(typeof n.accessToken=="string",31837,{l:n}),new sa(n.accessToken,this.currentUser)):null)):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.auth&&this.o&&this.auth.removeAuthTokenListener(this.o),this.o=void 0}u(){const t=this.auth&&this.auth.getUid();return $(t===null||typeof t=="string",2055,{h:t}),new gt(t)}}class Vl{constructor(t,e,n){this.P=t,this.T=e,this.I=n,this.type="FirstParty",this.user=gt.FIRST_PARTY,this.A=new Map}R(){return this.I?this.I():null}get headers(){this.A.set("X-Goog-AuthUser",this.P);const t=this.R();return t&&this.A.set("Authorization",t),this.T&&this.A.set("X-Goog-Iam-Authorization-Token",this.T),this.A}}class Pl{constructor(t,e,n){this.P=t,this.T=e,this.I=n}getToken(){return Promise.resolve(new Vl(this.P,this.T,this.I))}start(t,e){t.enqueueRetryable((()=>e(gt.FIRST_PARTY)))}shutdown(){}invalidateToken(){}}class Zi{constructor(t){this.value=t,this.type="AppCheck",this.headers=new Map,t&&t.length>0&&this.headers.set("x-firebase-appcheck",this.value)}}class Sl{constructor(t,e){this.V=e,this.forceRefresh=!1,this.appCheck=null,this.m=null,this.p=null,Il(t)&&t.settings.appCheckToken&&(this.p=t.settings.appCheckToken)}start(t,e){$(this.o===void 0,3512);const n=o=>{o.error!=null&&N("FirebaseAppCheckTokenProvider",`Error getting App Check token; using placeholder token instead. Error: ${o.error.message}`);const u=o.token!==this.m;return this.m=o.token,N("FirebaseAppCheckTokenProvider",`Received ${u?"new":"existing"} token.`),u?e(o.token):Promise.resolve()};this.o=o=>{t.enqueueRetryable((()=>n(o)))};const i=o=>{N("FirebaseAppCheckTokenProvider","AppCheck detected"),this.appCheck=o,this.o&&this.appCheck.addTokenListener(this.o)};this.V.onInit((o=>i(o))),setTimeout((()=>{if(!this.appCheck){const o=this.V.getImmediate({optional:!0});o?i(o):N("FirebaseAppCheckTokenProvider","AppCheck not yet detected")}}),0)}getToken(){if(this.p)return Promise.resolve(new Zi(this.p));const t=this.forceRefresh;return this.forceRefresh=!1,this.appCheck?this.appCheck.getToken(t).then((e=>e?($(typeof e.token=="string",44558,{tokenResult:e}),this.m=e.token,new Zi(e.token)):null)):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.appCheck&&this.o&&this.appCheck.removeTokenListener(this.o),this.o=void 0}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Cl(r){const t=typeof self<"u"&&(self.crypto||self.msCrypto),e=new Uint8Array(r);if(t&&typeof t.getRandomValues=="function")t.getRandomValues(e);else for(let n=0;n<r;n++)e[n]=Math.floor(256*Math.random());return e}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class gs{static newId(){const t="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",e=62*Math.floor(4.129032258064516);let n="";for(;n.length<20;){const i=Cl(40);for(let o=0;o<i.length;++o)n.length<20&&i[o]<e&&(n+=t.charAt(i[o]%62))}return n}}function U(r,t){return r<t?-1:r>t?1:0}function ts(r,t){const e=Math.min(r.length,t.length);for(let n=0;n<e;n++){const i=r.charAt(n),o=t.charAt(n);if(i!==o)return Wr(i)===Wr(o)?U(i,o):Wr(i)?1:-1}return U(r.length,t.length)}const Dl=55296,Nl=57343;function Wr(r){const t=r.charCodeAt(0);return t>=Dl&&t<=Nl}function Pe(r,t,e){return r.length===t.length&&r.every(((n,i)=>e(n,t[i])))}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const to="__name__";class Ct{constructor(t,e,n){e===void 0?e=0:e>t.length&&O(637,{offset:e,range:t.length}),n===void 0?n=t.length-e:n>t.length-e&&O(1746,{length:n,range:t.length-e}),this.segments=t,this.offset=e,this.len=n}get length(){return this.len}isEqual(t){return Ct.comparator(this,t)===0}child(t){const e=this.segments.slice(this.offset,this.limit());return t instanceof Ct?t.forEach((n=>{e.push(n)})):e.push(t),this.construct(e)}limit(){return this.offset+this.length}popFirst(t){return t=t===void 0?1:t,this.construct(this.segments,this.offset+t,this.length-t)}popLast(){return this.construct(this.segments,this.offset,this.length-1)}firstSegment(){return this.segments[this.offset]}lastSegment(){return this.get(this.length-1)}get(t){return this.segments[this.offset+t]}isEmpty(){return this.length===0}isPrefixOf(t){if(t.length<this.length)return!1;for(let e=0;e<this.length;e++)if(this.get(e)!==t.get(e))return!1;return!0}isImmediateParentOf(t){if(this.length+1!==t.length)return!1;for(let e=0;e<this.length;e++)if(this.get(e)!==t.get(e))return!1;return!0}forEach(t){for(let e=this.offset,n=this.limit();e<n;e++)t(this.segments[e])}toArray(){return this.segments.slice(this.offset,this.limit())}static comparator(t,e){const n=Math.min(t.length,e.length);for(let i=0;i<n;i++){const o=Ct.compareSegments(t.get(i),e.get(i));if(o!==0)return o}return U(t.length,e.length)}static compareSegments(t,e){const n=Ct.isNumericId(t),i=Ct.isNumericId(e);return n&&!i?-1:!n&&i?1:n&&i?Ct.extractNumericId(t).compare(Ct.extractNumericId(e)):ts(t,e)}static isNumericId(t){return t.startsWith("__id")&&t.endsWith("__")}static extractNumericId(t){return Qt.fromString(t.substring(4,t.length-2))}}class W extends Ct{construct(t,e,n){return new W(t,e,n)}canonicalString(){return this.toArray().join("/")}toString(){return this.canonicalString()}toUriEncodedString(){return this.toArray().map(encodeURIComponent).join("/")}static fromString(...t){const e=[];for(const n of t){if(n.indexOf("//")>=0)throw new D(R.INVALID_ARGUMENT,`Invalid segment (${n}). Paths must not contain // in them.`);e.push(...n.split("/").filter((i=>i.length>0)))}return new W(e)}static emptyPath(){return new W([])}}const bl=/^[_a-zA-Z][_a-zA-Z0-9]*$/;class ut extends Ct{construct(t,e,n){return new ut(t,e,n)}static isValidIdentifier(t){return bl.test(t)}canonicalString(){return this.toArray().map((t=>(t=t.replace(/\\/g,"\\\\").replace(/`/g,"\\`"),ut.isValidIdentifier(t)||(t="`"+t+"`"),t))).join(".")}toString(){return this.canonicalString()}isKeyField(){return this.length===1&&this.get(0)===to}static keyField(){return new ut([to])}static fromServerFormat(t){const e=[];let n="",i=0;const o=()=>{if(n.length===0)throw new D(R.INVALID_ARGUMENT,`Invalid field path (${t}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);e.push(n),n=""};let u=!1;for(;i<t.length;){const c=t[i];if(c==="\\"){if(i+1===t.length)throw new D(R.INVALID_ARGUMENT,"Path has trailing escape character: "+t);const f=t[i+1];if(f!=="\\"&&f!=="."&&f!=="`")throw new D(R.INVALID_ARGUMENT,"Path has invalid escape sequence: "+t);n+=f,i+=2}else c==="`"?(u=!u,i++):c!=="."||u?(n+=c,i++):(o(),i++)}if(o(),u)throw new D(R.INVALID_ARGUMENT,"Unterminated ` in path: "+t);return new ut(e)}static emptyPath(){return new ut([])}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class x{constructor(t){this.path=t}static fromPath(t){return new x(W.fromString(t))}static fromName(t){return new x(W.fromString(t).popFirst(5))}static empty(){return new x(W.emptyPath())}get collectionGroup(){return this.path.popLast().lastSegment()}hasCollectionId(t){return this.path.length>=2&&this.path.get(this.path.length-2)===t}getCollectionGroup(){return this.path.get(this.path.length-2)}getCollectionPath(){return this.path.popLast()}isEqual(t){return t!==null&&W.comparator(this.path,t.path)===0}toString(){return this.path.toString()}static comparator(t,e){return W.comparator(t.path,e.path)}static isDocumentKey(t){return t.length%2==0}static fromSegments(t){return new x(new W(t.slice()))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ia(r,t,e){if(!e)throw new D(R.INVALID_ARGUMENT,`Function ${r}() cannot be called with an empty ${t}.`)}function kl(r,t,e,n){if(t===!0&&n===!0)throw new D(R.INVALID_ARGUMENT,`${r} and ${e} cannot be used together.`)}function eo(r){if(!x.isDocumentKey(r))throw new D(R.INVALID_ARGUMENT,`Invalid document reference. Document references must have an even number of segments, but ${r} has ${r.length}.`)}function no(r){if(x.isDocumentKey(r))throw new D(R.INVALID_ARGUMENT,`Invalid collection reference. Collection references must have an odd number of segments, but ${r} has ${r.length}.`)}function oa(r){return typeof r=="object"&&r!==null&&(Object.getPrototypeOf(r)===Object.prototype||Object.getPrototypeOf(r)===null)}function cr(r){if(r===void 0)return"undefined";if(r===null)return"null";if(typeof r=="string")return r.length>20&&(r=`${r.substring(0,20)}...`),JSON.stringify(r);if(typeof r=="number"||typeof r=="boolean")return""+r;if(typeof r=="object"){if(r instanceof Array)return"an array";{const t=(function(n){return n.constructor?n.constructor.name:null})(r);return t?`a custom ${t} object`:"an object"}}return typeof r=="function"?"a function":O(12329,{type:typeof r})}function Yn(r,t){if("_delegate"in r&&(r=r._delegate),!(r instanceof t)){if(t.name===r.constructor.name)throw new D(R.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{const e=cr(r);throw new D(R.INVALID_ARGUMENT,`Expected type '${t.name}', but it was: ${e}`)}}return r}function xl(r,t){if(t<=0)throw new D(R.INVALID_ARGUMENT,`Function ${r}() requires a positive number, but it was: ${t}.`)}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function nt(r,t){const e={typeString:r};return t&&(e.value=t),e}function mn(r,t){if(!oa(r))throw new D(R.INVALID_ARGUMENT,"JSON must be an object");let e;for(const n in t)if(t[n]){const i=t[n].typeString,o="value"in t[n]?{value:t[n].value}:void 0;if(!(n in r)){e=`JSON missing required field: '${n}'`;break}const u=r[n];if(i&&typeof u!==i){e=`JSON field '${n}' must be a ${i}.`;break}if(o!==void 0&&u!==o.value){e=`Expected '${n}' field to equal '${o.value}'`;break}}if(e)throw new D(R.INVALID_ARGUMENT,e);return!0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ro=-62135596800,so=1e6;class X{static now(){return X.fromMillis(Date.now())}static fromDate(t){return X.fromMillis(t.getTime())}static fromMillis(t){const e=Math.floor(t/1e3),n=Math.floor((t-1e3*e)*so);return new X(e,n)}constructor(t,e){if(this.seconds=t,this.nanoseconds=e,e<0)throw new D(R.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+e);if(e>=1e9)throw new D(R.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+e);if(t<ro)throw new D(R.INVALID_ARGUMENT,"Timestamp seconds out of range: "+t);if(t>=253402300800)throw new D(R.INVALID_ARGUMENT,"Timestamp seconds out of range: "+t)}toDate(){return new Date(this.toMillis())}toMillis(){return 1e3*this.seconds+this.nanoseconds/so}_compareTo(t){return this.seconds===t.seconds?U(this.nanoseconds,t.nanoseconds):U(this.seconds,t.seconds)}isEqual(t){return t.seconds===this.seconds&&t.nanoseconds===this.nanoseconds}toString(){return"Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")"}toJSON(){return{type:X._jsonSchemaVersion,seconds:this.seconds,nanoseconds:this.nanoseconds}}static fromJSON(t){if(mn(t,X._jsonSchema))return new X(t.seconds,t.nanoseconds)}valueOf(){const t=this.seconds-ro;return String(t).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0")}}X._jsonSchemaVersion="firestore/timestamp/1.0",X._jsonSchema={type:nt("string",X._jsonSchemaVersion),seconds:nt("number"),nanoseconds:nt("number")};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class L{static fromTimestamp(t){return new L(t)}static min(){return new L(new X(0,0))}static max(){return new L(new X(253402300799,999999999))}constructor(t){this.timestamp=t}compareTo(t){return this.timestamp._compareTo(t.timestamp)}isEqual(t){return this.timestamp.isEqual(t.timestamp)}toMicroseconds(){return 1e6*this.timestamp.seconds+this.timestamp.nanoseconds/1e3}toString(){return"SnapshotVersion("+this.timestamp.toString()+")"}toTimestamp(){return this.timestamp}}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const an=-1;function Ml(r,t){const e=r.toTimestamp().seconds,n=r.toTimestamp().nanoseconds+1,i=L.fromTimestamp(n===1e9?new X(e+1,0):new X(e,n));return new Xt(i,x.empty(),t)}function Ol(r){return new Xt(r.readTime,r.key,an)}class Xt{constructor(t,e,n){this.readTime=t,this.documentKey=e,this.largestBatchId=n}static min(){return new Xt(L.min(),x.empty(),an)}static max(){return new Xt(L.max(),x.empty(),an)}}function Ll(r,t){let e=r.readTime.compareTo(t.readTime);return e!==0?e:(e=x.comparator(r.documentKey,t.documentKey),e!==0?e:U(r.largestBatchId,t.largestBatchId))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Fl="The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.";class Ul{constructor(){this.onCommittedListeners=[]}addOnCommittedListener(t){this.onCommittedListeners.push(t)}raiseOnCommittedEvent(){this.onCommittedListeners.forEach((t=>t()))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ke(r){if(r.code!==R.FAILED_PRECONDITION||r.message!==Fl)throw r;N("LocalStore","Unexpectedly lost primary lease")}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class V{constructor(t){this.nextCallback=null,this.catchCallback=null,this.result=void 0,this.error=void 0,this.isDone=!1,this.callbackAttached=!1,t((e=>{this.isDone=!0,this.result=e,this.nextCallback&&this.nextCallback(e)}),(e=>{this.isDone=!0,this.error=e,this.catchCallback&&this.catchCallback(e)}))}catch(t){return this.next(void 0,t)}next(t,e){return this.callbackAttached&&O(59440),this.callbackAttached=!0,this.isDone?this.error?this.wrapFailure(e,this.error):this.wrapSuccess(t,this.result):new V(((n,i)=>{this.nextCallback=o=>{this.wrapSuccess(t,o).next(n,i)},this.catchCallback=o=>{this.wrapFailure(e,o).next(n,i)}}))}toPromise(){return new Promise(((t,e)=>{this.next(t,e)}))}wrapUserFunction(t){try{const e=t();return e instanceof V?e:V.resolve(e)}catch(e){return V.reject(e)}}wrapSuccess(t,e){return t?this.wrapUserFunction((()=>t(e))):V.resolve(e)}wrapFailure(t,e){return t?this.wrapUserFunction((()=>t(e))):V.reject(e)}static resolve(t){return new V(((e,n)=>{e(t)}))}static reject(t){return new V(((e,n)=>{n(t)}))}static waitFor(t){return new V(((e,n)=>{let i=0,o=0,u=!1;t.forEach((c=>{++i,c.next((()=>{++o,u&&o===i&&e()}),(f=>n(f)))})),u=!0,o===i&&e()}))}static or(t){let e=V.resolve(!1);for(const n of t)e=e.next((i=>i?V.resolve(i):n()));return e}static forEach(t,e){const n=[];return t.forEach(((i,o)=>{n.push(e.call(this,i,o))})),this.waitFor(n)}static mapArray(t,e){return new V(((n,i)=>{const o=t.length,u=new Array(o);let c=0;for(let f=0;f<o;f++){const d=f;e(t[d]).next((_=>{u[d]=_,++c,c===o&&n(u)}),(_=>i(_)))}}))}static doWhile(t,e){return new V(((n,i)=>{const o=()=>{t()===!0?e().next((()=>{o()}),i):n()};o()}))}}function ql(r){const t=r.match(/Android ([\d.]+)/i),e=t?t[1].split(".").slice(0,2).join("."):"-1";return Number(e)}function xe(r){return r.name==="IndexedDbTransactionError"}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class hr{constructor(t,e){this.previousValue=t,e&&(e.sequenceNumberHandler=n=>this.ae(n),this.ue=n=>e.writeSequenceNumber(n))}ae(t){return this.previousValue=Math.max(t,this.previousValue),this.previousValue}next(){const t=++this.previousValue;return this.ue&&this.ue(t),t}}hr.ce=-1;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const _s=-1;function fr(r){return r==null}function Jn(r){return r===0&&1/r==-1/0}function jl(r){return typeof r=="number"&&Number.isInteger(r)&&!Jn(r)&&r<=Number.MAX_SAFE_INTEGER&&r>=Number.MIN_SAFE_INTEGER}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const aa="";function Bl(r){let t="";for(let e=0;e<r.length;e++)t.length>0&&(t=io(t)),t=zl(r.get(e),t);return io(t)}function zl(r,t){let e=t;const n=r.length;for(let i=0;i<n;i++){const o=r.charAt(i);switch(o){case"\0":e+="";break;case aa:e+="";break;default:e+=o}}return e}function io(r){return r+aa+""}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function oo(r){let t=0;for(const e in r)Object.prototype.hasOwnProperty.call(r,e)&&t++;return t}function le(r,t){for(const e in r)Object.prototype.hasOwnProperty.call(r,e)&&t(e,r[e])}function ua(r){for(const t in r)if(Object.prototype.hasOwnProperty.call(r,t))return!1;return!0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Y{constructor(t,e){this.comparator=t,this.root=e||at.EMPTY}insert(t,e){return new Y(this.comparator,this.root.insert(t,e,this.comparator).copy(null,null,at.BLACK,null,null))}remove(t){return new Y(this.comparator,this.root.remove(t,this.comparator).copy(null,null,at.BLACK,null,null))}get(t){let e=this.root;for(;!e.isEmpty();){const n=this.comparator(t,e.key);if(n===0)return e.value;n<0?e=e.left:n>0&&(e=e.right)}return null}indexOf(t){let e=0,n=this.root;for(;!n.isEmpty();){const i=this.comparator(t,n.key);if(i===0)return e+n.left.size;i<0?n=n.left:(e+=n.left.size+1,n=n.right)}return-1}isEmpty(){return this.root.isEmpty()}get size(){return this.root.size}minKey(){return this.root.minKey()}maxKey(){return this.root.maxKey()}inorderTraversal(t){return this.root.inorderTraversal(t)}forEach(t){this.inorderTraversal(((e,n)=>(t(e,n),!1)))}toString(){const t=[];return this.inorderTraversal(((e,n)=>(t.push(`${e}:${n}`),!1))),`{${t.join(", ")}}`}reverseTraversal(t){return this.root.reverseTraversal(t)}getIterator(){return new qn(this.root,null,this.comparator,!1)}getIteratorFrom(t){return new qn(this.root,t,this.comparator,!1)}getReverseIterator(){return new qn(this.root,null,this.comparator,!0)}getReverseIteratorFrom(t){return new qn(this.root,t,this.comparator,!0)}}class qn{constructor(t,e,n,i){this.isReverse=i,this.nodeStack=[];let o=1;for(;!t.isEmpty();)if(o=e?n(t.key,e):1,e&&i&&(o*=-1),o<0)t=this.isReverse?t.left:t.right;else{if(o===0){this.nodeStack.push(t);break}this.nodeStack.push(t),t=this.isReverse?t.right:t.left}}getNext(){let t=this.nodeStack.pop();const e={key:t.key,value:t.value};if(this.isReverse)for(t=t.left;!t.isEmpty();)this.nodeStack.push(t),t=t.right;else for(t=t.right;!t.isEmpty();)this.nodeStack.push(t),t=t.left;return e}hasNext(){return this.nodeStack.length>0}peek(){if(this.nodeStack.length===0)return null;const t=this.nodeStack[this.nodeStack.length-1];return{key:t.key,value:t.value}}}class at{constructor(t,e,n,i,o){this.key=t,this.value=e,this.color=n??at.RED,this.left=i??at.EMPTY,this.right=o??at.EMPTY,this.size=this.left.size+1+this.right.size}copy(t,e,n,i,o){return new at(t??this.key,e??this.value,n??this.color,i??this.left,o??this.right)}isEmpty(){return!1}inorderTraversal(t){return this.left.inorderTraversal(t)||t(this.key,this.value)||this.right.inorderTraversal(t)}reverseTraversal(t){return this.right.reverseTraversal(t)||t(this.key,this.value)||this.left.reverseTraversal(t)}min(){return this.left.isEmpty()?this:this.left.min()}minKey(){return this.min().key}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey()}insert(t,e,n){let i=this;const o=n(t,i.key);return i=o<0?i.copy(null,null,null,i.left.insert(t,e,n),null):o===0?i.copy(null,e,null,null,null):i.copy(null,null,null,null,i.right.insert(t,e,n)),i.fixUp()}removeMin(){if(this.left.isEmpty())return at.EMPTY;let t=this;return t.left.isRed()||t.left.left.isRed()||(t=t.moveRedLeft()),t=t.copy(null,null,null,t.left.removeMin(),null),t.fixUp()}remove(t,e){let n,i=this;if(e(t,i.key)<0)i.left.isEmpty()||i.left.isRed()||i.left.left.isRed()||(i=i.moveRedLeft()),i=i.copy(null,null,null,i.left.remove(t,e),null);else{if(i.left.isRed()&&(i=i.rotateRight()),i.right.isEmpty()||i.right.isRed()||i.right.left.isRed()||(i=i.moveRedRight()),e(t,i.key)===0){if(i.right.isEmpty())return at.EMPTY;n=i.right.min(),i=i.copy(n.key,n.value,null,null,i.right.removeMin())}i=i.copy(null,null,null,null,i.right.remove(t,e))}return i.fixUp()}isRed(){return this.color}fixUp(){let t=this;return t.right.isRed()&&!t.left.isRed()&&(t=t.rotateLeft()),t.left.isRed()&&t.left.left.isRed()&&(t=t.rotateRight()),t.left.isRed()&&t.right.isRed()&&(t=t.colorFlip()),t}moveRedLeft(){let t=this.colorFlip();return t.right.left.isRed()&&(t=t.copy(null,null,null,null,t.right.rotateRight()),t=t.rotateLeft(),t=t.colorFlip()),t}moveRedRight(){let t=this.colorFlip();return t.left.left.isRed()&&(t=t.rotateRight(),t=t.colorFlip()),t}rotateLeft(){const t=this.copy(null,null,at.RED,null,this.right.left);return this.right.copy(null,null,this.color,t,null)}rotateRight(){const t=this.copy(null,null,at.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,t)}colorFlip(){const t=this.left.copy(null,null,!this.left.color,null,null),e=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,t,e)}checkMaxDepth(){const t=this.check();return Math.pow(2,t)<=this.size+1}check(){if(this.isRed()&&this.left.isRed())throw O(43730,{key:this.key,value:this.value});if(this.right.isRed())throw O(14113,{key:this.key,value:this.value});const t=this.left.check();if(t!==this.right.check())throw O(27949);return t+(this.isRed()?0:1)}}at.EMPTY=null,at.RED=!0,at.BLACK=!1;at.EMPTY=new class{constructor(){this.size=0}get key(){throw O(57766)}get value(){throw O(16141)}get color(){throw O(16727)}get left(){throw O(29726)}get right(){throw O(36894)}copy(t,e,n,i,o){return this}insert(t,e,n){return new at(t,e)}remove(t,e){return this}isEmpty(){return!0}inorderTraversal(t){return!1}reverseTraversal(t){return!1}minKey(){return null}maxKey(){return null}isRed(){return!1}checkMaxDepth(){return!0}check(){return 0}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class rt{constructor(t){this.comparator=t,this.data=new Y(this.comparator)}has(t){return this.data.get(t)!==null}first(){return this.data.minKey()}last(){return this.data.maxKey()}get size(){return this.data.size}indexOf(t){return this.data.indexOf(t)}forEach(t){this.data.inorderTraversal(((e,n)=>(t(e),!1)))}forEachInRange(t,e){const n=this.data.getIteratorFrom(t[0]);for(;n.hasNext();){const i=n.getNext();if(this.comparator(i.key,t[1])>=0)return;e(i.key)}}forEachWhile(t,e){let n;for(n=e!==void 0?this.data.getIteratorFrom(e):this.data.getIterator();n.hasNext();)if(!t(n.getNext().key))return}firstAfterOrEqual(t){const e=this.data.getIteratorFrom(t);return e.hasNext()?e.getNext().key:null}getIterator(){return new ao(this.data.getIterator())}getIteratorFrom(t){return new ao(this.data.getIteratorFrom(t))}add(t){return this.copy(this.data.remove(t).insert(t,!0))}delete(t){return this.has(t)?this.copy(this.data.remove(t)):this}isEmpty(){return this.data.isEmpty()}unionWith(t){let e=this;return e.size<t.size&&(e=t,t=this),t.forEach((n=>{e=e.add(n)})),e}isEqual(t){if(!(t instanceof rt)||this.size!==t.size)return!1;const e=this.data.getIterator(),n=t.data.getIterator();for(;e.hasNext();){const i=e.getNext().key,o=n.getNext().key;if(this.comparator(i,o)!==0)return!1}return!0}toArray(){const t=[];return this.forEach((e=>{t.push(e)})),t}toString(){const t=[];return this.forEach((e=>t.push(e))),"SortedSet("+t.toString()+")"}copy(t){const e=new rt(this.comparator);return e.data=t,e}}class ao{constructor(t){this.iter=t}getNext(){return this.iter.getNext().key}hasNext(){return this.iter.hasNext()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Vt{constructor(t){this.fields=t,t.sort(ut.comparator)}static empty(){return new Vt([])}unionWith(t){let e=new rt(ut.comparator);for(const n of this.fields)e=e.add(n);for(const n of t)e=e.add(n);return new Vt(e.toArray())}covers(t){for(const e of this.fields)if(e.isPrefixOf(t))return!0;return!1}isEqual(t){return Pe(this.fields,t.fields,((e,n)=>e.isEqual(n)))}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class la extends Error{constructor(){super(...arguments),this.name="Base64DecodeError"}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class lt{constructor(t){this.binaryString=t}static fromBase64String(t){const e=(function(i){try{return atob(i)}catch(o){throw typeof DOMException<"u"&&o instanceof DOMException?new la("Invalid base64 string: "+o):o}})(t);return new lt(e)}static fromUint8Array(t){const e=(function(i){let o="";for(let u=0;u<i.length;++u)o+=String.fromCharCode(i[u]);return o})(t);return new lt(e)}[Symbol.iterator](){let t=0;return{next:()=>t<this.binaryString.length?{value:this.binaryString.charCodeAt(t++),done:!1}:{value:void 0,done:!0}}}toBase64(){return(function(e){return btoa(e)})(this.binaryString)}toUint8Array(){return(function(e){const n=new Uint8Array(e.length);for(let i=0;i<e.length;i++)n[i]=e.charCodeAt(i);return n})(this.binaryString)}approximateByteSize(){return 2*this.binaryString.length}compareTo(t){return U(this.binaryString,t.binaryString)}isEqual(t){return this.binaryString===t.binaryString}}lt.EMPTY_BYTE_STRING=new lt("");const Gl=new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);function Yt(r){if($(!!r,39018),typeof r=="string"){let t=0;const e=Gl.exec(r);if($(!!e,46558,{timestamp:r}),e[1]){let i=e[1];i=(i+"000000000").substr(0,9),t=Number(i)}const n=new Date(r);return{seconds:Math.floor(n.getTime()/1e3),nanos:t}}return{seconds:Z(r.seconds),nanos:Z(r.nanos)}}function Z(r){return typeof r=="number"?r:typeof r=="string"?Number(r):0}function Jt(r){return typeof r=="string"?lt.fromBase64String(r):lt.fromUint8Array(r)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ca="server_timestamp",ha="__type__",fa="__previous_value__",da="__local_write_time__";function ys(r){return(r?.mapValue?.fields||{})[ha]?.stringValue===ca}function dr(r){const t=r.mapValue.fields[fa];return ys(t)?dr(t):t}function un(r){const t=Yt(r.mapValue.fields[da].timestampValue);return new X(t.seconds,t.nanos)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $l{constructor(t,e,n,i,o,u,c,f,d,_){this.databaseId=t,this.appId=e,this.persistenceKey=n,this.host=i,this.ssl=o,this.forceLongPolling=u,this.autoDetectLongPolling=c,this.longPollingOptions=f,this.useFetchStreams=d,this.isUsingEmulator=_}}const Zn="(default)";class ln{constructor(t,e){this.projectId=t,this.database=e||Zn}static empty(){return new ln("","")}get isDefaultDatabase(){return this.database===Zn}isEqual(t){return t instanceof ln&&t.projectId===this.projectId&&t.database===this.database}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ma="__type__",Kl="__max__",jn={mapValue:{}},pa="__vector__",tr="value";function Zt(r){return"nullValue"in r?0:"booleanValue"in r?1:"integerValue"in r||"doubleValue"in r?2:"timestampValue"in r?3:"stringValue"in r?5:"bytesValue"in r?6:"referenceValue"in r?7:"geoPointValue"in r?8:"arrayValue"in r?9:"mapValue"in r?ys(r)?4:Wl(r)?9007199254740991:Ql(r)?10:11:O(28295,{value:r})}function xt(r,t){if(r===t)return!0;const e=Zt(r);if(e!==Zt(t))return!1;switch(e){case 0:case 9007199254740991:return!0;case 1:return r.booleanValue===t.booleanValue;case 4:return un(r).isEqual(un(t));case 3:return(function(i,o){if(typeof i.timestampValue=="string"&&typeof o.timestampValue=="string"&&i.timestampValue.length===o.timestampValue.length)return i.timestampValue===o.timestampValue;const u=Yt(i.timestampValue),c=Yt(o.timestampValue);return u.seconds===c.seconds&&u.nanos===c.nanos})(r,t);case 5:return r.stringValue===t.stringValue;case 6:return(function(i,o){return Jt(i.bytesValue).isEqual(Jt(o.bytesValue))})(r,t);case 7:return r.referenceValue===t.referenceValue;case 8:return(function(i,o){return Z(i.geoPointValue.latitude)===Z(o.geoPointValue.latitude)&&Z(i.geoPointValue.longitude)===Z(o.geoPointValue.longitude)})(r,t);case 2:return(function(i,o){if("integerValue"in i&&"integerValue"in o)return Z(i.integerValue)===Z(o.integerValue);if("doubleValue"in i&&"doubleValue"in o){const u=Z(i.doubleValue),c=Z(o.doubleValue);return u===c?Jn(u)===Jn(c):isNaN(u)&&isNaN(c)}return!1})(r,t);case 9:return Pe(r.arrayValue.values||[],t.arrayValue.values||[],xt);case 10:case 11:return(function(i,o){const u=i.mapValue.fields||{},c=o.mapValue.fields||{};if(oo(u)!==oo(c))return!1;for(const f in u)if(u.hasOwnProperty(f)&&(c[f]===void 0||!xt(u[f],c[f])))return!1;return!0})(r,t);default:return O(52216,{left:r})}}function cn(r,t){return(r.values||[]).find((e=>xt(e,t)))!==void 0}function Se(r,t){if(r===t)return 0;const e=Zt(r),n=Zt(t);if(e!==n)return U(e,n);switch(e){case 0:case 9007199254740991:return 0;case 1:return U(r.booleanValue,t.booleanValue);case 2:return(function(o,u){const c=Z(o.integerValue||o.doubleValue),f=Z(u.integerValue||u.doubleValue);return c<f?-1:c>f?1:c===f?0:isNaN(c)?isNaN(f)?0:-1:1})(r,t);case 3:return uo(r.timestampValue,t.timestampValue);case 4:return uo(un(r),un(t));case 5:return ts(r.stringValue,t.stringValue);case 6:return(function(o,u){const c=Jt(o),f=Jt(u);return c.compareTo(f)})(r.bytesValue,t.bytesValue);case 7:return(function(o,u){const c=o.split("/"),f=u.split("/");for(let d=0;d<c.length&&d<f.length;d++){const _=U(c[d],f[d]);if(_!==0)return _}return U(c.length,f.length)})(r.referenceValue,t.referenceValue);case 8:return(function(o,u){const c=U(Z(o.latitude),Z(u.latitude));return c!==0?c:U(Z(o.longitude),Z(u.longitude))})(r.geoPointValue,t.geoPointValue);case 9:return lo(r.arrayValue,t.arrayValue);case 10:return(function(o,u){const c=o.fields||{},f=u.fields||{},d=c[tr]?.arrayValue,_=f[tr]?.arrayValue,A=U(d?.values?.length||0,_?.values?.length||0);return A!==0?A:lo(d,_)})(r.mapValue,t.mapValue);case 11:return(function(o,u){if(o===jn.mapValue&&u===jn.mapValue)return 0;if(o===jn.mapValue)return 1;if(u===jn.mapValue)return-1;const c=o.fields||{},f=Object.keys(c),d=u.fields||{},_=Object.keys(d);f.sort(),_.sort();for(let A=0;A<f.length&&A<_.length;++A){const P=ts(f[A],_[A]);if(P!==0)return P;const C=Se(c[f[A]],d[_[A]]);if(C!==0)return C}return U(f.length,_.length)})(r.mapValue,t.mapValue);default:throw O(23264,{he:e})}}function uo(r,t){if(typeof r=="string"&&typeof t=="string"&&r.length===t.length)return U(r,t);const e=Yt(r),n=Yt(t),i=U(e.seconds,n.seconds);return i!==0?i:U(e.nanos,n.nanos)}function lo(r,t){const e=r.values||[],n=t.values||[];for(let i=0;i<e.length&&i<n.length;++i){const o=Se(e[i],n[i]);if(o)return o}return U(e.length,n.length)}function Ce(r){return es(r)}function es(r){return"nullValue"in r?"null":"booleanValue"in r?""+r.booleanValue:"integerValue"in r?""+r.integerValue:"doubleValue"in r?""+r.doubleValue:"timestampValue"in r?(function(e){const n=Yt(e);return`time(${n.seconds},${n.nanos})`})(r.timestampValue):"stringValue"in r?r.stringValue:"bytesValue"in r?(function(e){return Jt(e).toBase64()})(r.bytesValue):"referenceValue"in r?(function(e){return x.fromName(e).toString()})(r.referenceValue):"geoPointValue"in r?(function(e){return`geo(${e.latitude},${e.longitude})`})(r.geoPointValue):"arrayValue"in r?(function(e){let n="[",i=!0;for(const o of e.values||[])i?i=!1:n+=",",n+=es(o);return n+"]"})(r.arrayValue):"mapValue"in r?(function(e){const n=Object.keys(e.fields||{}).sort();let i="{",o=!0;for(const u of n)o?o=!1:i+=",",i+=`${u}:${es(e.fields[u])}`;return i+"}"})(r.mapValue):O(61005,{value:r})}function Kn(r){switch(Zt(r)){case 0:case 1:return 4;case 2:return 8;case 3:case 8:return 16;case 4:const t=dr(r);return t?16+Kn(t):16;case 5:return 2*r.stringValue.length;case 6:return Jt(r.bytesValue).approximateByteSize();case 7:return r.referenceValue.length;case 9:return(function(n){return(n.values||[]).reduce(((i,o)=>i+Kn(o)),0)})(r.arrayValue);case 10:case 11:return(function(n){let i=0;return le(n.fields,((o,u)=>{i+=o.length+Kn(u)})),i})(r.mapValue);default:throw O(13486,{value:r})}}function co(r,t){return{referenceValue:`projects/${r.projectId}/databases/${r.database}/documents/${t.path.canonicalString()}`}}function ns(r){return!!r&&"integerValue"in r}function Es(r){return!!r&&"arrayValue"in r}function ho(r){return!!r&&"nullValue"in r}function fo(r){return!!r&&"doubleValue"in r&&isNaN(Number(r.doubleValue))}function Qn(r){return!!r&&"mapValue"in r}function Ql(r){return(r?.mapValue?.fields||{})[ma]?.stringValue===pa}function nn(r){if(r.geoPointValue)return{geoPointValue:{...r.geoPointValue}};if(r.timestampValue&&typeof r.timestampValue=="object")return{timestampValue:{...r.timestampValue}};if(r.mapValue){const t={mapValue:{fields:{}}};return le(r.mapValue.fields,((e,n)=>t.mapValue.fields[e]=nn(n))),t}if(r.arrayValue){const t={arrayValue:{values:[]}};for(let e=0;e<(r.arrayValue.values||[]).length;++e)t.arrayValue.values[e]=nn(r.arrayValue.values[e]);return t}return{...r}}function Wl(r){return(((r.mapValue||{}).fields||{}).__type__||{}).stringValue===Kl}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class At{constructor(t){this.value=t}static empty(){return new At({mapValue:{}})}field(t){if(t.isEmpty())return this.value;{let e=this.value;for(let n=0;n<t.length-1;++n)if(e=(e.mapValue.fields||{})[t.get(n)],!Qn(e))return null;return e=(e.mapValue.fields||{})[t.lastSegment()],e||null}}set(t,e){this.getFieldsMap(t.popLast())[t.lastSegment()]=nn(e)}setAll(t){let e=ut.emptyPath(),n={},i=[];t.forEach(((u,c)=>{if(!e.isImmediateParentOf(c)){const f=this.getFieldsMap(e);this.applyChanges(f,n,i),n={},i=[],e=c.popLast()}u?n[c.lastSegment()]=nn(u):i.push(c.lastSegment())}));const o=this.getFieldsMap(e);this.applyChanges(o,n,i)}delete(t){const e=this.field(t.popLast());Qn(e)&&e.mapValue.fields&&delete e.mapValue.fields[t.lastSegment()]}isEqual(t){return xt(this.value,t.value)}getFieldsMap(t){let e=this.value;e.mapValue.fields||(e.mapValue={fields:{}});for(let n=0;n<t.length;++n){let i=e.mapValue.fields[t.get(n)];Qn(i)&&i.mapValue.fields||(i={mapValue:{fields:{}}},e.mapValue.fields[t.get(n)]=i),e=i}return e.mapValue.fields}applyChanges(t,e,n){le(e,((i,o)=>t[i]=o));for(const i of n)delete t[i]}clone(){return new At(nn(this.value))}}function ga(r){const t=[];return le(r.fields,((e,n)=>{const i=new ut([e]);if(Qn(n)){const o=ga(n.mapValue).fields;if(o.length===0)t.push(i);else for(const u of o)t.push(i.child(u))}else t.push(i)})),new Vt(t)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _t{constructor(t,e,n,i,o,u,c){this.key=t,this.documentType=e,this.version=n,this.readTime=i,this.createTime=o,this.data=u,this.documentState=c}static newInvalidDocument(t){return new _t(t,0,L.min(),L.min(),L.min(),At.empty(),0)}static newFoundDocument(t,e,n,i){return new _t(t,1,e,L.min(),n,i,0)}static newNoDocument(t,e){return new _t(t,2,e,L.min(),L.min(),At.empty(),0)}static newUnknownDocument(t,e){return new _t(t,3,e,L.min(),L.min(),At.empty(),2)}convertToFoundDocument(t,e){return!this.createTime.isEqual(L.min())||this.documentType!==2&&this.documentType!==0||(this.createTime=t),this.version=t,this.documentType=1,this.data=e,this.documentState=0,this}convertToNoDocument(t){return this.version=t,this.documentType=2,this.data=At.empty(),this.documentState=0,this}convertToUnknownDocument(t){return this.version=t,this.documentType=3,this.data=At.empty(),this.documentState=2,this}setHasCommittedMutations(){return this.documentState=2,this}setHasLocalMutations(){return this.documentState=1,this.version=L.min(),this}setReadTime(t){return this.readTime=t,this}get hasLocalMutations(){return this.documentState===1}get hasCommittedMutations(){return this.documentState===2}get hasPendingWrites(){return this.hasLocalMutations||this.hasCommittedMutations}isValidDocument(){return this.documentType!==0}isFoundDocument(){return this.documentType===1}isNoDocument(){return this.documentType===2}isUnknownDocument(){return this.documentType===3}isEqual(t){return t instanceof _t&&this.key.isEqual(t.key)&&this.version.isEqual(t.version)&&this.documentType===t.documentType&&this.documentState===t.documentState&&this.data.isEqual(t.data)}mutableCopy(){return new _t(this.key,this.documentType,this.version,this.readTime,this.createTime,this.data.clone(),this.documentState)}toString(){return`Document(${this.key}, ${this.version}, ${JSON.stringify(this.data.value)}, {createTime: ${this.createTime}}), {documentType: ${this.documentType}}), {documentState: ${this.documentState}})`}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class er{constructor(t,e){this.position=t,this.inclusive=e}}function mo(r,t,e){let n=0;for(let i=0;i<r.position.length;i++){const o=t[i],u=r.position[i];if(o.field.isKeyField()?n=x.comparator(x.fromName(u.referenceValue),e.key):n=Se(u,e.data.field(o.field)),o.dir==="desc"&&(n*=-1),n!==0)break}return n}function po(r,t){if(r===null)return t===null;if(t===null||r.inclusive!==t.inclusive||r.position.length!==t.position.length)return!1;for(let e=0;e<r.position.length;e++)if(!xt(r.position[e],t.position[e]))return!1;return!0}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nr{constructor(t,e="asc"){this.field=t,this.dir=e}}function Hl(r,t){return r.dir===t.dir&&r.field.isEqual(t.field)}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _a{}class et extends _a{constructor(t,e,n){super(),this.field=t,this.op=e,this.value=n}static create(t,e,n){return t.isKeyField()?e==="in"||e==="not-in"?this.createKeyFieldInFilter(t,e,n):new Yl(t,e,n):e==="array-contains"?new tc(t,n):e==="in"?new ec(t,n):e==="not-in"?new nc(t,n):e==="array-contains-any"?new rc(t,n):new et(t,e,n)}static createKeyFieldInFilter(t,e,n){return e==="in"?new Jl(t,n):new Zl(t,n)}matches(t){const e=t.data.field(this.field);return this.op==="!="?e!==null&&e.nullValue===void 0&&this.matchesComparison(Se(e,this.value)):e!==null&&Zt(this.value)===Zt(e)&&this.matchesComparison(Se(e,this.value))}matchesComparison(t){switch(this.op){case"<":return t<0;case"<=":return t<=0;case"==":return t===0;case"!=":return t!==0;case">":return t>0;case">=":return t>=0;default:return O(47266,{operator:this.op})}}isInequality(){return["<","<=",">",">=","!=","not-in"].indexOf(this.op)>=0}getFlattenedFilters(){return[this]}getFilters(){return[this]}}class Pt extends _a{constructor(t,e){super(),this.filters=t,this.op=e,this.Pe=null}static create(t,e){return new Pt(t,e)}matches(t){return ya(this)?this.filters.find((e=>!e.matches(t)))===void 0:this.filters.find((e=>e.matches(t)))!==void 0}getFlattenedFilters(){return this.Pe!==null||(this.Pe=this.filters.reduce(((t,e)=>t.concat(e.getFlattenedFilters())),[])),this.Pe}getFilters(){return Object.assign([],this.filters)}}function ya(r){return r.op==="and"}function Ea(r){return Xl(r)&&ya(r)}function Xl(r){for(const t of r.filters)if(t instanceof Pt)return!1;return!0}function rs(r){if(r instanceof et)return r.field.canonicalString()+r.op.toString()+Ce(r.value);if(Ea(r))return r.filters.map((t=>rs(t))).join(",");{const t=r.filters.map((e=>rs(e))).join(",");return`${r.op}(${t})`}}function Ta(r,t){return r instanceof et?(function(n,i){return i instanceof et&&n.op===i.op&&n.field.isEqual(i.field)&&xt(n.value,i.value)})(r,t):r instanceof Pt?(function(n,i){return i instanceof Pt&&n.op===i.op&&n.filters.length===i.filters.length?n.filters.reduce(((o,u,c)=>o&&Ta(u,i.filters[c])),!0):!1})(r,t):void O(19439)}function va(r){return r instanceof et?(function(e){return`${e.field.canonicalString()} ${e.op} ${Ce(e.value)}`})(r):r instanceof Pt?(function(e){return e.op.toString()+" {"+e.getFilters().map(va).join(" ,")+"}"})(r):"Filter"}class Yl extends et{constructor(t,e,n){super(t,e,n),this.key=x.fromName(n.referenceValue)}matches(t){const e=x.comparator(t.key,this.key);return this.matchesComparison(e)}}class Jl extends et{constructor(t,e){super(t,"in",e),this.keys=Ia("in",e)}matches(t){return this.keys.some((e=>e.isEqual(t.key)))}}class Zl extends et{constructor(t,e){super(t,"not-in",e),this.keys=Ia("not-in",e)}matches(t){return!this.keys.some((e=>e.isEqual(t.key)))}}function Ia(r,t){return(t.arrayValue?.values||[]).map((e=>x.fromName(e.referenceValue)))}class tc extends et{constructor(t,e){super(t,"array-contains",e)}matches(t){const e=t.data.field(this.field);return Es(e)&&cn(e.arrayValue,this.value)}}class ec extends et{constructor(t,e){super(t,"in",e)}matches(t){const e=t.data.field(this.field);return e!==null&&cn(this.value.arrayValue,e)}}class nc extends et{constructor(t,e){super(t,"not-in",e)}matches(t){if(cn(this.value.arrayValue,{nullValue:"NULL_VALUE"}))return!1;const e=t.data.field(this.field);return e!==null&&e.nullValue===void 0&&!cn(this.value.arrayValue,e)}}class rc extends et{constructor(t,e){super(t,"array-contains-any",e)}matches(t){const e=t.data.field(this.field);return!(!Es(e)||!e.arrayValue.values)&&e.arrayValue.values.some((n=>cn(this.value.arrayValue,n)))}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class sc{constructor(t,e=null,n=[],i=[],o=null,u=null,c=null){this.path=t,this.collectionGroup=e,this.orderBy=n,this.filters=i,this.limit=o,this.startAt=u,this.endAt=c,this.Te=null}}function go(r,t=null,e=[],n=[],i=null,o=null,u=null){return new sc(r,t,e,n,i,o,u)}function Ts(r){const t=F(r);if(t.Te===null){let e=t.path.canonicalString();t.collectionGroup!==null&&(e+="|cg:"+t.collectionGroup),e+="|f:",e+=t.filters.map((n=>rs(n))).join(","),e+="|ob:",e+=t.orderBy.map((n=>(function(o){return o.field.canonicalString()+o.dir})(n))).join(","),fr(t.limit)||(e+="|l:",e+=t.limit),t.startAt&&(e+="|lb:",e+=t.startAt.inclusive?"b:":"a:",e+=t.startAt.position.map((n=>Ce(n))).join(",")),t.endAt&&(e+="|ub:",e+=t.endAt.inclusive?"a:":"b:",e+=t.endAt.position.map((n=>Ce(n))).join(",")),t.Te=e}return t.Te}function vs(r,t){if(r.limit!==t.limit||r.orderBy.length!==t.orderBy.length)return!1;for(let e=0;e<r.orderBy.length;e++)if(!Hl(r.orderBy[e],t.orderBy[e]))return!1;if(r.filters.length!==t.filters.length)return!1;for(let e=0;e<r.filters.length;e++)if(!Ta(r.filters[e],t.filters[e]))return!1;return r.collectionGroup===t.collectionGroup&&!!r.path.isEqual(t.path)&&!!po(r.startAt,t.startAt)&&po(r.endAt,t.endAt)}function ss(r){return x.isDocumentKey(r.path)&&r.collectionGroup===null&&r.filters.length===0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pn{constructor(t,e=null,n=[],i=[],o=null,u="F",c=null,f=null){this.path=t,this.collectionGroup=e,this.explicitOrderBy=n,this.filters=i,this.limit=o,this.limitType=u,this.startAt=c,this.endAt=f,this.Ie=null,this.Ee=null,this.de=null,this.startAt,this.endAt}}function ic(r,t,e,n,i,o,u,c){return new pn(r,t,e,n,i,o,u,c)}function Aa(r){return new pn(r)}function _o(r){return r.filters.length===0&&r.limit===null&&r.startAt==null&&r.endAt==null&&(r.explicitOrderBy.length===0||r.explicitOrderBy.length===1&&r.explicitOrderBy[0].field.isKeyField())}function wa(r){return r.collectionGroup!==null}function rn(r){const t=F(r);if(t.Ie===null){t.Ie=[];const e=new Set;for(const o of t.explicitOrderBy)t.Ie.push(o),e.add(o.field.canonicalString());const n=t.explicitOrderBy.length>0?t.explicitOrderBy[t.explicitOrderBy.length-1].dir:"asc";(function(u){let c=new rt(ut.comparator);return u.filters.forEach((f=>{f.getFlattenedFilters().forEach((d=>{d.isInequality()&&(c=c.add(d.field))}))})),c})(t).forEach((o=>{e.has(o.canonicalString())||o.isKeyField()||t.Ie.push(new nr(o,n))})),e.has(ut.keyField().canonicalString())||t.Ie.push(new nr(ut.keyField(),n))}return t.Ie}function Dt(r){const t=F(r);return t.Ee||(t.Ee=oc(t,rn(r))),t.Ee}function oc(r,t){if(r.limitType==="F")return go(r.path,r.collectionGroup,t,r.filters,r.limit,r.startAt,r.endAt);{t=t.map((i=>{const o=i.dir==="desc"?"asc":"desc";return new nr(i.field,o)}));const e=r.endAt?new er(r.endAt.position,r.endAt.inclusive):null,n=r.startAt?new er(r.startAt.position,r.startAt.inclusive):null;return go(r.path,r.collectionGroup,t,r.filters,r.limit,e,n)}}function is(r,t){const e=r.filters.concat([t]);return new pn(r.path,r.collectionGroup,r.explicitOrderBy.slice(),e,r.limit,r.limitType,r.startAt,r.endAt)}function rr(r,t,e){return new pn(r.path,r.collectionGroup,r.explicitOrderBy.slice(),r.filters.slice(),t,e,r.startAt,r.endAt)}function mr(r,t){return vs(Dt(r),Dt(t))&&r.limitType===t.limitType}function Ra(r){return`${Ts(Dt(r))}|lt:${r.limitType}`}function Ee(r){return`Query(target=${(function(e){let n=e.path.canonicalString();return e.collectionGroup!==null&&(n+=" collectionGroup="+e.collectionGroup),e.filters.length>0&&(n+=`, filters: [${e.filters.map((i=>va(i))).join(", ")}]`),fr(e.limit)||(n+=", limit: "+e.limit),e.orderBy.length>0&&(n+=`, orderBy: [${e.orderBy.map((i=>(function(u){return`${u.field.canonicalString()} (${u.dir})`})(i))).join(", ")}]`),e.startAt&&(n+=", startAt: ",n+=e.startAt.inclusive?"b:":"a:",n+=e.startAt.position.map((i=>Ce(i))).join(",")),e.endAt&&(n+=", endAt: ",n+=e.endAt.inclusive?"a:":"b:",n+=e.endAt.position.map((i=>Ce(i))).join(",")),`Target(${n})`})(Dt(r))}; limitType=${r.limitType})`}function pr(r,t){return t.isFoundDocument()&&(function(n,i){const o=i.key.path;return n.collectionGroup!==null?i.key.hasCollectionId(n.collectionGroup)&&n.path.isPrefixOf(o):x.isDocumentKey(n.path)?n.path.isEqual(o):n.path.isImmediateParentOf(o)})(r,t)&&(function(n,i){for(const o of rn(n))if(!o.field.isKeyField()&&i.data.field(o.field)===null)return!1;return!0})(r,t)&&(function(n,i){for(const o of n.filters)if(!o.matches(i))return!1;return!0})(r,t)&&(function(n,i){return!(n.startAt&&!(function(u,c,f){const d=mo(u,c,f);return u.inclusive?d<=0:d<0})(n.startAt,rn(n),i)||n.endAt&&!(function(u,c,f){const d=mo(u,c,f);return u.inclusive?d>=0:d>0})(n.endAt,rn(n),i))})(r,t)}function ac(r){return r.collectionGroup||(r.path.length%2==1?r.path.lastSegment():r.path.get(r.path.length-2))}function Va(r){return(t,e)=>{let n=!1;for(const i of rn(r)){const o=uc(i,t,e);if(o!==0)return o;n=n||i.field.isKeyField()}return 0}}function uc(r,t,e){const n=r.field.isKeyField()?x.comparator(t.key,e.key):(function(o,u,c){const f=u.data.field(o),d=c.data.field(o);return f!==null&&d!==null?Se(f,d):O(42886)})(r.field,t,e);switch(r.dir){case"asc":return n;case"desc":return-1*n;default:return O(19790,{direction:r.dir})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ce{constructor(t,e){this.mapKeyFn=t,this.equalsFn=e,this.inner={},this.innerSize=0}get(t){const e=this.mapKeyFn(t),n=this.inner[e];if(n!==void 0){for(const[i,o]of n)if(this.equalsFn(i,t))return o}}has(t){return this.get(t)!==void 0}set(t,e){const n=this.mapKeyFn(t),i=this.inner[n];if(i===void 0)return this.inner[n]=[[t,e]],void this.innerSize++;for(let o=0;o<i.length;o++)if(this.equalsFn(i[o][0],t))return void(i[o]=[t,e]);i.push([t,e]),this.innerSize++}delete(t){const e=this.mapKeyFn(t),n=this.inner[e];if(n===void 0)return!1;for(let i=0;i<n.length;i++)if(this.equalsFn(n[i][0],t))return n.length===1?delete this.inner[e]:n.splice(i,1),this.innerSize--,!0;return!1}forEach(t){le(this.inner,((e,n)=>{for(const[i,o]of n)t(i,o)}))}isEmpty(){return ua(this.inner)}size(){return this.innerSize}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const lc=new Y(x.comparator);function jt(){return lc}const Pa=new Y(x.comparator);function tn(...r){let t=Pa;for(const e of r)t=t.insert(e.key,e);return t}function Sa(r){let t=Pa;return r.forEach(((e,n)=>t=t.insert(e,n.overlayedDocument))),t}function oe(){return sn()}function Ca(){return sn()}function sn(){return new ce((r=>r.toString()),((r,t)=>r.isEqual(t)))}const cc=new Y(x.comparator),hc=new rt(x.comparator);function q(...r){let t=hc;for(const e of r)t=t.add(e);return t}const fc=new rt(U);function dc(){return fc}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Is(r,t){if(r.useProto3Json){if(isNaN(t))return{doubleValue:"NaN"};if(t===1/0)return{doubleValue:"Infinity"};if(t===-1/0)return{doubleValue:"-Infinity"}}return{doubleValue:Jn(t)?"-0":t}}function Da(r){return{integerValue:""+r}}function mc(r,t){return jl(t)?Da(t):Is(r,t)}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class gr{constructor(){this._=void 0}}function pc(r,t,e){return r instanceof hn?(function(i,o){const u={fields:{[ha]:{stringValue:ca},[da]:{timestampValue:{seconds:i.seconds,nanos:i.nanoseconds}}}};return o&&ys(o)&&(o=dr(o)),o&&(u.fields[fa]=o),{mapValue:u}})(e,t):r instanceof fn?ba(r,t):r instanceof dn?ka(r,t):(function(i,o){const u=Na(i,o),c=yo(u)+yo(i.Ae);return ns(u)&&ns(i.Ae)?Da(c):Is(i.serializer,c)})(r,t)}function gc(r,t,e){return r instanceof fn?ba(r,t):r instanceof dn?ka(r,t):e}function Na(r,t){return r instanceof sr?(function(n){return ns(n)||(function(o){return!!o&&"doubleValue"in o})(n)})(t)?t:{integerValue:0}:null}class hn extends gr{}class fn extends gr{constructor(t){super(),this.elements=t}}function ba(r,t){const e=xa(t);for(const n of r.elements)e.some((i=>xt(i,n)))||e.push(n);return{arrayValue:{values:e}}}class dn extends gr{constructor(t){super(),this.elements=t}}function ka(r,t){let e=xa(t);for(const n of r.elements)e=e.filter((i=>!xt(i,n)));return{arrayValue:{values:e}}}class sr extends gr{constructor(t,e){super(),this.serializer=t,this.Ae=e}}function yo(r){return Z(r.integerValue||r.doubleValue)}function xa(r){return Es(r)&&r.arrayValue.values?r.arrayValue.values.slice():[]}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _c{constructor(t,e){this.field=t,this.transform=e}}function yc(r,t){return r.field.isEqual(t.field)&&(function(n,i){return n instanceof fn&&i instanceof fn||n instanceof dn&&i instanceof dn?Pe(n.elements,i.elements,xt):n instanceof sr&&i instanceof sr?xt(n.Ae,i.Ae):n instanceof hn&&i instanceof hn})(r.transform,t.transform)}class Ec{constructor(t,e){this.version=t,this.transformResults=e}}class Ut{constructor(t,e){this.updateTime=t,this.exists=e}static none(){return new Ut}static exists(t){return new Ut(void 0,t)}static updateTime(t){return new Ut(t)}get isNone(){return this.updateTime===void 0&&this.exists===void 0}isEqual(t){return this.exists===t.exists&&(this.updateTime?!!t.updateTime&&this.updateTime.isEqual(t.updateTime):!t.updateTime)}}function Wn(r,t){return r.updateTime!==void 0?t.isFoundDocument()&&t.version.isEqual(r.updateTime):r.exists===void 0||r.exists===t.isFoundDocument()}class _r{}function Ma(r,t){if(!r.hasLocalMutations||t&&t.fields.length===0)return null;if(t===null)return r.isNoDocument()?new La(r.key,Ut.none()):new gn(r.key,r.data,Ut.none());{const e=r.data,n=At.empty();let i=new rt(ut.comparator);for(let o of t.fields)if(!i.has(o)){let u=e.field(o);u===null&&o.length>1&&(o=o.popLast(),u=e.field(o)),u===null?n.delete(o):n.set(o,u),i=i.add(o)}return new he(r.key,n,new Vt(i.toArray()),Ut.none())}}function Tc(r,t,e){r instanceof gn?(function(i,o,u){const c=i.value.clone(),f=To(i.fieldTransforms,o,u.transformResults);c.setAll(f),o.convertToFoundDocument(u.version,c).setHasCommittedMutations()})(r,t,e):r instanceof he?(function(i,o,u){if(!Wn(i.precondition,o))return void o.convertToUnknownDocument(u.version);const c=To(i.fieldTransforms,o,u.transformResults),f=o.data;f.setAll(Oa(i)),f.setAll(c),o.convertToFoundDocument(u.version,f).setHasCommittedMutations()})(r,t,e):(function(i,o,u){o.convertToNoDocument(u.version).setHasCommittedMutations()})(0,t,e)}function on(r,t,e,n){return r instanceof gn?(function(o,u,c,f){if(!Wn(o.precondition,u))return c;const d=o.value.clone(),_=vo(o.fieldTransforms,f,u);return d.setAll(_),u.convertToFoundDocument(u.version,d).setHasLocalMutations(),null})(r,t,e,n):r instanceof he?(function(o,u,c,f){if(!Wn(o.precondition,u))return c;const d=vo(o.fieldTransforms,f,u),_=u.data;return _.setAll(Oa(o)),_.setAll(d),u.convertToFoundDocument(u.version,_).setHasLocalMutations(),c===null?null:c.unionWith(o.fieldMask.fields).unionWith(o.fieldTransforms.map((A=>A.field)))})(r,t,e,n):(function(o,u,c){return Wn(o.precondition,u)?(u.convertToNoDocument(u.version).setHasLocalMutations(),null):c})(r,t,e)}function vc(r,t){let e=null;for(const n of r.fieldTransforms){const i=t.data.field(n.field),o=Na(n.transform,i||null);o!=null&&(e===null&&(e=At.empty()),e.set(n.field,o))}return e||null}function Eo(r,t){return r.type===t.type&&!!r.key.isEqual(t.key)&&!!r.precondition.isEqual(t.precondition)&&!!(function(n,i){return n===void 0&&i===void 0||!(!n||!i)&&Pe(n,i,((o,u)=>yc(o,u)))})(r.fieldTransforms,t.fieldTransforms)&&(r.type===0?r.value.isEqual(t.value):r.type!==1||r.data.isEqual(t.data)&&r.fieldMask.isEqual(t.fieldMask))}class gn extends _r{constructor(t,e,n,i=[]){super(),this.key=t,this.value=e,this.precondition=n,this.fieldTransforms=i,this.type=0}getFieldMask(){return null}}class he extends _r{constructor(t,e,n,i,o=[]){super(),this.key=t,this.data=e,this.fieldMask=n,this.precondition=i,this.fieldTransforms=o,this.type=1}getFieldMask(){return this.fieldMask}}function Oa(r){const t=new Map;return r.fieldMask.fields.forEach((e=>{if(!e.isEmpty()){const n=r.data.field(e);t.set(e,n)}})),t}function To(r,t,e){const n=new Map;$(r.length===e.length,32656,{Re:e.length,Ve:r.length});for(let i=0;i<e.length;i++){const o=r[i],u=o.transform,c=t.data.field(o.field);n.set(o.field,gc(u,c,e[i]))}return n}function vo(r,t,e){const n=new Map;for(const i of r){const o=i.transform,u=e.data.field(i.field);n.set(i.field,pc(o,u,t))}return n}class La extends _r{constructor(t,e){super(),this.key=t,this.precondition=e,this.type=2,this.fieldTransforms=[]}getFieldMask(){return null}}class Ic extends _r{constructor(t,e){super(),this.key=t,this.precondition=e,this.type=3,this.fieldTransforms=[]}getFieldMask(){return null}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ac{constructor(t,e,n,i){this.batchId=t,this.localWriteTime=e,this.baseMutations=n,this.mutations=i}applyToRemoteDocument(t,e){const n=e.mutationResults;for(let i=0;i<this.mutations.length;i++){const o=this.mutations[i];o.key.isEqual(t.key)&&Tc(o,t,n[i])}}applyToLocalView(t,e){for(const n of this.baseMutations)n.key.isEqual(t.key)&&(e=on(n,t,e,this.localWriteTime));for(const n of this.mutations)n.key.isEqual(t.key)&&(e=on(n,t,e,this.localWriteTime));return e}applyToLocalDocumentSet(t,e){const n=Ca();return this.mutations.forEach((i=>{const o=t.get(i.key),u=o.overlayedDocument;let c=this.applyToLocalView(u,o.mutatedFields);c=e.has(i.key)?null:c;const f=Ma(u,c);f!==null&&n.set(i.key,f),u.isValidDocument()||u.convertToNoDocument(L.min())})),n}keys(){return this.mutations.reduce(((t,e)=>t.add(e.key)),q())}isEqual(t){return this.batchId===t.batchId&&Pe(this.mutations,t.mutations,((e,n)=>Eo(e,n)))&&Pe(this.baseMutations,t.baseMutations,((e,n)=>Eo(e,n)))}}class As{constructor(t,e,n,i){this.batch=t,this.commitVersion=e,this.mutationResults=n,this.docVersions=i}static from(t,e,n){$(t.mutations.length===n.length,58842,{me:t.mutations.length,fe:n.length});let i=(function(){return cc})();const o=t.mutations;for(let u=0;u<o.length;u++)i=i.insert(o[u].key,n[u].version);return new As(t,e,n,i)}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wc{constructor(t,e){this.largestBatchId=t,this.mutation=e}getKey(){return this.mutation.key}isEqual(t){return t!==null&&this.mutation===t.mutation}toString(){return`Overlay{
      largestBatchId: ${this.largestBatchId},
      mutation: ${this.mutation.toString()}
    }`}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Rc{constructor(t,e){this.count=t,this.unchangedNames=e}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var tt,j;function Vc(r){switch(r){case R.OK:return O(64938);case R.CANCELLED:case R.UNKNOWN:case R.DEADLINE_EXCEEDED:case R.RESOURCE_EXHAUSTED:case R.INTERNAL:case R.UNAVAILABLE:case R.UNAUTHENTICATED:return!1;case R.INVALID_ARGUMENT:case R.NOT_FOUND:case R.ALREADY_EXISTS:case R.PERMISSION_DENIED:case R.FAILED_PRECONDITION:case R.ABORTED:case R.OUT_OF_RANGE:case R.UNIMPLEMENTED:case R.DATA_LOSS:return!0;default:return O(15467,{code:r})}}function Fa(r){if(r===void 0)return qt("GRPC error has no .code"),R.UNKNOWN;switch(r){case tt.OK:return R.OK;case tt.CANCELLED:return R.CANCELLED;case tt.UNKNOWN:return R.UNKNOWN;case tt.DEADLINE_EXCEEDED:return R.DEADLINE_EXCEEDED;case tt.RESOURCE_EXHAUSTED:return R.RESOURCE_EXHAUSTED;case tt.INTERNAL:return R.INTERNAL;case tt.UNAVAILABLE:return R.UNAVAILABLE;case tt.UNAUTHENTICATED:return R.UNAUTHENTICATED;case tt.INVALID_ARGUMENT:return R.INVALID_ARGUMENT;case tt.NOT_FOUND:return R.NOT_FOUND;case tt.ALREADY_EXISTS:return R.ALREADY_EXISTS;case tt.PERMISSION_DENIED:return R.PERMISSION_DENIED;case tt.FAILED_PRECONDITION:return R.FAILED_PRECONDITION;case tt.ABORTED:return R.ABORTED;case tt.OUT_OF_RANGE:return R.OUT_OF_RANGE;case tt.UNIMPLEMENTED:return R.UNIMPLEMENTED;case tt.DATA_LOSS:return R.DATA_LOSS;default:return O(39323,{code:r})}}(j=tt||(tt={}))[j.OK=0]="OK",j[j.CANCELLED=1]="CANCELLED",j[j.UNKNOWN=2]="UNKNOWN",j[j.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",j[j.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",j[j.NOT_FOUND=5]="NOT_FOUND",j[j.ALREADY_EXISTS=6]="ALREADY_EXISTS",j[j.PERMISSION_DENIED=7]="PERMISSION_DENIED",j[j.UNAUTHENTICATED=16]="UNAUTHENTICATED",j[j.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",j[j.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",j[j.ABORTED=10]="ABORTED",j[j.OUT_OF_RANGE=11]="OUT_OF_RANGE",j[j.UNIMPLEMENTED=12]="UNIMPLEMENTED",j[j.INTERNAL=13]="INTERNAL",j[j.UNAVAILABLE=14]="UNAVAILABLE",j[j.DATA_LOSS=15]="DATA_LOSS";/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Pc(){return new TextEncoder}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Sc=new Qt([4294967295,4294967295],0);function Io(r){const t=Pc().encode(r),e=new Yo;return e.update(t),new Uint8Array(e.digest())}function Ao(r){const t=new DataView(r.buffer),e=t.getUint32(0,!0),n=t.getUint32(4,!0),i=t.getUint32(8,!0),o=t.getUint32(12,!0);return[new Qt([e,n],0),new Qt([i,o],0)]}class ws{constructor(t,e,n){if(this.bitmap=t,this.padding=e,this.hashCount=n,e<0||e>=8)throw new en(`Invalid padding: ${e}`);if(n<0)throw new en(`Invalid hash count: ${n}`);if(t.length>0&&this.hashCount===0)throw new en(`Invalid hash count: ${n}`);if(t.length===0&&e!==0)throw new en(`Invalid padding when bitmap length is 0: ${e}`);this.ge=8*t.length-e,this.pe=Qt.fromNumber(this.ge)}ye(t,e,n){let i=t.add(e.multiply(Qt.fromNumber(n)));return i.compare(Sc)===1&&(i=new Qt([i.getBits(0),i.getBits(1)],0)),i.modulo(this.pe).toNumber()}we(t){return!!(this.bitmap[Math.floor(t/8)]&1<<t%8)}mightContain(t){if(this.ge===0)return!1;const e=Io(t),[n,i]=Ao(e);for(let o=0;o<this.hashCount;o++){const u=this.ye(n,i,o);if(!this.we(u))return!1}return!0}static create(t,e,n){const i=t%8==0?0:8-t%8,o=new Uint8Array(Math.ceil(t/8)),u=new ws(o,i,e);return n.forEach((c=>u.insert(c))),u}insert(t){if(this.ge===0)return;const e=Io(t),[n,i]=Ao(e);for(let o=0;o<this.hashCount;o++){const u=this.ye(n,i,o);this.Se(u)}}Se(t){const e=Math.floor(t/8),n=t%8;this.bitmap[e]|=1<<n}}class en extends Error{constructor(){super(...arguments),this.name="BloomFilterError"}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class yr{constructor(t,e,n,i,o){this.snapshotVersion=t,this.targetChanges=e,this.targetMismatches=n,this.documentUpdates=i,this.resolvedLimboDocuments=o}static createSynthesizedRemoteEventForCurrentChange(t,e,n){const i=new Map;return i.set(t,_n.createSynthesizedTargetChangeForCurrentChange(t,e,n)),new yr(L.min(),i,new Y(U),jt(),q())}}class _n{constructor(t,e,n,i,o){this.resumeToken=t,this.current=e,this.addedDocuments=n,this.modifiedDocuments=i,this.removedDocuments=o}static createSynthesizedTargetChangeForCurrentChange(t,e,n){return new _n(n,e,q(),q(),q())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Hn{constructor(t,e,n,i){this.be=t,this.removedTargetIds=e,this.key=n,this.De=i}}class Ua{constructor(t,e){this.targetId=t,this.Ce=e}}class qa{constructor(t,e,n=lt.EMPTY_BYTE_STRING,i=null){this.state=t,this.targetIds=e,this.resumeToken=n,this.cause=i}}class wo{constructor(){this.ve=0,this.Fe=Ro(),this.Me=lt.EMPTY_BYTE_STRING,this.xe=!1,this.Oe=!0}get current(){return this.xe}get resumeToken(){return this.Me}get Ne(){return this.ve!==0}get Be(){return this.Oe}Le(t){t.approximateByteSize()>0&&(this.Oe=!0,this.Me=t)}ke(){let t=q(),e=q(),n=q();return this.Fe.forEach(((i,o)=>{switch(o){case 0:t=t.add(i);break;case 2:e=e.add(i);break;case 1:n=n.add(i);break;default:O(38017,{changeType:o})}})),new _n(this.Me,this.xe,t,e,n)}qe(){this.Oe=!1,this.Fe=Ro()}Qe(t,e){this.Oe=!0,this.Fe=this.Fe.insert(t,e)}$e(t){this.Oe=!0,this.Fe=this.Fe.remove(t)}Ue(){this.ve+=1}Ke(){this.ve-=1,$(this.ve>=0,3241,{ve:this.ve})}We(){this.Oe=!0,this.xe=!0}}class Cc{constructor(t){this.Ge=t,this.ze=new Map,this.je=jt(),this.Je=Bn(),this.He=Bn(),this.Ye=new Y(U)}Ze(t){for(const e of t.be)t.De&&t.De.isFoundDocument()?this.Xe(e,t.De):this.et(e,t.key,t.De);for(const e of t.removedTargetIds)this.et(e,t.key,t.De)}tt(t){this.forEachTarget(t,(e=>{const n=this.nt(e);switch(t.state){case 0:this.rt(e)&&n.Le(t.resumeToken);break;case 1:n.Ke(),n.Ne||n.qe(),n.Le(t.resumeToken);break;case 2:n.Ke(),n.Ne||this.removeTarget(e);break;case 3:this.rt(e)&&(n.We(),n.Le(t.resumeToken));break;case 4:this.rt(e)&&(this.it(e),n.Le(t.resumeToken));break;default:O(56790,{state:t.state})}}))}forEachTarget(t,e){t.targetIds.length>0?t.targetIds.forEach(e):this.ze.forEach(((n,i)=>{this.rt(i)&&e(i)}))}st(t){const e=t.targetId,n=t.Ce.count,i=this.ot(e);if(i){const o=i.target;if(ss(o))if(n===0){const u=new x(o.path);this.et(e,u,_t.newNoDocument(u,L.min()))}else $(n===1,20013,{expectedCount:n});else{const u=this._t(e);if(u!==n){const c=this.ut(t),f=c?this.ct(c,t,u):1;if(f!==0){this.it(e);const d=f===2?"TargetPurposeExistenceFilterMismatchBloom":"TargetPurposeExistenceFilterMismatch";this.Ye=this.Ye.insert(e,d)}}}}}ut(t){const e=t.Ce.unchangedNames;if(!e||!e.bits)return null;const{bits:{bitmap:n="",padding:i=0},hashCount:o=0}=e;let u,c;try{u=Jt(n).toUint8Array()}catch(f){if(f instanceof la)return Ve("Decoding the base64 bloom filter in existence filter failed ("+f.message+"); ignoring the bloom filter and falling back to full re-query."),null;throw f}try{c=new ws(u,i,o)}catch(f){return Ve(f instanceof en?"BloomFilter error: ":"Applying bloom filter failed: ",f),null}return c.ge===0?null:c}ct(t,e,n){return e.Ce.count===n-this.Pt(t,e.targetId)?0:2}Pt(t,e){const n=this.Ge.getRemoteKeysForTarget(e);let i=0;return n.forEach((o=>{const u=this.Ge.ht(),c=`projects/${u.projectId}/databases/${u.database}/documents/${o.path.canonicalString()}`;t.mightContain(c)||(this.et(e,o,null),i++)})),i}Tt(t){const e=new Map;this.ze.forEach(((o,u)=>{const c=this.ot(u);if(c){if(o.current&&ss(c.target)){const f=new x(c.target.path);this.It(f).has(u)||this.Et(u,f)||this.et(u,f,_t.newNoDocument(f,t))}o.Be&&(e.set(u,o.ke()),o.qe())}}));let n=q();this.He.forEach(((o,u)=>{let c=!0;u.forEachWhile((f=>{const d=this.ot(f);return!d||d.purpose==="TargetPurposeLimboResolution"||(c=!1,!1)})),c&&(n=n.add(o))})),this.je.forEach(((o,u)=>u.setReadTime(t)));const i=new yr(t,e,this.Ye,this.je,n);return this.je=jt(),this.Je=Bn(),this.He=Bn(),this.Ye=new Y(U),i}Xe(t,e){if(!this.rt(t))return;const n=this.Et(t,e.key)?2:0;this.nt(t).Qe(e.key,n),this.je=this.je.insert(e.key,e),this.Je=this.Je.insert(e.key,this.It(e.key).add(t)),this.He=this.He.insert(e.key,this.dt(e.key).add(t))}et(t,e,n){if(!this.rt(t))return;const i=this.nt(t);this.Et(t,e)?i.Qe(e,1):i.$e(e),this.He=this.He.insert(e,this.dt(e).delete(t)),this.He=this.He.insert(e,this.dt(e).add(t)),n&&(this.je=this.je.insert(e,n))}removeTarget(t){this.ze.delete(t)}_t(t){const e=this.nt(t).ke();return this.Ge.getRemoteKeysForTarget(t).size+e.addedDocuments.size-e.removedDocuments.size}Ue(t){this.nt(t).Ue()}nt(t){let e=this.ze.get(t);return e||(e=new wo,this.ze.set(t,e)),e}dt(t){let e=this.He.get(t);return e||(e=new rt(U),this.He=this.He.insert(t,e)),e}It(t){let e=this.Je.get(t);return e||(e=new rt(U),this.Je=this.Je.insert(t,e)),e}rt(t){const e=this.ot(t)!==null;return e||N("WatchChangeAggregator","Detected inactive target",t),e}ot(t){const e=this.ze.get(t);return e&&e.Ne?null:this.Ge.At(t)}it(t){this.ze.set(t,new wo),this.Ge.getRemoteKeysForTarget(t).forEach((e=>{this.et(t,e,null)}))}Et(t,e){return this.Ge.getRemoteKeysForTarget(t).has(e)}}function Bn(){return new Y(x.comparator)}function Ro(){return new Y(x.comparator)}const Dc={asc:"ASCENDING",desc:"DESCENDING"},Nc={"<":"LESS_THAN","<=":"LESS_THAN_OR_EQUAL",">":"GREATER_THAN",">=":"GREATER_THAN_OR_EQUAL","==":"EQUAL","!=":"NOT_EQUAL","array-contains":"ARRAY_CONTAINS",in:"IN","not-in":"NOT_IN","array-contains-any":"ARRAY_CONTAINS_ANY"},bc={and:"AND",or:"OR"};class kc{constructor(t,e){this.databaseId=t,this.useProto3Json=e}}function os(r,t){return r.useProto3Json||fr(t)?t:{value:t}}function ir(r,t){return r.useProto3Json?`${new Date(1e3*t.seconds).toISOString().replace(/\.\d*/,"").replace("Z","")}.${("000000000"+t.nanoseconds).slice(-9)}Z`:{seconds:""+t.seconds,nanos:t.nanoseconds}}function ja(r,t){return r.useProto3Json?t.toBase64():t.toUint8Array()}function xc(r,t){return ir(r,t.toTimestamp())}function Nt(r){return $(!!r,49232),L.fromTimestamp((function(e){const n=Yt(e);return new X(n.seconds,n.nanos)})(r))}function Rs(r,t){return as(r,t).canonicalString()}function as(r,t){const e=(function(i){return new W(["projects",i.projectId,"databases",i.database])})(r).child("documents");return t===void 0?e:e.child(t)}function Ba(r){const t=W.fromString(r);return $(Qa(t),10190,{key:t.toString()}),t}function us(r,t){return Rs(r.databaseId,t.path)}function Hr(r,t){const e=Ba(t);if(e.get(1)!==r.databaseId.projectId)throw new D(R.INVALID_ARGUMENT,"Tried to deserialize key from different project: "+e.get(1)+" vs "+r.databaseId.projectId);if(e.get(3)!==r.databaseId.database)throw new D(R.INVALID_ARGUMENT,"Tried to deserialize key from different database: "+e.get(3)+" vs "+r.databaseId.database);return new x(Ga(e))}function za(r,t){return Rs(r.databaseId,t)}function Mc(r){const t=Ba(r);return t.length===4?W.emptyPath():Ga(t)}function ls(r){return new W(["projects",r.databaseId.projectId,"databases",r.databaseId.database]).canonicalString()}function Ga(r){return $(r.length>4&&r.get(4)==="documents",29091,{key:r.toString()}),r.popFirst(5)}function Vo(r,t,e){return{name:us(r,t),fields:e.value.mapValue.fields}}function Oc(r,t){let e;if("targetChange"in t){t.targetChange;const n=(function(d){return d==="NO_CHANGE"?0:d==="ADD"?1:d==="REMOVE"?2:d==="CURRENT"?3:d==="RESET"?4:O(39313,{state:d})})(t.targetChange.targetChangeType||"NO_CHANGE"),i=t.targetChange.targetIds||[],o=(function(d,_){return d.useProto3Json?($(_===void 0||typeof _=="string",58123),lt.fromBase64String(_||"")):($(_===void 0||_ instanceof Buffer||_ instanceof Uint8Array,16193),lt.fromUint8Array(_||new Uint8Array))})(r,t.targetChange.resumeToken),u=t.targetChange.cause,c=u&&(function(d){const _=d.code===void 0?R.UNKNOWN:Fa(d.code);return new D(_,d.message||"")})(u);e=new qa(n,i,o,c||null)}else if("documentChange"in t){t.documentChange;const n=t.documentChange;n.document,n.document.name,n.document.updateTime;const i=Hr(r,n.document.name),o=Nt(n.document.updateTime),u=n.document.createTime?Nt(n.document.createTime):L.min(),c=new At({mapValue:{fields:n.document.fields}}),f=_t.newFoundDocument(i,o,u,c),d=n.targetIds||[],_=n.removedTargetIds||[];e=new Hn(d,_,f.key,f)}else if("documentDelete"in t){t.documentDelete;const n=t.documentDelete;n.document;const i=Hr(r,n.document),o=n.readTime?Nt(n.readTime):L.min(),u=_t.newNoDocument(i,o),c=n.removedTargetIds||[];e=new Hn([],c,u.key,u)}else if("documentRemove"in t){t.documentRemove;const n=t.documentRemove;n.document;const i=Hr(r,n.document),o=n.removedTargetIds||[];e=new Hn([],o,i,null)}else{if(!("filter"in t))return O(11601,{Rt:t});{t.filter;const n=t.filter;n.targetId;const{count:i=0,unchangedNames:o}=n,u=new Rc(i,o),c=n.targetId;e=new Ua(c,u)}}return e}function Lc(r,t){let e;if(t instanceof gn)e={update:Vo(r,t.key,t.value)};else if(t instanceof La)e={delete:us(r,t.key)};else if(t instanceof he)e={update:Vo(r,t.key,t.data),updateMask:Kc(t.fieldMask)};else{if(!(t instanceof Ic))return O(16599,{Vt:t.type});e={verify:us(r,t.key)}}return t.fieldTransforms.length>0&&(e.updateTransforms=t.fieldTransforms.map((n=>(function(o,u){const c=u.transform;if(c instanceof hn)return{fieldPath:u.field.canonicalString(),setToServerValue:"REQUEST_TIME"};if(c instanceof fn)return{fieldPath:u.field.canonicalString(),appendMissingElements:{values:c.elements}};if(c instanceof dn)return{fieldPath:u.field.canonicalString(),removeAllFromArray:{values:c.elements}};if(c instanceof sr)return{fieldPath:u.field.canonicalString(),increment:c.Ae};throw O(20930,{transform:u.transform})})(0,n)))),t.precondition.isNone||(e.currentDocument=(function(i,o){return o.updateTime!==void 0?{updateTime:xc(i,o.updateTime)}:o.exists!==void 0?{exists:o.exists}:O(27497)})(r,t.precondition)),e}function Fc(r,t){return r&&r.length>0?($(t!==void 0,14353),r.map((e=>(function(i,o){let u=i.updateTime?Nt(i.updateTime):Nt(o);return u.isEqual(L.min())&&(u=Nt(o)),new Ec(u,i.transformResults||[])})(e,t)))):[]}function Uc(r,t){return{documents:[za(r,t.path)]}}function qc(r,t){const e={structuredQuery:{}},n=t.path;let i;t.collectionGroup!==null?(i=n,e.structuredQuery.from=[{collectionId:t.collectionGroup,allDescendants:!0}]):(i=n.popLast(),e.structuredQuery.from=[{collectionId:n.lastSegment()}]),e.parent=za(r,i);const o=(function(d){if(d.length!==0)return Ka(Pt.create(d,"and"))})(t.filters);o&&(e.structuredQuery.where=o);const u=(function(d){if(d.length!==0)return d.map((_=>(function(P){return{field:Te(P.field),direction:zc(P.dir)}})(_)))})(t.orderBy);u&&(e.structuredQuery.orderBy=u);const c=os(r,t.limit);return c!==null&&(e.structuredQuery.limit=c),t.startAt&&(e.structuredQuery.startAt=(function(d){return{before:d.inclusive,values:d.position}})(t.startAt)),t.endAt&&(e.structuredQuery.endAt=(function(d){return{before:!d.inclusive,values:d.position}})(t.endAt)),{ft:e,parent:i}}function jc(r){let t=Mc(r.parent);const e=r.structuredQuery,n=e.from?e.from.length:0;let i=null;if(n>0){$(n===1,65062);const _=e.from[0];_.allDescendants?i=_.collectionId:t=t.child(_.collectionId)}let o=[];e.where&&(o=(function(A){const P=$a(A);return P instanceof Pt&&Ea(P)?P.getFilters():[P]})(e.where));let u=[];e.orderBy&&(u=(function(A){return A.map((P=>(function(k){return new nr(ve(k.field),(function(b){switch(b){case"ASCENDING":return"asc";case"DESCENDING":return"desc";default:return}})(k.direction))})(P)))})(e.orderBy));let c=null;e.limit&&(c=(function(A){let P;return P=typeof A=="object"?A.value:A,fr(P)?null:P})(e.limit));let f=null;e.startAt&&(f=(function(A){const P=!!A.before,C=A.values||[];return new er(C,P)})(e.startAt));let d=null;return e.endAt&&(d=(function(A){const P=!A.before,C=A.values||[];return new er(C,P)})(e.endAt)),ic(t,i,u,o,c,"F",f,d)}function Bc(r,t){const e=(function(i){switch(i){case"TargetPurposeListen":return null;case"TargetPurposeExistenceFilterMismatch":return"existence-filter-mismatch";case"TargetPurposeExistenceFilterMismatchBloom":return"existence-filter-mismatch-bloom";case"TargetPurposeLimboResolution":return"limbo-document";default:return O(28987,{purpose:i})}})(t.purpose);return e==null?null:{"goog-listen-tags":e}}function $a(r){return r.unaryFilter!==void 0?(function(e){switch(e.unaryFilter.op){case"IS_NAN":const n=ve(e.unaryFilter.field);return et.create(n,"==",{doubleValue:NaN});case"IS_NULL":const i=ve(e.unaryFilter.field);return et.create(i,"==",{nullValue:"NULL_VALUE"});case"IS_NOT_NAN":const o=ve(e.unaryFilter.field);return et.create(o,"!=",{doubleValue:NaN});case"IS_NOT_NULL":const u=ve(e.unaryFilter.field);return et.create(u,"!=",{nullValue:"NULL_VALUE"});case"OPERATOR_UNSPECIFIED":return O(61313);default:return O(60726)}})(r):r.fieldFilter!==void 0?(function(e){return et.create(ve(e.fieldFilter.field),(function(i){switch(i){case"EQUAL":return"==";case"NOT_EQUAL":return"!=";case"GREATER_THAN":return">";case"GREATER_THAN_OR_EQUAL":return">=";case"LESS_THAN":return"<";case"LESS_THAN_OR_EQUAL":return"<=";case"ARRAY_CONTAINS":return"array-contains";case"IN":return"in";case"NOT_IN":return"not-in";case"ARRAY_CONTAINS_ANY":return"array-contains-any";case"OPERATOR_UNSPECIFIED":return O(58110);default:return O(50506)}})(e.fieldFilter.op),e.fieldFilter.value)})(r):r.compositeFilter!==void 0?(function(e){return Pt.create(e.compositeFilter.filters.map((n=>$a(n))),(function(i){switch(i){case"AND":return"and";case"OR":return"or";default:return O(1026)}})(e.compositeFilter.op))})(r):O(30097,{filter:r})}function zc(r){return Dc[r]}function Gc(r){return Nc[r]}function $c(r){return bc[r]}function Te(r){return{fieldPath:r.canonicalString()}}function ve(r){return ut.fromServerFormat(r.fieldPath)}function Ka(r){return r instanceof et?(function(e){if(e.op==="=="){if(fo(e.value))return{unaryFilter:{field:Te(e.field),op:"IS_NAN"}};if(ho(e.value))return{unaryFilter:{field:Te(e.field),op:"IS_NULL"}}}else if(e.op==="!="){if(fo(e.value))return{unaryFilter:{field:Te(e.field),op:"IS_NOT_NAN"}};if(ho(e.value))return{unaryFilter:{field:Te(e.field),op:"IS_NOT_NULL"}}}return{fieldFilter:{field:Te(e.field),op:Gc(e.op),value:e.value}}})(r):r instanceof Pt?(function(e){const n=e.getFilters().map((i=>Ka(i)));return n.length===1?n[0]:{compositeFilter:{op:$c(e.op),filters:n}}})(r):O(54877,{filter:r})}function Kc(r){const t=[];return r.fields.forEach((e=>t.push(e.canonicalString()))),{fieldPaths:t}}function Qa(r){return r.length>=4&&r.get(0)==="projects"&&r.get(2)==="databases"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Kt{constructor(t,e,n,i,o=L.min(),u=L.min(),c=lt.EMPTY_BYTE_STRING,f=null){this.target=t,this.targetId=e,this.purpose=n,this.sequenceNumber=i,this.snapshotVersion=o,this.lastLimboFreeSnapshotVersion=u,this.resumeToken=c,this.expectedCount=f}withSequenceNumber(t){return new Kt(this.target,this.targetId,this.purpose,t,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,this.expectedCount)}withResumeToken(t,e){return new Kt(this.target,this.targetId,this.purpose,this.sequenceNumber,e,this.lastLimboFreeSnapshotVersion,t,null)}withExpectedCount(t){return new Kt(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,t)}withLastLimboFreeSnapshotVersion(t){return new Kt(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,t,this.resumeToken,this.expectedCount)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Qc{constructor(t){this.yt=t}}function Wc(r){const t=jc({parent:r.parent,structuredQuery:r.structuredQuery});return r.limitType==="LAST"?rr(t,t.limit,"L"):t}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Hc{constructor(){this.Cn=new Xc}addToCollectionParentIndex(t,e){return this.Cn.add(e),V.resolve()}getCollectionParents(t,e){return V.resolve(this.Cn.getEntries(e))}addFieldIndex(t,e){return V.resolve()}deleteFieldIndex(t,e){return V.resolve()}deleteAllFieldIndexes(t){return V.resolve()}createTargetIndexes(t,e){return V.resolve()}getDocumentsMatchingTarget(t,e){return V.resolve(null)}getIndexType(t,e){return V.resolve(0)}getFieldIndexes(t,e){return V.resolve([])}getNextCollectionGroupToUpdate(t){return V.resolve(null)}getMinOffset(t,e){return V.resolve(Xt.min())}getMinOffsetFromCollectionGroup(t,e){return V.resolve(Xt.min())}updateCollectionGroup(t,e,n){return V.resolve()}updateIndexEntries(t,e){return V.resolve()}}class Xc{constructor(){this.index={}}add(t){const e=t.lastSegment(),n=t.popLast(),i=this.index[e]||new rt(W.comparator),o=!i.has(n);return this.index[e]=i.add(n),o}has(t){const e=t.lastSegment(),n=t.popLast(),i=this.index[e];return i&&i.has(n)}getEntries(t){return(this.index[t]||new rt(W.comparator)).toArray()}}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Po={didRun:!1,sequenceNumbersCollected:0,targetsRemoved:0,documentsRemoved:0},Wa=41943040;class vt{static withCacheSize(t){return new vt(t,vt.DEFAULT_COLLECTION_PERCENTILE,vt.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT)}constructor(t,e,n){this.cacheSizeCollectionThreshold=t,this.percentileToCollect=e,this.maximumSequenceNumbersToCollect=n}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */vt.DEFAULT_COLLECTION_PERCENTILE=10,vt.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT=1e3,vt.DEFAULT=new vt(Wa,vt.DEFAULT_COLLECTION_PERCENTILE,vt.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT),vt.DISABLED=new vt(-1,0,0);/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class De{constructor(t){this.ar=t}next(){return this.ar+=2,this.ar}static ur(){return new De(0)}static cr(){return new De(-1)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const So="LruGarbageCollector",Yc=1048576;function Co([r,t],[e,n]){const i=U(r,e);return i===0?U(t,n):i}class Jc{constructor(t){this.Ir=t,this.buffer=new rt(Co),this.Er=0}dr(){return++this.Er}Ar(t){const e=[t,this.dr()];if(this.buffer.size<this.Ir)this.buffer=this.buffer.add(e);else{const n=this.buffer.last();Co(e,n)<0&&(this.buffer=this.buffer.delete(n).add(e))}}get maxValue(){return this.buffer.last()[0]}}class Zc{constructor(t,e,n){this.garbageCollector=t,this.asyncQueue=e,this.localStore=n,this.Rr=null}start(){this.garbageCollector.params.cacheSizeCollectionThreshold!==-1&&this.Vr(6e4)}stop(){this.Rr&&(this.Rr.cancel(),this.Rr=null)}get started(){return this.Rr!==null}Vr(t){N(So,`Garbage collection scheduled in ${t}ms`),this.Rr=this.asyncQueue.enqueueAfterDelay("lru_garbage_collection",t,(async()=>{this.Rr=null;try{await this.localStore.collectGarbage(this.garbageCollector)}catch(e){xe(e)?N(So,"Ignoring IndexedDB error during garbage collection: ",e):await ke(e)}await this.Vr(3e5)}))}}class th{constructor(t,e){this.mr=t,this.params=e}calculateTargetCount(t,e){return this.mr.gr(t).next((n=>Math.floor(e/100*n)))}nthSequenceNumber(t,e){if(e===0)return V.resolve(hr.ce);const n=new Jc(e);return this.mr.forEachTarget(t,(i=>n.Ar(i.sequenceNumber))).next((()=>this.mr.pr(t,(i=>n.Ar(i))))).next((()=>n.maxValue))}removeTargets(t,e,n){return this.mr.removeTargets(t,e,n)}removeOrphanedDocuments(t,e){return this.mr.removeOrphanedDocuments(t,e)}collect(t,e){return this.params.cacheSizeCollectionThreshold===-1?(N("LruGarbageCollector","Garbage collection skipped; disabled"),V.resolve(Po)):this.getCacheSize(t).next((n=>n<this.params.cacheSizeCollectionThreshold?(N("LruGarbageCollector",`Garbage collection skipped; Cache size ${n} is lower than threshold ${this.params.cacheSizeCollectionThreshold}`),Po):this.yr(t,e)))}getCacheSize(t){return this.mr.getCacheSize(t)}yr(t,e){let n,i,o,u,c,f,d;const _=Date.now();return this.calculateTargetCount(t,this.params.percentileToCollect).next((A=>(A>this.params.maximumSequenceNumbersToCollect?(N("LruGarbageCollector",`Capping sequence numbers to collect down to the maximum of ${this.params.maximumSequenceNumbersToCollect} from ${A}`),i=this.params.maximumSequenceNumbersToCollect):i=A,u=Date.now(),this.nthSequenceNumber(t,i)))).next((A=>(n=A,c=Date.now(),this.removeTargets(t,n,e)))).next((A=>(o=A,f=Date.now(),this.removeOrphanedDocuments(t,n)))).next((A=>(d=Date.now(),ye()<=Ft.DEBUG&&N("LruGarbageCollector",`LRU Garbage Collection
	Counted targets in ${u-_}ms
	Determined least recently used ${i} in `+(c-u)+`ms
	Removed ${o} targets in `+(f-c)+`ms
	Removed ${A} documents in `+(d-f)+`ms
Total Duration: ${d-_}ms`),V.resolve({didRun:!0,sequenceNumbersCollected:i,targetsRemoved:o,documentsRemoved:A}))))}}function eh(r,t){return new th(r,t)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nh{constructor(){this.changes=new ce((t=>t.toString()),((t,e)=>t.isEqual(e))),this.changesApplied=!1}addEntry(t){this.assertNotApplied(),this.changes.set(t.key,t)}removeEntry(t,e){this.assertNotApplied(),this.changes.set(t,_t.newInvalidDocument(t).setReadTime(e))}getEntry(t,e){this.assertNotApplied();const n=this.changes.get(e);return n!==void 0?V.resolve(n):this.getFromCache(t,e)}getEntries(t,e){return this.getAllFromCache(t,e)}apply(t){return this.assertNotApplied(),this.changesApplied=!0,this.applyChanges(t)}assertNotApplied(){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class rh{constructor(t,e){this.overlayedDocument=t,this.mutatedFields=e}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class sh{constructor(t,e,n,i){this.remoteDocumentCache=t,this.mutationQueue=e,this.documentOverlayCache=n,this.indexManager=i}getDocument(t,e){let n=null;return this.documentOverlayCache.getOverlay(t,e).next((i=>(n=i,this.remoteDocumentCache.getEntry(t,e)))).next((i=>(n!==null&&on(n.mutation,i,Vt.empty(),X.now()),i)))}getDocuments(t,e){return this.remoteDocumentCache.getEntries(t,e).next((n=>this.getLocalViewOfDocuments(t,n,q()).next((()=>n))))}getLocalViewOfDocuments(t,e,n=q()){const i=oe();return this.populateOverlays(t,i,e).next((()=>this.computeViews(t,e,i,n).next((o=>{let u=tn();return o.forEach(((c,f)=>{u=u.insert(c,f.overlayedDocument)})),u}))))}getOverlayedDocuments(t,e){const n=oe();return this.populateOverlays(t,n,e).next((()=>this.computeViews(t,e,n,q())))}populateOverlays(t,e,n){const i=[];return n.forEach((o=>{e.has(o)||i.push(o)})),this.documentOverlayCache.getOverlays(t,i).next((o=>{o.forEach(((u,c)=>{e.set(u,c)}))}))}computeViews(t,e,n,i){let o=jt();const u=sn(),c=(function(){return sn()})();return e.forEach(((f,d)=>{const _=n.get(d.key);i.has(d.key)&&(_===void 0||_.mutation instanceof he)?o=o.insert(d.key,d):_!==void 0?(u.set(d.key,_.mutation.getFieldMask()),on(_.mutation,d,_.mutation.getFieldMask(),X.now())):u.set(d.key,Vt.empty())})),this.recalculateAndSaveOverlays(t,o).next((f=>(f.forEach(((d,_)=>u.set(d,_))),e.forEach(((d,_)=>c.set(d,new rh(_,u.get(d)??null)))),c)))}recalculateAndSaveOverlays(t,e){const n=sn();let i=new Y(((u,c)=>u-c)),o=q();return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(t,e).next((u=>{for(const c of u)c.keys().forEach((f=>{const d=e.get(f);if(d===null)return;let _=n.get(f)||Vt.empty();_=c.applyToLocalView(d,_),n.set(f,_);const A=(i.get(c.batchId)||q()).add(f);i=i.insert(c.batchId,A)}))})).next((()=>{const u=[],c=i.getReverseIterator();for(;c.hasNext();){const f=c.getNext(),d=f.key,_=f.value,A=Ca();_.forEach((P=>{if(!o.has(P)){const C=Ma(e.get(P),n.get(P));C!==null&&A.set(P,C),o=o.add(P)}})),u.push(this.documentOverlayCache.saveOverlays(t,d,A))}return V.waitFor(u)})).next((()=>n))}recalculateAndSaveOverlaysForDocumentKeys(t,e){return this.remoteDocumentCache.getEntries(t,e).next((n=>this.recalculateAndSaveOverlays(t,n)))}getDocumentsMatchingQuery(t,e,n,i){return(function(u){return x.isDocumentKey(u.path)&&u.collectionGroup===null&&u.filters.length===0})(e)?this.getDocumentsMatchingDocumentQuery(t,e.path):wa(e)?this.getDocumentsMatchingCollectionGroupQuery(t,e,n,i):this.getDocumentsMatchingCollectionQuery(t,e,n,i)}getNextDocuments(t,e,n,i){return this.remoteDocumentCache.getAllFromCollectionGroup(t,e,n,i).next((o=>{const u=i-o.size>0?this.documentOverlayCache.getOverlaysForCollectionGroup(t,e,n.largestBatchId,i-o.size):V.resolve(oe());let c=an,f=o;return u.next((d=>V.forEach(d,((_,A)=>(c<A.largestBatchId&&(c=A.largestBatchId),o.get(_)?V.resolve():this.remoteDocumentCache.getEntry(t,_).next((P=>{f=f.insert(_,P)}))))).next((()=>this.populateOverlays(t,d,o))).next((()=>this.computeViews(t,f,d,q()))).next((_=>({batchId:c,changes:Sa(_)})))))}))}getDocumentsMatchingDocumentQuery(t,e){return this.getDocument(t,new x(e)).next((n=>{let i=tn();return n.isFoundDocument()&&(i=i.insert(n.key,n)),i}))}getDocumentsMatchingCollectionGroupQuery(t,e,n,i){const o=e.collectionGroup;let u=tn();return this.indexManager.getCollectionParents(t,o).next((c=>V.forEach(c,(f=>{const d=(function(A,P){return new pn(P,null,A.explicitOrderBy.slice(),A.filters.slice(),A.limit,A.limitType,A.startAt,A.endAt)})(e,f.child(o));return this.getDocumentsMatchingCollectionQuery(t,d,n,i).next((_=>{_.forEach(((A,P)=>{u=u.insert(A,P)}))}))})).next((()=>u))))}getDocumentsMatchingCollectionQuery(t,e,n,i){let o;return this.documentOverlayCache.getOverlaysForCollection(t,e.path,n.largestBatchId).next((u=>(o=u,this.remoteDocumentCache.getDocumentsMatchingQuery(t,e,n,o,i)))).next((u=>{o.forEach(((f,d)=>{const _=d.getKey();u.get(_)===null&&(u=u.insert(_,_t.newInvalidDocument(_)))}));let c=tn();return u.forEach(((f,d)=>{const _=o.get(f);_!==void 0&&on(_.mutation,d,Vt.empty(),X.now()),pr(e,d)&&(c=c.insert(f,d))})),c}))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ih{constructor(t){this.serializer=t,this.Lr=new Map,this.kr=new Map}getBundleMetadata(t,e){return V.resolve(this.Lr.get(e))}saveBundleMetadata(t,e){return this.Lr.set(e.id,(function(i){return{id:i.id,version:i.version,createTime:Nt(i.createTime)}})(e)),V.resolve()}getNamedQuery(t,e){return V.resolve(this.kr.get(e))}saveNamedQuery(t,e){return this.kr.set(e.name,(function(i){return{name:i.name,query:Wc(i.bundledQuery),readTime:Nt(i.readTime)}})(e)),V.resolve()}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class oh{constructor(){this.overlays=new Y(x.comparator),this.qr=new Map}getOverlay(t,e){return V.resolve(this.overlays.get(e))}getOverlays(t,e){const n=oe();return V.forEach(e,(i=>this.getOverlay(t,i).next((o=>{o!==null&&n.set(i,o)})))).next((()=>n))}saveOverlays(t,e,n){return n.forEach(((i,o)=>{this.St(t,e,o)})),V.resolve()}removeOverlaysForBatchId(t,e,n){const i=this.qr.get(n);return i!==void 0&&(i.forEach((o=>this.overlays=this.overlays.remove(o))),this.qr.delete(n)),V.resolve()}getOverlaysForCollection(t,e,n){const i=oe(),o=e.length+1,u=new x(e.child("")),c=this.overlays.getIteratorFrom(u);for(;c.hasNext();){const f=c.getNext().value,d=f.getKey();if(!e.isPrefixOf(d.path))break;d.path.length===o&&f.largestBatchId>n&&i.set(f.getKey(),f)}return V.resolve(i)}getOverlaysForCollectionGroup(t,e,n,i){let o=new Y(((d,_)=>d-_));const u=this.overlays.getIterator();for(;u.hasNext();){const d=u.getNext().value;if(d.getKey().getCollectionGroup()===e&&d.largestBatchId>n){let _=o.get(d.largestBatchId);_===null&&(_=oe(),o=o.insert(d.largestBatchId,_)),_.set(d.getKey(),d)}}const c=oe(),f=o.getIterator();for(;f.hasNext()&&(f.getNext().value.forEach(((d,_)=>c.set(d,_))),!(c.size()>=i)););return V.resolve(c)}St(t,e,n){const i=this.overlays.get(n.key);if(i!==null){const u=this.qr.get(i.largestBatchId).delete(n.key);this.qr.set(i.largestBatchId,u)}this.overlays=this.overlays.insert(n.key,new wc(e,n));let o=this.qr.get(e);o===void 0&&(o=q(),this.qr.set(e,o)),this.qr.set(e,o.add(n.key))}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ah{constructor(){this.sessionToken=lt.EMPTY_BYTE_STRING}getSessionToken(t){return V.resolve(this.sessionToken)}setSessionToken(t,e){return this.sessionToken=e,V.resolve()}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Vs{constructor(){this.Qr=new rt(st.$r),this.Ur=new rt(st.Kr)}isEmpty(){return this.Qr.isEmpty()}addReference(t,e){const n=new st(t,e);this.Qr=this.Qr.add(n),this.Ur=this.Ur.add(n)}Wr(t,e){t.forEach((n=>this.addReference(n,e)))}removeReference(t,e){this.Gr(new st(t,e))}zr(t,e){t.forEach((n=>this.removeReference(n,e)))}jr(t){const e=new x(new W([])),n=new st(e,t),i=new st(e,t+1),o=[];return this.Ur.forEachInRange([n,i],(u=>{this.Gr(u),o.push(u.key)})),o}Jr(){this.Qr.forEach((t=>this.Gr(t)))}Gr(t){this.Qr=this.Qr.delete(t),this.Ur=this.Ur.delete(t)}Hr(t){const e=new x(new W([])),n=new st(e,t),i=new st(e,t+1);let o=q();return this.Ur.forEachInRange([n,i],(u=>{o=o.add(u.key)})),o}containsKey(t){const e=new st(t,0),n=this.Qr.firstAfterOrEqual(e);return n!==null&&t.isEqual(n.key)}}class st{constructor(t,e){this.key=t,this.Yr=e}static $r(t,e){return x.comparator(t.key,e.key)||U(t.Yr,e.Yr)}static Kr(t,e){return U(t.Yr,e.Yr)||x.comparator(t.key,e.key)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class uh{constructor(t,e){this.indexManager=t,this.referenceDelegate=e,this.mutationQueue=[],this.tr=1,this.Zr=new rt(st.$r)}checkEmpty(t){return V.resolve(this.mutationQueue.length===0)}addMutationBatch(t,e,n,i){const o=this.tr;this.tr++,this.mutationQueue.length>0&&this.mutationQueue[this.mutationQueue.length-1];const u=new Ac(o,e,n,i);this.mutationQueue.push(u);for(const c of i)this.Zr=this.Zr.add(new st(c.key,o)),this.indexManager.addToCollectionParentIndex(t,c.key.path.popLast());return V.resolve(u)}lookupMutationBatch(t,e){return V.resolve(this.Xr(e))}getNextMutationBatchAfterBatchId(t,e){const n=e+1,i=this.ei(n),o=i<0?0:i;return V.resolve(this.mutationQueue.length>o?this.mutationQueue[o]:null)}getHighestUnacknowledgedBatchId(){return V.resolve(this.mutationQueue.length===0?_s:this.tr-1)}getAllMutationBatches(t){return V.resolve(this.mutationQueue.slice())}getAllMutationBatchesAffectingDocumentKey(t,e){const n=new st(e,0),i=new st(e,Number.POSITIVE_INFINITY),o=[];return this.Zr.forEachInRange([n,i],(u=>{const c=this.Xr(u.Yr);o.push(c)})),V.resolve(o)}getAllMutationBatchesAffectingDocumentKeys(t,e){let n=new rt(U);return e.forEach((i=>{const o=new st(i,0),u=new st(i,Number.POSITIVE_INFINITY);this.Zr.forEachInRange([o,u],(c=>{n=n.add(c.Yr)}))})),V.resolve(this.ti(n))}getAllMutationBatchesAffectingQuery(t,e){const n=e.path,i=n.length+1;let o=n;x.isDocumentKey(o)||(o=o.child(""));const u=new st(new x(o),0);let c=new rt(U);return this.Zr.forEachWhile((f=>{const d=f.key.path;return!!n.isPrefixOf(d)&&(d.length===i&&(c=c.add(f.Yr)),!0)}),u),V.resolve(this.ti(c))}ti(t){const e=[];return t.forEach((n=>{const i=this.Xr(n);i!==null&&e.push(i)})),e}removeMutationBatch(t,e){$(this.ni(e.batchId,"removed")===0,55003),this.mutationQueue.shift();let n=this.Zr;return V.forEach(e.mutations,(i=>{const o=new st(i.key,e.batchId);return n=n.delete(o),this.referenceDelegate.markPotentiallyOrphaned(t,i.key)})).next((()=>{this.Zr=n}))}ir(t){}containsKey(t,e){const n=new st(e,0),i=this.Zr.firstAfterOrEqual(n);return V.resolve(e.isEqual(i&&i.key))}performConsistencyCheck(t){return this.mutationQueue.length,V.resolve()}ni(t,e){return this.ei(t)}ei(t){return this.mutationQueue.length===0?0:t-this.mutationQueue[0].batchId}Xr(t){const e=this.ei(t);return e<0||e>=this.mutationQueue.length?null:this.mutationQueue[e]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class lh{constructor(t){this.ri=t,this.docs=(function(){return new Y(x.comparator)})(),this.size=0}setIndexManager(t){this.indexManager=t}addEntry(t,e){const n=e.key,i=this.docs.get(n),o=i?i.size:0,u=this.ri(e);return this.docs=this.docs.insert(n,{document:e.mutableCopy(),size:u}),this.size+=u-o,this.indexManager.addToCollectionParentIndex(t,n.path.popLast())}removeEntry(t){const e=this.docs.get(t);e&&(this.docs=this.docs.remove(t),this.size-=e.size)}getEntry(t,e){const n=this.docs.get(e);return V.resolve(n?n.document.mutableCopy():_t.newInvalidDocument(e))}getEntries(t,e){let n=jt();return e.forEach((i=>{const o=this.docs.get(i);n=n.insert(i,o?o.document.mutableCopy():_t.newInvalidDocument(i))})),V.resolve(n)}getDocumentsMatchingQuery(t,e,n,i){let o=jt();const u=e.path,c=new x(u.child("__id-9223372036854775808__")),f=this.docs.getIteratorFrom(c);for(;f.hasNext();){const{key:d,value:{document:_}}=f.getNext();if(!u.isPrefixOf(d.path))break;d.path.length>u.length+1||Ll(Ol(_),n)<=0||(i.has(_.key)||pr(e,_))&&(o=o.insert(_.key,_.mutableCopy()))}return V.resolve(o)}getAllFromCollectionGroup(t,e,n,i){O(9500)}ii(t,e){return V.forEach(this.docs,(n=>e(n)))}newChangeBuffer(t){return new ch(this)}getSize(t){return V.resolve(this.size)}}class ch extends nh{constructor(t){super(),this.Nr=t}applyChanges(t){const e=[];return this.changes.forEach(((n,i)=>{i.isValidDocument()?e.push(this.Nr.addEntry(t,i)):this.Nr.removeEntry(n)})),V.waitFor(e)}getFromCache(t,e){return this.Nr.getEntry(t,e)}getAllFromCache(t,e){return this.Nr.getEntries(t,e)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class hh{constructor(t){this.persistence=t,this.si=new ce((e=>Ts(e)),vs),this.lastRemoteSnapshotVersion=L.min(),this.highestTargetId=0,this.oi=0,this._i=new Vs,this.targetCount=0,this.ai=De.ur()}forEachTarget(t,e){return this.si.forEach(((n,i)=>e(i))),V.resolve()}getLastRemoteSnapshotVersion(t){return V.resolve(this.lastRemoteSnapshotVersion)}getHighestSequenceNumber(t){return V.resolve(this.oi)}allocateTargetId(t){return this.highestTargetId=this.ai.next(),V.resolve(this.highestTargetId)}setTargetsMetadata(t,e,n){return n&&(this.lastRemoteSnapshotVersion=n),e>this.oi&&(this.oi=e),V.resolve()}Pr(t){this.si.set(t.target,t);const e=t.targetId;e>this.highestTargetId&&(this.ai=new De(e),this.highestTargetId=e),t.sequenceNumber>this.oi&&(this.oi=t.sequenceNumber)}addTargetData(t,e){return this.Pr(e),this.targetCount+=1,V.resolve()}updateTargetData(t,e){return this.Pr(e),V.resolve()}removeTargetData(t,e){return this.si.delete(e.target),this._i.jr(e.targetId),this.targetCount-=1,V.resolve()}removeTargets(t,e,n){let i=0;const o=[];return this.si.forEach(((u,c)=>{c.sequenceNumber<=e&&n.get(c.targetId)===null&&(this.si.delete(u),o.push(this.removeMatchingKeysForTargetId(t,c.targetId)),i++)})),V.waitFor(o).next((()=>i))}getTargetCount(t){return V.resolve(this.targetCount)}getTargetData(t,e){const n=this.si.get(e)||null;return V.resolve(n)}addMatchingKeys(t,e,n){return this._i.Wr(e,n),V.resolve()}removeMatchingKeys(t,e,n){this._i.zr(e,n);const i=this.persistence.referenceDelegate,o=[];return i&&e.forEach((u=>{o.push(i.markPotentiallyOrphaned(t,u))})),V.waitFor(o)}removeMatchingKeysForTargetId(t,e){return this._i.jr(e),V.resolve()}getMatchingKeysForTargetId(t,e){const n=this._i.Hr(e);return V.resolve(n)}containsKey(t,e){return V.resolve(this._i.containsKey(e))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ha{constructor(t,e){this.ui={},this.overlays={},this.ci=new hr(0),this.li=!1,this.li=!0,this.hi=new ah,this.referenceDelegate=t(this),this.Pi=new hh(this),this.indexManager=new Hc,this.remoteDocumentCache=(function(i){return new lh(i)})((n=>this.referenceDelegate.Ti(n))),this.serializer=new Qc(e),this.Ii=new ih(this.serializer)}start(){return Promise.resolve()}shutdown(){return this.li=!1,Promise.resolve()}get started(){return this.li}setDatabaseDeletedListener(){}setNetworkEnabled(){}getIndexManager(t){return this.indexManager}getDocumentOverlayCache(t){let e=this.overlays[t.toKey()];return e||(e=new oh,this.overlays[t.toKey()]=e),e}getMutationQueue(t,e){let n=this.ui[t.toKey()];return n||(n=new uh(e,this.referenceDelegate),this.ui[t.toKey()]=n),n}getGlobalsCache(){return this.hi}getTargetCache(){return this.Pi}getRemoteDocumentCache(){return this.remoteDocumentCache}getBundleCache(){return this.Ii}runTransaction(t,e,n){N("MemoryPersistence","Starting transaction:",t);const i=new fh(this.ci.next());return this.referenceDelegate.Ei(),n(i).next((o=>this.referenceDelegate.di(i).next((()=>o)))).toPromise().then((o=>(i.raiseOnCommittedEvent(),o)))}Ai(t,e){return V.or(Object.values(this.ui).map((n=>()=>n.containsKey(t,e))))}}class fh extends Ul{constructor(t){super(),this.currentSequenceNumber=t}}class Ps{constructor(t){this.persistence=t,this.Ri=new Vs,this.Vi=null}static mi(t){return new Ps(t)}get fi(){if(this.Vi)return this.Vi;throw O(60996)}addReference(t,e,n){return this.Ri.addReference(n,e),this.fi.delete(n.toString()),V.resolve()}removeReference(t,e,n){return this.Ri.removeReference(n,e),this.fi.add(n.toString()),V.resolve()}markPotentiallyOrphaned(t,e){return this.fi.add(e.toString()),V.resolve()}removeTarget(t,e){this.Ri.jr(e.targetId).forEach((i=>this.fi.add(i.toString())));const n=this.persistence.getTargetCache();return n.getMatchingKeysForTargetId(t,e.targetId).next((i=>{i.forEach((o=>this.fi.add(o.toString())))})).next((()=>n.removeTargetData(t,e)))}Ei(){this.Vi=new Set}di(t){const e=this.persistence.getRemoteDocumentCache().newChangeBuffer();return V.forEach(this.fi,(n=>{const i=x.fromPath(n);return this.gi(t,i).next((o=>{o||e.removeEntry(i,L.min())}))})).next((()=>(this.Vi=null,e.apply(t))))}updateLimboDocument(t,e){return this.gi(t,e).next((n=>{n?this.fi.delete(e.toString()):this.fi.add(e.toString())}))}Ti(t){return 0}gi(t,e){return V.or([()=>V.resolve(this.Ri.containsKey(e)),()=>this.persistence.getTargetCache().containsKey(t,e),()=>this.persistence.Ai(t,e)])}}class or{constructor(t,e){this.persistence=t,this.pi=new ce((n=>Bl(n.path)),((n,i)=>n.isEqual(i))),this.garbageCollector=eh(this,e)}static mi(t,e){return new or(t,e)}Ei(){}di(t){return V.resolve()}forEachTarget(t,e){return this.persistence.getTargetCache().forEachTarget(t,e)}gr(t){const e=this.wr(t);return this.persistence.getTargetCache().getTargetCount(t).next((n=>e.next((i=>n+i))))}wr(t){let e=0;return this.pr(t,(n=>{e++})).next((()=>e))}pr(t,e){return V.forEach(this.pi,((n,i)=>this.br(t,n,i).next((o=>o?V.resolve():e(i)))))}removeTargets(t,e,n){return this.persistence.getTargetCache().removeTargets(t,e,n)}removeOrphanedDocuments(t,e){let n=0;const i=this.persistence.getRemoteDocumentCache(),o=i.newChangeBuffer();return i.ii(t,(u=>this.br(t,u,e).next((c=>{c||(n++,o.removeEntry(u,L.min()))})))).next((()=>o.apply(t))).next((()=>n))}markPotentiallyOrphaned(t,e){return this.pi.set(e,t.currentSequenceNumber),V.resolve()}removeTarget(t,e){const n=e.withSequenceNumber(t.currentSequenceNumber);return this.persistence.getTargetCache().updateTargetData(t,n)}addReference(t,e,n){return this.pi.set(n,t.currentSequenceNumber),V.resolve()}removeReference(t,e,n){return this.pi.set(n,t.currentSequenceNumber),V.resolve()}updateLimboDocument(t,e){return this.pi.set(e,t.currentSequenceNumber),V.resolve()}Ti(t){let e=t.key.toString().length;return t.isFoundDocument()&&(e+=Kn(t.data.value)),e}br(t,e,n){return V.or([()=>this.persistence.Ai(t,e),()=>this.persistence.getTargetCache().containsKey(t,e),()=>{const i=this.pi.get(e);return V.resolve(i!==void 0&&i>n)}])}getCacheSize(t){return this.persistence.getRemoteDocumentCache().getSize(t)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ss{constructor(t,e,n,i){this.targetId=t,this.fromCache=e,this.Es=n,this.ds=i}static As(t,e){let n=q(),i=q();for(const o of e.docChanges)switch(o.type){case 0:n=n.add(o.doc.key);break;case 1:i=i.add(o.doc.key)}return new Ss(t,e.fromCache,n,i)}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class dh{constructor(){this._documentReadCount=0}get documentReadCount(){return this._documentReadCount}incrementDocumentReadCount(t){this._documentReadCount+=t}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class mh{constructor(){this.Rs=!1,this.Vs=!1,this.fs=100,this.gs=(function(){return _l()?8:ql(yl())>0?6:4})()}initialize(t,e){this.ps=t,this.indexManager=e,this.Rs=!0}getDocumentsMatchingQuery(t,e,n,i){const o={result:null};return this.ys(t,e).next((u=>{o.result=u})).next((()=>{if(!o.result)return this.ws(t,e,i,n).next((u=>{o.result=u}))})).next((()=>{if(o.result)return;const u=new dh;return this.Ss(t,e,u).next((c=>{if(o.result=c,this.Vs)return this.bs(t,e,u,c.size)}))})).next((()=>o.result))}bs(t,e,n,i){return n.documentReadCount<this.fs?(ye()<=Ft.DEBUG&&N("QueryEngine","SDK will not create cache indexes for query:",Ee(e),"since it only creates cache indexes for collection contains","more than or equal to",this.fs,"documents"),V.resolve()):(ye()<=Ft.DEBUG&&N("QueryEngine","Query:",Ee(e),"scans",n.documentReadCount,"local documents and returns",i,"documents as results."),n.documentReadCount>this.gs*i?(ye()<=Ft.DEBUG&&N("QueryEngine","The SDK decides to create cache indexes for query:",Ee(e),"as using cache indexes may help improve performance."),this.indexManager.createTargetIndexes(t,Dt(e))):V.resolve())}ys(t,e){if(_o(e))return V.resolve(null);let n=Dt(e);return this.indexManager.getIndexType(t,n).next((i=>i===0?null:(e.limit!==null&&i===1&&(e=rr(e,null,"F"),n=Dt(e)),this.indexManager.getDocumentsMatchingTarget(t,n).next((o=>{const u=q(...o);return this.ps.getDocuments(t,u).next((c=>this.indexManager.getMinOffset(t,n).next((f=>{const d=this.Ds(e,c);return this.Cs(e,d,u,f.readTime)?this.ys(t,rr(e,null,"F")):this.vs(t,d,e,f)}))))})))))}ws(t,e,n,i){return _o(e)||i.isEqual(L.min())?V.resolve(null):this.ps.getDocuments(t,n).next((o=>{const u=this.Ds(e,o);return this.Cs(e,u,n,i)?V.resolve(null):(ye()<=Ft.DEBUG&&N("QueryEngine","Re-using previous result from %s to execute query: %s",i.toString(),Ee(e)),this.vs(t,u,e,Ml(i,an)).next((c=>c)))}))}Ds(t,e){let n=new rt(Va(t));return e.forEach(((i,o)=>{pr(t,o)&&(n=n.add(o))})),n}Cs(t,e,n,i){if(t.limit===null)return!1;if(n.size!==e.size)return!0;const o=t.limitType==="F"?e.last():e.first();return!!o&&(o.hasPendingWrites||o.version.compareTo(i)>0)}Ss(t,e,n){return ye()<=Ft.DEBUG&&N("QueryEngine","Using full collection scan to execute query:",Ee(e)),this.ps.getDocumentsMatchingQuery(t,e,Xt.min(),n)}vs(t,e,n,i){return this.ps.getDocumentsMatchingQuery(t,n,i).next((o=>(e.forEach((u=>{o=o.insert(u.key,u)})),o)))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Cs="LocalStore",ph=3e8;class gh{constructor(t,e,n,i){this.persistence=t,this.Fs=e,this.serializer=i,this.Ms=new Y(U),this.xs=new ce((o=>Ts(o)),vs),this.Os=new Map,this.Ns=t.getRemoteDocumentCache(),this.Pi=t.getTargetCache(),this.Ii=t.getBundleCache(),this.Bs(n)}Bs(t){this.documentOverlayCache=this.persistence.getDocumentOverlayCache(t),this.indexManager=this.persistence.getIndexManager(t),this.mutationQueue=this.persistence.getMutationQueue(t,this.indexManager),this.localDocuments=new sh(this.Ns,this.mutationQueue,this.documentOverlayCache,this.indexManager),this.Ns.setIndexManager(this.indexManager),this.Fs.initialize(this.localDocuments,this.indexManager)}collectGarbage(t){return this.persistence.runTransaction("Collect garbage","readwrite-primary",(e=>t.collect(e,this.Ms)))}}function _h(r,t,e,n){return new gh(r,t,e,n)}async function Xa(r,t){const e=F(r);return await e.persistence.runTransaction("Handle user change","readonly",(n=>{let i;return e.mutationQueue.getAllMutationBatches(n).next((o=>(i=o,e.Bs(t),e.mutationQueue.getAllMutationBatches(n)))).next((o=>{const u=[],c=[];let f=q();for(const d of i){u.push(d.batchId);for(const _ of d.mutations)f=f.add(_.key)}for(const d of o){c.push(d.batchId);for(const _ of d.mutations)f=f.add(_.key)}return e.localDocuments.getDocuments(n,f).next((d=>({Ls:d,removedBatchIds:u,addedBatchIds:c})))}))}))}function yh(r,t){const e=F(r);return e.persistence.runTransaction("Acknowledge batch","readwrite-primary",(n=>{const i=t.batch.keys(),o=e.Ns.newChangeBuffer({trackRemovals:!0});return(function(c,f,d,_){const A=d.batch,P=A.keys();let C=V.resolve();return P.forEach((k=>{C=C.next((()=>_.getEntry(f,k))).next((M=>{const b=d.docVersions.get(k);$(b!==null,48541),M.version.compareTo(b)<0&&(A.applyToRemoteDocument(M,d),M.isValidDocument()&&(M.setReadTime(d.commitVersion),_.addEntry(M)))}))})),C.next((()=>c.mutationQueue.removeMutationBatch(f,A)))})(e,n,t,o).next((()=>o.apply(n))).next((()=>e.mutationQueue.performConsistencyCheck(n))).next((()=>e.documentOverlayCache.removeOverlaysForBatchId(n,i,t.batch.batchId))).next((()=>e.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(n,(function(c){let f=q();for(let d=0;d<c.mutationResults.length;++d)c.mutationResults[d].transformResults.length>0&&(f=f.add(c.batch.mutations[d].key));return f})(t)))).next((()=>e.localDocuments.getDocuments(n,i)))}))}function Ya(r){const t=F(r);return t.persistence.runTransaction("Get last remote snapshot version","readonly",(e=>t.Pi.getLastRemoteSnapshotVersion(e)))}function Eh(r,t){const e=F(r),n=t.snapshotVersion;let i=e.Ms;return e.persistence.runTransaction("Apply remote event","readwrite-primary",(o=>{const u=e.Ns.newChangeBuffer({trackRemovals:!0});i=e.Ms;const c=[];t.targetChanges.forEach(((_,A)=>{const P=i.get(A);if(!P)return;c.push(e.Pi.removeMatchingKeys(o,_.removedDocuments,A).next((()=>e.Pi.addMatchingKeys(o,_.addedDocuments,A))));let C=P.withSequenceNumber(o.currentSequenceNumber);t.targetMismatches.get(A)!==null?C=C.withResumeToken(lt.EMPTY_BYTE_STRING,L.min()).withLastLimboFreeSnapshotVersion(L.min()):_.resumeToken.approximateByteSize()>0&&(C=C.withResumeToken(_.resumeToken,n)),i=i.insert(A,C),(function(M,b,K){return M.resumeToken.approximateByteSize()===0||b.snapshotVersion.toMicroseconds()-M.snapshotVersion.toMicroseconds()>=ph?!0:K.addedDocuments.size+K.modifiedDocuments.size+K.removedDocuments.size>0})(P,C,_)&&c.push(e.Pi.updateTargetData(o,C))}));let f=jt(),d=q();if(t.documentUpdates.forEach((_=>{t.resolvedLimboDocuments.has(_)&&c.push(e.persistence.referenceDelegate.updateLimboDocument(o,_))})),c.push(Th(o,u,t.documentUpdates).next((_=>{f=_.ks,d=_.qs}))),!n.isEqual(L.min())){const _=e.Pi.getLastRemoteSnapshotVersion(o).next((A=>e.Pi.setTargetsMetadata(o,o.currentSequenceNumber,n)));c.push(_)}return V.waitFor(c).next((()=>u.apply(o))).next((()=>e.localDocuments.getLocalViewOfDocuments(o,f,d))).next((()=>f))})).then((o=>(e.Ms=i,o)))}function Th(r,t,e){let n=q(),i=q();return e.forEach((o=>n=n.add(o))),t.getEntries(r,n).next((o=>{let u=jt();return e.forEach(((c,f)=>{const d=o.get(c);f.isFoundDocument()!==d.isFoundDocument()&&(i=i.add(c)),f.isNoDocument()&&f.version.isEqual(L.min())?(t.removeEntry(c,f.readTime),u=u.insert(c,f)):!d.isValidDocument()||f.version.compareTo(d.version)>0||f.version.compareTo(d.version)===0&&d.hasPendingWrites?(t.addEntry(f),u=u.insert(c,f)):N(Cs,"Ignoring outdated watch update for ",c,". Current version:",d.version," Watch version:",f.version)})),{ks:u,qs:i}}))}function vh(r,t){const e=F(r);return e.persistence.runTransaction("Get next mutation batch","readonly",(n=>(t===void 0&&(t=_s),e.mutationQueue.getNextMutationBatchAfterBatchId(n,t))))}function Ih(r,t){const e=F(r);return e.persistence.runTransaction("Allocate target","readwrite",(n=>{let i;return e.Pi.getTargetData(n,t).next((o=>o?(i=o,V.resolve(i)):e.Pi.allocateTargetId(n).next((u=>(i=new Kt(t,u,"TargetPurposeListen",n.currentSequenceNumber),e.Pi.addTargetData(n,i).next((()=>i)))))))})).then((n=>{const i=e.Ms.get(n.targetId);return(i===null||n.snapshotVersion.compareTo(i.snapshotVersion)>0)&&(e.Ms=e.Ms.insert(n.targetId,n),e.xs.set(t,n.targetId)),n}))}async function cs(r,t,e){const n=F(r),i=n.Ms.get(t),o=e?"readwrite":"readwrite-primary";try{e||await n.persistence.runTransaction("Release target",o,(u=>n.persistence.referenceDelegate.removeTarget(u,i)))}catch(u){if(!xe(u))throw u;N(Cs,`Failed to update sequence numbers for target ${t}: ${u}`)}n.Ms=n.Ms.remove(t),n.xs.delete(i.target)}function Do(r,t,e){const n=F(r);let i=L.min(),o=q();return n.persistence.runTransaction("Execute query","readwrite",(u=>(function(f,d,_){const A=F(f),P=A.xs.get(_);return P!==void 0?V.resolve(A.Ms.get(P)):A.Pi.getTargetData(d,_)})(n,u,Dt(t)).next((c=>{if(c)return i=c.lastLimboFreeSnapshotVersion,n.Pi.getMatchingKeysForTargetId(u,c.targetId).next((f=>{o=f}))})).next((()=>n.Fs.getDocumentsMatchingQuery(u,t,e?i:L.min(),e?o:q()))).next((c=>(Ah(n,ac(t),c),{documents:c,Qs:o})))))}function Ah(r,t,e){let n=r.Os.get(t)||L.min();e.forEach(((i,o)=>{o.readTime.compareTo(n)>0&&(n=o.readTime)})),r.Os.set(t,n)}class No{constructor(){this.activeTargetIds=dc()}zs(t){this.activeTargetIds=this.activeTargetIds.add(t)}js(t){this.activeTargetIds=this.activeTargetIds.delete(t)}Gs(){const t={activeTargetIds:this.activeTargetIds.toArray(),updateTimeMs:Date.now()};return JSON.stringify(t)}}class wh{constructor(){this.Mo=new No,this.xo={},this.onlineStateHandler=null,this.sequenceNumberHandler=null}addPendingMutation(t){}updateMutationState(t,e,n){}addLocalQueryTarget(t,e=!0){return e&&this.Mo.zs(t),this.xo[t]||"not-current"}updateQueryState(t,e,n){this.xo[t]=e}removeLocalQueryTarget(t){this.Mo.js(t)}isLocalQueryTarget(t){return this.Mo.activeTargetIds.has(t)}clearQueryState(t){delete this.xo[t]}getAllActiveQueryTargets(){return this.Mo.activeTargetIds}isActiveQueryTarget(t){return this.Mo.activeTargetIds.has(t)}start(){return this.Mo=new No,Promise.resolve()}handleUserChange(t,e,n){}setOnlineState(t){}shutdown(){}writeSequenceNumber(t){}notifyBundleLoaded(t){}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Rh{Oo(t){}shutdown(){}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const bo="ConnectivityMonitor";class ko{constructor(){this.No=()=>this.Bo(),this.Lo=()=>this.ko(),this.qo=[],this.Qo()}Oo(t){this.qo.push(t)}shutdown(){window.removeEventListener("online",this.No),window.removeEventListener("offline",this.Lo)}Qo(){window.addEventListener("online",this.No),window.addEventListener("offline",this.Lo)}Bo(){N(bo,"Network connectivity changed: AVAILABLE");for(const t of this.qo)t(0)}ko(){N(bo,"Network connectivity changed: UNAVAILABLE");for(const t of this.qo)t(1)}static v(){return typeof window<"u"&&window.addEventListener!==void 0&&window.removeEventListener!==void 0}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let zn=null;function hs(){return zn===null?zn=(function(){return 268435456+Math.round(2147483648*Math.random())})():zn++,"0x"+zn.toString(16)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Xr="RestConnection",Vh={BatchGetDocuments:"batchGet",Commit:"commit",RunQuery:"runQuery",RunAggregationQuery:"runAggregationQuery"};class Ph{get $o(){return!1}constructor(t){this.databaseInfo=t,this.databaseId=t.databaseId;const e=t.ssl?"https":"http",n=encodeURIComponent(this.databaseId.projectId),i=encodeURIComponent(this.databaseId.database);this.Uo=e+"://"+t.host,this.Ko=`projects/${n}/databases/${i}`,this.Wo=this.databaseId.database===Zn?`project_id=${n}`:`project_id=${n}&database_id=${i}`}Go(t,e,n,i,o){const u=hs(),c=this.zo(t,e.toUriEncodedString());N(Xr,`Sending RPC '${t}' ${u}:`,c,n);const f={"google-cloud-resource-prefix":this.Ko,"x-goog-request-params":this.Wo};this.jo(f,i,o);const{host:d}=new URL(c),_=Xo(d);return this.Jo(t,c,f,n,_).then((A=>(N(Xr,`Received RPC '${t}' ${u}: `,A),A)),(A=>{throw Ve(Xr,`RPC '${t}' ${u} failed with error: `,A,"url: ",c,"request:",n),A}))}Ho(t,e,n,i,o,u){return this.Go(t,e,n,i,o)}jo(t,e,n){t["X-Goog-Api-Client"]=(function(){return"gl-js/ fire/"+be})(),t["Content-Type"]="text/plain",this.databaseInfo.appId&&(t["X-Firebase-GMPID"]=this.databaseInfo.appId),e&&e.headers.forEach(((i,o)=>t[o]=i)),n&&n.headers.forEach(((i,o)=>t[o]=i))}zo(t,e){const n=Vh[t];return`${this.Uo}/v1/${e}:${n}`}terminate(){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Sh{constructor(t){this.Yo=t.Yo,this.Zo=t.Zo}Xo(t){this.e_=t}t_(t){this.n_=t}r_(t){this.i_=t}onMessage(t){this.s_=t}close(){this.Zo()}send(t){this.Yo(t)}o_(){this.e_()}__(){this.n_()}a_(t){this.i_(t)}u_(t){this.s_(t)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const pt="WebChannelConnection";class Ch extends Ph{constructor(t){super(t),this.c_=[],this.forceLongPolling=t.forceLongPolling,this.autoDetectLongPolling=t.autoDetectLongPolling,this.useFetchStreams=t.useFetchStreams,this.longPollingOptions=t.longPollingOptions}Jo(t,e,n,i,o){const u=hs();return new Promise(((c,f)=>{const d=new Jo;d.setWithCredentials(!0),d.listenOnce(Zo.COMPLETE,(()=>{try{switch(d.getLastErrorCode()){case $n.NO_ERROR:const A=d.getResponseJson();N(pt,`XHR for RPC '${t}' ${u} received:`,JSON.stringify(A)),c(A);break;case $n.TIMEOUT:N(pt,`RPC '${t}' ${u} timed out`),f(new D(R.DEADLINE_EXCEEDED,"Request time out"));break;case $n.HTTP_ERROR:const P=d.getStatus();if(N(pt,`RPC '${t}' ${u} failed with status:`,P,"response text:",d.getResponseText()),P>0){let C=d.getResponseJson();Array.isArray(C)&&(C=C[0]);const k=C?.error;if(k&&k.status&&k.message){const M=(function(K){const z=K.toLowerCase().replace(/_/g,"-");return Object.values(R).indexOf(z)>=0?z:R.UNKNOWN})(k.status);f(new D(M,k.message))}else f(new D(R.UNKNOWN,"Server responded with status "+d.getStatus()))}else f(new D(R.UNAVAILABLE,"Connection failed."));break;default:O(9055,{l_:t,streamId:u,h_:d.getLastErrorCode(),P_:d.getLastError()})}}finally{N(pt,`RPC '${t}' ${u} completed.`)}}));const _=JSON.stringify(i);N(pt,`RPC '${t}' ${u} sending request:`,i),d.send(e,"POST",_,n,15)}))}T_(t,e,n){const i=hs(),o=[this.Uo,"/","google.firestore.v1.Firestore","/",t,"/channel"],u=na(),c=ea(),f={httpSessionIdParam:"gsessionid",initMessageHeaders:{},messageUrlParams:{database:`projects/${this.databaseId.projectId}/databases/${this.databaseId.database}`},sendRawJson:!0,supportsCrossDomainXhr:!0,internalChannelParams:{forwardChannelRequestTimeoutMs:6e5},forceLongPolling:this.forceLongPolling,detectBufferingProxy:this.autoDetectLongPolling},d=this.longPollingOptions.timeoutSeconds;d!==void 0&&(f.longPollingTimeout=Math.round(1e3*d)),this.useFetchStreams&&(f.useFetchStreams=!0),this.jo(f.initMessageHeaders,e,n),f.encodeInitMessageHeaders=!0;const _=o.join("");N(pt,`Creating RPC '${t}' stream ${i}: ${_}`,f);const A=u.createWebChannel(_,f);this.I_(A);let P=!1,C=!1;const k=new Sh({Yo:b=>{C?N(pt,`Not sending because RPC '${t}' stream ${i} is closed:`,b):(P||(N(pt,`Opening RPC '${t}' stream ${i} transport.`),A.open(),P=!0),N(pt,`RPC '${t}' stream ${i} sending:`,b),A.send(b))},Zo:()=>A.close()}),M=(b,K,z)=>{b.listen(K,(G=>{try{z(G)}catch(yt){setTimeout((()=>{throw yt}),0)}}))};return M(A,Ze.EventType.OPEN,(()=>{C||(N(pt,`RPC '${t}' stream ${i} transport opened.`),k.o_())})),M(A,Ze.EventType.CLOSE,(()=>{C||(C=!0,N(pt,`RPC '${t}' stream ${i} transport closed`),k.a_(),this.E_(A))})),M(A,Ze.EventType.ERROR,(b=>{C||(C=!0,Ve(pt,`RPC '${t}' stream ${i} transport errored. Name:`,b.name,"Message:",b.message),k.a_(new D(R.UNAVAILABLE,"The operation could not be completed")))})),M(A,Ze.EventType.MESSAGE,(b=>{if(!C){const K=b.data[0];$(!!K,16349);const z=K,G=z?.error||z[0]?.error;if(G){N(pt,`RPC '${t}' stream ${i} received error:`,G);const yt=G.status;let St=(function(m){const g=tt[m];if(g!==void 0)return Fa(g)})(yt),ct=G.message;St===void 0&&(St=R.INTERNAL,ct="Unknown error status: "+yt+" with message "+G.message),C=!0,k.a_(new D(St,ct)),A.close()}else N(pt,`RPC '${t}' stream ${i} received:`,K),k.u_(K)}})),M(c,ta.STAT_EVENT,(b=>{b.stat===Zr.PROXY?N(pt,`RPC '${t}' stream ${i} detected buffering proxy`):b.stat===Zr.NOPROXY&&N(pt,`RPC '${t}' stream ${i} detected no buffering proxy`)})),setTimeout((()=>{k.__()}),0),k}terminate(){this.c_.forEach((t=>t.close())),this.c_=[]}I_(t){this.c_.push(t)}E_(t){this.c_=this.c_.filter((e=>e===t))}}function Yr(){return typeof document<"u"?document:null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Er(r){return new kc(r,!0)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ja{constructor(t,e,n=1e3,i=1.5,o=6e4){this.Mi=t,this.timerId=e,this.d_=n,this.A_=i,this.R_=o,this.V_=0,this.m_=null,this.f_=Date.now(),this.reset()}reset(){this.V_=0}g_(){this.V_=this.R_}p_(t){this.cancel();const e=Math.floor(this.V_+this.y_()),n=Math.max(0,Date.now()-this.f_),i=Math.max(0,e-n);i>0&&N("ExponentialBackoff",`Backing off for ${i} ms (base delay: ${this.V_} ms, delay with jitter: ${e} ms, last attempt: ${n} ms ago)`),this.m_=this.Mi.enqueueAfterDelay(this.timerId,i,(()=>(this.f_=Date.now(),t()))),this.V_*=this.A_,this.V_<this.d_&&(this.V_=this.d_),this.V_>this.R_&&(this.V_=this.R_)}w_(){this.m_!==null&&(this.m_.skipDelay(),this.m_=null)}cancel(){this.m_!==null&&(this.m_.cancel(),this.m_=null)}y_(){return(Math.random()-.5)*this.V_}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const xo="PersistentStream";class Za{constructor(t,e,n,i,o,u,c,f){this.Mi=t,this.S_=n,this.b_=i,this.connection=o,this.authCredentialsProvider=u,this.appCheckCredentialsProvider=c,this.listener=f,this.state=0,this.D_=0,this.C_=null,this.v_=null,this.stream=null,this.F_=0,this.M_=new Ja(t,e)}x_(){return this.state===1||this.state===5||this.O_()}O_(){return this.state===2||this.state===3}start(){this.F_=0,this.state!==4?this.auth():this.N_()}async stop(){this.x_()&&await this.close(0)}B_(){this.state=0,this.M_.reset()}L_(){this.O_()&&this.C_===null&&(this.C_=this.Mi.enqueueAfterDelay(this.S_,6e4,(()=>this.k_())))}q_(t){this.Q_(),this.stream.send(t)}async k_(){if(this.O_())return this.close(0)}Q_(){this.C_&&(this.C_.cancel(),this.C_=null)}U_(){this.v_&&(this.v_.cancel(),this.v_=null)}async close(t,e){this.Q_(),this.U_(),this.M_.cancel(),this.D_++,t!==4?this.M_.reset():e&&e.code===R.RESOURCE_EXHAUSTED?(qt(e.toString()),qt("Using maximum backoff delay to prevent overloading the backend."),this.M_.g_()):e&&e.code===R.UNAUTHENTICATED&&this.state!==3&&(this.authCredentialsProvider.invalidateToken(),this.appCheckCredentialsProvider.invalidateToken()),this.stream!==null&&(this.K_(),this.stream.close(),this.stream=null),this.state=t,await this.listener.r_(e)}K_(){}auth(){this.state=1;const t=this.W_(this.D_),e=this.D_;Promise.all([this.authCredentialsProvider.getToken(),this.appCheckCredentialsProvider.getToken()]).then((([n,i])=>{this.D_===e&&this.G_(n,i)}),(n=>{t((()=>{const i=new D(R.UNKNOWN,"Fetching auth token failed: "+n.message);return this.z_(i)}))}))}G_(t,e){const n=this.W_(this.D_);this.stream=this.j_(t,e),this.stream.Xo((()=>{n((()=>this.listener.Xo()))})),this.stream.t_((()=>{n((()=>(this.state=2,this.v_=this.Mi.enqueueAfterDelay(this.b_,1e4,(()=>(this.O_()&&(this.state=3),Promise.resolve()))),this.listener.t_())))})),this.stream.r_((i=>{n((()=>this.z_(i)))})),this.stream.onMessage((i=>{n((()=>++this.F_==1?this.J_(i):this.onNext(i)))}))}N_(){this.state=5,this.M_.p_((async()=>{this.state=0,this.start()}))}z_(t){return N(xo,`close with error: ${t}`),this.stream=null,this.close(4,t)}W_(t){return e=>{this.Mi.enqueueAndForget((()=>this.D_===t?e():(N(xo,"stream callback skipped by getCloseGuardedDispatcher."),Promise.resolve())))}}}class Dh extends Za{constructor(t,e,n,i,o,u){super(t,"listen_stream_connection_backoff","listen_stream_idle","health_check_timeout",e,n,i,u),this.serializer=o}j_(t,e){return this.connection.T_("Listen",t,e)}J_(t){return this.onNext(t)}onNext(t){this.M_.reset();const e=Oc(this.serializer,t),n=(function(o){if(!("targetChange"in o))return L.min();const u=o.targetChange;return u.targetIds&&u.targetIds.length?L.min():u.readTime?Nt(u.readTime):L.min()})(t);return this.listener.H_(e,n)}Y_(t){const e={};e.database=ls(this.serializer),e.addTarget=(function(o,u){let c;const f=u.target;if(c=ss(f)?{documents:Uc(o,f)}:{query:qc(o,f).ft},c.targetId=u.targetId,u.resumeToken.approximateByteSize()>0){c.resumeToken=ja(o,u.resumeToken);const d=os(o,u.expectedCount);d!==null&&(c.expectedCount=d)}else if(u.snapshotVersion.compareTo(L.min())>0){c.readTime=ir(o,u.snapshotVersion.toTimestamp());const d=os(o,u.expectedCount);d!==null&&(c.expectedCount=d)}return c})(this.serializer,t);const n=Bc(this.serializer,t);n&&(e.labels=n),this.q_(e)}Z_(t){const e={};e.database=ls(this.serializer),e.removeTarget=t,this.q_(e)}}class Nh extends Za{constructor(t,e,n,i,o,u){super(t,"write_stream_connection_backoff","write_stream_idle","health_check_timeout",e,n,i,u),this.serializer=o}get X_(){return this.F_>0}start(){this.lastStreamToken=void 0,super.start()}K_(){this.X_&&this.ea([])}j_(t,e){return this.connection.T_("Write",t,e)}J_(t){return $(!!t.streamToken,31322),this.lastStreamToken=t.streamToken,$(!t.writeResults||t.writeResults.length===0,55816),this.listener.ta()}onNext(t){$(!!t.streamToken,12678),this.lastStreamToken=t.streamToken,this.M_.reset();const e=Fc(t.writeResults,t.commitTime),n=Nt(t.commitTime);return this.listener.na(n,e)}ra(){const t={};t.database=ls(this.serializer),this.q_(t)}ea(t){const e={streamToken:this.lastStreamToken,writes:t.map((n=>Lc(this.serializer,n)))};this.q_(e)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class bh{}class kh extends bh{constructor(t,e,n,i){super(),this.authCredentials=t,this.appCheckCredentials=e,this.connection=n,this.serializer=i,this.ia=!1}sa(){if(this.ia)throw new D(R.FAILED_PRECONDITION,"The client has already been terminated.")}Go(t,e,n,i){return this.sa(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then((([o,u])=>this.connection.Go(t,as(e,n),i,o,u))).catch((o=>{throw o.name==="FirebaseError"?(o.code===R.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),o):new D(R.UNKNOWN,o.toString())}))}Ho(t,e,n,i,o){return this.sa(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then((([u,c])=>this.connection.Ho(t,as(e,n),i,u,c,o))).catch((u=>{throw u.name==="FirebaseError"?(u.code===R.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),u):new D(R.UNKNOWN,u.toString())}))}terminate(){this.ia=!0,this.connection.terminate()}}class xh{constructor(t,e){this.asyncQueue=t,this.onlineStateHandler=e,this.state="Unknown",this.oa=0,this._a=null,this.aa=!0}ua(){this.oa===0&&(this.ca("Unknown"),this._a=this.asyncQueue.enqueueAfterDelay("online_state_timeout",1e4,(()=>(this._a=null,this.la("Backend didn't respond within 10 seconds."),this.ca("Offline"),Promise.resolve()))))}ha(t){this.state==="Online"?this.ca("Unknown"):(this.oa++,this.oa>=1&&(this.Pa(),this.la(`Connection failed 1 times. Most recent error: ${t.toString()}`),this.ca("Offline")))}set(t){this.Pa(),this.oa=0,t==="Online"&&(this.aa=!1),this.ca(t)}ca(t){t!==this.state&&(this.state=t,this.onlineStateHandler(t))}la(t){const e=`Could not reach Cloud Firestore backend. ${t}
This typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.`;this.aa?(qt(e),this.aa=!1):N("OnlineStateTracker",e)}Pa(){this._a!==null&&(this._a.cancel(),this._a=null)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ue="RemoteStore";class Mh{constructor(t,e,n,i,o){this.localStore=t,this.datastore=e,this.asyncQueue=n,this.remoteSyncer={},this.Ta=[],this.Ia=new Map,this.Ea=new Set,this.da=[],this.Aa=o,this.Aa.Oo((u=>{n.enqueueAndForget((async()=>{fe(this)&&(N(ue,"Restarting streams for network reachability change."),await(async function(f){const d=F(f);d.Ea.add(4),await yn(d),d.Ra.set("Unknown"),d.Ea.delete(4),await Tr(d)})(this))}))})),this.Ra=new xh(n,i)}}async function Tr(r){if(fe(r))for(const t of r.da)await t(!0)}async function yn(r){for(const t of r.da)await t(!1)}function tu(r,t){const e=F(r);e.Ia.has(t.targetId)||(e.Ia.set(t.targetId,t),ks(e)?bs(e):Me(e).O_()&&Ns(e,t))}function Ds(r,t){const e=F(r),n=Me(e);e.Ia.delete(t),n.O_()&&eu(e,t),e.Ia.size===0&&(n.O_()?n.L_():fe(e)&&e.Ra.set("Unknown"))}function Ns(r,t){if(r.Va.Ue(t.targetId),t.resumeToken.approximateByteSize()>0||t.snapshotVersion.compareTo(L.min())>0){const e=r.remoteSyncer.getRemoteKeysForTarget(t.targetId).size;t=t.withExpectedCount(e)}Me(r).Y_(t)}function eu(r,t){r.Va.Ue(t),Me(r).Z_(t)}function bs(r){r.Va=new Cc({getRemoteKeysForTarget:t=>r.remoteSyncer.getRemoteKeysForTarget(t),At:t=>r.Ia.get(t)||null,ht:()=>r.datastore.serializer.databaseId}),Me(r).start(),r.Ra.ua()}function ks(r){return fe(r)&&!Me(r).x_()&&r.Ia.size>0}function fe(r){return F(r).Ea.size===0}function nu(r){r.Va=void 0}async function Oh(r){r.Ra.set("Online")}async function Lh(r){r.Ia.forEach(((t,e)=>{Ns(r,t)}))}async function Fh(r,t){nu(r),ks(r)?(r.Ra.ha(t),bs(r)):r.Ra.set("Unknown")}async function Uh(r,t,e){if(r.Ra.set("Online"),t instanceof qa&&t.state===2&&t.cause)try{await(async function(i,o){const u=o.cause;for(const c of o.targetIds)i.Ia.has(c)&&(await i.remoteSyncer.rejectListen(c,u),i.Ia.delete(c),i.Va.removeTarget(c))})(r,t)}catch(n){N(ue,"Failed to remove targets %s: %s ",t.targetIds.join(","),n),await ar(r,n)}else if(t instanceof Hn?r.Va.Ze(t):t instanceof Ua?r.Va.st(t):r.Va.tt(t),!e.isEqual(L.min()))try{const n=await Ya(r.localStore);e.compareTo(n)>=0&&await(function(o,u){const c=o.Va.Tt(u);return c.targetChanges.forEach(((f,d)=>{if(f.resumeToken.approximateByteSize()>0){const _=o.Ia.get(d);_&&o.Ia.set(d,_.withResumeToken(f.resumeToken,u))}})),c.targetMismatches.forEach(((f,d)=>{const _=o.Ia.get(f);if(!_)return;o.Ia.set(f,_.withResumeToken(lt.EMPTY_BYTE_STRING,_.snapshotVersion)),eu(o,f);const A=new Kt(_.target,f,d,_.sequenceNumber);Ns(o,A)})),o.remoteSyncer.applyRemoteEvent(c)})(r,e)}catch(n){N(ue,"Failed to raise snapshot:",n),await ar(r,n)}}async function ar(r,t,e){if(!xe(t))throw t;r.Ea.add(1),await yn(r),r.Ra.set("Offline"),e||(e=()=>Ya(r.localStore)),r.asyncQueue.enqueueRetryable((async()=>{N(ue,"Retrying IndexedDB access"),await e(),r.Ea.delete(1),await Tr(r)}))}function ru(r,t){return t().catch((e=>ar(r,e,t)))}async function vr(r){const t=F(r),e=te(t);let n=t.Ta.length>0?t.Ta[t.Ta.length-1].batchId:_s;for(;qh(t);)try{const i=await vh(t.localStore,n);if(i===null){t.Ta.length===0&&e.L_();break}n=i.batchId,jh(t,i)}catch(i){await ar(t,i)}su(t)&&iu(t)}function qh(r){return fe(r)&&r.Ta.length<10}function jh(r,t){r.Ta.push(t);const e=te(r);e.O_()&&e.X_&&e.ea(t.mutations)}function su(r){return fe(r)&&!te(r).x_()&&r.Ta.length>0}function iu(r){te(r).start()}async function Bh(r){te(r).ra()}async function zh(r){const t=te(r);for(const e of r.Ta)t.ea(e.mutations)}async function Gh(r,t,e){const n=r.Ta.shift(),i=As.from(n,t,e);await ru(r,(()=>r.remoteSyncer.applySuccessfulWrite(i))),await vr(r)}async function $h(r,t){t&&te(r).X_&&await(async function(n,i){if((function(u){return Vc(u)&&u!==R.ABORTED})(i.code)){const o=n.Ta.shift();te(n).B_(),await ru(n,(()=>n.remoteSyncer.rejectFailedWrite(o.batchId,i))),await vr(n)}})(r,t),su(r)&&iu(r)}async function Mo(r,t){const e=F(r);e.asyncQueue.verifyOperationInProgress(),N(ue,"RemoteStore received new credentials");const n=fe(e);e.Ea.add(3),await yn(e),n&&e.Ra.set("Unknown"),await e.remoteSyncer.handleCredentialChange(t),e.Ea.delete(3),await Tr(e)}async function Kh(r,t){const e=F(r);t?(e.Ea.delete(2),await Tr(e)):t||(e.Ea.add(2),await yn(e),e.Ra.set("Unknown"))}function Me(r){return r.ma||(r.ma=(function(e,n,i){const o=F(e);return o.sa(),new Dh(n,o.connection,o.authCredentials,o.appCheckCredentials,o.serializer,i)})(r.datastore,r.asyncQueue,{Xo:Oh.bind(null,r),t_:Lh.bind(null,r),r_:Fh.bind(null,r),H_:Uh.bind(null,r)}),r.da.push((async t=>{t?(r.ma.B_(),ks(r)?bs(r):r.Ra.set("Unknown")):(await r.ma.stop(),nu(r))}))),r.ma}function te(r){return r.fa||(r.fa=(function(e,n,i){const o=F(e);return o.sa(),new Nh(n,o.connection,o.authCredentials,o.appCheckCredentials,o.serializer,i)})(r.datastore,r.asyncQueue,{Xo:()=>Promise.resolve(),t_:Bh.bind(null,r),r_:$h.bind(null,r),ta:zh.bind(null,r),na:Gh.bind(null,r)}),r.da.push((async t=>{t?(r.fa.B_(),await vr(r)):(await r.fa.stop(),r.Ta.length>0&&(N(ue,`Stopping write stream with ${r.Ta.length} pending writes`),r.Ta=[]))}))),r.fa}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xs{constructor(t,e,n,i,o){this.asyncQueue=t,this.timerId=e,this.targetTimeMs=n,this.op=i,this.removalCallback=o,this.deferred=new Wt,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch((u=>{}))}get promise(){return this.deferred.promise}static createAndSchedule(t,e,n,i,o){const u=Date.now()+n,c=new xs(t,e,u,i,o);return c.start(n),c}start(t){this.timerHandle=setTimeout((()=>this.handleDelayElapsed()),t)}skipDelay(){return this.handleDelayElapsed()}cancel(t){this.timerHandle!==null&&(this.clearTimeout(),this.deferred.reject(new D(R.CANCELLED,"Operation cancelled"+(t?": "+t:""))))}handleDelayElapsed(){this.asyncQueue.enqueueAndForget((()=>this.timerHandle!==null?(this.clearTimeout(),this.op().then((t=>this.deferred.resolve(t)))):Promise.resolve()))}clearTimeout(){this.timerHandle!==null&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null)}}function Ms(r,t){if(qt("AsyncQueue",`${t}: ${r}`),xe(r))return new D(R.UNAVAILABLE,`${t}: ${r}`);throw r}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ie{static emptySet(t){return new Ie(t.comparator)}constructor(t){this.comparator=t?(e,n)=>t(e,n)||x.comparator(e.key,n.key):(e,n)=>x.comparator(e.key,n.key),this.keyedMap=tn(),this.sortedSet=new Y(this.comparator)}has(t){return this.keyedMap.get(t)!=null}get(t){return this.keyedMap.get(t)}first(){return this.sortedSet.minKey()}last(){return this.sortedSet.maxKey()}isEmpty(){return this.sortedSet.isEmpty()}indexOf(t){const e=this.keyedMap.get(t);return e?this.sortedSet.indexOf(e):-1}get size(){return this.sortedSet.size}forEach(t){this.sortedSet.inorderTraversal(((e,n)=>(t(e),!1)))}add(t){const e=this.delete(t.key);return e.copy(e.keyedMap.insert(t.key,t),e.sortedSet.insert(t,null))}delete(t){const e=this.get(t);return e?this.copy(this.keyedMap.remove(t),this.sortedSet.remove(e)):this}isEqual(t){if(!(t instanceof Ie)||this.size!==t.size)return!1;const e=this.sortedSet.getIterator(),n=t.sortedSet.getIterator();for(;e.hasNext();){const i=e.getNext().key,o=n.getNext().key;if(!i.isEqual(o))return!1}return!0}toString(){const t=[];return this.forEach((e=>{t.push(e.toString())})),t.length===0?"DocumentSet ()":`DocumentSet (
  `+t.join(`  
`)+`
)`}copy(t,e){const n=new Ie;return n.comparator=this.comparator,n.keyedMap=t,n.sortedSet=e,n}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Oo{constructor(){this.ga=new Y(x.comparator)}track(t){const e=t.doc.key,n=this.ga.get(e);n?t.type!==0&&n.type===3?this.ga=this.ga.insert(e,t):t.type===3&&n.type!==1?this.ga=this.ga.insert(e,{type:n.type,doc:t.doc}):t.type===2&&n.type===2?this.ga=this.ga.insert(e,{type:2,doc:t.doc}):t.type===2&&n.type===0?this.ga=this.ga.insert(e,{type:0,doc:t.doc}):t.type===1&&n.type===0?this.ga=this.ga.remove(e):t.type===1&&n.type===2?this.ga=this.ga.insert(e,{type:1,doc:n.doc}):t.type===0&&n.type===1?this.ga=this.ga.insert(e,{type:2,doc:t.doc}):O(63341,{Rt:t,pa:n}):this.ga=this.ga.insert(e,t)}ya(){const t=[];return this.ga.inorderTraversal(((e,n)=>{t.push(n)})),t}}class Ne{constructor(t,e,n,i,o,u,c,f,d){this.query=t,this.docs=e,this.oldDocs=n,this.docChanges=i,this.mutatedKeys=o,this.fromCache=u,this.syncStateChanged=c,this.excludesMetadataChanges=f,this.hasCachedResults=d}static fromInitialDocuments(t,e,n,i,o){const u=[];return e.forEach((c=>{u.push({type:0,doc:c})})),new Ne(t,e,Ie.emptySet(e),u,n,i,!0,!1,o)}get hasPendingWrites(){return!this.mutatedKeys.isEmpty()}isEqual(t){if(!(this.fromCache===t.fromCache&&this.hasCachedResults===t.hasCachedResults&&this.syncStateChanged===t.syncStateChanged&&this.mutatedKeys.isEqual(t.mutatedKeys)&&mr(this.query,t.query)&&this.docs.isEqual(t.docs)&&this.oldDocs.isEqual(t.oldDocs)))return!1;const e=this.docChanges,n=t.docChanges;if(e.length!==n.length)return!1;for(let i=0;i<e.length;i++)if(e[i].type!==n[i].type||!e[i].doc.isEqual(n[i].doc))return!1;return!0}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Qh{constructor(){this.wa=void 0,this.Sa=[]}ba(){return this.Sa.some((t=>t.Da()))}}class Wh{constructor(){this.queries=Lo(),this.onlineState="Unknown",this.Ca=new Set}terminate(){(function(e,n){const i=F(e),o=i.queries;i.queries=Lo(),o.forEach(((u,c)=>{for(const f of c.Sa)f.onError(n)}))})(this,new D(R.ABORTED,"Firestore shutting down"))}}function Lo(){return new ce((r=>Ra(r)),mr)}async function Hh(r,t){const e=F(r);let n=3;const i=t.query;let o=e.queries.get(i);o?!o.ba()&&t.Da()&&(n=2):(o=new Qh,n=t.Da()?0:1);try{switch(n){case 0:o.wa=await e.onListen(i,!0);break;case 1:o.wa=await e.onListen(i,!1);break;case 2:await e.onFirstRemoteStoreListen(i)}}catch(u){const c=Ms(u,`Initialization of query '${Ee(t.query)}' failed`);return void t.onError(c)}e.queries.set(i,o),o.Sa.push(t),t.va(e.onlineState),o.wa&&t.Fa(o.wa)&&Os(e)}async function Xh(r,t){const e=F(r),n=t.query;let i=3;const o=e.queries.get(n);if(o){const u=o.Sa.indexOf(t);u>=0&&(o.Sa.splice(u,1),o.Sa.length===0?i=t.Da()?0:1:!o.ba()&&t.Da()&&(i=2))}switch(i){case 0:return e.queries.delete(n),e.onUnlisten(n,!0);case 1:return e.queries.delete(n),e.onUnlisten(n,!1);case 2:return e.onLastRemoteStoreUnlisten(n);default:return}}function Yh(r,t){const e=F(r);let n=!1;for(const i of t){const o=i.query,u=e.queries.get(o);if(u){for(const c of u.Sa)c.Fa(i)&&(n=!0);u.wa=i}}n&&Os(e)}function Jh(r,t,e){const n=F(r),i=n.queries.get(t);if(i)for(const o of i.Sa)o.onError(e);n.queries.delete(t)}function Os(r){r.Ca.forEach((t=>{t.next()}))}var fs,Fo;(Fo=fs||(fs={})).Ma="default",Fo.Cache="cache";class Zh{constructor(t,e,n){this.query=t,this.xa=e,this.Oa=!1,this.Na=null,this.onlineState="Unknown",this.options=n||{}}Fa(t){if(!this.options.includeMetadataChanges){const n=[];for(const i of t.docChanges)i.type!==3&&n.push(i);t=new Ne(t.query,t.docs,t.oldDocs,n,t.mutatedKeys,t.fromCache,t.syncStateChanged,!0,t.hasCachedResults)}let e=!1;return this.Oa?this.Ba(t)&&(this.xa.next(t),e=!0):this.La(t,this.onlineState)&&(this.ka(t),e=!0),this.Na=t,e}onError(t){this.xa.error(t)}va(t){this.onlineState=t;let e=!1;return this.Na&&!this.Oa&&this.La(this.Na,t)&&(this.ka(this.Na),e=!0),e}La(t,e){if(!t.fromCache||!this.Da())return!0;const n=e!=="Offline";return(!this.options.qa||!n)&&(!t.docs.isEmpty()||t.hasCachedResults||e==="Offline")}Ba(t){if(t.docChanges.length>0)return!0;const e=this.Na&&this.Na.hasPendingWrites!==t.hasPendingWrites;return!(!t.syncStateChanged&&!e)&&this.options.includeMetadataChanges===!0}ka(t){t=Ne.fromInitialDocuments(t.query,t.docs,t.mutatedKeys,t.fromCache,t.hasCachedResults),this.Oa=!0,this.xa.next(t)}Da(){return this.options.source!==fs.Cache}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ou{constructor(t){this.key=t}}class au{constructor(t){this.key=t}}class tf{constructor(t,e){this.query=t,this.Ya=e,this.Za=null,this.hasCachedResults=!1,this.current=!1,this.Xa=q(),this.mutatedKeys=q(),this.eu=Va(t),this.tu=new Ie(this.eu)}get nu(){return this.Ya}ru(t,e){const n=e?e.iu:new Oo,i=e?e.tu:this.tu;let o=e?e.mutatedKeys:this.mutatedKeys,u=i,c=!1;const f=this.query.limitType==="F"&&i.size===this.query.limit?i.last():null,d=this.query.limitType==="L"&&i.size===this.query.limit?i.first():null;if(t.inorderTraversal(((_,A)=>{const P=i.get(_),C=pr(this.query,A)?A:null,k=!!P&&this.mutatedKeys.has(P.key),M=!!C&&(C.hasLocalMutations||this.mutatedKeys.has(C.key)&&C.hasCommittedMutations);let b=!1;P&&C?P.data.isEqual(C.data)?k!==M&&(n.track({type:3,doc:C}),b=!0):this.su(P,C)||(n.track({type:2,doc:C}),b=!0,(f&&this.eu(C,f)>0||d&&this.eu(C,d)<0)&&(c=!0)):!P&&C?(n.track({type:0,doc:C}),b=!0):P&&!C&&(n.track({type:1,doc:P}),b=!0,(f||d)&&(c=!0)),b&&(C?(u=u.add(C),o=M?o.add(_):o.delete(_)):(u=u.delete(_),o=o.delete(_)))})),this.query.limit!==null)for(;u.size>this.query.limit;){const _=this.query.limitType==="F"?u.last():u.first();u=u.delete(_.key),o=o.delete(_.key),n.track({type:1,doc:_})}return{tu:u,iu:n,Cs:c,mutatedKeys:o}}su(t,e){return t.hasLocalMutations&&e.hasCommittedMutations&&!e.hasLocalMutations}applyChanges(t,e,n,i){const o=this.tu;this.tu=t.tu,this.mutatedKeys=t.mutatedKeys;const u=t.iu.ya();u.sort(((_,A)=>(function(C,k){const M=b=>{switch(b){case 0:return 1;case 2:case 3:return 2;case 1:return 0;default:return O(20277,{Rt:b})}};return M(C)-M(k)})(_.type,A.type)||this.eu(_.doc,A.doc))),this.ou(n),i=i??!1;const c=e&&!i?this._u():[],f=this.Xa.size===0&&this.current&&!i?1:0,d=f!==this.Za;return this.Za=f,u.length!==0||d?{snapshot:new Ne(this.query,t.tu,o,u,t.mutatedKeys,f===0,d,!1,!!n&&n.resumeToken.approximateByteSize()>0),au:c}:{au:c}}va(t){return this.current&&t==="Offline"?(this.current=!1,this.applyChanges({tu:this.tu,iu:new Oo,mutatedKeys:this.mutatedKeys,Cs:!1},!1)):{au:[]}}uu(t){return!this.Ya.has(t)&&!!this.tu.has(t)&&!this.tu.get(t).hasLocalMutations}ou(t){t&&(t.addedDocuments.forEach((e=>this.Ya=this.Ya.add(e))),t.modifiedDocuments.forEach((e=>{})),t.removedDocuments.forEach((e=>this.Ya=this.Ya.delete(e))),this.current=t.current)}_u(){if(!this.current)return[];const t=this.Xa;this.Xa=q(),this.tu.forEach((n=>{this.uu(n.key)&&(this.Xa=this.Xa.add(n.key))}));const e=[];return t.forEach((n=>{this.Xa.has(n)||e.push(new au(n))})),this.Xa.forEach((n=>{t.has(n)||e.push(new ou(n))})),e}cu(t){this.Ya=t.Qs,this.Xa=q();const e=this.ru(t.documents);return this.applyChanges(e,!0)}lu(){return Ne.fromInitialDocuments(this.query,this.tu,this.mutatedKeys,this.Za===0,this.hasCachedResults)}}const Ls="SyncEngine";class ef{constructor(t,e,n){this.query=t,this.targetId=e,this.view=n}}class nf{constructor(t){this.key=t,this.hu=!1}}class rf{constructor(t,e,n,i,o,u){this.localStore=t,this.remoteStore=e,this.eventManager=n,this.sharedClientState=i,this.currentUser=o,this.maxConcurrentLimboResolutions=u,this.Pu={},this.Tu=new ce((c=>Ra(c)),mr),this.Iu=new Map,this.Eu=new Set,this.du=new Y(x.comparator),this.Au=new Map,this.Ru=new Vs,this.Vu={},this.mu=new Map,this.fu=De.cr(),this.onlineState="Unknown",this.gu=void 0}get isPrimaryClient(){return this.gu===!0}}async function sf(r,t,e=!0){const n=du(r);let i;const o=n.Tu.get(t);return o?(n.sharedClientState.addLocalQueryTarget(o.targetId),i=o.view.lu()):i=await uu(n,t,e,!0),i}async function of(r,t){const e=du(r);await uu(e,t,!0,!1)}async function uu(r,t,e,n){const i=await Ih(r.localStore,Dt(t)),o=i.targetId,u=r.sharedClientState.addLocalQueryTarget(o,e);let c;return n&&(c=await af(r,t,o,u==="current",i.resumeToken)),r.isPrimaryClient&&e&&tu(r.remoteStore,i),c}async function af(r,t,e,n,i){r.pu=(A,P,C)=>(async function(M,b,K,z){let G=b.view.ru(K);G.Cs&&(G=await Do(M.localStore,b.query,!1).then((({documents:T})=>b.view.ru(T,G))));const yt=z&&z.targetChanges.get(b.targetId),St=z&&z.targetMismatches.get(b.targetId)!=null,ct=b.view.applyChanges(G,M.isPrimaryClient,yt,St);return qo(M,b.targetId,ct.au),ct.snapshot})(r,A,P,C);const o=await Do(r.localStore,t,!0),u=new tf(t,o.Qs),c=u.ru(o.documents),f=_n.createSynthesizedTargetChangeForCurrentChange(e,n&&r.onlineState!=="Offline",i),d=u.applyChanges(c,r.isPrimaryClient,f);qo(r,e,d.au);const _=new ef(t,e,u);return r.Tu.set(t,_),r.Iu.has(e)?r.Iu.get(e).push(t):r.Iu.set(e,[t]),d.snapshot}async function uf(r,t,e){const n=F(r),i=n.Tu.get(t),o=n.Iu.get(i.targetId);if(o.length>1)return n.Iu.set(i.targetId,o.filter((u=>!mr(u,t)))),void n.Tu.delete(t);n.isPrimaryClient?(n.sharedClientState.removeLocalQueryTarget(i.targetId),n.sharedClientState.isActiveQueryTarget(i.targetId)||await cs(n.localStore,i.targetId,!1).then((()=>{n.sharedClientState.clearQueryState(i.targetId),e&&Ds(n.remoteStore,i.targetId),ds(n,i.targetId)})).catch(ke)):(ds(n,i.targetId),await cs(n.localStore,i.targetId,!0))}async function lf(r,t){const e=F(r),n=e.Tu.get(t),i=e.Iu.get(n.targetId);e.isPrimaryClient&&i.length===1&&(e.sharedClientState.removeLocalQueryTarget(n.targetId),Ds(e.remoteStore,n.targetId))}async function cf(r,t,e){const n=_f(r);try{const i=await(function(u,c){const f=F(u),d=X.now(),_=c.reduce(((C,k)=>C.add(k.key)),q());let A,P;return f.persistence.runTransaction("Locally write mutations","readwrite",(C=>{let k=jt(),M=q();return f.Ns.getEntries(C,_).next((b=>{k=b,k.forEach(((K,z)=>{z.isValidDocument()||(M=M.add(K))}))})).next((()=>f.localDocuments.getOverlayedDocuments(C,k))).next((b=>{A=b;const K=[];for(const z of c){const G=vc(z,A.get(z.key).overlayedDocument);G!=null&&K.push(new he(z.key,G,ga(G.value.mapValue),Ut.exists(!0)))}return f.mutationQueue.addMutationBatch(C,d,K,c)})).next((b=>{P=b;const K=b.applyToLocalDocumentSet(A,M);return f.documentOverlayCache.saveOverlays(C,b.batchId,K)}))})).then((()=>({batchId:P.batchId,changes:Sa(A)})))})(n.localStore,t);n.sharedClientState.addPendingMutation(i.batchId),(function(u,c,f){let d=u.Vu[u.currentUser.toKey()];d||(d=new Y(U)),d=d.insert(c,f),u.Vu[u.currentUser.toKey()]=d})(n,i.batchId,e),await En(n,i.changes),await vr(n.remoteStore)}catch(i){const o=Ms(i,"Failed to persist write");e.reject(o)}}async function lu(r,t){const e=F(r);try{const n=await Eh(e.localStore,t);t.targetChanges.forEach(((i,o)=>{const u=e.Au.get(o);u&&($(i.addedDocuments.size+i.modifiedDocuments.size+i.removedDocuments.size<=1,22616),i.addedDocuments.size>0?u.hu=!0:i.modifiedDocuments.size>0?$(u.hu,14607):i.removedDocuments.size>0&&($(u.hu,42227),u.hu=!1))})),await En(e,n,t)}catch(n){await ke(n)}}function Uo(r,t,e){const n=F(r);if(n.isPrimaryClient&&e===0||!n.isPrimaryClient&&e===1){const i=[];n.Tu.forEach(((o,u)=>{const c=u.view.va(t);c.snapshot&&i.push(c.snapshot)})),(function(u,c){const f=F(u);f.onlineState=c;let d=!1;f.queries.forEach(((_,A)=>{for(const P of A.Sa)P.va(c)&&(d=!0)})),d&&Os(f)})(n.eventManager,t),i.length&&n.Pu.H_(i),n.onlineState=t,n.isPrimaryClient&&n.sharedClientState.setOnlineState(t)}}async function hf(r,t,e){const n=F(r);n.sharedClientState.updateQueryState(t,"rejected",e);const i=n.Au.get(t),o=i&&i.key;if(o){let u=new Y(x.comparator);u=u.insert(o,_t.newNoDocument(o,L.min()));const c=q().add(o),f=new yr(L.min(),new Map,new Y(U),u,c);await lu(n,f),n.du=n.du.remove(o),n.Au.delete(t),Fs(n)}else await cs(n.localStore,t,!1).then((()=>ds(n,t,e))).catch(ke)}async function ff(r,t){const e=F(r),n=t.batch.batchId;try{const i=await yh(e.localStore,t);hu(e,n,null),cu(e,n),e.sharedClientState.updateMutationState(n,"acknowledged"),await En(e,i)}catch(i){await ke(i)}}async function df(r,t,e){const n=F(r);try{const i=await(function(u,c){const f=F(u);return f.persistence.runTransaction("Reject batch","readwrite-primary",(d=>{let _;return f.mutationQueue.lookupMutationBatch(d,c).next((A=>($(A!==null,37113),_=A.keys(),f.mutationQueue.removeMutationBatch(d,A)))).next((()=>f.mutationQueue.performConsistencyCheck(d))).next((()=>f.documentOverlayCache.removeOverlaysForBatchId(d,_,c))).next((()=>f.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(d,_))).next((()=>f.localDocuments.getDocuments(d,_)))}))})(n.localStore,t);hu(n,t,e),cu(n,t),n.sharedClientState.updateMutationState(t,"rejected",e),await En(n,i)}catch(i){await ke(i)}}function cu(r,t){(r.mu.get(t)||[]).forEach((e=>{e.resolve()})),r.mu.delete(t)}function hu(r,t,e){const n=F(r);let i=n.Vu[n.currentUser.toKey()];if(i){const o=i.get(t);o&&(e?o.reject(e):o.resolve(),i=i.remove(t)),n.Vu[n.currentUser.toKey()]=i}}function ds(r,t,e=null){r.sharedClientState.removeLocalQueryTarget(t);for(const n of r.Iu.get(t))r.Tu.delete(n),e&&r.Pu.yu(n,e);r.Iu.delete(t),r.isPrimaryClient&&r.Ru.jr(t).forEach((n=>{r.Ru.containsKey(n)||fu(r,n)}))}function fu(r,t){r.Eu.delete(t.path.canonicalString());const e=r.du.get(t);e!==null&&(Ds(r.remoteStore,e),r.du=r.du.remove(t),r.Au.delete(e),Fs(r))}function qo(r,t,e){for(const n of e)n instanceof ou?(r.Ru.addReference(n.key,t),mf(r,n)):n instanceof au?(N(Ls,"Document no longer in limbo: "+n.key),r.Ru.removeReference(n.key,t),r.Ru.containsKey(n.key)||fu(r,n.key)):O(19791,{wu:n})}function mf(r,t){const e=t.key,n=e.path.canonicalString();r.du.get(e)||r.Eu.has(n)||(N(Ls,"New document in limbo: "+e),r.Eu.add(n),Fs(r))}function Fs(r){for(;r.Eu.size>0&&r.du.size<r.maxConcurrentLimboResolutions;){const t=r.Eu.values().next().value;r.Eu.delete(t);const e=new x(W.fromString(t)),n=r.fu.next();r.Au.set(n,new nf(e)),r.du=r.du.insert(e,n),tu(r.remoteStore,new Kt(Dt(Aa(e.path)),n,"TargetPurposeLimboResolution",hr.ce))}}async function En(r,t,e){const n=F(r),i=[],o=[],u=[];n.Tu.isEmpty()||(n.Tu.forEach(((c,f)=>{u.push(n.pu(f,t,e).then((d=>{if((d||e)&&n.isPrimaryClient){const _=d?!d.fromCache:e?.targetChanges.get(f.targetId)?.current;n.sharedClientState.updateQueryState(f.targetId,_?"current":"not-current")}if(d){i.push(d);const _=Ss.As(f.targetId,d);o.push(_)}})))})),await Promise.all(u),n.Pu.H_(i),await(async function(f,d){const _=F(f);try{await _.persistence.runTransaction("notifyLocalViewChanges","readwrite",(A=>V.forEach(d,(P=>V.forEach(P.Es,(C=>_.persistence.referenceDelegate.addReference(A,P.targetId,C))).next((()=>V.forEach(P.ds,(C=>_.persistence.referenceDelegate.removeReference(A,P.targetId,C)))))))))}catch(A){if(!xe(A))throw A;N(Cs,"Failed to update sequence numbers: "+A)}for(const A of d){const P=A.targetId;if(!A.fromCache){const C=_.Ms.get(P),k=C.snapshotVersion,M=C.withLastLimboFreeSnapshotVersion(k);_.Ms=_.Ms.insert(P,M)}}})(n.localStore,o))}async function pf(r,t){const e=F(r);if(!e.currentUser.isEqual(t)){N(Ls,"User change. New user:",t.toKey());const n=await Xa(e.localStore,t);e.currentUser=t,(function(o,u){o.mu.forEach((c=>{c.forEach((f=>{f.reject(new D(R.CANCELLED,u))}))})),o.mu.clear()})(e,"'waitForPendingWrites' promise is rejected due to a user change."),e.sharedClientState.handleUserChange(t,n.removedBatchIds,n.addedBatchIds),await En(e,n.Ls)}}function gf(r,t){const e=F(r),n=e.Au.get(t);if(n&&n.hu)return q().add(n.key);{let i=q();const o=e.Iu.get(t);if(!o)return i;for(const u of o){const c=e.Tu.get(u);i=i.unionWith(c.view.nu)}return i}}function du(r){const t=F(r);return t.remoteStore.remoteSyncer.applyRemoteEvent=lu.bind(null,t),t.remoteStore.remoteSyncer.getRemoteKeysForTarget=gf.bind(null,t),t.remoteStore.remoteSyncer.rejectListen=hf.bind(null,t),t.Pu.H_=Yh.bind(null,t.eventManager),t.Pu.yu=Jh.bind(null,t.eventManager),t}function _f(r){const t=F(r);return t.remoteStore.remoteSyncer.applySuccessfulWrite=ff.bind(null,t),t.remoteStore.remoteSyncer.rejectFailedWrite=df.bind(null,t),t}class ur{constructor(){this.kind="memory",this.synchronizeTabs=!1}async initialize(t){this.serializer=Er(t.databaseInfo.databaseId),this.sharedClientState=this.Du(t),this.persistence=this.Cu(t),await this.persistence.start(),this.localStore=this.vu(t),this.gcScheduler=this.Fu(t,this.localStore),this.indexBackfillerScheduler=this.Mu(t,this.localStore)}Fu(t,e){return null}Mu(t,e){return null}vu(t){return _h(this.persistence,new mh,t.initialUser,this.serializer)}Cu(t){return new Ha(Ps.mi,this.serializer)}Du(t){return new wh}async terminate(){this.gcScheduler?.stop(),this.indexBackfillerScheduler?.stop(),this.sharedClientState.shutdown(),await this.persistence.shutdown()}}ur.provider={build:()=>new ur};class yf extends ur{constructor(t){super(),this.cacheSizeBytes=t}Fu(t,e){$(this.persistence.referenceDelegate instanceof or,46915);const n=this.persistence.referenceDelegate.garbageCollector;return new Zc(n,t.asyncQueue,e)}Cu(t){const e=this.cacheSizeBytes!==void 0?vt.withCacheSize(this.cacheSizeBytes):vt.DEFAULT;return new Ha((n=>or.mi(n,e)),this.serializer)}}class ms{async initialize(t,e){this.localStore||(this.localStore=t.localStore,this.sharedClientState=t.sharedClientState,this.datastore=this.createDatastore(e),this.remoteStore=this.createRemoteStore(e),this.eventManager=this.createEventManager(e),this.syncEngine=this.createSyncEngine(e,!t.synchronizeTabs),this.sharedClientState.onlineStateHandler=n=>Uo(this.syncEngine,n,1),this.remoteStore.remoteSyncer.handleCredentialChange=pf.bind(null,this.syncEngine),await Kh(this.remoteStore,this.syncEngine.isPrimaryClient))}createEventManager(t){return(function(){return new Wh})()}createDatastore(t){const e=Er(t.databaseInfo.databaseId),n=(function(o){return new Ch(o)})(t.databaseInfo);return(function(o,u,c,f){return new kh(o,u,c,f)})(t.authCredentials,t.appCheckCredentials,n,e)}createRemoteStore(t){return(function(n,i,o,u,c){return new Mh(n,i,o,u,c)})(this.localStore,this.datastore,t.asyncQueue,(e=>Uo(this.syncEngine,e,0)),(function(){return ko.v()?new ko:new Rh})())}createSyncEngine(t,e){return(function(i,o,u,c,f,d,_){const A=new rf(i,o,u,c,f,d);return _&&(A.gu=!0),A})(this.localStore,this.remoteStore,this.eventManager,this.sharedClientState,t.initialUser,t.maxConcurrentLimboResolutions,e)}async terminate(){await(async function(e){const n=F(e);N(ue,"RemoteStore shutting down."),n.Ea.add(5),await yn(n),n.Aa.shutdown(),n.Ra.set("Unknown")})(this.remoteStore),this.datastore?.terminate(),this.eventManager?.terminate()}}ms.provider={build:()=>new ms};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ef{constructor(t){this.observer=t,this.muted=!1}next(t){this.muted||this.observer.next&&this.Ou(this.observer.next,t)}error(t){this.muted||(this.observer.error?this.Ou(this.observer.error,t):qt("Uncaught Error in snapshot listener:",t.toString()))}Nu(){this.muted=!0}Ou(t,e){setTimeout((()=>{this.muted||t(e)}),0)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ee="FirestoreClient";class Tf{constructor(t,e,n,i,o){this.authCredentials=t,this.appCheckCredentials=e,this.asyncQueue=n,this.databaseInfo=i,this.user=gt.UNAUTHENTICATED,this.clientId=gs.newId(),this.authCredentialListener=()=>Promise.resolve(),this.appCheckCredentialListener=()=>Promise.resolve(),this._uninitializedComponentsProvider=o,this.authCredentials.start(n,(async u=>{N(ee,"Received user=",u.uid),await this.authCredentialListener(u),this.user=u})),this.appCheckCredentials.start(n,(u=>(N(ee,"Received new app check token=",u),this.appCheckCredentialListener(u,this.user))))}get configuration(){return{asyncQueue:this.asyncQueue,databaseInfo:this.databaseInfo,clientId:this.clientId,authCredentials:this.authCredentials,appCheckCredentials:this.appCheckCredentials,initialUser:this.user,maxConcurrentLimboResolutions:100}}setCredentialChangeListener(t){this.authCredentialListener=t}setAppCheckTokenChangeListener(t){this.appCheckCredentialListener=t}terminate(){this.asyncQueue.enterRestrictedMode();const t=new Wt;return this.asyncQueue.enqueueAndForgetEvenWhileRestricted((async()=>{try{this._onlineComponents&&await this._onlineComponents.terminate(),this._offlineComponents&&await this._offlineComponents.terminate(),this.authCredentials.shutdown(),this.appCheckCredentials.shutdown(),t.resolve()}catch(e){const n=Ms(e,"Failed to shutdown persistence");t.reject(n)}})),t.promise}}async function Jr(r,t){r.asyncQueue.verifyOperationInProgress(),N(ee,"Initializing OfflineComponentProvider");const e=r.configuration;await t.initialize(e);let n=e.initialUser;r.setCredentialChangeListener((async i=>{n.isEqual(i)||(await Xa(t.localStore,i),n=i)})),t.persistence.setDatabaseDeletedListener((()=>r.terminate())),r._offlineComponents=t}async function jo(r,t){r.asyncQueue.verifyOperationInProgress();const e=await vf(r);N(ee,"Initializing OnlineComponentProvider"),await t.initialize(e,r.configuration),r.setCredentialChangeListener((n=>Mo(t.remoteStore,n))),r.setAppCheckTokenChangeListener(((n,i)=>Mo(t.remoteStore,i))),r._onlineComponents=t}async function vf(r){if(!r._offlineComponents)if(r._uninitializedComponentsProvider){N(ee,"Using user provided OfflineComponentProvider");try{await Jr(r,r._uninitializedComponentsProvider._offline)}catch(t){const e=t;if(!(function(i){return i.name==="FirebaseError"?i.code===R.FAILED_PRECONDITION||i.code===R.UNIMPLEMENTED:!(typeof DOMException<"u"&&i instanceof DOMException)||i.code===22||i.code===20||i.code===11})(e))throw e;Ve("Error using user provided cache. Falling back to memory cache: "+e),await Jr(r,new ur)}}else N(ee,"Using default OfflineComponentProvider"),await Jr(r,new yf(void 0));return r._offlineComponents}async function mu(r){return r._onlineComponents||(r._uninitializedComponentsProvider?(N(ee,"Using user provided OnlineComponentProvider"),await jo(r,r._uninitializedComponentsProvider._online)):(N(ee,"Using default OnlineComponentProvider"),await jo(r,new ms))),r._onlineComponents}function If(r){return mu(r).then((t=>t.syncEngine))}async function Af(r){const t=await mu(r),e=t.eventManager;return e.onListen=sf.bind(null,t.syncEngine),e.onUnlisten=uf.bind(null,t.syncEngine),e.onFirstRemoteStoreListen=of.bind(null,t.syncEngine),e.onLastRemoteStoreUnlisten=lf.bind(null,t.syncEngine),e}function wf(r,t,e={}){const n=new Wt;return r.asyncQueue.enqueueAndForget((async()=>(function(o,u,c,f,d){const _=new Ef({next:P=>{_.Nu(),u.enqueueAndForget((()=>Xh(o,A))),P.fromCache&&f.source==="server"?d.reject(new D(R.UNAVAILABLE,'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')):d.resolve(P)},error:P=>d.reject(P)}),A=new Zh(c,_,{includeMetadataChanges:!0,qa:!0});return Hh(o,A)})(await Af(r),r.asyncQueue,t,e,n))),n.promise}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function pu(r){const t={};return r.timeoutSeconds!==void 0&&(t.timeoutSeconds=r.timeoutSeconds),t}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Bo=new Map;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const gu="firestore.googleapis.com",zo=!0;class Go{constructor(t){if(t.host===void 0){if(t.ssl!==void 0)throw new D(R.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host=gu,this.ssl=zo}else this.host=t.host,this.ssl=t.ssl??zo;if(this.isUsingEmulator=t.emulatorOptions!==void 0,this.credentials=t.credentials,this.ignoreUndefinedProperties=!!t.ignoreUndefinedProperties,this.localCache=t.localCache,t.cacheSizeBytes===void 0)this.cacheSizeBytes=Wa;else{if(t.cacheSizeBytes!==-1&&t.cacheSizeBytes<Yc)throw new D(R.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=t.cacheSizeBytes}kl("experimentalForceLongPolling",t.experimentalForceLongPolling,"experimentalAutoDetectLongPolling",t.experimentalAutoDetectLongPolling),this.experimentalForceLongPolling=!!t.experimentalForceLongPolling,this.experimentalForceLongPolling?this.experimentalAutoDetectLongPolling=!1:t.experimentalAutoDetectLongPolling===void 0?this.experimentalAutoDetectLongPolling=!0:this.experimentalAutoDetectLongPolling=!!t.experimentalAutoDetectLongPolling,this.experimentalLongPollingOptions=pu(t.experimentalLongPollingOptions??{}),(function(n){if(n.timeoutSeconds!==void 0){if(isNaN(n.timeoutSeconds))throw new D(R.INVALID_ARGUMENT,`invalid long polling timeout: ${n.timeoutSeconds} (must not be NaN)`);if(n.timeoutSeconds<5)throw new D(R.INVALID_ARGUMENT,`invalid long polling timeout: ${n.timeoutSeconds} (minimum allowed value is 5)`);if(n.timeoutSeconds>30)throw new D(R.INVALID_ARGUMENT,`invalid long polling timeout: ${n.timeoutSeconds} (maximum allowed value is 30)`)}})(this.experimentalLongPollingOptions),this.useFetchStreams=!!t.useFetchStreams}isEqual(t){return this.host===t.host&&this.ssl===t.ssl&&this.credentials===t.credentials&&this.cacheSizeBytes===t.cacheSizeBytes&&this.experimentalForceLongPolling===t.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===t.experimentalAutoDetectLongPolling&&(function(n,i){return n.timeoutSeconds===i.timeoutSeconds})(this.experimentalLongPollingOptions,t.experimentalLongPollingOptions)&&this.ignoreUndefinedProperties===t.ignoreUndefinedProperties&&this.useFetchStreams===t.useFetchStreams}}class Ir{constructor(t,e,n,i){this._authCredentials=t,this._appCheckCredentials=e,this._databaseId=n,this._app=i,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new Go({}),this._settingsFrozen=!1,this._emulatorOptions={},this._terminateTask="notTerminated"}get app(){if(!this._app)throw new D(R.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app}get _initialized(){return this._settingsFrozen}get _terminated(){return this._terminateTask!=="notTerminated"}_setSettings(t){if(this._settingsFrozen)throw new D(R.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new Go(t),this._emulatorOptions=t.emulatorOptions||{},t.credentials!==void 0&&(this._authCredentials=(function(n){if(!n)return new Al;switch(n.type){case"firstParty":return new Pl(n.sessionIndex||"0",n.iamToken||null,n.authTokenFactory||null);case"provider":return n.client;default:throw new D(R.INVALID_ARGUMENT,"makeAuthCredentialsProvider failed due to invalid credential type")}})(t.credentials))}_getSettings(){return this._settings}_getEmulatorOptions(){return this._emulatorOptions}_freezeSettings(){return this._settingsFrozen=!0,this._settings}_delete(){return this._terminateTask==="notTerminated"&&(this._terminateTask=this._terminate()),this._terminateTask}async _restart(){this._terminateTask==="notTerminated"?await this._terminate():this._terminateTask="notTerminated"}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings}}_terminate(){return(function(e){const n=Bo.get(e);n&&(N("ComponentProvider","Removing Datastore"),Bo.delete(e),n.terminate())})(this),Promise.resolve()}}function Rf(r,t,e,n={}){r=Yn(r,Ir);const i=Xo(t),o=r._getSettings(),u={...o,emulatorOptions:r._getEmulatorOptions()},c=`${t}:${e}`;i&&(fl(`https://${c}`),dl("Firestore",!0)),o.host!==gu&&o.host!==c&&Ve("Host has been set in both settings() and connectFirestoreEmulator(), emulator host will be used.");const f={...o,host:c,ssl:i,emulatorOptions:n};if(!ml(f,u)&&(r._setSettings(f),n.mockUserToken)){let d,_;if(typeof n.mockUserToken=="string")d=n.mockUserToken,_=gt.MOCK_USER;else{d=pl(n.mockUserToken,r._app?.options.projectId);const A=n.mockUserToken.sub||n.mockUserToken.user_id;if(!A)throw new D(R.INVALID_ARGUMENT,"mockUserToken must contain 'sub' or 'user_id' field!");_=new gt(A)}r._authCredentials=new wl(new sa(d,_))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class de{constructor(t,e,n){this.converter=e,this._query=n,this.type="query",this.firestore=t}withConverter(t){return new de(this.firestore,t,this._query)}}class it{constructor(t,e,n){this.converter=e,this._key=n,this.type="document",this.firestore=t}get _path(){return this._key.path}get id(){return this._key.path.lastSegment()}get path(){return this._key.path.canonicalString()}get parent(){return new Ht(this.firestore,this.converter,this._key.path.popLast())}withConverter(t){return new it(this.firestore,t,this._key)}toJSON(){return{type:it._jsonSchemaVersion,referencePath:this._key.toString()}}static fromJSON(t,e,n){if(mn(e,it._jsonSchema))return new it(t,n||null,new x(W.fromString(e.referencePath)))}}it._jsonSchemaVersion="firestore/documentReference/1.0",it._jsonSchema={type:nt("string",it._jsonSchemaVersion),referencePath:nt("string")};class Ht extends de{constructor(t,e,n){super(t,e,Aa(n)),this._path=n,this.type="collection"}get id(){return this._query.path.lastSegment()}get path(){return this._query.path.canonicalString()}get parent(){const t=this._path.popLast();return t.isEmpty()?null:new it(this.firestore,null,new x(t))}withConverter(t){return new Ht(this.firestore,t,this._path)}}function $f(r,t,...e){if(r=Re(r),ia("collection","path",t),r instanceof Ir){const n=W.fromString(t,...e);return no(n),new Ht(r,null,n)}{if(!(r instanceof it||r instanceof Ht))throw new D(R.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const n=r._path.child(W.fromString(t,...e));return no(n),new Ht(r.firestore,null,n)}}function Vf(r,t,...e){if(r=Re(r),arguments.length===1&&(t=gs.newId()),ia("doc","path",t),r instanceof Ir){const n=W.fromString(t,...e);return eo(n),new it(r,null,new x(n))}{if(!(r instanceof it||r instanceof Ht))throw new D(R.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const n=r._path.child(W.fromString(t,...e));return eo(n),new it(r.firestore,r instanceof Ht?r.converter:null,new x(n))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const $o="AsyncQueue";class Ko{constructor(t=Promise.resolve()){this.Xu=[],this.ec=!1,this.tc=[],this.nc=null,this.rc=!1,this.sc=!1,this.oc=[],this.M_=new Ja(this,"async_queue_retry"),this._c=()=>{const n=Yr();n&&N($o,"Visibility state changed to "+n.visibilityState),this.M_.w_()},this.ac=t;const e=Yr();e&&typeof e.addEventListener=="function"&&e.addEventListener("visibilitychange",this._c)}get isShuttingDown(){return this.ec}enqueueAndForget(t){this.enqueue(t)}enqueueAndForgetEvenWhileRestricted(t){this.uc(),this.cc(t)}enterRestrictedMode(t){if(!this.ec){this.ec=!0,this.sc=t||!1;const e=Yr();e&&typeof e.removeEventListener=="function"&&e.removeEventListener("visibilitychange",this._c)}}enqueue(t){if(this.uc(),this.ec)return new Promise((()=>{}));const e=new Wt;return this.cc((()=>this.ec&&this.sc?Promise.resolve():(t().then(e.resolve,e.reject),e.promise))).then((()=>e.promise))}enqueueRetryable(t){this.enqueueAndForget((()=>(this.Xu.push(t),this.lc())))}async lc(){if(this.Xu.length!==0){try{await this.Xu[0](),this.Xu.shift(),this.M_.reset()}catch(t){if(!xe(t))throw t;N($o,"Operation failed with retryable error: "+t)}this.Xu.length>0&&this.M_.p_((()=>this.lc()))}}cc(t){const e=this.ac.then((()=>(this.rc=!0,t().catch((n=>{throw this.nc=n,this.rc=!1,qt("INTERNAL UNHANDLED ERROR: ",Qo(n)),n})).then((n=>(this.rc=!1,n))))));return this.ac=e,e}enqueueAfterDelay(t,e,n){this.uc(),this.oc.indexOf(t)>-1&&(e=0);const i=xs.createAndSchedule(this,t,e,n,(o=>this.hc(o)));return this.tc.push(i),i}uc(){this.nc&&O(47125,{Pc:Qo(this.nc)})}verifyOperationInProgress(){}async Tc(){let t;do t=this.ac,await t;while(t!==this.ac)}Ic(t){for(const e of this.tc)if(e.timerId===t)return!0;return!1}Ec(t){return this.Tc().then((()=>{this.tc.sort(((e,n)=>e.targetTimeMs-n.targetTimeMs));for(const e of this.tc)if(e.skipDelay(),t!=="all"&&e.timerId===t)break;return this.Tc()}))}dc(t){this.oc.push(t)}hc(t){const e=this.tc.indexOf(t);this.tc.splice(e,1)}}function Qo(r){let t=r.message||"";return r.stack&&(t=r.stack.includes(r.message)?r.stack:r.message+`
`+r.stack),t}class Us extends Ir{constructor(t,e,n,i){super(t,e,n,i),this.type="firestore",this._queue=new Ko,this._persistenceKey=i?.name||"[DEFAULT]"}async _terminate(){if(this._firestoreClient){const t=this._firestoreClient.terminate();this._queue=new Ko(t),this._firestoreClient=void 0,await t}}}function Kf(r,t){const e=typeof r=="object"?r:ul(),n=typeof r=="string"?r:t||Zn,i=ll(e,"firestore").getImmediate({identifier:n});if(!i._initialized){const o=cl("firestore");o&&Rf(i,...o)}return i}function _u(r){if(r._terminated)throw new D(R.FAILED_PRECONDITION,"The client has already been terminated.");return r._firestoreClient||Pf(r),r._firestoreClient}function Pf(r){const t=r._freezeSettings(),e=(function(i,o,u,c){return new $l(i,o,u,c.host,c.ssl,c.experimentalForceLongPolling,c.experimentalAutoDetectLongPolling,pu(c.experimentalLongPollingOptions),c.useFetchStreams,c.isUsingEmulator)})(r._databaseId,r._app?.options.appId||"",r._persistenceKey,t);r._componentsProvider||t.localCache?._offlineComponentProvider&&t.localCache?._onlineComponentProvider&&(r._componentsProvider={_offline:t.localCache._offlineComponentProvider,_online:t.localCache._onlineComponentProvider}),r._firestoreClient=new Tf(r._authCredentials,r._appCheckCredentials,r._queue,e,r._componentsProvider&&(function(i){const o=i?._online.build();return{_offline:i?._offline.build(o),_online:o}})(r._componentsProvider))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wt{constructor(t){this._byteString=t}static fromBase64String(t){try{return new wt(lt.fromBase64String(t))}catch(e){throw new D(R.INVALID_ARGUMENT,"Failed to construct data from Base64 string: "+e)}}static fromUint8Array(t){return new wt(lt.fromUint8Array(t))}toBase64(){return this._byteString.toBase64()}toUint8Array(){return this._byteString.toUint8Array()}toString(){return"Bytes(base64: "+this.toBase64()+")"}isEqual(t){return this._byteString.isEqual(t._byteString)}toJSON(){return{type:wt._jsonSchemaVersion,bytes:this.toBase64()}}static fromJSON(t){if(mn(t,wt._jsonSchema))return wt.fromBase64String(t.bytes)}}wt._jsonSchemaVersion="firestore/bytes/1.0",wt._jsonSchema={type:nt("string",wt._jsonSchemaVersion),bytes:nt("string")};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qs{constructor(...t){for(let e=0;e<t.length;++e)if(t[e].length===0)throw new D(R.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new ut(t)}isEqual(t){return this._internalPath.isEqual(t._internalPath)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class js{constructor(t){this._methodName=t}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class bt{constructor(t,e){if(!isFinite(t)||t<-90||t>90)throw new D(R.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+t);if(!isFinite(e)||e<-180||e>180)throw new D(R.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+e);this._lat=t,this._long=e}get latitude(){return this._lat}get longitude(){return this._long}isEqual(t){return this._lat===t._lat&&this._long===t._long}_compareTo(t){return U(this._lat,t._lat)||U(this._long,t._long)}toJSON(){return{latitude:this._lat,longitude:this._long,type:bt._jsonSchemaVersion}}static fromJSON(t){if(mn(t,bt._jsonSchema))return new bt(t.latitude,t.longitude)}}bt._jsonSchemaVersion="firestore/geoPoint/1.0",bt._jsonSchema={type:nt("string",bt._jsonSchemaVersion),latitude:nt("number"),longitude:nt("number")};/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class kt{constructor(t){this._values=(t||[]).map((e=>e))}toArray(){return this._values.map((t=>t))}isEqual(t){return(function(n,i){if(n.length!==i.length)return!1;for(let o=0;o<n.length;++o)if(n[o]!==i[o])return!1;return!0})(this._values,t._values)}toJSON(){return{type:kt._jsonSchemaVersion,vectorValues:this._values}}static fromJSON(t){if(mn(t,kt._jsonSchema)){if(Array.isArray(t.vectorValues)&&t.vectorValues.every((e=>typeof e=="number")))return new kt(t.vectorValues);throw new D(R.INVALID_ARGUMENT,"Expected 'vectorValues' field to be a number array")}}}kt._jsonSchemaVersion="firestore/vectorValue/1.0",kt._jsonSchema={type:nt("string",kt._jsonSchemaVersion),vectorValues:nt("object")};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Sf=/^__.*__$/;class Cf{constructor(t,e,n){this.data=t,this.fieldMask=e,this.fieldTransforms=n}toMutation(t,e){return this.fieldMask!==null?new he(t,this.data,this.fieldMask,e,this.fieldTransforms):new gn(t,this.data,e,this.fieldTransforms)}}function yu(r){switch(r){case 0:case 2:case 1:return!0;case 3:case 4:return!1;default:throw O(40011,{Ac:r})}}class Bs{constructor(t,e,n,i,o,u){this.settings=t,this.databaseId=e,this.serializer=n,this.ignoreUndefinedProperties=i,o===void 0&&this.Rc(),this.fieldTransforms=o||[],this.fieldMask=u||[]}get path(){return this.settings.path}get Ac(){return this.settings.Ac}Vc(t){return new Bs({...this.settings,...t},this.databaseId,this.serializer,this.ignoreUndefinedProperties,this.fieldTransforms,this.fieldMask)}mc(t){const e=this.path?.child(t),n=this.Vc({path:e,fc:!1});return n.gc(t),n}yc(t){const e=this.path?.child(t),n=this.Vc({path:e,fc:!1});return n.Rc(),n}wc(t){return this.Vc({path:void 0,fc:!0})}Sc(t){return lr(t,this.settings.methodName,this.settings.bc||!1,this.path,this.settings.Dc)}contains(t){return this.fieldMask.find((e=>t.isPrefixOf(e)))!==void 0||this.fieldTransforms.find((e=>t.isPrefixOf(e.field)))!==void 0}Rc(){if(this.path)for(let t=0;t<this.path.length;t++)this.gc(this.path.get(t))}gc(t){if(t.length===0)throw this.Sc("Document fields must not be empty");if(yu(this.Ac)&&Sf.test(t))throw this.Sc('Document fields cannot begin and end with "__"')}}class Df{constructor(t,e,n){this.databaseId=t,this.ignoreUndefinedProperties=e,this.serializer=n||Er(t)}Cc(t,e,n,i=!1){return new Bs({Ac:t,methodName:e,Dc:n,path:ut.emptyPath(),fc:!1,bc:i},this.databaseId,this.serializer,this.ignoreUndefinedProperties)}}function Eu(r){const t=r._freezeSettings(),e=Er(r._databaseId);return new Df(r._databaseId,!!t.ignoreUndefinedProperties,e)}function Nf(r,t,e,n,i,o={}){const u=r.Cc(o.merge||o.mergeFields?2:0,t,e,i);Iu("Data must be an object, but it was:",u,n);const c=Tu(n,u);let f,d;if(o.merge)f=new Vt(u.fieldMask),d=u.fieldTransforms;else if(o.mergeFields){const _=[];for(const A of o.mergeFields){const P=kf(t,A,e);if(!u.contains(P))throw new D(R.INVALID_ARGUMENT,`Field '${P}' is specified in your field mask but missing from your input data.`);Mf(_,P)||_.push(P)}f=new Vt(_),d=u.fieldTransforms.filter((A=>f.covers(A.field)))}else f=null,d=u.fieldTransforms;return new Cf(new At(c),f,d)}class zs extends js{_toFieldTransform(t){return new _c(t.path,new hn)}isEqual(t){return t instanceof zs}}function bf(r,t,e,n=!1){return Gs(e,r.Cc(n?4:3,t))}function Gs(r,t){if(vu(r=Re(r)))return Iu("Unsupported field value:",t,r),Tu(r,t);if(r instanceof js)return(function(n,i){if(!yu(i.Ac))throw i.Sc(`${n._methodName}() can only be used with update() and set()`);if(!i.path)throw i.Sc(`${n._methodName}() is not currently supported inside arrays`);const o=n._toFieldTransform(i);o&&i.fieldTransforms.push(o)})(r,t),null;if(r===void 0&&t.ignoreUndefinedProperties)return null;if(t.path&&t.fieldMask.push(t.path),r instanceof Array){if(t.settings.fc&&t.Ac!==4)throw t.Sc("Nested arrays are not supported");return(function(n,i){const o=[];let u=0;for(const c of n){let f=Gs(c,i.wc(u));f==null&&(f={nullValue:"NULL_VALUE"}),o.push(f),u++}return{arrayValue:{values:o}}})(r,t)}return(function(n,i){if((n=Re(n))===null)return{nullValue:"NULL_VALUE"};if(typeof n=="number")return mc(i.serializer,n);if(typeof n=="boolean")return{booleanValue:n};if(typeof n=="string")return{stringValue:n};if(n instanceof Date){const o=X.fromDate(n);return{timestampValue:ir(i.serializer,o)}}if(n instanceof X){const o=new X(n.seconds,1e3*Math.floor(n.nanoseconds/1e3));return{timestampValue:ir(i.serializer,o)}}if(n instanceof bt)return{geoPointValue:{latitude:n.latitude,longitude:n.longitude}};if(n instanceof wt)return{bytesValue:ja(i.serializer,n._byteString)};if(n instanceof it){const o=i.databaseId,u=n.firestore._databaseId;if(!u.isEqual(o))throw i.Sc(`Document reference is for database ${u.projectId}/${u.database} but should be for database ${o.projectId}/${o.database}`);return{referenceValue:Rs(n.firestore._databaseId||i.databaseId,n._key.path)}}if(n instanceof kt)return(function(u,c){return{mapValue:{fields:{[ma]:{stringValue:pa},[tr]:{arrayValue:{values:u.toArray().map((d=>{if(typeof d!="number")throw c.Sc("VectorValues must only contain numeric values.");return Is(c.serializer,d)}))}}}}}})(n,i);throw i.Sc(`Unsupported field value: ${cr(n)}`)})(r,t)}function Tu(r,t){const e={};return ua(r)?t.path&&t.path.length>0&&t.fieldMask.push(t.path):le(r,((n,i)=>{const o=Gs(i,t.mc(n));o!=null&&(e[n]=o)})),{mapValue:{fields:e}}}function vu(r){return!(typeof r!="object"||r===null||r instanceof Array||r instanceof Date||r instanceof X||r instanceof bt||r instanceof wt||r instanceof it||r instanceof js||r instanceof kt)}function Iu(r,t,e){if(!vu(e)||!oa(e)){const n=cr(e);throw n==="an object"?t.Sc(r+" a custom object"):t.Sc(r+" "+n)}}function kf(r,t,e){if((t=Re(t))instanceof qs)return t._internalPath;if(typeof t=="string")return Au(r,t);throw lr("Field path arguments must be of type string or ",r,!1,void 0,e)}const xf=new RegExp("[~\\*/\\[\\]]");function Au(r,t,e){if(t.search(xf)>=0)throw lr(`Invalid field path (${t}). Paths must not contain '~', '*', '/', '[', or ']'`,r,!1,void 0,e);try{return new qs(...t.split("."))._internalPath}catch{throw lr(`Invalid field path (${t}). Paths must not be empty, begin with '.', end with '.', or contain '..'`,r,!1,void 0,e)}}function lr(r,t,e,n,i){const o=n&&!n.isEmpty(),u=i!==void 0;let c=`Function ${t}() called with invalid data`;e&&(c+=" (via `toFirestore()`)"),c+=". ";let f="";return(o||u)&&(f+=" (found",o&&(f+=` in field ${n}`),u&&(f+=` in document ${i}`),f+=")"),new D(R.INVALID_ARGUMENT,c+r+f)}function Mf(r,t){return r.some((e=>e.isEqual(t)))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wu{constructor(t,e,n,i,o){this._firestore=t,this._userDataWriter=e,this._key=n,this._document=i,this._converter=o}get id(){return this._key.path.lastSegment()}get ref(){return new it(this._firestore,this._converter,this._key)}exists(){return this._document!==null}data(){if(this._document){if(this._converter){const t=new Of(this._firestore,this._userDataWriter,this._key,this._document,null);return this._converter.fromFirestore(t)}return this._userDataWriter.convertValue(this._document.data.value)}}get(t){if(this._document){const e=this._document.data.field($s("DocumentSnapshot.get",t));if(e!==null)return this._userDataWriter.convertValue(e)}}}class Of extends wu{data(){return super.data()}}function $s(r,t){return typeof t=="string"?Au(r,t):t instanceof qs?t._internalPath:t._delegate._internalPath}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Lf(r){if(r.limitType==="L"&&r.explicitOrderBy.length===0)throw new D(R.UNIMPLEMENTED,"limitToLast() queries require specifying at least one orderBy() clause")}class Ks{}class Ru extends Ks{}function Qf(r,t,...e){let n=[];t instanceof Ks&&n.push(t),n=n.concat(e),(function(o){const u=o.filter((f=>f instanceof Qs)).length,c=o.filter((f=>f instanceof Ar)).length;if(u>1||u>0&&c>0)throw new D(R.INVALID_ARGUMENT,"InvalidQuery. When using composite filters, you cannot use more than one filter at the top level. Consider nesting the multiple filters within an `and(...)` statement. For example: change `query(query, where(...), or(...))` to `query(query, and(where(...), or(...)))`.")})(n);for(const i of n)r=i._apply(r);return r}class Ar extends Ru{constructor(t,e,n){super(),this._field=t,this._op=e,this._value=n,this.type="where"}static _create(t,e,n){return new Ar(t,e,n)}_apply(t){const e=this._parse(t);return Vu(t._query,e),new de(t.firestore,t.converter,is(t._query,e))}_parse(t){const e=Eu(t.firestore);return(function(o,u,c,f,d,_,A){let P;if(d.isKeyField()){if(_==="array-contains"||_==="array-contains-any")throw new D(R.INVALID_ARGUMENT,`Invalid Query. You can't perform '${_}' queries on documentId().`);if(_==="in"||_==="not-in"){Ho(A,_);const k=[];for(const M of A)k.push(Wo(f,o,M));P={arrayValue:{values:k}}}else P=Wo(f,o,A)}else _!=="in"&&_!=="not-in"&&_!=="array-contains-any"||Ho(A,_),P=bf(c,u,A,_==="in"||_==="not-in");return et.create(d,_,P)})(t._query,"where",e,t.firestore._databaseId,this._field,this._op,this._value)}}function Wf(r,t,e){const n=t,i=$s("where",r);return Ar._create(i,n,e)}class Qs extends Ks{constructor(t,e){super(),this.type=t,this._queryConstraints=e}static _create(t,e){return new Qs(t,e)}_parse(t){const e=this._queryConstraints.map((n=>n._parse(t))).filter((n=>n.getFilters().length>0));return e.length===1?e[0]:Pt.create(e,this._getOperator())}_apply(t){const e=this._parse(t);return e.getFilters().length===0?t:((function(i,o){let u=i;const c=o.getFlattenedFilters();for(const f of c)Vu(u,f),u=is(u,f)})(t._query,e),new de(t.firestore,t.converter,is(t._query,e)))}_getQueryConstraints(){return this._queryConstraints}_getOperator(){return this.type==="and"?"and":"or"}}class Ws extends Ru{constructor(t,e,n){super(),this.type=t,this._limit=e,this._limitType=n}static _create(t,e,n){return new Ws(t,e,n)}_apply(t){return new de(t.firestore,t.converter,rr(t._query,this._limit,this._limitType))}}function Hf(r){return xl("limit",r),Ws._create("limit",r,"F")}function Wo(r,t,e){if(typeof(e=Re(e))=="string"){if(e==="")throw new D(R.INVALID_ARGUMENT,"Invalid query. When querying with documentId(), you must provide a valid document ID, but it was an empty string.");if(!wa(t)&&e.indexOf("/")!==-1)throw new D(R.INVALID_ARGUMENT,`Invalid query. When querying a collection by documentId(), you must provide a plain document ID, but '${e}' contains a '/' character.`);const n=t.path.child(W.fromString(e));if(!x.isDocumentKey(n))throw new D(R.INVALID_ARGUMENT,`Invalid query. When querying a collection group by documentId(), the value provided must result in a valid document path, but '${n}' is not because it has an odd number of segments (${n.length}).`);return co(r,new x(n))}if(e instanceof it)return co(r,e._key);throw new D(R.INVALID_ARGUMENT,`Invalid query. When querying with documentId(), you must provide a valid string or a DocumentReference, but it was: ${cr(e)}.`)}function Ho(r,t){if(!Array.isArray(r)||r.length===0)throw new D(R.INVALID_ARGUMENT,`Invalid Query. A non-empty array is required for '${t.toString()}' filters.`)}function Vu(r,t){const e=(function(i,o){for(const u of i)for(const c of u.getFlattenedFilters())if(o.indexOf(c.op)>=0)return c.op;return null})(r.filters,(function(i){switch(i){case"!=":return["!=","not-in"];case"array-contains-any":case"in":return["not-in"];case"not-in":return["array-contains-any","in","not-in","!="];default:return[]}})(t.op));if(e!==null)throw e===t.op?new D(R.INVALID_ARGUMENT,`Invalid query. You cannot use more than one '${t.op.toString()}' filter.`):new D(R.INVALID_ARGUMENT,`Invalid query. You cannot use '${t.op.toString()}' filters with '${e.toString()}' filters.`)}class Ff{convertValue(t,e="none"){switch(Zt(t)){case 0:return null;case 1:return t.booleanValue;case 2:return Z(t.integerValue||t.doubleValue);case 3:return this.convertTimestamp(t.timestampValue);case 4:return this.convertServerTimestamp(t,e);case 5:return t.stringValue;case 6:return this.convertBytes(Jt(t.bytesValue));case 7:return this.convertReference(t.referenceValue);case 8:return this.convertGeoPoint(t.geoPointValue);case 9:return this.convertArray(t.arrayValue,e);case 11:return this.convertObject(t.mapValue,e);case 10:return this.convertVectorValue(t.mapValue);default:throw O(62114,{value:t})}}convertObject(t,e){return this.convertObjectMap(t.fields,e)}convertObjectMap(t,e="none"){const n={};return le(t,((i,o)=>{n[i]=this.convertValue(o,e)})),n}convertVectorValue(t){const e=t.fields?.[tr].arrayValue?.values?.map((n=>Z(n.doubleValue)));return new kt(e)}convertGeoPoint(t){return new bt(Z(t.latitude),Z(t.longitude))}convertArray(t,e){return(t.values||[]).map((n=>this.convertValue(n,e)))}convertServerTimestamp(t,e){switch(e){case"previous":const n=dr(t);return n==null?null:this.convertValue(n,e);case"estimate":return this.convertTimestamp(un(t));default:return null}}convertTimestamp(t){const e=Yt(t);return new X(e.seconds,e.nanos)}convertDocumentKey(t,e){const n=W.fromString(t);$(Qa(n),9688,{name:t});const i=new ln(n.get(1),n.get(3)),o=new x(n.popFirst(5));return i.isEqual(e)||qt(`Document ${o} contains a document reference within a different database (${i.projectId}/${i.database}) which is not supported. It will be treated as a reference in the current database (${e.projectId}/${e.database}) instead.`),o}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Uf(r,t,e){let n;return n=r?r.toFirestore(t):t,n}class Gn{constructor(t,e){this.hasPendingWrites=t,this.fromCache=e}isEqual(t){return this.hasPendingWrites===t.hasPendingWrites&&this.fromCache===t.fromCache}}class Ae extends wu{constructor(t,e,n,i,o,u){super(t,e,n,i,u),this._firestore=t,this._firestoreImpl=t,this.metadata=o}exists(){return super.exists()}data(t={}){if(this._document){if(this._converter){const e=new Xn(this._firestore,this._userDataWriter,this._key,this._document,this.metadata,null);return this._converter.fromFirestore(e,t)}return this._userDataWriter.convertValue(this._document.data.value,t.serverTimestamps)}}get(t,e={}){if(this._document){const n=this._document.data.field($s("DocumentSnapshot.get",t));if(n!==null)return this._userDataWriter.convertValue(n,e.serverTimestamps)}}toJSON(){if(this.metadata.hasPendingWrites)throw new D(R.FAILED_PRECONDITION,"DocumentSnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const t=this._document,e={};return e.type=Ae._jsonSchemaVersion,e.bundle="",e.bundleSource="DocumentSnapshot",e.bundleName=this._key.toString(),!t||!t.isValidDocument()||!t.isFoundDocument()?e:(this._userDataWriter.convertObjectMap(t.data.value.mapValue.fields,"previous"),e.bundle=(this._firestore,this.ref.path,"NOT SUPPORTED"),e)}}Ae._jsonSchemaVersion="firestore/documentSnapshot/1.0",Ae._jsonSchema={type:nt("string",Ae._jsonSchemaVersion),bundleSource:nt("string","DocumentSnapshot"),bundleName:nt("string"),bundle:nt("string")};class Xn extends Ae{data(t={}){return super.data(t)}}class we{constructor(t,e,n,i){this._firestore=t,this._userDataWriter=e,this._snapshot=i,this.metadata=new Gn(i.hasPendingWrites,i.fromCache),this.query=n}get docs(){const t=[];return this.forEach((e=>t.push(e))),t}get size(){return this._snapshot.docs.size}get empty(){return this.size===0}forEach(t,e){this._snapshot.docs.forEach((n=>{t.call(e,new Xn(this._firestore,this._userDataWriter,n.key,n,new Gn(this._snapshot.mutatedKeys.has(n.key),this._snapshot.fromCache),this.query.converter))}))}docChanges(t={}){const e=!!t.includeMetadataChanges;if(e&&this._snapshot.excludesMetadataChanges)throw new D(R.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this._cachedChanges&&this._cachedChangesIncludeMetadataChanges===e||(this._cachedChanges=(function(i,o){if(i._snapshot.oldDocs.isEmpty()){let u=0;return i._snapshot.docChanges.map((c=>{const f=new Xn(i._firestore,i._userDataWriter,c.doc.key,c.doc,new Gn(i._snapshot.mutatedKeys.has(c.doc.key),i._snapshot.fromCache),i.query.converter);return c.doc,{type:"added",doc:f,oldIndex:-1,newIndex:u++}}))}{let u=i._snapshot.oldDocs;return i._snapshot.docChanges.filter((c=>o||c.type!==3)).map((c=>{const f=new Xn(i._firestore,i._userDataWriter,c.doc.key,c.doc,new Gn(i._snapshot.mutatedKeys.has(c.doc.key),i._snapshot.fromCache),i.query.converter);let d=-1,_=-1;return c.type!==0&&(d=u.indexOf(c.doc.key),u=u.delete(c.doc.key)),c.type!==1&&(u=u.add(c.doc),_=u.indexOf(c.doc.key)),{type:qf(c.type),doc:f,oldIndex:d,newIndex:_}}))}})(this,e),this._cachedChangesIncludeMetadataChanges=e),this._cachedChanges}toJSON(){if(this.metadata.hasPendingWrites)throw new D(R.FAILED_PRECONDITION,"QuerySnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const t={};t.type=we._jsonSchemaVersion,t.bundleSource="QuerySnapshot",t.bundleName=gs.newId(),this._firestore._databaseId.database,this._firestore._databaseId.projectId;const e=[],n=[],i=[];return this.docs.forEach((o=>{o._document!==null&&(e.push(o._document),n.push(this._userDataWriter.convertObjectMap(o._document.data.value.mapValue.fields,"previous")),i.push(o.ref.path))})),t.bundle=(this._firestore,this.query._query,t.bundleName,"NOT SUPPORTED"),t}}function qf(r){switch(r){case 0:return"added";case 2:case 3:return"modified";case 1:return"removed";default:return O(61501,{type:r})}}we._jsonSchemaVersion="firestore/querySnapshot/1.0",we._jsonSchema={type:nt("string",we._jsonSchemaVersion),bundleSource:nt("string","QuerySnapshot"),bundleName:nt("string"),bundle:nt("string")};class jf extends Ff{constructor(t){super(),this.firestore=t}convertBytes(t){return new wt(t)}convertReference(t){const e=this.convertDocumentKey(t,this.firestore._databaseId);return new it(this.firestore,null,e)}}function Xf(r){r=Yn(r,de);const t=Yn(r.firestore,Us),e=_u(t),n=new jf(t);return Lf(r._query),wf(e,r._query).then((i=>new we(t,n,r,i)))}function Yf(r,t){const e=Yn(r.firestore,Us),n=Vf(r),i=Uf(r.converter,t);return Bf(e,[Nf(Eu(r.firestore),"addDoc",n._key,i,r.converter!==null,{}).toMutation(n._key,Ut.exists(!1))]).then((()=>n))}function Bf(r,t){return(function(n,i){const o=new Wt;return n.asyncQueue.enqueueAndForget((async()=>cf(await If(n),i,o))),o.promise})(_u(r),t)}function Jf(){return new zs("serverTimestamp")}(function(t,e=!0){(function(i){be=i})(El),Tl(new vl("firestore",((n,{instanceIdentifier:i,options:o})=>{const u=n.getProvider("app").getImmediate(),c=new Us(new Rl(n.getProvider("auth-internal")),new Sl(u,n.getProvider("app-check-internal")),(function(d,_){if(!Object.prototype.hasOwnProperty.apply(d.options,["projectId"]))throw new D(R.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new ln(d.options.projectId,_)})(u,i),u);return o={useFetchStreams:e,...o},c._setSettings(o),c}),"PUBLIC").setMultipleInstances(!0)),Hi(Yi,Ji,t),Hi(Yi,Ji,"esm2020")})();export{Ff as AbstractUserDataWriter,wt as Bytes,Ht as CollectionReference,it as DocumentReference,Ae as DocumentSnapshot,qs as FieldPath,js as FieldValue,Us as Firestore,D as FirestoreError,bt as GeoPoint,de as Query,Qs as QueryCompositeFilterConstraint,Ru as QueryConstraint,Xn as QueryDocumentSnapshot,Ar as QueryFieldFilterConstraint,Ws as QueryLimitConstraint,we as QuerySnapshot,Gn as SnapshotMetadata,X as Timestamp,kt as VectorValue,gs as _AutoId,lt as _ByteString,ln as _DatabaseId,x as _DocumentKey,Al as _EmptyAuthCredentialsProvider,ut as _FieldPath,Yn as _cast,Ve as _logWarn,kl as _validateIsNotUsedTogether,Yf as addDoc,$f as collection,Rf as connectFirestoreEmulator,Vf as doc,_u as ensureFirestoreConfigured,Bf as executeWrite,Xf as getDocs,Kf as getFirestore,Hf as limit,Qf as query,Jf as serverTimestamp,Wf as where};
