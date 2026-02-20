function TT(t,e){for(var n=0;n<e.length;n++){const r=e[n];if(typeof r!="string"&&!Array.isArray(r)){for(const i in r)if(i!=="default"&&!(i in t)){const s=Object.getOwnPropertyDescriptor(r,i);s&&Object.defineProperty(t,i,s.get?s:{enumerable:!0,get:()=>r[i]})}}}return Object.freeze(Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}))}(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))r(i);new MutationObserver(i=>{for(const s of i)if(s.type==="childList")for(const o of s.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&r(o)}).observe(document,{childList:!0,subtree:!0});function n(i){const s={};return i.integrity&&(s.integrity=i.integrity),i.referrerPolicy&&(s.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?s.credentials="include":i.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function r(i){if(i.ep)return;i.ep=!0;const s=n(i);fetch(i.href,s)}})();function IT(t){return t&&t.__esModule&&Object.prototype.hasOwnProperty.call(t,"default")?t.default:t}var qy={exports:{}},Jl={},Hy={exports:{}},ne={};/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var Mo=Symbol.for("react.element"),ST=Symbol.for("react.portal"),RT=Symbol.for("react.fragment"),AT=Symbol.for("react.strict_mode"),kT=Symbol.for("react.profiler"),CT=Symbol.for("react.provider"),PT=Symbol.for("react.context"),xT=Symbol.for("react.forward_ref"),NT=Symbol.for("react.suspense"),DT=Symbol.for("react.memo"),OT=Symbol.for("react.lazy"),am=Symbol.iterator;function bT(t){return t===null||typeof t!="object"?null:(t=am&&t[am]||t["@@iterator"],typeof t=="function"?t:null)}var Ky={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},Gy=Object.assign,Qy={};function ns(t,e,n){this.props=t,this.context=e,this.refs=Qy,this.updater=n||Ky}ns.prototype.isReactComponent={};ns.prototype.setState=function(t,e){if(typeof t!="object"&&typeof t!="function"&&t!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,t,e,"setState")};ns.prototype.forceUpdate=function(t){this.updater.enqueueForceUpdate(this,t,"forceUpdate")};function Xy(){}Xy.prototype=ns.prototype;function cd(t,e,n){this.props=t,this.context=e,this.refs=Qy,this.updater=n||Ky}var hd=cd.prototype=new Xy;hd.constructor=cd;Gy(hd,ns.prototype);hd.isPureReactComponent=!0;var lm=Array.isArray,Yy=Object.prototype.hasOwnProperty,dd={current:null},Jy={key:!0,ref:!0,__self:!0,__source:!0};function Zy(t,e,n){var r,i={},s=null,o=null;if(e!=null)for(r in e.ref!==void 0&&(o=e.ref),e.key!==void 0&&(s=""+e.key),e)Yy.call(e,r)&&!Jy.hasOwnProperty(r)&&(i[r]=e[r]);var l=arguments.length-2;if(l===1)i.children=n;else if(1<l){for(var u=Array(l),h=0;h<l;h++)u[h]=arguments[h+2];i.children=u}if(t&&t.defaultProps)for(r in l=t.defaultProps,l)i[r]===void 0&&(i[r]=l[r]);return{$$typeof:Mo,type:t,key:s,ref:o,props:i,_owner:dd.current}}function VT(t,e){return{$$typeof:Mo,type:t.type,key:e,ref:t.ref,props:t.props,_owner:t._owner}}function fd(t){return typeof t=="object"&&t!==null&&t.$$typeof===Mo}function LT(t){var e={"=":"=0",":":"=2"};return"$"+t.replace(/[=:]/g,function(n){return e[n]})}var um=/\/+/g;function nc(t,e){return typeof t=="object"&&t!==null&&t.key!=null?LT(""+t.key):e.toString(36)}function $a(t,e,n,r,i){var s=typeof t;(s==="undefined"||s==="boolean")&&(t=null);var o=!1;if(t===null)o=!0;else switch(s){case"string":case"number":o=!0;break;case"object":switch(t.$$typeof){case Mo:case ST:o=!0}}if(o)return o=t,i=i(o),t=r===""?"."+nc(o,0):r,lm(i)?(n="",t!=null&&(n=t.replace(um,"$&/")+"/"),$a(i,e,n,"",function(h){return h})):i!=null&&(fd(i)&&(i=VT(i,n+(!i.key||o&&o.key===i.key?"":(""+i.key).replace(um,"$&/")+"/")+t)),e.push(i)),1;if(o=0,r=r===""?".":r+":",lm(t))for(var l=0;l<t.length;l++){s=t[l];var u=r+nc(s,l);o+=$a(s,e,n,u,i)}else if(u=bT(t),typeof u=="function")for(t=u.call(t),l=0;!(s=t.next()).done;)s=s.value,u=r+nc(s,l++),o+=$a(s,e,n,u,i);else if(s==="object")throw e=String(t),Error("Objects are not valid as a React child (found: "+(e==="[object Object]"?"object with keys {"+Object.keys(t).join(", ")+"}":e)+"). If you meant to render a collection of children, use an array instead.");return o}function va(t,e,n){if(t==null)return t;var r=[],i=0;return $a(t,r,"","",function(s){return e.call(n,s,i++)}),r}function MT(t){if(t._status===-1){var e=t._result;e=e(),e.then(function(n){(t._status===0||t._status===-1)&&(t._status=1,t._result=n)},function(n){(t._status===0||t._status===-1)&&(t._status=2,t._result=n)}),t._status===-1&&(t._status=0,t._result=e)}if(t._status===1)return t._result.default;throw t._result}var pt={current:null},Wa={transition:null},jT={ReactCurrentDispatcher:pt,ReactCurrentBatchConfig:Wa,ReactCurrentOwner:dd};function e_(){throw Error("act(...) is not supported in production builds of React.")}ne.Children={map:va,forEach:function(t,e,n){va(t,function(){e.apply(this,arguments)},n)},count:function(t){var e=0;return va(t,function(){e++}),e},toArray:function(t){return va(t,function(e){return e})||[]},only:function(t){if(!fd(t))throw Error("React.Children.only expected to receive a single React element child.");return t}};ne.Component=ns;ne.Fragment=RT;ne.Profiler=kT;ne.PureComponent=cd;ne.StrictMode=AT;ne.Suspense=NT;ne.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=jT;ne.act=e_;ne.cloneElement=function(t,e,n){if(t==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+t+".");var r=Gy({},t.props),i=t.key,s=t.ref,o=t._owner;if(e!=null){if(e.ref!==void 0&&(s=e.ref,o=dd.current),e.key!==void 0&&(i=""+e.key),t.type&&t.type.defaultProps)var l=t.type.defaultProps;for(u in e)Yy.call(e,u)&&!Jy.hasOwnProperty(u)&&(r[u]=e[u]===void 0&&l!==void 0?l[u]:e[u])}var u=arguments.length-2;if(u===1)r.children=n;else if(1<u){l=Array(u);for(var h=0;h<u;h++)l[h]=arguments[h+2];r.children=l}return{$$typeof:Mo,type:t.type,key:i,ref:s,props:r,_owner:o}};ne.createContext=function(t){return t={$$typeof:PT,_currentValue:t,_currentValue2:t,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},t.Provider={$$typeof:CT,_context:t},t.Consumer=t};ne.createElement=Zy;ne.createFactory=function(t){var e=Zy.bind(null,t);return e.type=t,e};ne.createRef=function(){return{current:null}};ne.forwardRef=function(t){return{$$typeof:xT,render:t}};ne.isValidElement=fd;ne.lazy=function(t){return{$$typeof:OT,_payload:{_status:-1,_result:t},_init:MT}};ne.memo=function(t,e){return{$$typeof:DT,type:t,compare:e===void 0?null:e}};ne.startTransition=function(t){var e=Wa.transition;Wa.transition={};try{t()}finally{Wa.transition=e}};ne.unstable_act=e_;ne.useCallback=function(t,e){return pt.current.useCallback(t,e)};ne.useContext=function(t){return pt.current.useContext(t)};ne.useDebugValue=function(){};ne.useDeferredValue=function(t){return pt.current.useDeferredValue(t)};ne.useEffect=function(t,e){return pt.current.useEffect(t,e)};ne.useId=function(){return pt.current.useId()};ne.useImperativeHandle=function(t,e,n){return pt.current.useImperativeHandle(t,e,n)};ne.useInsertionEffect=function(t,e){return pt.current.useInsertionEffect(t,e)};ne.useLayoutEffect=function(t,e){return pt.current.useLayoutEffect(t,e)};ne.useMemo=function(t,e){return pt.current.useMemo(t,e)};ne.useReducer=function(t,e,n){return pt.current.useReducer(t,e,n)};ne.useRef=function(t){return pt.current.useRef(t)};ne.useState=function(t){return pt.current.useState(t)};ne.useSyncExternalStore=function(t,e,n){return pt.current.useSyncExternalStore(t,e,n)};ne.useTransition=function(){return pt.current.useTransition()};ne.version="18.3.1";Hy.exports=ne;var b=Hy.exports;const t_=IT(b),UT=TT({__proto__:null,default:t_},[b]);/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var FT=b,BT=Symbol.for("react.element"),zT=Symbol.for("react.fragment"),$T=Object.prototype.hasOwnProperty,WT=FT.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,qT={key:!0,ref:!0,__self:!0,__source:!0};function n_(t,e,n){var r,i={},s=null,o=null;n!==void 0&&(s=""+n),e.key!==void 0&&(s=""+e.key),e.ref!==void 0&&(o=e.ref);for(r in e)$T.call(e,r)&&!qT.hasOwnProperty(r)&&(i[r]=e[r]);if(t&&t.defaultProps)for(r in e=t.defaultProps,e)i[r]===void 0&&(i[r]=e[r]);return{$$typeof:BT,type:t,key:s,ref:o,props:i,_owner:WT.current}}Jl.Fragment=zT;Jl.jsx=n_;Jl.jsxs=n_;qy.exports=Jl;var p=qy.exports,zc={},r_={exports:{}},Ct={},i_={exports:{}},s_={};/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */(function(t){function e(q,L){var z=q.length;q.push(L);e:for(;0<z;){var X=z-1>>>1,te=q[X];if(0<i(te,L))q[X]=L,q[z]=te,z=X;else break e}}function n(q){return q.length===0?null:q[0]}function r(q){if(q.length===0)return null;var L=q[0],z=q.pop();if(z!==L){q[0]=z;e:for(var X=0,te=q.length,ue=te>>>1;X<ue;){var Mt=2*(X+1)-1,yn=q[Mt],_n=Mt+1,vn=q[_n];if(0>i(yn,z))_n<te&&0>i(vn,yn)?(q[X]=vn,q[_n]=z,X=_n):(q[X]=yn,q[Mt]=z,X=Mt);else if(_n<te&&0>i(vn,z))q[X]=vn,q[_n]=z,X=_n;else break e}}return L}function i(q,L){var z=q.sortIndex-L.sortIndex;return z!==0?z:q.id-L.id}if(typeof performance=="object"&&typeof performance.now=="function"){var s=performance;t.unstable_now=function(){return s.now()}}else{var o=Date,l=o.now();t.unstable_now=function(){return o.now()-l}}var u=[],h=[],f=1,m=null,_=3,R=!1,k=!1,x=!1,C=typeof setTimeout=="function"?setTimeout:null,w=typeof clearTimeout=="function"?clearTimeout:null,g=typeof setImmediate<"u"?setImmediate:null;typeof navigator<"u"&&navigator.scheduling!==void 0&&navigator.scheduling.isInputPending!==void 0&&navigator.scheduling.isInputPending.bind(navigator.scheduling);function T(q){for(var L=n(h);L!==null;){if(L.callback===null)r(h);else if(L.startTime<=q)r(h),L.sortIndex=L.expirationTime,e(u,L);else break;L=n(h)}}function D(q){if(x=!1,T(q),!k)if(n(u)!==null)k=!0,De(j);else{var L=n(h);L!==null&&Le(D,L.startTime-q)}}function j(q,L){k=!1,x&&(x=!1,w(v),v=-1),R=!0;var z=_;try{for(T(L),m=n(u);m!==null&&(!(m.expirationTime>L)||q&&!P());){var X=m.callback;if(typeof X=="function"){m.callback=null,_=m.priorityLevel;var te=X(m.expirationTime<=L);L=t.unstable_now(),typeof te=="function"?m.callback=te:m===n(u)&&r(u),T(L)}else r(u);m=n(u)}if(m!==null)var ue=!0;else{var Mt=n(h);Mt!==null&&Le(D,Mt.startTime-L),ue=!1}return ue}finally{m=null,_=z,R=!1}}var U=!1,I=null,v=-1,E=5,S=-1;function P(){return!(t.unstable_now()-S<E)}function N(){if(I!==null){var q=t.unstable_now();S=q;var L=!0;try{L=I(!0,q)}finally{L?A():(U=!1,I=null)}}else U=!1}var A;if(typeof g=="function")A=function(){g(N)};else if(typeof MessageChannel<"u"){var W=new MessageChannel,ve=W.port2;W.port1.onmessage=N,A=function(){ve.postMessage(null)}}else A=function(){C(N,0)};function De(q){I=q,U||(U=!0,A())}function Le(q,L){v=C(function(){q(t.unstable_now())},L)}t.unstable_IdlePriority=5,t.unstable_ImmediatePriority=1,t.unstable_LowPriority=4,t.unstable_NormalPriority=3,t.unstable_Profiling=null,t.unstable_UserBlockingPriority=2,t.unstable_cancelCallback=function(q){q.callback=null},t.unstable_continueExecution=function(){k||R||(k=!0,De(j))},t.unstable_forceFrameRate=function(q){0>q||125<q?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):E=0<q?Math.floor(1e3/q):5},t.unstable_getCurrentPriorityLevel=function(){return _},t.unstable_getFirstCallbackNode=function(){return n(u)},t.unstable_next=function(q){switch(_){case 1:case 2:case 3:var L=3;break;default:L=_}var z=_;_=L;try{return q()}finally{_=z}},t.unstable_pauseExecution=function(){},t.unstable_requestPaint=function(){},t.unstable_runWithPriority=function(q,L){switch(q){case 1:case 2:case 3:case 4:case 5:break;default:q=3}var z=_;_=q;try{return L()}finally{_=z}},t.unstable_scheduleCallback=function(q,L,z){var X=t.unstable_now();switch(typeof z=="object"&&z!==null?(z=z.delay,z=typeof z=="number"&&0<z?X+z:X):z=X,q){case 1:var te=-1;break;case 2:te=250;break;case 5:te=1073741823;break;case 4:te=1e4;break;default:te=5e3}return te=z+te,q={id:f++,callback:L,priorityLevel:q,startTime:z,expirationTime:te,sortIndex:-1},z>X?(q.sortIndex=z,e(h,q),n(u)===null&&q===n(h)&&(x?(w(v),v=-1):x=!0,Le(D,z-X))):(q.sortIndex=te,e(u,q),k||R||(k=!0,De(j))),q},t.unstable_shouldYield=P,t.unstable_wrapCallback=function(q){var L=_;return function(){var z=_;_=L;try{return q.apply(this,arguments)}finally{_=z}}}})(s_);i_.exports=s_;var HT=i_.exports;/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var KT=b,kt=HT;function B(t){for(var e="https://reactjs.org/docs/error-decoder.html?invariant="+t,n=1;n<arguments.length;n++)e+="&args[]="+encodeURIComponent(arguments[n]);return"Minified React error #"+t+"; visit "+e+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var o_=new Set,ao={};function ii(t,e){Fi(t,e),Fi(t+"Capture",e)}function Fi(t,e){for(ao[t]=e,t=0;t<e.length;t++)o_.add(e[t])}var Dn=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),$c=Object.prototype.hasOwnProperty,GT=/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,cm={},hm={};function QT(t){return $c.call(hm,t)?!0:$c.call(cm,t)?!1:GT.test(t)?hm[t]=!0:(cm[t]=!0,!1)}function XT(t,e,n,r){if(n!==null&&n.type===0)return!1;switch(typeof e){case"function":case"symbol":return!0;case"boolean":return r?!1:n!==null?!n.acceptsBooleans:(t=t.toLowerCase().slice(0,5),t!=="data-"&&t!=="aria-");default:return!1}}function YT(t,e,n,r){if(e===null||typeof e>"u"||XT(t,e,n,r))return!0;if(r)return!1;if(n!==null)switch(n.type){case 3:return!e;case 4:return e===!1;case 5:return isNaN(e);case 6:return isNaN(e)||1>e}return!1}function mt(t,e,n,r,i,s,o){this.acceptsBooleans=e===2||e===3||e===4,this.attributeName=r,this.attributeNamespace=i,this.mustUseProperty=n,this.propertyName=t,this.type=e,this.sanitizeURL=s,this.removeEmptyString=o}var Xe={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(t){Xe[t]=new mt(t,0,!1,t,null,!1,!1)});[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(t){var e=t[0];Xe[e]=new mt(e,1,!1,t[1],null,!1,!1)});["contentEditable","draggable","spellCheck","value"].forEach(function(t){Xe[t]=new mt(t,2,!1,t.toLowerCase(),null,!1,!1)});["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(t){Xe[t]=new mt(t,2,!1,t,null,!1,!1)});"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(t){Xe[t]=new mt(t,3,!1,t.toLowerCase(),null,!1,!1)});["checked","multiple","muted","selected"].forEach(function(t){Xe[t]=new mt(t,3,!0,t,null,!1,!1)});["capture","download"].forEach(function(t){Xe[t]=new mt(t,4,!1,t,null,!1,!1)});["cols","rows","size","span"].forEach(function(t){Xe[t]=new mt(t,6,!1,t,null,!1,!1)});["rowSpan","start"].forEach(function(t){Xe[t]=new mt(t,5,!1,t.toLowerCase(),null,!1,!1)});var pd=/[\-:]([a-z])/g;function md(t){return t[1].toUpperCase()}"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(t){var e=t.replace(pd,md);Xe[e]=new mt(e,1,!1,t,null,!1,!1)});"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(t){var e=t.replace(pd,md);Xe[e]=new mt(e,1,!1,t,"http://www.w3.org/1999/xlink",!1,!1)});["xml:base","xml:lang","xml:space"].forEach(function(t){var e=t.replace(pd,md);Xe[e]=new mt(e,1,!1,t,"http://www.w3.org/XML/1998/namespace",!1,!1)});["tabIndex","crossOrigin"].forEach(function(t){Xe[t]=new mt(t,1,!1,t.toLowerCase(),null,!1,!1)});Xe.xlinkHref=new mt("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1);["src","href","action","formAction"].forEach(function(t){Xe[t]=new mt(t,1,!1,t.toLowerCase(),null,!0,!0)});function gd(t,e,n,r){var i=Xe.hasOwnProperty(e)?Xe[e]:null;(i!==null?i.type!==0:r||!(2<e.length)||e[0]!=="o"&&e[0]!=="O"||e[1]!=="n"&&e[1]!=="N")&&(YT(e,n,i,r)&&(n=null),r||i===null?QT(e)&&(n===null?t.removeAttribute(e):t.setAttribute(e,""+n)):i.mustUseProperty?t[i.propertyName]=n===null?i.type===3?!1:"":n:(e=i.attributeName,r=i.attributeNamespace,n===null?t.removeAttribute(e):(i=i.type,n=i===3||i===4&&n===!0?"":""+n,r?t.setAttributeNS(r,e,n):t.setAttribute(e,n))))}var Fn=KT.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,wa=Symbol.for("react.element"),_i=Symbol.for("react.portal"),vi=Symbol.for("react.fragment"),yd=Symbol.for("react.strict_mode"),Wc=Symbol.for("react.profiler"),a_=Symbol.for("react.provider"),l_=Symbol.for("react.context"),_d=Symbol.for("react.forward_ref"),qc=Symbol.for("react.suspense"),Hc=Symbol.for("react.suspense_list"),vd=Symbol.for("react.memo"),Gn=Symbol.for("react.lazy"),u_=Symbol.for("react.offscreen"),dm=Symbol.iterator;function ks(t){return t===null||typeof t!="object"?null:(t=dm&&t[dm]||t["@@iterator"],typeof t=="function"?t:null)}var Ie=Object.assign,rc;function js(t){if(rc===void 0)try{throw Error()}catch(n){var e=n.stack.trim().match(/\n( *(at )?)/);rc=e&&e[1]||""}return`
`+rc+t}var ic=!1;function sc(t,e){if(!t||ic)return"";ic=!0;var n=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(e)if(e=function(){throw Error()},Object.defineProperty(e.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(e,[])}catch(h){var r=h}Reflect.construct(t,[],e)}else{try{e.call()}catch(h){r=h}t.call(e.prototype)}else{try{throw Error()}catch(h){r=h}t()}}catch(h){if(h&&r&&typeof h.stack=="string"){for(var i=h.stack.split(`
`),s=r.stack.split(`
`),o=i.length-1,l=s.length-1;1<=o&&0<=l&&i[o]!==s[l];)l--;for(;1<=o&&0<=l;o--,l--)if(i[o]!==s[l]){if(o!==1||l!==1)do if(o--,l--,0>l||i[o]!==s[l]){var u=`
`+i[o].replace(" at new "," at ");return t.displayName&&u.includes("<anonymous>")&&(u=u.replace("<anonymous>",t.displayName)),u}while(1<=o&&0<=l);break}}}finally{ic=!1,Error.prepareStackTrace=n}return(t=t?t.displayName||t.name:"")?js(t):""}function JT(t){switch(t.tag){case 5:return js(t.type);case 16:return js("Lazy");case 13:return js("Suspense");case 19:return js("SuspenseList");case 0:case 2:case 15:return t=sc(t.type,!1),t;case 11:return t=sc(t.type.render,!1),t;case 1:return t=sc(t.type,!0),t;default:return""}}function Kc(t){if(t==null)return null;if(typeof t=="function")return t.displayName||t.name||null;if(typeof t=="string")return t;switch(t){case vi:return"Fragment";case _i:return"Portal";case Wc:return"Profiler";case yd:return"StrictMode";case qc:return"Suspense";case Hc:return"SuspenseList"}if(typeof t=="object")switch(t.$$typeof){case l_:return(t.displayName||"Context")+".Consumer";case a_:return(t._context.displayName||"Context")+".Provider";case _d:var e=t.render;return t=t.displayName,t||(t=e.displayName||e.name||"",t=t!==""?"ForwardRef("+t+")":"ForwardRef"),t;case vd:return e=t.displayName||null,e!==null?e:Kc(t.type)||"Memo";case Gn:e=t._payload,t=t._init;try{return Kc(t(e))}catch{}}return null}function ZT(t){var e=t.type;switch(t.tag){case 24:return"Cache";case 9:return(e.displayName||"Context")+".Consumer";case 10:return(e._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return t=e.render,t=t.displayName||t.name||"",e.displayName||(t!==""?"ForwardRef("+t+")":"ForwardRef");case 7:return"Fragment";case 5:return e;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return Kc(e);case 8:return e===yd?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if(typeof e=="function")return e.displayName||e.name||null;if(typeof e=="string")return e}return null}function _r(t){switch(typeof t){case"boolean":case"number":case"string":case"undefined":return t;case"object":return t;default:return""}}function c_(t){var e=t.type;return(t=t.nodeName)&&t.toLowerCase()==="input"&&(e==="checkbox"||e==="radio")}function eI(t){var e=c_(t)?"checked":"value",n=Object.getOwnPropertyDescriptor(t.constructor.prototype,e),r=""+t[e];if(!t.hasOwnProperty(e)&&typeof n<"u"&&typeof n.get=="function"&&typeof n.set=="function"){var i=n.get,s=n.set;return Object.defineProperty(t,e,{configurable:!0,get:function(){return i.call(this)},set:function(o){r=""+o,s.call(this,o)}}),Object.defineProperty(t,e,{enumerable:n.enumerable}),{getValue:function(){return r},setValue:function(o){r=""+o},stopTracking:function(){t._valueTracker=null,delete t[e]}}}}function Ea(t){t._valueTracker||(t._valueTracker=eI(t))}function h_(t){if(!t)return!1;var e=t._valueTracker;if(!e)return!0;var n=e.getValue(),r="";return t&&(r=c_(t)?t.checked?"true":"false":t.value),t=r,t!==n?(e.setValue(t),!0):!1}function cl(t){if(t=t||(typeof document<"u"?document:void 0),typeof t>"u")return null;try{return t.activeElement||t.body}catch{return t.body}}function Gc(t,e){var n=e.checked;return Ie({},e,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:n??t._wrapperState.initialChecked})}function fm(t,e){var n=e.defaultValue==null?"":e.defaultValue,r=e.checked!=null?e.checked:e.defaultChecked;n=_r(e.value!=null?e.value:n),t._wrapperState={initialChecked:r,initialValue:n,controlled:e.type==="checkbox"||e.type==="radio"?e.checked!=null:e.value!=null}}function d_(t,e){e=e.checked,e!=null&&gd(t,"checked",e,!1)}function Qc(t,e){d_(t,e);var n=_r(e.value),r=e.type;if(n!=null)r==="number"?(n===0&&t.value===""||t.value!=n)&&(t.value=""+n):t.value!==""+n&&(t.value=""+n);else if(r==="submit"||r==="reset"){t.removeAttribute("value");return}e.hasOwnProperty("value")?Xc(t,e.type,n):e.hasOwnProperty("defaultValue")&&Xc(t,e.type,_r(e.defaultValue)),e.checked==null&&e.defaultChecked!=null&&(t.defaultChecked=!!e.defaultChecked)}function pm(t,e,n){if(e.hasOwnProperty("value")||e.hasOwnProperty("defaultValue")){var r=e.type;if(!(r!=="submit"&&r!=="reset"||e.value!==void 0&&e.value!==null))return;e=""+t._wrapperState.initialValue,n||e===t.value||(t.value=e),t.defaultValue=e}n=t.name,n!==""&&(t.name=""),t.defaultChecked=!!t._wrapperState.initialChecked,n!==""&&(t.name=n)}function Xc(t,e,n){(e!=="number"||cl(t.ownerDocument)!==t)&&(n==null?t.defaultValue=""+t._wrapperState.initialValue:t.defaultValue!==""+n&&(t.defaultValue=""+n))}var Us=Array.isArray;function xi(t,e,n,r){if(t=t.options,e){e={};for(var i=0;i<n.length;i++)e["$"+n[i]]=!0;for(n=0;n<t.length;n++)i=e.hasOwnProperty("$"+t[n].value),t[n].selected!==i&&(t[n].selected=i),i&&r&&(t[n].defaultSelected=!0)}else{for(n=""+_r(n),e=null,i=0;i<t.length;i++){if(t[i].value===n){t[i].selected=!0,r&&(t[i].defaultSelected=!0);return}e!==null||t[i].disabled||(e=t[i])}e!==null&&(e.selected=!0)}}function Yc(t,e){if(e.dangerouslySetInnerHTML!=null)throw Error(B(91));return Ie({},e,{value:void 0,defaultValue:void 0,children:""+t._wrapperState.initialValue})}function mm(t,e){var n=e.value;if(n==null){if(n=e.children,e=e.defaultValue,n!=null){if(e!=null)throw Error(B(92));if(Us(n)){if(1<n.length)throw Error(B(93));n=n[0]}e=n}e==null&&(e=""),n=e}t._wrapperState={initialValue:_r(n)}}function f_(t,e){var n=_r(e.value),r=_r(e.defaultValue);n!=null&&(n=""+n,n!==t.value&&(t.value=n),e.defaultValue==null&&t.defaultValue!==n&&(t.defaultValue=n)),r!=null&&(t.defaultValue=""+r)}function gm(t){var e=t.textContent;e===t._wrapperState.initialValue&&e!==""&&e!==null&&(t.value=e)}function p_(t){switch(t){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function Jc(t,e){return t==null||t==="http://www.w3.org/1999/xhtml"?p_(e):t==="http://www.w3.org/2000/svg"&&e==="foreignObject"?"http://www.w3.org/1999/xhtml":t}var Ta,m_=function(t){return typeof MSApp<"u"&&MSApp.execUnsafeLocalFunction?function(e,n,r,i){MSApp.execUnsafeLocalFunction(function(){return t(e,n,r,i)})}:t}(function(t,e){if(t.namespaceURI!=="http://www.w3.org/2000/svg"||"innerHTML"in t)t.innerHTML=e;else{for(Ta=Ta||document.createElement("div"),Ta.innerHTML="<svg>"+e.valueOf().toString()+"</svg>",e=Ta.firstChild;t.firstChild;)t.removeChild(t.firstChild);for(;e.firstChild;)t.appendChild(e.firstChild)}});function lo(t,e){if(e){var n=t.firstChild;if(n&&n===t.lastChild&&n.nodeType===3){n.nodeValue=e;return}}t.textContent=e}var Hs={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},tI=["Webkit","ms","Moz","O"];Object.keys(Hs).forEach(function(t){tI.forEach(function(e){e=e+t.charAt(0).toUpperCase()+t.substring(1),Hs[e]=Hs[t]})});function g_(t,e,n){return e==null||typeof e=="boolean"||e===""?"":n||typeof e!="number"||e===0||Hs.hasOwnProperty(t)&&Hs[t]?(""+e).trim():e+"px"}function y_(t,e){t=t.style;for(var n in e)if(e.hasOwnProperty(n)){var r=n.indexOf("--")===0,i=g_(n,e[n],r);n==="float"&&(n="cssFloat"),r?t.setProperty(n,i):t[n]=i}}var nI=Ie({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});function Zc(t,e){if(e){if(nI[t]&&(e.children!=null||e.dangerouslySetInnerHTML!=null))throw Error(B(137,t));if(e.dangerouslySetInnerHTML!=null){if(e.children!=null)throw Error(B(60));if(typeof e.dangerouslySetInnerHTML!="object"||!("__html"in e.dangerouslySetInnerHTML))throw Error(B(61))}if(e.style!=null&&typeof e.style!="object")throw Error(B(62))}}function eh(t,e){if(t.indexOf("-")===-1)return typeof e.is=="string";switch(t){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var th=null;function wd(t){return t=t.target||t.srcElement||window,t.correspondingUseElement&&(t=t.correspondingUseElement),t.nodeType===3?t.parentNode:t}var nh=null,Ni=null,Di=null;function ym(t){if(t=Fo(t)){if(typeof nh!="function")throw Error(B(280));var e=t.stateNode;e&&(e=ru(e),nh(t.stateNode,t.type,e))}}function __(t){Ni?Di?Di.push(t):Di=[t]:Ni=t}function v_(){if(Ni){var t=Ni,e=Di;if(Di=Ni=null,ym(t),e)for(t=0;t<e.length;t++)ym(e[t])}}function w_(t,e){return t(e)}function E_(){}var oc=!1;function T_(t,e,n){if(oc)return t(e,n);oc=!0;try{return w_(t,e,n)}finally{oc=!1,(Ni!==null||Di!==null)&&(E_(),v_())}}function uo(t,e){var n=t.stateNode;if(n===null)return null;var r=ru(n);if(r===null)return null;n=r[e];e:switch(e){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(r=!r.disabled)||(t=t.type,r=!(t==="button"||t==="input"||t==="select"||t==="textarea")),t=!r;break e;default:t=!1}if(t)return null;if(n&&typeof n!="function")throw Error(B(231,e,typeof n));return n}var rh=!1;if(Dn)try{var Cs={};Object.defineProperty(Cs,"passive",{get:function(){rh=!0}}),window.addEventListener("test",Cs,Cs),window.removeEventListener("test",Cs,Cs)}catch{rh=!1}function rI(t,e,n,r,i,s,o,l,u){var h=Array.prototype.slice.call(arguments,3);try{e.apply(n,h)}catch(f){this.onError(f)}}var Ks=!1,hl=null,dl=!1,ih=null,iI={onError:function(t){Ks=!0,hl=t}};function sI(t,e,n,r,i,s,o,l,u){Ks=!1,hl=null,rI.apply(iI,arguments)}function oI(t,e,n,r,i,s,o,l,u){if(sI.apply(this,arguments),Ks){if(Ks){var h=hl;Ks=!1,hl=null}else throw Error(B(198));dl||(dl=!0,ih=h)}}function si(t){var e=t,n=t;if(t.alternate)for(;e.return;)e=e.return;else{t=e;do e=t,e.flags&4098&&(n=e.return),t=e.return;while(t)}return e.tag===3?n:null}function I_(t){if(t.tag===13){var e=t.memoizedState;if(e===null&&(t=t.alternate,t!==null&&(e=t.memoizedState)),e!==null)return e.dehydrated}return null}function _m(t){if(si(t)!==t)throw Error(B(188))}function aI(t){var e=t.alternate;if(!e){if(e=si(t),e===null)throw Error(B(188));return e!==t?null:t}for(var n=t,r=e;;){var i=n.return;if(i===null)break;var s=i.alternate;if(s===null){if(r=i.return,r!==null){n=r;continue}break}if(i.child===s.child){for(s=i.child;s;){if(s===n)return _m(i),t;if(s===r)return _m(i),e;s=s.sibling}throw Error(B(188))}if(n.return!==r.return)n=i,r=s;else{for(var o=!1,l=i.child;l;){if(l===n){o=!0,n=i,r=s;break}if(l===r){o=!0,r=i,n=s;break}l=l.sibling}if(!o){for(l=s.child;l;){if(l===n){o=!0,n=s,r=i;break}if(l===r){o=!0,r=s,n=i;break}l=l.sibling}if(!o)throw Error(B(189))}}if(n.alternate!==r)throw Error(B(190))}if(n.tag!==3)throw Error(B(188));return n.stateNode.current===n?t:e}function S_(t){return t=aI(t),t!==null?R_(t):null}function R_(t){if(t.tag===5||t.tag===6)return t;for(t=t.child;t!==null;){var e=R_(t);if(e!==null)return e;t=t.sibling}return null}var A_=kt.unstable_scheduleCallback,vm=kt.unstable_cancelCallback,lI=kt.unstable_shouldYield,uI=kt.unstable_requestPaint,xe=kt.unstable_now,cI=kt.unstable_getCurrentPriorityLevel,Ed=kt.unstable_ImmediatePriority,k_=kt.unstable_UserBlockingPriority,fl=kt.unstable_NormalPriority,hI=kt.unstable_LowPriority,C_=kt.unstable_IdlePriority,Zl=null,sn=null;function dI(t){if(sn&&typeof sn.onCommitFiberRoot=="function")try{sn.onCommitFiberRoot(Zl,t,void 0,(t.current.flags&128)===128)}catch{}}var Wt=Math.clz32?Math.clz32:mI,fI=Math.log,pI=Math.LN2;function mI(t){return t>>>=0,t===0?32:31-(fI(t)/pI|0)|0}var Ia=64,Sa=4194304;function Fs(t){switch(t&-t){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return t&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return t&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return t}}function pl(t,e){var n=t.pendingLanes;if(n===0)return 0;var r=0,i=t.suspendedLanes,s=t.pingedLanes,o=n&268435455;if(o!==0){var l=o&~i;l!==0?r=Fs(l):(s&=o,s!==0&&(r=Fs(s)))}else o=n&~i,o!==0?r=Fs(o):s!==0&&(r=Fs(s));if(r===0)return 0;if(e!==0&&e!==r&&!(e&i)&&(i=r&-r,s=e&-e,i>=s||i===16&&(s&4194240)!==0))return e;if(r&4&&(r|=n&16),e=t.entangledLanes,e!==0)for(t=t.entanglements,e&=r;0<e;)n=31-Wt(e),i=1<<n,r|=t[n],e&=~i;return r}function gI(t,e){switch(t){case 1:case 2:case 4:return e+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return e+5e3;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function yI(t,e){for(var n=t.suspendedLanes,r=t.pingedLanes,i=t.expirationTimes,s=t.pendingLanes;0<s;){var o=31-Wt(s),l=1<<o,u=i[o];u===-1?(!(l&n)||l&r)&&(i[o]=gI(l,e)):u<=e&&(t.expiredLanes|=l),s&=~l}}function sh(t){return t=t.pendingLanes&-1073741825,t!==0?t:t&1073741824?1073741824:0}function P_(){var t=Ia;return Ia<<=1,!(Ia&4194240)&&(Ia=64),t}function ac(t){for(var e=[],n=0;31>n;n++)e.push(t);return e}function jo(t,e,n){t.pendingLanes|=e,e!==536870912&&(t.suspendedLanes=0,t.pingedLanes=0),t=t.eventTimes,e=31-Wt(e),t[e]=n}function _I(t,e){var n=t.pendingLanes&~e;t.pendingLanes=e,t.suspendedLanes=0,t.pingedLanes=0,t.expiredLanes&=e,t.mutableReadLanes&=e,t.entangledLanes&=e,e=t.entanglements;var r=t.eventTimes;for(t=t.expirationTimes;0<n;){var i=31-Wt(n),s=1<<i;e[i]=0,r[i]=-1,t[i]=-1,n&=~s}}function Td(t,e){var n=t.entangledLanes|=e;for(t=t.entanglements;n;){var r=31-Wt(n),i=1<<r;i&e|t[r]&e&&(t[r]|=e),n&=~i}}var ce=0;function x_(t){return t&=-t,1<t?4<t?t&268435455?16:536870912:4:1}var N_,Id,D_,O_,b_,oh=!1,Ra=[],or=null,ar=null,lr=null,co=new Map,ho=new Map,Xn=[],vI="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");function wm(t,e){switch(t){case"focusin":case"focusout":or=null;break;case"dragenter":case"dragleave":ar=null;break;case"mouseover":case"mouseout":lr=null;break;case"pointerover":case"pointerout":co.delete(e.pointerId);break;case"gotpointercapture":case"lostpointercapture":ho.delete(e.pointerId)}}function Ps(t,e,n,r,i,s){return t===null||t.nativeEvent!==s?(t={blockedOn:e,domEventName:n,eventSystemFlags:r,nativeEvent:s,targetContainers:[i]},e!==null&&(e=Fo(e),e!==null&&Id(e)),t):(t.eventSystemFlags|=r,e=t.targetContainers,i!==null&&e.indexOf(i)===-1&&e.push(i),t)}function wI(t,e,n,r,i){switch(e){case"focusin":return or=Ps(or,t,e,n,r,i),!0;case"dragenter":return ar=Ps(ar,t,e,n,r,i),!0;case"mouseover":return lr=Ps(lr,t,e,n,r,i),!0;case"pointerover":var s=i.pointerId;return co.set(s,Ps(co.get(s)||null,t,e,n,r,i)),!0;case"gotpointercapture":return s=i.pointerId,ho.set(s,Ps(ho.get(s)||null,t,e,n,r,i)),!0}return!1}function V_(t){var e=Vr(t.target);if(e!==null){var n=si(e);if(n!==null){if(e=n.tag,e===13){if(e=I_(n),e!==null){t.blockedOn=e,b_(t.priority,function(){D_(n)});return}}else if(e===3&&n.stateNode.current.memoizedState.isDehydrated){t.blockedOn=n.tag===3?n.stateNode.containerInfo:null;return}}}t.blockedOn=null}function qa(t){if(t.blockedOn!==null)return!1;for(var e=t.targetContainers;0<e.length;){var n=ah(t.domEventName,t.eventSystemFlags,e[0],t.nativeEvent);if(n===null){n=t.nativeEvent;var r=new n.constructor(n.type,n);th=r,n.target.dispatchEvent(r),th=null}else return e=Fo(n),e!==null&&Id(e),t.blockedOn=n,!1;e.shift()}return!0}function Em(t,e,n){qa(t)&&n.delete(e)}function EI(){oh=!1,or!==null&&qa(or)&&(or=null),ar!==null&&qa(ar)&&(ar=null),lr!==null&&qa(lr)&&(lr=null),co.forEach(Em),ho.forEach(Em)}function xs(t,e){t.blockedOn===e&&(t.blockedOn=null,oh||(oh=!0,kt.unstable_scheduleCallback(kt.unstable_NormalPriority,EI)))}function fo(t){function e(i){return xs(i,t)}if(0<Ra.length){xs(Ra[0],t);for(var n=1;n<Ra.length;n++){var r=Ra[n];r.blockedOn===t&&(r.blockedOn=null)}}for(or!==null&&xs(or,t),ar!==null&&xs(ar,t),lr!==null&&xs(lr,t),co.forEach(e),ho.forEach(e),n=0;n<Xn.length;n++)r=Xn[n],r.blockedOn===t&&(r.blockedOn=null);for(;0<Xn.length&&(n=Xn[0],n.blockedOn===null);)V_(n),n.blockedOn===null&&Xn.shift()}var Oi=Fn.ReactCurrentBatchConfig,ml=!0;function TI(t,e,n,r){var i=ce,s=Oi.transition;Oi.transition=null;try{ce=1,Sd(t,e,n,r)}finally{ce=i,Oi.transition=s}}function II(t,e,n,r){var i=ce,s=Oi.transition;Oi.transition=null;try{ce=4,Sd(t,e,n,r)}finally{ce=i,Oi.transition=s}}function Sd(t,e,n,r){if(ml){var i=ah(t,e,n,r);if(i===null)yc(t,e,r,gl,n),wm(t,r);else if(wI(i,t,e,n,r))r.stopPropagation();else if(wm(t,r),e&4&&-1<vI.indexOf(t)){for(;i!==null;){var s=Fo(i);if(s!==null&&N_(s),s=ah(t,e,n,r),s===null&&yc(t,e,r,gl,n),s===i)break;i=s}i!==null&&r.stopPropagation()}else yc(t,e,r,null,n)}}var gl=null;function ah(t,e,n,r){if(gl=null,t=wd(r),t=Vr(t),t!==null)if(e=si(t),e===null)t=null;else if(n=e.tag,n===13){if(t=I_(e),t!==null)return t;t=null}else if(n===3){if(e.stateNode.current.memoizedState.isDehydrated)return e.tag===3?e.stateNode.containerInfo:null;t=null}else e!==t&&(t=null);return gl=t,null}function L_(t){switch(t){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(cI()){case Ed:return 1;case k_:return 4;case fl:case hI:return 16;case C_:return 536870912;default:return 16}default:return 16}}var nr=null,Rd=null,Ha=null;function M_(){if(Ha)return Ha;var t,e=Rd,n=e.length,r,i="value"in nr?nr.value:nr.textContent,s=i.length;for(t=0;t<n&&e[t]===i[t];t++);var o=n-t;for(r=1;r<=o&&e[n-r]===i[s-r];r++);return Ha=i.slice(t,1<r?1-r:void 0)}function Ka(t){var e=t.keyCode;return"charCode"in t?(t=t.charCode,t===0&&e===13&&(t=13)):t=e,t===10&&(t=13),32<=t||t===13?t:0}function Aa(){return!0}function Tm(){return!1}function Pt(t){function e(n,r,i,s,o){this._reactName=n,this._targetInst=i,this.type=r,this.nativeEvent=s,this.target=o,this.currentTarget=null;for(var l in t)t.hasOwnProperty(l)&&(n=t[l],this[l]=n?n(s):s[l]);return this.isDefaultPrevented=(s.defaultPrevented!=null?s.defaultPrevented:s.returnValue===!1)?Aa:Tm,this.isPropagationStopped=Tm,this}return Ie(e.prototype,{preventDefault:function(){this.defaultPrevented=!0;var n=this.nativeEvent;n&&(n.preventDefault?n.preventDefault():typeof n.returnValue!="unknown"&&(n.returnValue=!1),this.isDefaultPrevented=Aa)},stopPropagation:function(){var n=this.nativeEvent;n&&(n.stopPropagation?n.stopPropagation():typeof n.cancelBubble!="unknown"&&(n.cancelBubble=!0),this.isPropagationStopped=Aa)},persist:function(){},isPersistent:Aa}),e}var rs={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(t){return t.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},Ad=Pt(rs),Uo=Ie({},rs,{view:0,detail:0}),SI=Pt(Uo),lc,uc,Ns,eu=Ie({},Uo,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:kd,button:0,buttons:0,relatedTarget:function(t){return t.relatedTarget===void 0?t.fromElement===t.srcElement?t.toElement:t.fromElement:t.relatedTarget},movementX:function(t){return"movementX"in t?t.movementX:(t!==Ns&&(Ns&&t.type==="mousemove"?(lc=t.screenX-Ns.screenX,uc=t.screenY-Ns.screenY):uc=lc=0,Ns=t),lc)},movementY:function(t){return"movementY"in t?t.movementY:uc}}),Im=Pt(eu),RI=Ie({},eu,{dataTransfer:0}),AI=Pt(RI),kI=Ie({},Uo,{relatedTarget:0}),cc=Pt(kI),CI=Ie({},rs,{animationName:0,elapsedTime:0,pseudoElement:0}),PI=Pt(CI),xI=Ie({},rs,{clipboardData:function(t){return"clipboardData"in t?t.clipboardData:window.clipboardData}}),NI=Pt(xI),DI=Ie({},rs,{data:0}),Sm=Pt(DI),OI={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},bI={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},VI={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function LI(t){var e=this.nativeEvent;return e.getModifierState?e.getModifierState(t):(t=VI[t])?!!e[t]:!1}function kd(){return LI}var MI=Ie({},Uo,{key:function(t){if(t.key){var e=OI[t.key]||t.key;if(e!=="Unidentified")return e}return t.type==="keypress"?(t=Ka(t),t===13?"Enter":String.fromCharCode(t)):t.type==="keydown"||t.type==="keyup"?bI[t.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:kd,charCode:function(t){return t.type==="keypress"?Ka(t):0},keyCode:function(t){return t.type==="keydown"||t.type==="keyup"?t.keyCode:0},which:function(t){return t.type==="keypress"?Ka(t):t.type==="keydown"||t.type==="keyup"?t.keyCode:0}}),jI=Pt(MI),UI=Ie({},eu,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),Rm=Pt(UI),FI=Ie({},Uo,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:kd}),BI=Pt(FI),zI=Ie({},rs,{propertyName:0,elapsedTime:0,pseudoElement:0}),$I=Pt(zI),WI=Ie({},eu,{deltaX:function(t){return"deltaX"in t?t.deltaX:"wheelDeltaX"in t?-t.wheelDeltaX:0},deltaY:function(t){return"deltaY"in t?t.deltaY:"wheelDeltaY"in t?-t.wheelDeltaY:"wheelDelta"in t?-t.wheelDelta:0},deltaZ:0,deltaMode:0}),qI=Pt(WI),HI=[9,13,27,32],Cd=Dn&&"CompositionEvent"in window,Gs=null;Dn&&"documentMode"in document&&(Gs=document.documentMode);var KI=Dn&&"TextEvent"in window&&!Gs,j_=Dn&&(!Cd||Gs&&8<Gs&&11>=Gs),Am=" ",km=!1;function U_(t,e){switch(t){case"keyup":return HI.indexOf(e.keyCode)!==-1;case"keydown":return e.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function F_(t){return t=t.detail,typeof t=="object"&&"data"in t?t.data:null}var wi=!1;function GI(t,e){switch(t){case"compositionend":return F_(e);case"keypress":return e.which!==32?null:(km=!0,Am);case"textInput":return t=e.data,t===Am&&km?null:t;default:return null}}function QI(t,e){if(wi)return t==="compositionend"||!Cd&&U_(t,e)?(t=M_(),Ha=Rd=nr=null,wi=!1,t):null;switch(t){case"paste":return null;case"keypress":if(!(e.ctrlKey||e.altKey||e.metaKey)||e.ctrlKey&&e.altKey){if(e.char&&1<e.char.length)return e.char;if(e.which)return String.fromCharCode(e.which)}return null;case"compositionend":return j_&&e.locale!=="ko"?null:e.data;default:return null}}var XI={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function Cm(t){var e=t&&t.nodeName&&t.nodeName.toLowerCase();return e==="input"?!!XI[t.type]:e==="textarea"}function B_(t,e,n,r){__(r),e=yl(e,"onChange"),0<e.length&&(n=new Ad("onChange","change",null,n,r),t.push({event:n,listeners:e}))}var Qs=null,po=null;function YI(t){J_(t,0)}function tu(t){var e=Ii(t);if(h_(e))return t}function JI(t,e){if(t==="change")return e}var z_=!1;if(Dn){var hc;if(Dn){var dc="oninput"in document;if(!dc){var Pm=document.createElement("div");Pm.setAttribute("oninput","return;"),dc=typeof Pm.oninput=="function"}hc=dc}else hc=!1;z_=hc&&(!document.documentMode||9<document.documentMode)}function xm(){Qs&&(Qs.detachEvent("onpropertychange",$_),po=Qs=null)}function $_(t){if(t.propertyName==="value"&&tu(po)){var e=[];B_(e,po,t,wd(t)),T_(YI,e)}}function ZI(t,e,n){t==="focusin"?(xm(),Qs=e,po=n,Qs.attachEvent("onpropertychange",$_)):t==="focusout"&&xm()}function eS(t){if(t==="selectionchange"||t==="keyup"||t==="keydown")return tu(po)}function tS(t,e){if(t==="click")return tu(e)}function nS(t,e){if(t==="input"||t==="change")return tu(e)}function rS(t,e){return t===e&&(t!==0||1/t===1/e)||t!==t&&e!==e}var Yt=typeof Object.is=="function"?Object.is:rS;function mo(t,e){if(Yt(t,e))return!0;if(typeof t!="object"||t===null||typeof e!="object"||e===null)return!1;var n=Object.keys(t),r=Object.keys(e);if(n.length!==r.length)return!1;for(r=0;r<n.length;r++){var i=n[r];if(!$c.call(e,i)||!Yt(t[i],e[i]))return!1}return!0}function Nm(t){for(;t&&t.firstChild;)t=t.firstChild;return t}function Dm(t,e){var n=Nm(t);t=0;for(var r;n;){if(n.nodeType===3){if(r=t+n.textContent.length,t<=e&&r>=e)return{node:n,offset:e-t};t=r}e:{for(;n;){if(n.nextSibling){n=n.nextSibling;break e}n=n.parentNode}n=void 0}n=Nm(n)}}function W_(t,e){return t&&e?t===e?!0:t&&t.nodeType===3?!1:e&&e.nodeType===3?W_(t,e.parentNode):"contains"in t?t.contains(e):t.compareDocumentPosition?!!(t.compareDocumentPosition(e)&16):!1:!1}function q_(){for(var t=window,e=cl();e instanceof t.HTMLIFrameElement;){try{var n=typeof e.contentWindow.location.href=="string"}catch{n=!1}if(n)t=e.contentWindow;else break;e=cl(t.document)}return e}function Pd(t){var e=t&&t.nodeName&&t.nodeName.toLowerCase();return e&&(e==="input"&&(t.type==="text"||t.type==="search"||t.type==="tel"||t.type==="url"||t.type==="password")||e==="textarea"||t.contentEditable==="true")}function iS(t){var e=q_(),n=t.focusedElem,r=t.selectionRange;if(e!==n&&n&&n.ownerDocument&&W_(n.ownerDocument.documentElement,n)){if(r!==null&&Pd(n)){if(e=r.start,t=r.end,t===void 0&&(t=e),"selectionStart"in n)n.selectionStart=e,n.selectionEnd=Math.min(t,n.value.length);else if(t=(e=n.ownerDocument||document)&&e.defaultView||window,t.getSelection){t=t.getSelection();var i=n.textContent.length,s=Math.min(r.start,i);r=r.end===void 0?s:Math.min(r.end,i),!t.extend&&s>r&&(i=r,r=s,s=i),i=Dm(n,s);var o=Dm(n,r);i&&o&&(t.rangeCount!==1||t.anchorNode!==i.node||t.anchorOffset!==i.offset||t.focusNode!==o.node||t.focusOffset!==o.offset)&&(e=e.createRange(),e.setStart(i.node,i.offset),t.removeAllRanges(),s>r?(t.addRange(e),t.extend(o.node,o.offset)):(e.setEnd(o.node,o.offset),t.addRange(e)))}}for(e=[],t=n;t=t.parentNode;)t.nodeType===1&&e.push({element:t,left:t.scrollLeft,top:t.scrollTop});for(typeof n.focus=="function"&&n.focus(),n=0;n<e.length;n++)t=e[n],t.element.scrollLeft=t.left,t.element.scrollTop=t.top}}var sS=Dn&&"documentMode"in document&&11>=document.documentMode,Ei=null,lh=null,Xs=null,uh=!1;function Om(t,e,n){var r=n.window===n?n.document:n.nodeType===9?n:n.ownerDocument;uh||Ei==null||Ei!==cl(r)||(r=Ei,"selectionStart"in r&&Pd(r)?r={start:r.selectionStart,end:r.selectionEnd}:(r=(r.ownerDocument&&r.ownerDocument.defaultView||window).getSelection(),r={anchorNode:r.anchorNode,anchorOffset:r.anchorOffset,focusNode:r.focusNode,focusOffset:r.focusOffset}),Xs&&mo(Xs,r)||(Xs=r,r=yl(lh,"onSelect"),0<r.length&&(e=new Ad("onSelect","select",null,e,n),t.push({event:e,listeners:r}),e.target=Ei)))}function ka(t,e){var n={};return n[t.toLowerCase()]=e.toLowerCase(),n["Webkit"+t]="webkit"+e,n["Moz"+t]="moz"+e,n}var Ti={animationend:ka("Animation","AnimationEnd"),animationiteration:ka("Animation","AnimationIteration"),animationstart:ka("Animation","AnimationStart"),transitionend:ka("Transition","TransitionEnd")},fc={},H_={};Dn&&(H_=document.createElement("div").style,"AnimationEvent"in window||(delete Ti.animationend.animation,delete Ti.animationiteration.animation,delete Ti.animationstart.animation),"TransitionEvent"in window||delete Ti.transitionend.transition);function nu(t){if(fc[t])return fc[t];if(!Ti[t])return t;var e=Ti[t],n;for(n in e)if(e.hasOwnProperty(n)&&n in H_)return fc[t]=e[n];return t}var K_=nu("animationend"),G_=nu("animationiteration"),Q_=nu("animationstart"),X_=nu("transitionend"),Y_=new Map,bm="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");function Sr(t,e){Y_.set(t,e),ii(e,[t])}for(var pc=0;pc<bm.length;pc++){var mc=bm[pc],oS=mc.toLowerCase(),aS=mc[0].toUpperCase()+mc.slice(1);Sr(oS,"on"+aS)}Sr(K_,"onAnimationEnd");Sr(G_,"onAnimationIteration");Sr(Q_,"onAnimationStart");Sr("dblclick","onDoubleClick");Sr("focusin","onFocus");Sr("focusout","onBlur");Sr(X_,"onTransitionEnd");Fi("onMouseEnter",["mouseout","mouseover"]);Fi("onMouseLeave",["mouseout","mouseover"]);Fi("onPointerEnter",["pointerout","pointerover"]);Fi("onPointerLeave",["pointerout","pointerover"]);ii("onChange","change click focusin focusout input keydown keyup selectionchange".split(" "));ii("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));ii("onBeforeInput",["compositionend","keypress","textInput","paste"]);ii("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" "));ii("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" "));ii("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var Bs="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),lS=new Set("cancel close invalid load scroll toggle".split(" ").concat(Bs));function Vm(t,e,n){var r=t.type||"unknown-event";t.currentTarget=n,oI(r,e,void 0,t),t.currentTarget=null}function J_(t,e){e=(e&4)!==0;for(var n=0;n<t.length;n++){var r=t[n],i=r.event;r=r.listeners;e:{var s=void 0;if(e)for(var o=r.length-1;0<=o;o--){var l=r[o],u=l.instance,h=l.currentTarget;if(l=l.listener,u!==s&&i.isPropagationStopped())break e;Vm(i,l,h),s=u}else for(o=0;o<r.length;o++){if(l=r[o],u=l.instance,h=l.currentTarget,l=l.listener,u!==s&&i.isPropagationStopped())break e;Vm(i,l,h),s=u}}}if(dl)throw t=ih,dl=!1,ih=null,t}function me(t,e){var n=e[ph];n===void 0&&(n=e[ph]=new Set);var r=t+"__bubble";n.has(r)||(Z_(e,t,2,!1),n.add(r))}function gc(t,e,n){var r=0;e&&(r|=4),Z_(n,t,r,e)}var Ca="_reactListening"+Math.random().toString(36).slice(2);function go(t){if(!t[Ca]){t[Ca]=!0,o_.forEach(function(n){n!=="selectionchange"&&(lS.has(n)||gc(n,!1,t),gc(n,!0,t))});var e=t.nodeType===9?t:t.ownerDocument;e===null||e[Ca]||(e[Ca]=!0,gc("selectionchange",!1,e))}}function Z_(t,e,n,r){switch(L_(e)){case 1:var i=TI;break;case 4:i=II;break;default:i=Sd}n=i.bind(null,e,n,t),i=void 0,!rh||e!=="touchstart"&&e!=="touchmove"&&e!=="wheel"||(i=!0),r?i!==void 0?t.addEventListener(e,n,{capture:!0,passive:i}):t.addEventListener(e,n,!0):i!==void 0?t.addEventListener(e,n,{passive:i}):t.addEventListener(e,n,!1)}function yc(t,e,n,r,i){var s=r;if(!(e&1)&&!(e&2)&&r!==null)e:for(;;){if(r===null)return;var o=r.tag;if(o===3||o===4){var l=r.stateNode.containerInfo;if(l===i||l.nodeType===8&&l.parentNode===i)break;if(o===4)for(o=r.return;o!==null;){var u=o.tag;if((u===3||u===4)&&(u=o.stateNode.containerInfo,u===i||u.nodeType===8&&u.parentNode===i))return;o=o.return}for(;l!==null;){if(o=Vr(l),o===null)return;if(u=o.tag,u===5||u===6){r=s=o;continue e}l=l.parentNode}}r=r.return}T_(function(){var h=s,f=wd(n),m=[];e:{var _=Y_.get(t);if(_!==void 0){var R=Ad,k=t;switch(t){case"keypress":if(Ka(n)===0)break e;case"keydown":case"keyup":R=jI;break;case"focusin":k="focus",R=cc;break;case"focusout":k="blur",R=cc;break;case"beforeblur":case"afterblur":R=cc;break;case"click":if(n.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":R=Im;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":R=AI;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":R=BI;break;case K_:case G_:case Q_:R=PI;break;case X_:R=$I;break;case"scroll":R=SI;break;case"wheel":R=qI;break;case"copy":case"cut":case"paste":R=NI;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":R=Rm}var x=(e&4)!==0,C=!x&&t==="scroll",w=x?_!==null?_+"Capture":null:_;x=[];for(var g=h,T;g!==null;){T=g;var D=T.stateNode;if(T.tag===5&&D!==null&&(T=D,w!==null&&(D=uo(g,w),D!=null&&x.push(yo(g,D,T)))),C)break;g=g.return}0<x.length&&(_=new R(_,k,null,n,f),m.push({event:_,listeners:x}))}}if(!(e&7)){e:{if(_=t==="mouseover"||t==="pointerover",R=t==="mouseout"||t==="pointerout",_&&n!==th&&(k=n.relatedTarget||n.fromElement)&&(Vr(k)||k[On]))break e;if((R||_)&&(_=f.window===f?f:(_=f.ownerDocument)?_.defaultView||_.parentWindow:window,R?(k=n.relatedTarget||n.toElement,R=h,k=k?Vr(k):null,k!==null&&(C=si(k),k!==C||k.tag!==5&&k.tag!==6)&&(k=null)):(R=null,k=h),R!==k)){if(x=Im,D="onMouseLeave",w="onMouseEnter",g="mouse",(t==="pointerout"||t==="pointerover")&&(x=Rm,D="onPointerLeave",w="onPointerEnter",g="pointer"),C=R==null?_:Ii(R),T=k==null?_:Ii(k),_=new x(D,g+"leave",R,n,f),_.target=C,_.relatedTarget=T,D=null,Vr(f)===h&&(x=new x(w,g+"enter",k,n,f),x.target=T,x.relatedTarget=C,D=x),C=D,R&&k)t:{for(x=R,w=k,g=0,T=x;T;T=pi(T))g++;for(T=0,D=w;D;D=pi(D))T++;for(;0<g-T;)x=pi(x),g--;for(;0<T-g;)w=pi(w),T--;for(;g--;){if(x===w||w!==null&&x===w.alternate)break t;x=pi(x),w=pi(w)}x=null}else x=null;R!==null&&Lm(m,_,R,x,!1),k!==null&&C!==null&&Lm(m,C,k,x,!0)}}e:{if(_=h?Ii(h):window,R=_.nodeName&&_.nodeName.toLowerCase(),R==="select"||R==="input"&&_.type==="file")var j=JI;else if(Cm(_))if(z_)j=nS;else{j=eS;var U=ZI}else(R=_.nodeName)&&R.toLowerCase()==="input"&&(_.type==="checkbox"||_.type==="radio")&&(j=tS);if(j&&(j=j(t,h))){B_(m,j,n,f);break e}U&&U(t,_,h),t==="focusout"&&(U=_._wrapperState)&&U.controlled&&_.type==="number"&&Xc(_,"number",_.value)}switch(U=h?Ii(h):window,t){case"focusin":(Cm(U)||U.contentEditable==="true")&&(Ei=U,lh=h,Xs=null);break;case"focusout":Xs=lh=Ei=null;break;case"mousedown":uh=!0;break;case"contextmenu":case"mouseup":case"dragend":uh=!1,Om(m,n,f);break;case"selectionchange":if(sS)break;case"keydown":case"keyup":Om(m,n,f)}var I;if(Cd)e:{switch(t){case"compositionstart":var v="onCompositionStart";break e;case"compositionend":v="onCompositionEnd";break e;case"compositionupdate":v="onCompositionUpdate";break e}v=void 0}else wi?U_(t,n)&&(v="onCompositionEnd"):t==="keydown"&&n.keyCode===229&&(v="onCompositionStart");v&&(j_&&n.locale!=="ko"&&(wi||v!=="onCompositionStart"?v==="onCompositionEnd"&&wi&&(I=M_()):(nr=f,Rd="value"in nr?nr.value:nr.textContent,wi=!0)),U=yl(h,v),0<U.length&&(v=new Sm(v,t,null,n,f),m.push({event:v,listeners:U}),I?v.data=I:(I=F_(n),I!==null&&(v.data=I)))),(I=KI?GI(t,n):QI(t,n))&&(h=yl(h,"onBeforeInput"),0<h.length&&(f=new Sm("onBeforeInput","beforeinput",null,n,f),m.push({event:f,listeners:h}),f.data=I))}J_(m,e)})}function yo(t,e,n){return{instance:t,listener:e,currentTarget:n}}function yl(t,e){for(var n=e+"Capture",r=[];t!==null;){var i=t,s=i.stateNode;i.tag===5&&s!==null&&(i=s,s=uo(t,n),s!=null&&r.unshift(yo(t,s,i)),s=uo(t,e),s!=null&&r.push(yo(t,s,i))),t=t.return}return r}function pi(t){if(t===null)return null;do t=t.return;while(t&&t.tag!==5);return t||null}function Lm(t,e,n,r,i){for(var s=e._reactName,o=[];n!==null&&n!==r;){var l=n,u=l.alternate,h=l.stateNode;if(u!==null&&u===r)break;l.tag===5&&h!==null&&(l=h,i?(u=uo(n,s),u!=null&&o.unshift(yo(n,u,l))):i||(u=uo(n,s),u!=null&&o.push(yo(n,u,l)))),n=n.return}o.length!==0&&t.push({event:e,listeners:o})}var uS=/\r\n?/g,cS=/\u0000|\uFFFD/g;function Mm(t){return(typeof t=="string"?t:""+t).replace(uS,`
`).replace(cS,"")}function Pa(t,e,n){if(e=Mm(e),Mm(t)!==e&&n)throw Error(B(425))}function _l(){}var ch=null,hh=null;function dh(t,e){return t==="textarea"||t==="noscript"||typeof e.children=="string"||typeof e.children=="number"||typeof e.dangerouslySetInnerHTML=="object"&&e.dangerouslySetInnerHTML!==null&&e.dangerouslySetInnerHTML.__html!=null}var fh=typeof setTimeout=="function"?setTimeout:void 0,hS=typeof clearTimeout=="function"?clearTimeout:void 0,jm=typeof Promise=="function"?Promise:void 0,dS=typeof queueMicrotask=="function"?queueMicrotask:typeof jm<"u"?function(t){return jm.resolve(null).then(t).catch(fS)}:fh;function fS(t){setTimeout(function(){throw t})}function _c(t,e){var n=e,r=0;do{var i=n.nextSibling;if(t.removeChild(n),i&&i.nodeType===8)if(n=i.data,n==="/$"){if(r===0){t.removeChild(i),fo(e);return}r--}else n!=="$"&&n!=="$?"&&n!=="$!"||r++;n=i}while(n);fo(e)}function ur(t){for(;t!=null;t=t.nextSibling){var e=t.nodeType;if(e===1||e===3)break;if(e===8){if(e=t.data,e==="$"||e==="$!"||e==="$?")break;if(e==="/$")return null}}return t}function Um(t){t=t.previousSibling;for(var e=0;t;){if(t.nodeType===8){var n=t.data;if(n==="$"||n==="$!"||n==="$?"){if(e===0)return t;e--}else n==="/$"&&e++}t=t.previousSibling}return null}var is=Math.random().toString(36).slice(2),nn="__reactFiber$"+is,_o="__reactProps$"+is,On="__reactContainer$"+is,ph="__reactEvents$"+is,pS="__reactListeners$"+is,mS="__reactHandles$"+is;function Vr(t){var e=t[nn];if(e)return e;for(var n=t.parentNode;n;){if(e=n[On]||n[nn]){if(n=e.alternate,e.child!==null||n!==null&&n.child!==null)for(t=Um(t);t!==null;){if(n=t[nn])return n;t=Um(t)}return e}t=n,n=t.parentNode}return null}function Fo(t){return t=t[nn]||t[On],!t||t.tag!==5&&t.tag!==6&&t.tag!==13&&t.tag!==3?null:t}function Ii(t){if(t.tag===5||t.tag===6)return t.stateNode;throw Error(B(33))}function ru(t){return t[_o]||null}var mh=[],Si=-1;function Rr(t){return{current:t}}function ye(t){0>Si||(t.current=mh[Si],mh[Si]=null,Si--)}function fe(t,e){Si++,mh[Si]=t.current,t.current=e}var vr={},at=Rr(vr),_t=Rr(!1),Kr=vr;function Bi(t,e){var n=t.type.contextTypes;if(!n)return vr;var r=t.stateNode;if(r&&r.__reactInternalMemoizedUnmaskedChildContext===e)return r.__reactInternalMemoizedMaskedChildContext;var i={},s;for(s in n)i[s]=e[s];return r&&(t=t.stateNode,t.__reactInternalMemoizedUnmaskedChildContext=e,t.__reactInternalMemoizedMaskedChildContext=i),i}function vt(t){return t=t.childContextTypes,t!=null}function vl(){ye(_t),ye(at)}function Fm(t,e,n){if(at.current!==vr)throw Error(B(168));fe(at,e),fe(_t,n)}function ev(t,e,n){var r=t.stateNode;if(e=e.childContextTypes,typeof r.getChildContext!="function")return n;r=r.getChildContext();for(var i in r)if(!(i in e))throw Error(B(108,ZT(t)||"Unknown",i));return Ie({},n,r)}function wl(t){return t=(t=t.stateNode)&&t.__reactInternalMemoizedMergedChildContext||vr,Kr=at.current,fe(at,t),fe(_t,_t.current),!0}function Bm(t,e,n){var r=t.stateNode;if(!r)throw Error(B(169));n?(t=ev(t,e,Kr),r.__reactInternalMemoizedMergedChildContext=t,ye(_t),ye(at),fe(at,t)):ye(_t),fe(_t,n)}var In=null,iu=!1,vc=!1;function tv(t){In===null?In=[t]:In.push(t)}function gS(t){iu=!0,tv(t)}function Ar(){if(!vc&&In!==null){vc=!0;var t=0,e=ce;try{var n=In;for(ce=1;t<n.length;t++){var r=n[t];do r=r(!0);while(r!==null)}In=null,iu=!1}catch(i){throw In!==null&&(In=In.slice(t+1)),A_(Ed,Ar),i}finally{ce=e,vc=!1}}return null}var Ri=[],Ai=0,El=null,Tl=0,xt=[],Nt=0,Gr=null,Rn=1,An="";function Dr(t,e){Ri[Ai++]=Tl,Ri[Ai++]=El,El=t,Tl=e}function nv(t,e,n){xt[Nt++]=Rn,xt[Nt++]=An,xt[Nt++]=Gr,Gr=t;var r=Rn;t=An;var i=32-Wt(r)-1;r&=~(1<<i),n+=1;var s=32-Wt(e)+i;if(30<s){var o=i-i%5;s=(r&(1<<o)-1).toString(32),r>>=o,i-=o,Rn=1<<32-Wt(e)+i|n<<i|r,An=s+t}else Rn=1<<s|n<<i|r,An=t}function xd(t){t.return!==null&&(Dr(t,1),nv(t,1,0))}function Nd(t){for(;t===El;)El=Ri[--Ai],Ri[Ai]=null,Tl=Ri[--Ai],Ri[Ai]=null;for(;t===Gr;)Gr=xt[--Nt],xt[Nt]=null,An=xt[--Nt],xt[Nt]=null,Rn=xt[--Nt],xt[Nt]=null}var At=null,St=null,_e=!1,zt=null;function rv(t,e){var n=Ot(5,null,null,0);n.elementType="DELETED",n.stateNode=e,n.return=t,e=t.deletions,e===null?(t.deletions=[n],t.flags|=16):e.push(n)}function zm(t,e){switch(t.tag){case 5:var n=t.type;return e=e.nodeType!==1||n.toLowerCase()!==e.nodeName.toLowerCase()?null:e,e!==null?(t.stateNode=e,At=t,St=ur(e.firstChild),!0):!1;case 6:return e=t.pendingProps===""||e.nodeType!==3?null:e,e!==null?(t.stateNode=e,At=t,St=null,!0):!1;case 13:return e=e.nodeType!==8?null:e,e!==null?(n=Gr!==null?{id:Rn,overflow:An}:null,t.memoizedState={dehydrated:e,treeContext:n,retryLane:1073741824},n=Ot(18,null,null,0),n.stateNode=e,n.return=t,t.child=n,At=t,St=null,!0):!1;default:return!1}}function gh(t){return(t.mode&1)!==0&&(t.flags&128)===0}function yh(t){if(_e){var e=St;if(e){var n=e;if(!zm(t,e)){if(gh(t))throw Error(B(418));e=ur(n.nextSibling);var r=At;e&&zm(t,e)?rv(r,n):(t.flags=t.flags&-4097|2,_e=!1,At=t)}}else{if(gh(t))throw Error(B(418));t.flags=t.flags&-4097|2,_e=!1,At=t}}}function $m(t){for(t=t.return;t!==null&&t.tag!==5&&t.tag!==3&&t.tag!==13;)t=t.return;At=t}function xa(t){if(t!==At)return!1;if(!_e)return $m(t),_e=!0,!1;var e;if((e=t.tag!==3)&&!(e=t.tag!==5)&&(e=t.type,e=e!=="head"&&e!=="body"&&!dh(t.type,t.memoizedProps)),e&&(e=St)){if(gh(t))throw iv(),Error(B(418));for(;e;)rv(t,e),e=ur(e.nextSibling)}if($m(t),t.tag===13){if(t=t.memoizedState,t=t!==null?t.dehydrated:null,!t)throw Error(B(317));e:{for(t=t.nextSibling,e=0;t;){if(t.nodeType===8){var n=t.data;if(n==="/$"){if(e===0){St=ur(t.nextSibling);break e}e--}else n!=="$"&&n!=="$!"&&n!=="$?"||e++}t=t.nextSibling}St=null}}else St=At?ur(t.stateNode.nextSibling):null;return!0}function iv(){for(var t=St;t;)t=ur(t.nextSibling)}function zi(){St=At=null,_e=!1}function Dd(t){zt===null?zt=[t]:zt.push(t)}var yS=Fn.ReactCurrentBatchConfig;function Ds(t,e,n){if(t=n.ref,t!==null&&typeof t!="function"&&typeof t!="object"){if(n._owner){if(n=n._owner,n){if(n.tag!==1)throw Error(B(309));var r=n.stateNode}if(!r)throw Error(B(147,t));var i=r,s=""+t;return e!==null&&e.ref!==null&&typeof e.ref=="function"&&e.ref._stringRef===s?e.ref:(e=function(o){var l=i.refs;o===null?delete l[s]:l[s]=o},e._stringRef=s,e)}if(typeof t!="string")throw Error(B(284));if(!n._owner)throw Error(B(290,t))}return t}function Na(t,e){throw t=Object.prototype.toString.call(e),Error(B(31,t==="[object Object]"?"object with keys {"+Object.keys(e).join(", ")+"}":t))}function Wm(t){var e=t._init;return e(t._payload)}function sv(t){function e(w,g){if(t){var T=w.deletions;T===null?(w.deletions=[g],w.flags|=16):T.push(g)}}function n(w,g){if(!t)return null;for(;g!==null;)e(w,g),g=g.sibling;return null}function r(w,g){for(w=new Map;g!==null;)g.key!==null?w.set(g.key,g):w.set(g.index,g),g=g.sibling;return w}function i(w,g){return w=fr(w,g),w.index=0,w.sibling=null,w}function s(w,g,T){return w.index=T,t?(T=w.alternate,T!==null?(T=T.index,T<g?(w.flags|=2,g):T):(w.flags|=2,g)):(w.flags|=1048576,g)}function o(w){return t&&w.alternate===null&&(w.flags|=2),w}function l(w,g,T,D){return g===null||g.tag!==6?(g=Ac(T,w.mode,D),g.return=w,g):(g=i(g,T),g.return=w,g)}function u(w,g,T,D){var j=T.type;return j===vi?f(w,g,T.props.children,D,T.key):g!==null&&(g.elementType===j||typeof j=="object"&&j!==null&&j.$$typeof===Gn&&Wm(j)===g.type)?(D=i(g,T.props),D.ref=Ds(w,g,T),D.return=w,D):(D=el(T.type,T.key,T.props,null,w.mode,D),D.ref=Ds(w,g,T),D.return=w,D)}function h(w,g,T,D){return g===null||g.tag!==4||g.stateNode.containerInfo!==T.containerInfo||g.stateNode.implementation!==T.implementation?(g=kc(T,w.mode,D),g.return=w,g):(g=i(g,T.children||[]),g.return=w,g)}function f(w,g,T,D,j){return g===null||g.tag!==7?(g=Br(T,w.mode,D,j),g.return=w,g):(g=i(g,T),g.return=w,g)}function m(w,g,T){if(typeof g=="string"&&g!==""||typeof g=="number")return g=Ac(""+g,w.mode,T),g.return=w,g;if(typeof g=="object"&&g!==null){switch(g.$$typeof){case wa:return T=el(g.type,g.key,g.props,null,w.mode,T),T.ref=Ds(w,null,g),T.return=w,T;case _i:return g=kc(g,w.mode,T),g.return=w,g;case Gn:var D=g._init;return m(w,D(g._payload),T)}if(Us(g)||ks(g))return g=Br(g,w.mode,T,null),g.return=w,g;Na(w,g)}return null}function _(w,g,T,D){var j=g!==null?g.key:null;if(typeof T=="string"&&T!==""||typeof T=="number")return j!==null?null:l(w,g,""+T,D);if(typeof T=="object"&&T!==null){switch(T.$$typeof){case wa:return T.key===j?u(w,g,T,D):null;case _i:return T.key===j?h(w,g,T,D):null;case Gn:return j=T._init,_(w,g,j(T._payload),D)}if(Us(T)||ks(T))return j!==null?null:f(w,g,T,D,null);Na(w,T)}return null}function R(w,g,T,D,j){if(typeof D=="string"&&D!==""||typeof D=="number")return w=w.get(T)||null,l(g,w,""+D,j);if(typeof D=="object"&&D!==null){switch(D.$$typeof){case wa:return w=w.get(D.key===null?T:D.key)||null,u(g,w,D,j);case _i:return w=w.get(D.key===null?T:D.key)||null,h(g,w,D,j);case Gn:var U=D._init;return R(w,g,T,U(D._payload),j)}if(Us(D)||ks(D))return w=w.get(T)||null,f(g,w,D,j,null);Na(g,D)}return null}function k(w,g,T,D){for(var j=null,U=null,I=g,v=g=0,E=null;I!==null&&v<T.length;v++){I.index>v?(E=I,I=null):E=I.sibling;var S=_(w,I,T[v],D);if(S===null){I===null&&(I=E);break}t&&I&&S.alternate===null&&e(w,I),g=s(S,g,v),U===null?j=S:U.sibling=S,U=S,I=E}if(v===T.length)return n(w,I),_e&&Dr(w,v),j;if(I===null){for(;v<T.length;v++)I=m(w,T[v],D),I!==null&&(g=s(I,g,v),U===null?j=I:U.sibling=I,U=I);return _e&&Dr(w,v),j}for(I=r(w,I);v<T.length;v++)E=R(I,w,v,T[v],D),E!==null&&(t&&E.alternate!==null&&I.delete(E.key===null?v:E.key),g=s(E,g,v),U===null?j=E:U.sibling=E,U=E);return t&&I.forEach(function(P){return e(w,P)}),_e&&Dr(w,v),j}function x(w,g,T,D){var j=ks(T);if(typeof j!="function")throw Error(B(150));if(T=j.call(T),T==null)throw Error(B(151));for(var U=j=null,I=g,v=g=0,E=null,S=T.next();I!==null&&!S.done;v++,S=T.next()){I.index>v?(E=I,I=null):E=I.sibling;var P=_(w,I,S.value,D);if(P===null){I===null&&(I=E);break}t&&I&&P.alternate===null&&e(w,I),g=s(P,g,v),U===null?j=P:U.sibling=P,U=P,I=E}if(S.done)return n(w,I),_e&&Dr(w,v),j;if(I===null){for(;!S.done;v++,S=T.next())S=m(w,S.value,D),S!==null&&(g=s(S,g,v),U===null?j=S:U.sibling=S,U=S);return _e&&Dr(w,v),j}for(I=r(w,I);!S.done;v++,S=T.next())S=R(I,w,v,S.value,D),S!==null&&(t&&S.alternate!==null&&I.delete(S.key===null?v:S.key),g=s(S,g,v),U===null?j=S:U.sibling=S,U=S);return t&&I.forEach(function(N){return e(w,N)}),_e&&Dr(w,v),j}function C(w,g,T,D){if(typeof T=="object"&&T!==null&&T.type===vi&&T.key===null&&(T=T.props.children),typeof T=="object"&&T!==null){switch(T.$$typeof){case wa:e:{for(var j=T.key,U=g;U!==null;){if(U.key===j){if(j=T.type,j===vi){if(U.tag===7){n(w,U.sibling),g=i(U,T.props.children),g.return=w,w=g;break e}}else if(U.elementType===j||typeof j=="object"&&j!==null&&j.$$typeof===Gn&&Wm(j)===U.type){n(w,U.sibling),g=i(U,T.props),g.ref=Ds(w,U,T),g.return=w,w=g;break e}n(w,U);break}else e(w,U);U=U.sibling}T.type===vi?(g=Br(T.props.children,w.mode,D,T.key),g.return=w,w=g):(D=el(T.type,T.key,T.props,null,w.mode,D),D.ref=Ds(w,g,T),D.return=w,w=D)}return o(w);case _i:e:{for(U=T.key;g!==null;){if(g.key===U)if(g.tag===4&&g.stateNode.containerInfo===T.containerInfo&&g.stateNode.implementation===T.implementation){n(w,g.sibling),g=i(g,T.children||[]),g.return=w,w=g;break e}else{n(w,g);break}else e(w,g);g=g.sibling}g=kc(T,w.mode,D),g.return=w,w=g}return o(w);case Gn:return U=T._init,C(w,g,U(T._payload),D)}if(Us(T))return k(w,g,T,D);if(ks(T))return x(w,g,T,D);Na(w,T)}return typeof T=="string"&&T!==""||typeof T=="number"?(T=""+T,g!==null&&g.tag===6?(n(w,g.sibling),g=i(g,T),g.return=w,w=g):(n(w,g),g=Ac(T,w.mode,D),g.return=w,w=g),o(w)):n(w,g)}return C}var $i=sv(!0),ov=sv(!1),Il=Rr(null),Sl=null,ki=null,Od=null;function bd(){Od=ki=Sl=null}function Vd(t){var e=Il.current;ye(Il),t._currentValue=e}function _h(t,e,n){for(;t!==null;){var r=t.alternate;if((t.childLanes&e)!==e?(t.childLanes|=e,r!==null&&(r.childLanes|=e)):r!==null&&(r.childLanes&e)!==e&&(r.childLanes|=e),t===n)break;t=t.return}}function bi(t,e){Sl=t,Od=ki=null,t=t.dependencies,t!==null&&t.firstContext!==null&&(t.lanes&e&&(yt=!0),t.firstContext=null)}function Vt(t){var e=t._currentValue;if(Od!==t)if(t={context:t,memoizedValue:e,next:null},ki===null){if(Sl===null)throw Error(B(308));ki=t,Sl.dependencies={lanes:0,firstContext:t}}else ki=ki.next=t;return e}var Lr=null;function Ld(t){Lr===null?Lr=[t]:Lr.push(t)}function av(t,e,n,r){var i=e.interleaved;return i===null?(n.next=n,Ld(e)):(n.next=i.next,i.next=n),e.interleaved=n,bn(t,r)}function bn(t,e){t.lanes|=e;var n=t.alternate;for(n!==null&&(n.lanes|=e),n=t,t=t.return;t!==null;)t.childLanes|=e,n=t.alternate,n!==null&&(n.childLanes|=e),n=t,t=t.return;return n.tag===3?n.stateNode:null}var Qn=!1;function Md(t){t.updateQueue={baseState:t.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function lv(t,e){t=t.updateQueue,e.updateQueue===t&&(e.updateQueue={baseState:t.baseState,firstBaseUpdate:t.firstBaseUpdate,lastBaseUpdate:t.lastBaseUpdate,shared:t.shared,effects:t.effects})}function Nn(t,e){return{eventTime:t,lane:e,tag:0,payload:null,callback:null,next:null}}function cr(t,e,n){var r=t.updateQueue;if(r===null)return null;if(r=r.shared,oe&2){var i=r.pending;return i===null?e.next=e:(e.next=i.next,i.next=e),r.pending=e,bn(t,n)}return i=r.interleaved,i===null?(e.next=e,Ld(r)):(e.next=i.next,i.next=e),r.interleaved=e,bn(t,n)}function Ga(t,e,n){if(e=e.updateQueue,e!==null&&(e=e.shared,(n&4194240)!==0)){var r=e.lanes;r&=t.pendingLanes,n|=r,e.lanes=n,Td(t,n)}}function qm(t,e){var n=t.updateQueue,r=t.alternate;if(r!==null&&(r=r.updateQueue,n===r)){var i=null,s=null;if(n=n.firstBaseUpdate,n!==null){do{var o={eventTime:n.eventTime,lane:n.lane,tag:n.tag,payload:n.payload,callback:n.callback,next:null};s===null?i=s=o:s=s.next=o,n=n.next}while(n!==null);s===null?i=s=e:s=s.next=e}else i=s=e;n={baseState:r.baseState,firstBaseUpdate:i,lastBaseUpdate:s,shared:r.shared,effects:r.effects},t.updateQueue=n;return}t=n.lastBaseUpdate,t===null?n.firstBaseUpdate=e:t.next=e,n.lastBaseUpdate=e}function Rl(t,e,n,r){var i=t.updateQueue;Qn=!1;var s=i.firstBaseUpdate,o=i.lastBaseUpdate,l=i.shared.pending;if(l!==null){i.shared.pending=null;var u=l,h=u.next;u.next=null,o===null?s=h:o.next=h,o=u;var f=t.alternate;f!==null&&(f=f.updateQueue,l=f.lastBaseUpdate,l!==o&&(l===null?f.firstBaseUpdate=h:l.next=h,f.lastBaseUpdate=u))}if(s!==null){var m=i.baseState;o=0,f=h=u=null,l=s;do{var _=l.lane,R=l.eventTime;if((r&_)===_){f!==null&&(f=f.next={eventTime:R,lane:0,tag:l.tag,payload:l.payload,callback:l.callback,next:null});e:{var k=t,x=l;switch(_=e,R=n,x.tag){case 1:if(k=x.payload,typeof k=="function"){m=k.call(R,m,_);break e}m=k;break e;case 3:k.flags=k.flags&-65537|128;case 0:if(k=x.payload,_=typeof k=="function"?k.call(R,m,_):k,_==null)break e;m=Ie({},m,_);break e;case 2:Qn=!0}}l.callback!==null&&l.lane!==0&&(t.flags|=64,_=i.effects,_===null?i.effects=[l]:_.push(l))}else R={eventTime:R,lane:_,tag:l.tag,payload:l.payload,callback:l.callback,next:null},f===null?(h=f=R,u=m):f=f.next=R,o|=_;if(l=l.next,l===null){if(l=i.shared.pending,l===null)break;_=l,l=_.next,_.next=null,i.lastBaseUpdate=_,i.shared.pending=null}}while(!0);if(f===null&&(u=m),i.baseState=u,i.firstBaseUpdate=h,i.lastBaseUpdate=f,e=i.shared.interleaved,e!==null){i=e;do o|=i.lane,i=i.next;while(i!==e)}else s===null&&(i.shared.lanes=0);Xr|=o,t.lanes=o,t.memoizedState=m}}function Hm(t,e,n){if(t=e.effects,e.effects=null,t!==null)for(e=0;e<t.length;e++){var r=t[e],i=r.callback;if(i!==null){if(r.callback=null,r=n,typeof i!="function")throw Error(B(191,i));i.call(r)}}}var Bo={},on=Rr(Bo),vo=Rr(Bo),wo=Rr(Bo);function Mr(t){if(t===Bo)throw Error(B(174));return t}function jd(t,e){switch(fe(wo,e),fe(vo,t),fe(on,Bo),t=e.nodeType,t){case 9:case 11:e=(e=e.documentElement)?e.namespaceURI:Jc(null,"");break;default:t=t===8?e.parentNode:e,e=t.namespaceURI||null,t=t.tagName,e=Jc(e,t)}ye(on),fe(on,e)}function Wi(){ye(on),ye(vo),ye(wo)}function uv(t){Mr(wo.current);var e=Mr(on.current),n=Jc(e,t.type);e!==n&&(fe(vo,t),fe(on,n))}function Ud(t){vo.current===t&&(ye(on),ye(vo))}var we=Rr(0);function Al(t){for(var e=t;e!==null;){if(e.tag===13){var n=e.memoizedState;if(n!==null&&(n=n.dehydrated,n===null||n.data==="$?"||n.data==="$!"))return e}else if(e.tag===19&&e.memoizedProps.revealOrder!==void 0){if(e.flags&128)return e}else if(e.child!==null){e.child.return=e,e=e.child;continue}if(e===t)break;for(;e.sibling===null;){if(e.return===null||e.return===t)return null;e=e.return}e.sibling.return=e.return,e=e.sibling}return null}var wc=[];function Fd(){for(var t=0;t<wc.length;t++)wc[t]._workInProgressVersionPrimary=null;wc.length=0}var Qa=Fn.ReactCurrentDispatcher,Ec=Fn.ReactCurrentBatchConfig,Qr=0,Ee=null,Me=null,ze=null,kl=!1,Ys=!1,Eo=0,_S=0;function tt(){throw Error(B(321))}function Bd(t,e){if(e===null)return!1;for(var n=0;n<e.length&&n<t.length;n++)if(!Yt(t[n],e[n]))return!1;return!0}function zd(t,e,n,r,i,s){if(Qr=s,Ee=e,e.memoizedState=null,e.updateQueue=null,e.lanes=0,Qa.current=t===null||t.memoizedState===null?TS:IS,t=n(r,i),Ys){s=0;do{if(Ys=!1,Eo=0,25<=s)throw Error(B(301));s+=1,ze=Me=null,e.updateQueue=null,Qa.current=SS,t=n(r,i)}while(Ys)}if(Qa.current=Cl,e=Me!==null&&Me.next!==null,Qr=0,ze=Me=Ee=null,kl=!1,e)throw Error(B(300));return t}function $d(){var t=Eo!==0;return Eo=0,t}function tn(){var t={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return ze===null?Ee.memoizedState=ze=t:ze=ze.next=t,ze}function Lt(){if(Me===null){var t=Ee.alternate;t=t!==null?t.memoizedState:null}else t=Me.next;var e=ze===null?Ee.memoizedState:ze.next;if(e!==null)ze=e,Me=t;else{if(t===null)throw Error(B(310));Me=t,t={memoizedState:Me.memoizedState,baseState:Me.baseState,baseQueue:Me.baseQueue,queue:Me.queue,next:null},ze===null?Ee.memoizedState=ze=t:ze=ze.next=t}return ze}function To(t,e){return typeof e=="function"?e(t):e}function Tc(t){var e=Lt(),n=e.queue;if(n===null)throw Error(B(311));n.lastRenderedReducer=t;var r=Me,i=r.baseQueue,s=n.pending;if(s!==null){if(i!==null){var o=i.next;i.next=s.next,s.next=o}r.baseQueue=i=s,n.pending=null}if(i!==null){s=i.next,r=r.baseState;var l=o=null,u=null,h=s;do{var f=h.lane;if((Qr&f)===f)u!==null&&(u=u.next={lane:0,action:h.action,hasEagerState:h.hasEagerState,eagerState:h.eagerState,next:null}),r=h.hasEagerState?h.eagerState:t(r,h.action);else{var m={lane:f,action:h.action,hasEagerState:h.hasEagerState,eagerState:h.eagerState,next:null};u===null?(l=u=m,o=r):u=u.next=m,Ee.lanes|=f,Xr|=f}h=h.next}while(h!==null&&h!==s);u===null?o=r:u.next=l,Yt(r,e.memoizedState)||(yt=!0),e.memoizedState=r,e.baseState=o,e.baseQueue=u,n.lastRenderedState=r}if(t=n.interleaved,t!==null){i=t;do s=i.lane,Ee.lanes|=s,Xr|=s,i=i.next;while(i!==t)}else i===null&&(n.lanes=0);return[e.memoizedState,n.dispatch]}function Ic(t){var e=Lt(),n=e.queue;if(n===null)throw Error(B(311));n.lastRenderedReducer=t;var r=n.dispatch,i=n.pending,s=e.memoizedState;if(i!==null){n.pending=null;var o=i=i.next;do s=t(s,o.action),o=o.next;while(o!==i);Yt(s,e.memoizedState)||(yt=!0),e.memoizedState=s,e.baseQueue===null&&(e.baseState=s),n.lastRenderedState=s}return[s,r]}function cv(){}function hv(t,e){var n=Ee,r=Lt(),i=e(),s=!Yt(r.memoizedState,i);if(s&&(r.memoizedState=i,yt=!0),r=r.queue,Wd(pv.bind(null,n,r,t),[t]),r.getSnapshot!==e||s||ze!==null&&ze.memoizedState.tag&1){if(n.flags|=2048,Io(9,fv.bind(null,n,r,i,e),void 0,null),$e===null)throw Error(B(349));Qr&30||dv(n,e,i)}return i}function dv(t,e,n){t.flags|=16384,t={getSnapshot:e,value:n},e=Ee.updateQueue,e===null?(e={lastEffect:null,stores:null},Ee.updateQueue=e,e.stores=[t]):(n=e.stores,n===null?e.stores=[t]:n.push(t))}function fv(t,e,n,r){e.value=n,e.getSnapshot=r,mv(e)&&gv(t)}function pv(t,e,n){return n(function(){mv(e)&&gv(t)})}function mv(t){var e=t.getSnapshot;t=t.value;try{var n=e();return!Yt(t,n)}catch{return!0}}function gv(t){var e=bn(t,1);e!==null&&qt(e,t,1,-1)}function Km(t){var e=tn();return typeof t=="function"&&(t=t()),e.memoizedState=e.baseState=t,t={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:To,lastRenderedState:t},e.queue=t,t=t.dispatch=ES.bind(null,Ee,t),[e.memoizedState,t]}function Io(t,e,n,r){return t={tag:t,create:e,destroy:n,deps:r,next:null},e=Ee.updateQueue,e===null?(e={lastEffect:null,stores:null},Ee.updateQueue=e,e.lastEffect=t.next=t):(n=e.lastEffect,n===null?e.lastEffect=t.next=t:(r=n.next,n.next=t,t.next=r,e.lastEffect=t)),t}function yv(){return Lt().memoizedState}function Xa(t,e,n,r){var i=tn();Ee.flags|=t,i.memoizedState=Io(1|e,n,void 0,r===void 0?null:r)}function su(t,e,n,r){var i=Lt();r=r===void 0?null:r;var s=void 0;if(Me!==null){var o=Me.memoizedState;if(s=o.destroy,r!==null&&Bd(r,o.deps)){i.memoizedState=Io(e,n,s,r);return}}Ee.flags|=t,i.memoizedState=Io(1|e,n,s,r)}function Gm(t,e){return Xa(8390656,8,t,e)}function Wd(t,e){return su(2048,8,t,e)}function _v(t,e){return su(4,2,t,e)}function vv(t,e){return su(4,4,t,e)}function wv(t,e){if(typeof e=="function")return t=t(),e(t),function(){e(null)};if(e!=null)return t=t(),e.current=t,function(){e.current=null}}function Ev(t,e,n){return n=n!=null?n.concat([t]):null,su(4,4,wv.bind(null,e,t),n)}function qd(){}function Tv(t,e){var n=Lt();e=e===void 0?null:e;var r=n.memoizedState;return r!==null&&e!==null&&Bd(e,r[1])?r[0]:(n.memoizedState=[t,e],t)}function Iv(t,e){var n=Lt();e=e===void 0?null:e;var r=n.memoizedState;return r!==null&&e!==null&&Bd(e,r[1])?r[0]:(t=t(),n.memoizedState=[t,e],t)}function Sv(t,e,n){return Qr&21?(Yt(n,e)||(n=P_(),Ee.lanes|=n,Xr|=n,t.baseState=!0),e):(t.baseState&&(t.baseState=!1,yt=!0),t.memoizedState=n)}function vS(t,e){var n=ce;ce=n!==0&&4>n?n:4,t(!0);var r=Ec.transition;Ec.transition={};try{t(!1),e()}finally{ce=n,Ec.transition=r}}function Rv(){return Lt().memoizedState}function wS(t,e,n){var r=dr(t);if(n={lane:r,action:n,hasEagerState:!1,eagerState:null,next:null},Av(t))kv(e,n);else if(n=av(t,e,n,r),n!==null){var i=ft();qt(n,t,r,i),Cv(n,e,r)}}function ES(t,e,n){var r=dr(t),i={lane:r,action:n,hasEagerState:!1,eagerState:null,next:null};if(Av(t))kv(e,i);else{var s=t.alternate;if(t.lanes===0&&(s===null||s.lanes===0)&&(s=e.lastRenderedReducer,s!==null))try{var o=e.lastRenderedState,l=s(o,n);if(i.hasEagerState=!0,i.eagerState=l,Yt(l,o)){var u=e.interleaved;u===null?(i.next=i,Ld(e)):(i.next=u.next,u.next=i),e.interleaved=i;return}}catch{}finally{}n=av(t,e,i,r),n!==null&&(i=ft(),qt(n,t,r,i),Cv(n,e,r))}}function Av(t){var e=t.alternate;return t===Ee||e!==null&&e===Ee}function kv(t,e){Ys=kl=!0;var n=t.pending;n===null?e.next=e:(e.next=n.next,n.next=e),t.pending=e}function Cv(t,e,n){if(n&4194240){var r=e.lanes;r&=t.pendingLanes,n|=r,e.lanes=n,Td(t,n)}}var Cl={readContext:Vt,useCallback:tt,useContext:tt,useEffect:tt,useImperativeHandle:tt,useInsertionEffect:tt,useLayoutEffect:tt,useMemo:tt,useReducer:tt,useRef:tt,useState:tt,useDebugValue:tt,useDeferredValue:tt,useTransition:tt,useMutableSource:tt,useSyncExternalStore:tt,useId:tt,unstable_isNewReconciler:!1},TS={readContext:Vt,useCallback:function(t,e){return tn().memoizedState=[t,e===void 0?null:e],t},useContext:Vt,useEffect:Gm,useImperativeHandle:function(t,e,n){return n=n!=null?n.concat([t]):null,Xa(4194308,4,wv.bind(null,e,t),n)},useLayoutEffect:function(t,e){return Xa(4194308,4,t,e)},useInsertionEffect:function(t,e){return Xa(4,2,t,e)},useMemo:function(t,e){var n=tn();return e=e===void 0?null:e,t=t(),n.memoizedState=[t,e],t},useReducer:function(t,e,n){var r=tn();return e=n!==void 0?n(e):e,r.memoizedState=r.baseState=e,t={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:t,lastRenderedState:e},r.queue=t,t=t.dispatch=wS.bind(null,Ee,t),[r.memoizedState,t]},useRef:function(t){var e=tn();return t={current:t},e.memoizedState=t},useState:Km,useDebugValue:qd,useDeferredValue:function(t){return tn().memoizedState=t},useTransition:function(){var t=Km(!1),e=t[0];return t=vS.bind(null,t[1]),tn().memoizedState=t,[e,t]},useMutableSource:function(){},useSyncExternalStore:function(t,e,n){var r=Ee,i=tn();if(_e){if(n===void 0)throw Error(B(407));n=n()}else{if(n=e(),$e===null)throw Error(B(349));Qr&30||dv(r,e,n)}i.memoizedState=n;var s={value:n,getSnapshot:e};return i.queue=s,Gm(pv.bind(null,r,s,t),[t]),r.flags|=2048,Io(9,fv.bind(null,r,s,n,e),void 0,null),n},useId:function(){var t=tn(),e=$e.identifierPrefix;if(_e){var n=An,r=Rn;n=(r&~(1<<32-Wt(r)-1)).toString(32)+n,e=":"+e+"R"+n,n=Eo++,0<n&&(e+="H"+n.toString(32)),e+=":"}else n=_S++,e=":"+e+"r"+n.toString(32)+":";return t.memoizedState=e},unstable_isNewReconciler:!1},IS={readContext:Vt,useCallback:Tv,useContext:Vt,useEffect:Wd,useImperativeHandle:Ev,useInsertionEffect:_v,useLayoutEffect:vv,useMemo:Iv,useReducer:Tc,useRef:yv,useState:function(){return Tc(To)},useDebugValue:qd,useDeferredValue:function(t){var e=Lt();return Sv(e,Me.memoizedState,t)},useTransition:function(){var t=Tc(To)[0],e=Lt().memoizedState;return[t,e]},useMutableSource:cv,useSyncExternalStore:hv,useId:Rv,unstable_isNewReconciler:!1},SS={readContext:Vt,useCallback:Tv,useContext:Vt,useEffect:Wd,useImperativeHandle:Ev,useInsertionEffect:_v,useLayoutEffect:vv,useMemo:Iv,useReducer:Ic,useRef:yv,useState:function(){return Ic(To)},useDebugValue:qd,useDeferredValue:function(t){var e=Lt();return Me===null?e.memoizedState=t:Sv(e,Me.memoizedState,t)},useTransition:function(){var t=Ic(To)[0],e=Lt().memoizedState;return[t,e]},useMutableSource:cv,useSyncExternalStore:hv,useId:Rv,unstable_isNewReconciler:!1};function Ft(t,e){if(t&&t.defaultProps){e=Ie({},e),t=t.defaultProps;for(var n in t)e[n]===void 0&&(e[n]=t[n]);return e}return e}function vh(t,e,n,r){e=t.memoizedState,n=n(r,e),n=n==null?e:Ie({},e,n),t.memoizedState=n,t.lanes===0&&(t.updateQueue.baseState=n)}var ou={isMounted:function(t){return(t=t._reactInternals)?si(t)===t:!1},enqueueSetState:function(t,e,n){t=t._reactInternals;var r=ft(),i=dr(t),s=Nn(r,i);s.payload=e,n!=null&&(s.callback=n),e=cr(t,s,i),e!==null&&(qt(e,t,i,r),Ga(e,t,i))},enqueueReplaceState:function(t,e,n){t=t._reactInternals;var r=ft(),i=dr(t),s=Nn(r,i);s.tag=1,s.payload=e,n!=null&&(s.callback=n),e=cr(t,s,i),e!==null&&(qt(e,t,i,r),Ga(e,t,i))},enqueueForceUpdate:function(t,e){t=t._reactInternals;var n=ft(),r=dr(t),i=Nn(n,r);i.tag=2,e!=null&&(i.callback=e),e=cr(t,i,r),e!==null&&(qt(e,t,r,n),Ga(e,t,r))}};function Qm(t,e,n,r,i,s,o){return t=t.stateNode,typeof t.shouldComponentUpdate=="function"?t.shouldComponentUpdate(r,s,o):e.prototype&&e.prototype.isPureReactComponent?!mo(n,r)||!mo(i,s):!0}function Pv(t,e,n){var r=!1,i=vr,s=e.contextType;return typeof s=="object"&&s!==null?s=Vt(s):(i=vt(e)?Kr:at.current,r=e.contextTypes,s=(r=r!=null)?Bi(t,i):vr),e=new e(n,s),t.memoizedState=e.state!==null&&e.state!==void 0?e.state:null,e.updater=ou,t.stateNode=e,e._reactInternals=t,r&&(t=t.stateNode,t.__reactInternalMemoizedUnmaskedChildContext=i,t.__reactInternalMemoizedMaskedChildContext=s),e}function Xm(t,e,n,r){t=e.state,typeof e.componentWillReceiveProps=="function"&&e.componentWillReceiveProps(n,r),typeof e.UNSAFE_componentWillReceiveProps=="function"&&e.UNSAFE_componentWillReceiveProps(n,r),e.state!==t&&ou.enqueueReplaceState(e,e.state,null)}function wh(t,e,n,r){var i=t.stateNode;i.props=n,i.state=t.memoizedState,i.refs={},Md(t);var s=e.contextType;typeof s=="object"&&s!==null?i.context=Vt(s):(s=vt(e)?Kr:at.current,i.context=Bi(t,s)),i.state=t.memoizedState,s=e.getDerivedStateFromProps,typeof s=="function"&&(vh(t,e,s,n),i.state=t.memoizedState),typeof e.getDerivedStateFromProps=="function"||typeof i.getSnapshotBeforeUpdate=="function"||typeof i.UNSAFE_componentWillMount!="function"&&typeof i.componentWillMount!="function"||(e=i.state,typeof i.componentWillMount=="function"&&i.componentWillMount(),typeof i.UNSAFE_componentWillMount=="function"&&i.UNSAFE_componentWillMount(),e!==i.state&&ou.enqueueReplaceState(i,i.state,null),Rl(t,n,i,r),i.state=t.memoizedState),typeof i.componentDidMount=="function"&&(t.flags|=4194308)}function qi(t,e){try{var n="",r=e;do n+=JT(r),r=r.return;while(r);var i=n}catch(s){i=`
Error generating stack: `+s.message+`
`+s.stack}return{value:t,source:e,stack:i,digest:null}}function Sc(t,e,n){return{value:t,source:null,stack:n??null,digest:e??null}}function Eh(t,e){try{console.error(e.value)}catch(n){setTimeout(function(){throw n})}}var RS=typeof WeakMap=="function"?WeakMap:Map;function xv(t,e,n){n=Nn(-1,n),n.tag=3,n.payload={element:null};var r=e.value;return n.callback=function(){xl||(xl=!0,Nh=r),Eh(t,e)},n}function Nv(t,e,n){n=Nn(-1,n),n.tag=3;var r=t.type.getDerivedStateFromError;if(typeof r=="function"){var i=e.value;n.payload=function(){return r(i)},n.callback=function(){Eh(t,e)}}var s=t.stateNode;return s!==null&&typeof s.componentDidCatch=="function"&&(n.callback=function(){Eh(t,e),typeof r!="function"&&(hr===null?hr=new Set([this]):hr.add(this));var o=e.stack;this.componentDidCatch(e.value,{componentStack:o!==null?o:""})}),n}function Ym(t,e,n){var r=t.pingCache;if(r===null){r=t.pingCache=new RS;var i=new Set;r.set(e,i)}else i=r.get(e),i===void 0&&(i=new Set,r.set(e,i));i.has(n)||(i.add(n),t=US.bind(null,t,e,n),e.then(t,t))}function Jm(t){do{var e;if((e=t.tag===13)&&(e=t.memoizedState,e=e!==null?e.dehydrated!==null:!0),e)return t;t=t.return}while(t!==null);return null}function Zm(t,e,n,r,i){return t.mode&1?(t.flags|=65536,t.lanes=i,t):(t===e?t.flags|=65536:(t.flags|=128,n.flags|=131072,n.flags&=-52805,n.tag===1&&(n.alternate===null?n.tag=17:(e=Nn(-1,1),e.tag=2,cr(n,e,1))),n.lanes|=1),t)}var AS=Fn.ReactCurrentOwner,yt=!1;function dt(t,e,n,r){e.child=t===null?ov(e,null,n,r):$i(e,t.child,n,r)}function eg(t,e,n,r,i){n=n.render;var s=e.ref;return bi(e,i),r=zd(t,e,n,r,s,i),n=$d(),t!==null&&!yt?(e.updateQueue=t.updateQueue,e.flags&=-2053,t.lanes&=~i,Vn(t,e,i)):(_e&&n&&xd(e),e.flags|=1,dt(t,e,r,i),e.child)}function tg(t,e,n,r,i){if(t===null){var s=n.type;return typeof s=="function"&&!Zd(s)&&s.defaultProps===void 0&&n.compare===null&&n.defaultProps===void 0?(e.tag=15,e.type=s,Dv(t,e,s,r,i)):(t=el(n.type,null,r,e,e.mode,i),t.ref=e.ref,t.return=e,e.child=t)}if(s=t.child,!(t.lanes&i)){var o=s.memoizedProps;if(n=n.compare,n=n!==null?n:mo,n(o,r)&&t.ref===e.ref)return Vn(t,e,i)}return e.flags|=1,t=fr(s,r),t.ref=e.ref,t.return=e,e.child=t}function Dv(t,e,n,r,i){if(t!==null){var s=t.memoizedProps;if(mo(s,r)&&t.ref===e.ref)if(yt=!1,e.pendingProps=r=s,(t.lanes&i)!==0)t.flags&131072&&(yt=!0);else return e.lanes=t.lanes,Vn(t,e,i)}return Th(t,e,n,r,i)}function Ov(t,e,n){var r=e.pendingProps,i=r.children,s=t!==null?t.memoizedState:null;if(r.mode==="hidden")if(!(e.mode&1))e.memoizedState={baseLanes:0,cachePool:null,transitions:null},fe(Pi,It),It|=n;else{if(!(n&1073741824))return t=s!==null?s.baseLanes|n:n,e.lanes=e.childLanes=1073741824,e.memoizedState={baseLanes:t,cachePool:null,transitions:null},e.updateQueue=null,fe(Pi,It),It|=t,null;e.memoizedState={baseLanes:0,cachePool:null,transitions:null},r=s!==null?s.baseLanes:n,fe(Pi,It),It|=r}else s!==null?(r=s.baseLanes|n,e.memoizedState=null):r=n,fe(Pi,It),It|=r;return dt(t,e,i,n),e.child}function bv(t,e){var n=e.ref;(t===null&&n!==null||t!==null&&t.ref!==n)&&(e.flags|=512,e.flags|=2097152)}function Th(t,e,n,r,i){var s=vt(n)?Kr:at.current;return s=Bi(e,s),bi(e,i),n=zd(t,e,n,r,s,i),r=$d(),t!==null&&!yt?(e.updateQueue=t.updateQueue,e.flags&=-2053,t.lanes&=~i,Vn(t,e,i)):(_e&&r&&xd(e),e.flags|=1,dt(t,e,n,i),e.child)}function ng(t,e,n,r,i){if(vt(n)){var s=!0;wl(e)}else s=!1;if(bi(e,i),e.stateNode===null)Ya(t,e),Pv(e,n,r),wh(e,n,r,i),r=!0;else if(t===null){var o=e.stateNode,l=e.memoizedProps;o.props=l;var u=o.context,h=n.contextType;typeof h=="object"&&h!==null?h=Vt(h):(h=vt(n)?Kr:at.current,h=Bi(e,h));var f=n.getDerivedStateFromProps,m=typeof f=="function"||typeof o.getSnapshotBeforeUpdate=="function";m||typeof o.UNSAFE_componentWillReceiveProps!="function"&&typeof o.componentWillReceiveProps!="function"||(l!==r||u!==h)&&Xm(e,o,r,h),Qn=!1;var _=e.memoizedState;o.state=_,Rl(e,r,o,i),u=e.memoizedState,l!==r||_!==u||_t.current||Qn?(typeof f=="function"&&(vh(e,n,f,r),u=e.memoizedState),(l=Qn||Qm(e,n,l,r,_,u,h))?(m||typeof o.UNSAFE_componentWillMount!="function"&&typeof o.componentWillMount!="function"||(typeof o.componentWillMount=="function"&&o.componentWillMount(),typeof o.UNSAFE_componentWillMount=="function"&&o.UNSAFE_componentWillMount()),typeof o.componentDidMount=="function"&&(e.flags|=4194308)):(typeof o.componentDidMount=="function"&&(e.flags|=4194308),e.memoizedProps=r,e.memoizedState=u),o.props=r,o.state=u,o.context=h,r=l):(typeof o.componentDidMount=="function"&&(e.flags|=4194308),r=!1)}else{o=e.stateNode,lv(t,e),l=e.memoizedProps,h=e.type===e.elementType?l:Ft(e.type,l),o.props=h,m=e.pendingProps,_=o.context,u=n.contextType,typeof u=="object"&&u!==null?u=Vt(u):(u=vt(n)?Kr:at.current,u=Bi(e,u));var R=n.getDerivedStateFromProps;(f=typeof R=="function"||typeof o.getSnapshotBeforeUpdate=="function")||typeof o.UNSAFE_componentWillReceiveProps!="function"&&typeof o.componentWillReceiveProps!="function"||(l!==m||_!==u)&&Xm(e,o,r,u),Qn=!1,_=e.memoizedState,o.state=_,Rl(e,r,o,i);var k=e.memoizedState;l!==m||_!==k||_t.current||Qn?(typeof R=="function"&&(vh(e,n,R,r),k=e.memoizedState),(h=Qn||Qm(e,n,h,r,_,k,u)||!1)?(f||typeof o.UNSAFE_componentWillUpdate!="function"&&typeof o.componentWillUpdate!="function"||(typeof o.componentWillUpdate=="function"&&o.componentWillUpdate(r,k,u),typeof o.UNSAFE_componentWillUpdate=="function"&&o.UNSAFE_componentWillUpdate(r,k,u)),typeof o.componentDidUpdate=="function"&&(e.flags|=4),typeof o.getSnapshotBeforeUpdate=="function"&&(e.flags|=1024)):(typeof o.componentDidUpdate!="function"||l===t.memoizedProps&&_===t.memoizedState||(e.flags|=4),typeof o.getSnapshotBeforeUpdate!="function"||l===t.memoizedProps&&_===t.memoizedState||(e.flags|=1024),e.memoizedProps=r,e.memoizedState=k),o.props=r,o.state=k,o.context=u,r=h):(typeof o.componentDidUpdate!="function"||l===t.memoizedProps&&_===t.memoizedState||(e.flags|=4),typeof o.getSnapshotBeforeUpdate!="function"||l===t.memoizedProps&&_===t.memoizedState||(e.flags|=1024),r=!1)}return Ih(t,e,n,r,s,i)}function Ih(t,e,n,r,i,s){bv(t,e);var o=(e.flags&128)!==0;if(!r&&!o)return i&&Bm(e,n,!1),Vn(t,e,s);r=e.stateNode,AS.current=e;var l=o&&typeof n.getDerivedStateFromError!="function"?null:r.render();return e.flags|=1,t!==null&&o?(e.child=$i(e,t.child,null,s),e.child=$i(e,null,l,s)):dt(t,e,l,s),e.memoizedState=r.state,i&&Bm(e,n,!0),e.child}function Vv(t){var e=t.stateNode;e.pendingContext?Fm(t,e.pendingContext,e.pendingContext!==e.context):e.context&&Fm(t,e.context,!1),jd(t,e.containerInfo)}function rg(t,e,n,r,i){return zi(),Dd(i),e.flags|=256,dt(t,e,n,r),e.child}var Sh={dehydrated:null,treeContext:null,retryLane:0};function Rh(t){return{baseLanes:t,cachePool:null,transitions:null}}function Lv(t,e,n){var r=e.pendingProps,i=we.current,s=!1,o=(e.flags&128)!==0,l;if((l=o)||(l=t!==null&&t.memoizedState===null?!1:(i&2)!==0),l?(s=!0,e.flags&=-129):(t===null||t.memoizedState!==null)&&(i|=1),fe(we,i&1),t===null)return yh(e),t=e.memoizedState,t!==null&&(t=t.dehydrated,t!==null)?(e.mode&1?t.data==="$!"?e.lanes=8:e.lanes=1073741824:e.lanes=1,null):(o=r.children,t=r.fallback,s?(r=e.mode,s=e.child,o={mode:"hidden",children:o},!(r&1)&&s!==null?(s.childLanes=0,s.pendingProps=o):s=uu(o,r,0,null),t=Br(t,r,n,null),s.return=e,t.return=e,s.sibling=t,e.child=s,e.child.memoizedState=Rh(n),e.memoizedState=Sh,t):Hd(e,o));if(i=t.memoizedState,i!==null&&(l=i.dehydrated,l!==null))return kS(t,e,o,r,l,i,n);if(s){s=r.fallback,o=e.mode,i=t.child,l=i.sibling;var u={mode:"hidden",children:r.children};return!(o&1)&&e.child!==i?(r=e.child,r.childLanes=0,r.pendingProps=u,e.deletions=null):(r=fr(i,u),r.subtreeFlags=i.subtreeFlags&14680064),l!==null?s=fr(l,s):(s=Br(s,o,n,null),s.flags|=2),s.return=e,r.return=e,r.sibling=s,e.child=r,r=s,s=e.child,o=t.child.memoizedState,o=o===null?Rh(n):{baseLanes:o.baseLanes|n,cachePool:null,transitions:o.transitions},s.memoizedState=o,s.childLanes=t.childLanes&~n,e.memoizedState=Sh,r}return s=t.child,t=s.sibling,r=fr(s,{mode:"visible",children:r.children}),!(e.mode&1)&&(r.lanes=n),r.return=e,r.sibling=null,t!==null&&(n=e.deletions,n===null?(e.deletions=[t],e.flags|=16):n.push(t)),e.child=r,e.memoizedState=null,r}function Hd(t,e){return e=uu({mode:"visible",children:e},t.mode,0,null),e.return=t,t.child=e}function Da(t,e,n,r){return r!==null&&Dd(r),$i(e,t.child,null,n),t=Hd(e,e.pendingProps.children),t.flags|=2,e.memoizedState=null,t}function kS(t,e,n,r,i,s,o){if(n)return e.flags&256?(e.flags&=-257,r=Sc(Error(B(422))),Da(t,e,o,r)):e.memoizedState!==null?(e.child=t.child,e.flags|=128,null):(s=r.fallback,i=e.mode,r=uu({mode:"visible",children:r.children},i,0,null),s=Br(s,i,o,null),s.flags|=2,r.return=e,s.return=e,r.sibling=s,e.child=r,e.mode&1&&$i(e,t.child,null,o),e.child.memoizedState=Rh(o),e.memoizedState=Sh,s);if(!(e.mode&1))return Da(t,e,o,null);if(i.data==="$!"){if(r=i.nextSibling&&i.nextSibling.dataset,r)var l=r.dgst;return r=l,s=Error(B(419)),r=Sc(s,r,void 0),Da(t,e,o,r)}if(l=(o&t.childLanes)!==0,yt||l){if(r=$e,r!==null){switch(o&-o){case 4:i=2;break;case 16:i=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:i=32;break;case 536870912:i=268435456;break;default:i=0}i=i&(r.suspendedLanes|o)?0:i,i!==0&&i!==s.retryLane&&(s.retryLane=i,bn(t,i),qt(r,t,i,-1))}return Jd(),r=Sc(Error(B(421))),Da(t,e,o,r)}return i.data==="$?"?(e.flags|=128,e.child=t.child,e=FS.bind(null,t),i._reactRetry=e,null):(t=s.treeContext,St=ur(i.nextSibling),At=e,_e=!0,zt=null,t!==null&&(xt[Nt++]=Rn,xt[Nt++]=An,xt[Nt++]=Gr,Rn=t.id,An=t.overflow,Gr=e),e=Hd(e,r.children),e.flags|=4096,e)}function ig(t,e,n){t.lanes|=e;var r=t.alternate;r!==null&&(r.lanes|=e),_h(t.return,e,n)}function Rc(t,e,n,r,i){var s=t.memoizedState;s===null?t.memoizedState={isBackwards:e,rendering:null,renderingStartTime:0,last:r,tail:n,tailMode:i}:(s.isBackwards=e,s.rendering=null,s.renderingStartTime=0,s.last=r,s.tail=n,s.tailMode=i)}function Mv(t,e,n){var r=e.pendingProps,i=r.revealOrder,s=r.tail;if(dt(t,e,r.children,n),r=we.current,r&2)r=r&1|2,e.flags|=128;else{if(t!==null&&t.flags&128)e:for(t=e.child;t!==null;){if(t.tag===13)t.memoizedState!==null&&ig(t,n,e);else if(t.tag===19)ig(t,n,e);else if(t.child!==null){t.child.return=t,t=t.child;continue}if(t===e)break e;for(;t.sibling===null;){if(t.return===null||t.return===e)break e;t=t.return}t.sibling.return=t.return,t=t.sibling}r&=1}if(fe(we,r),!(e.mode&1))e.memoizedState=null;else switch(i){case"forwards":for(n=e.child,i=null;n!==null;)t=n.alternate,t!==null&&Al(t)===null&&(i=n),n=n.sibling;n=i,n===null?(i=e.child,e.child=null):(i=n.sibling,n.sibling=null),Rc(e,!1,i,n,s);break;case"backwards":for(n=null,i=e.child,e.child=null;i!==null;){if(t=i.alternate,t!==null&&Al(t)===null){e.child=i;break}t=i.sibling,i.sibling=n,n=i,i=t}Rc(e,!0,n,null,s);break;case"together":Rc(e,!1,null,null,void 0);break;default:e.memoizedState=null}return e.child}function Ya(t,e){!(e.mode&1)&&t!==null&&(t.alternate=null,e.alternate=null,e.flags|=2)}function Vn(t,e,n){if(t!==null&&(e.dependencies=t.dependencies),Xr|=e.lanes,!(n&e.childLanes))return null;if(t!==null&&e.child!==t.child)throw Error(B(153));if(e.child!==null){for(t=e.child,n=fr(t,t.pendingProps),e.child=n,n.return=e;t.sibling!==null;)t=t.sibling,n=n.sibling=fr(t,t.pendingProps),n.return=e;n.sibling=null}return e.child}function CS(t,e,n){switch(e.tag){case 3:Vv(e),zi();break;case 5:uv(e);break;case 1:vt(e.type)&&wl(e);break;case 4:jd(e,e.stateNode.containerInfo);break;case 10:var r=e.type._context,i=e.memoizedProps.value;fe(Il,r._currentValue),r._currentValue=i;break;case 13:if(r=e.memoizedState,r!==null)return r.dehydrated!==null?(fe(we,we.current&1),e.flags|=128,null):n&e.child.childLanes?Lv(t,e,n):(fe(we,we.current&1),t=Vn(t,e,n),t!==null?t.sibling:null);fe(we,we.current&1);break;case 19:if(r=(n&e.childLanes)!==0,t.flags&128){if(r)return Mv(t,e,n);e.flags|=128}if(i=e.memoizedState,i!==null&&(i.rendering=null,i.tail=null,i.lastEffect=null),fe(we,we.current),r)break;return null;case 22:case 23:return e.lanes=0,Ov(t,e,n)}return Vn(t,e,n)}var jv,Ah,Uv,Fv;jv=function(t,e){for(var n=e.child;n!==null;){if(n.tag===5||n.tag===6)t.appendChild(n.stateNode);else if(n.tag!==4&&n.child!==null){n.child.return=n,n=n.child;continue}if(n===e)break;for(;n.sibling===null;){if(n.return===null||n.return===e)return;n=n.return}n.sibling.return=n.return,n=n.sibling}};Ah=function(){};Uv=function(t,e,n,r){var i=t.memoizedProps;if(i!==r){t=e.stateNode,Mr(on.current);var s=null;switch(n){case"input":i=Gc(t,i),r=Gc(t,r),s=[];break;case"select":i=Ie({},i,{value:void 0}),r=Ie({},r,{value:void 0}),s=[];break;case"textarea":i=Yc(t,i),r=Yc(t,r),s=[];break;default:typeof i.onClick!="function"&&typeof r.onClick=="function"&&(t.onclick=_l)}Zc(n,r);var o;n=null;for(h in i)if(!r.hasOwnProperty(h)&&i.hasOwnProperty(h)&&i[h]!=null)if(h==="style"){var l=i[h];for(o in l)l.hasOwnProperty(o)&&(n||(n={}),n[o]="")}else h!=="dangerouslySetInnerHTML"&&h!=="children"&&h!=="suppressContentEditableWarning"&&h!=="suppressHydrationWarning"&&h!=="autoFocus"&&(ao.hasOwnProperty(h)?s||(s=[]):(s=s||[]).push(h,null));for(h in r){var u=r[h];if(l=i!=null?i[h]:void 0,r.hasOwnProperty(h)&&u!==l&&(u!=null||l!=null))if(h==="style")if(l){for(o in l)!l.hasOwnProperty(o)||u&&u.hasOwnProperty(o)||(n||(n={}),n[o]="");for(o in u)u.hasOwnProperty(o)&&l[o]!==u[o]&&(n||(n={}),n[o]=u[o])}else n||(s||(s=[]),s.push(h,n)),n=u;else h==="dangerouslySetInnerHTML"?(u=u?u.__html:void 0,l=l?l.__html:void 0,u!=null&&l!==u&&(s=s||[]).push(h,u)):h==="children"?typeof u!="string"&&typeof u!="number"||(s=s||[]).push(h,""+u):h!=="suppressContentEditableWarning"&&h!=="suppressHydrationWarning"&&(ao.hasOwnProperty(h)?(u!=null&&h==="onScroll"&&me("scroll",t),s||l===u||(s=[])):(s=s||[]).push(h,u))}n&&(s=s||[]).push("style",n);var h=s;(e.updateQueue=h)&&(e.flags|=4)}};Fv=function(t,e,n,r){n!==r&&(e.flags|=4)};function Os(t,e){if(!_e)switch(t.tailMode){case"hidden":e=t.tail;for(var n=null;e!==null;)e.alternate!==null&&(n=e),e=e.sibling;n===null?t.tail=null:n.sibling=null;break;case"collapsed":n=t.tail;for(var r=null;n!==null;)n.alternate!==null&&(r=n),n=n.sibling;r===null?e||t.tail===null?t.tail=null:t.tail.sibling=null:r.sibling=null}}function nt(t){var e=t.alternate!==null&&t.alternate.child===t.child,n=0,r=0;if(e)for(var i=t.child;i!==null;)n|=i.lanes|i.childLanes,r|=i.subtreeFlags&14680064,r|=i.flags&14680064,i.return=t,i=i.sibling;else for(i=t.child;i!==null;)n|=i.lanes|i.childLanes,r|=i.subtreeFlags,r|=i.flags,i.return=t,i=i.sibling;return t.subtreeFlags|=r,t.childLanes=n,e}function PS(t,e,n){var r=e.pendingProps;switch(Nd(e),e.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return nt(e),null;case 1:return vt(e.type)&&vl(),nt(e),null;case 3:return r=e.stateNode,Wi(),ye(_t),ye(at),Fd(),r.pendingContext&&(r.context=r.pendingContext,r.pendingContext=null),(t===null||t.child===null)&&(xa(e)?e.flags|=4:t===null||t.memoizedState.isDehydrated&&!(e.flags&256)||(e.flags|=1024,zt!==null&&(bh(zt),zt=null))),Ah(t,e),nt(e),null;case 5:Ud(e);var i=Mr(wo.current);if(n=e.type,t!==null&&e.stateNode!=null)Uv(t,e,n,r,i),t.ref!==e.ref&&(e.flags|=512,e.flags|=2097152);else{if(!r){if(e.stateNode===null)throw Error(B(166));return nt(e),null}if(t=Mr(on.current),xa(e)){r=e.stateNode,n=e.type;var s=e.memoizedProps;switch(r[nn]=e,r[_o]=s,t=(e.mode&1)!==0,n){case"dialog":me("cancel",r),me("close",r);break;case"iframe":case"object":case"embed":me("load",r);break;case"video":case"audio":for(i=0;i<Bs.length;i++)me(Bs[i],r);break;case"source":me("error",r);break;case"img":case"image":case"link":me("error",r),me("load",r);break;case"details":me("toggle",r);break;case"input":fm(r,s),me("invalid",r);break;case"select":r._wrapperState={wasMultiple:!!s.multiple},me("invalid",r);break;case"textarea":mm(r,s),me("invalid",r)}Zc(n,s),i=null;for(var o in s)if(s.hasOwnProperty(o)){var l=s[o];o==="children"?typeof l=="string"?r.textContent!==l&&(s.suppressHydrationWarning!==!0&&Pa(r.textContent,l,t),i=["children",l]):typeof l=="number"&&r.textContent!==""+l&&(s.suppressHydrationWarning!==!0&&Pa(r.textContent,l,t),i=["children",""+l]):ao.hasOwnProperty(o)&&l!=null&&o==="onScroll"&&me("scroll",r)}switch(n){case"input":Ea(r),pm(r,s,!0);break;case"textarea":Ea(r),gm(r);break;case"select":case"option":break;default:typeof s.onClick=="function"&&(r.onclick=_l)}r=i,e.updateQueue=r,r!==null&&(e.flags|=4)}else{o=i.nodeType===9?i:i.ownerDocument,t==="http://www.w3.org/1999/xhtml"&&(t=p_(n)),t==="http://www.w3.org/1999/xhtml"?n==="script"?(t=o.createElement("div"),t.innerHTML="<script><\/script>",t=t.removeChild(t.firstChild)):typeof r.is=="string"?t=o.createElement(n,{is:r.is}):(t=o.createElement(n),n==="select"&&(o=t,r.multiple?o.multiple=!0:r.size&&(o.size=r.size))):t=o.createElementNS(t,n),t[nn]=e,t[_o]=r,jv(t,e,!1,!1),e.stateNode=t;e:{switch(o=eh(n,r),n){case"dialog":me("cancel",t),me("close",t),i=r;break;case"iframe":case"object":case"embed":me("load",t),i=r;break;case"video":case"audio":for(i=0;i<Bs.length;i++)me(Bs[i],t);i=r;break;case"source":me("error",t),i=r;break;case"img":case"image":case"link":me("error",t),me("load",t),i=r;break;case"details":me("toggle",t),i=r;break;case"input":fm(t,r),i=Gc(t,r),me("invalid",t);break;case"option":i=r;break;case"select":t._wrapperState={wasMultiple:!!r.multiple},i=Ie({},r,{value:void 0}),me("invalid",t);break;case"textarea":mm(t,r),i=Yc(t,r),me("invalid",t);break;default:i=r}Zc(n,i),l=i;for(s in l)if(l.hasOwnProperty(s)){var u=l[s];s==="style"?y_(t,u):s==="dangerouslySetInnerHTML"?(u=u?u.__html:void 0,u!=null&&m_(t,u)):s==="children"?typeof u=="string"?(n!=="textarea"||u!=="")&&lo(t,u):typeof u=="number"&&lo(t,""+u):s!=="suppressContentEditableWarning"&&s!=="suppressHydrationWarning"&&s!=="autoFocus"&&(ao.hasOwnProperty(s)?u!=null&&s==="onScroll"&&me("scroll",t):u!=null&&gd(t,s,u,o))}switch(n){case"input":Ea(t),pm(t,r,!1);break;case"textarea":Ea(t),gm(t);break;case"option":r.value!=null&&t.setAttribute("value",""+_r(r.value));break;case"select":t.multiple=!!r.multiple,s=r.value,s!=null?xi(t,!!r.multiple,s,!1):r.defaultValue!=null&&xi(t,!!r.multiple,r.defaultValue,!0);break;default:typeof i.onClick=="function"&&(t.onclick=_l)}switch(n){case"button":case"input":case"select":case"textarea":r=!!r.autoFocus;break e;case"img":r=!0;break e;default:r=!1}}r&&(e.flags|=4)}e.ref!==null&&(e.flags|=512,e.flags|=2097152)}return nt(e),null;case 6:if(t&&e.stateNode!=null)Fv(t,e,t.memoizedProps,r);else{if(typeof r!="string"&&e.stateNode===null)throw Error(B(166));if(n=Mr(wo.current),Mr(on.current),xa(e)){if(r=e.stateNode,n=e.memoizedProps,r[nn]=e,(s=r.nodeValue!==n)&&(t=At,t!==null))switch(t.tag){case 3:Pa(r.nodeValue,n,(t.mode&1)!==0);break;case 5:t.memoizedProps.suppressHydrationWarning!==!0&&Pa(r.nodeValue,n,(t.mode&1)!==0)}s&&(e.flags|=4)}else r=(n.nodeType===9?n:n.ownerDocument).createTextNode(r),r[nn]=e,e.stateNode=r}return nt(e),null;case 13:if(ye(we),r=e.memoizedState,t===null||t.memoizedState!==null&&t.memoizedState.dehydrated!==null){if(_e&&St!==null&&e.mode&1&&!(e.flags&128))iv(),zi(),e.flags|=98560,s=!1;else if(s=xa(e),r!==null&&r.dehydrated!==null){if(t===null){if(!s)throw Error(B(318));if(s=e.memoizedState,s=s!==null?s.dehydrated:null,!s)throw Error(B(317));s[nn]=e}else zi(),!(e.flags&128)&&(e.memoizedState=null),e.flags|=4;nt(e),s=!1}else zt!==null&&(bh(zt),zt=null),s=!0;if(!s)return e.flags&65536?e:null}return e.flags&128?(e.lanes=n,e):(r=r!==null,r!==(t!==null&&t.memoizedState!==null)&&r&&(e.child.flags|=8192,e.mode&1&&(t===null||we.current&1?je===0&&(je=3):Jd())),e.updateQueue!==null&&(e.flags|=4),nt(e),null);case 4:return Wi(),Ah(t,e),t===null&&go(e.stateNode.containerInfo),nt(e),null;case 10:return Vd(e.type._context),nt(e),null;case 17:return vt(e.type)&&vl(),nt(e),null;case 19:if(ye(we),s=e.memoizedState,s===null)return nt(e),null;if(r=(e.flags&128)!==0,o=s.rendering,o===null)if(r)Os(s,!1);else{if(je!==0||t!==null&&t.flags&128)for(t=e.child;t!==null;){if(o=Al(t),o!==null){for(e.flags|=128,Os(s,!1),r=o.updateQueue,r!==null&&(e.updateQueue=r,e.flags|=4),e.subtreeFlags=0,r=n,n=e.child;n!==null;)s=n,t=r,s.flags&=14680066,o=s.alternate,o===null?(s.childLanes=0,s.lanes=t,s.child=null,s.subtreeFlags=0,s.memoizedProps=null,s.memoizedState=null,s.updateQueue=null,s.dependencies=null,s.stateNode=null):(s.childLanes=o.childLanes,s.lanes=o.lanes,s.child=o.child,s.subtreeFlags=0,s.deletions=null,s.memoizedProps=o.memoizedProps,s.memoizedState=o.memoizedState,s.updateQueue=o.updateQueue,s.type=o.type,t=o.dependencies,s.dependencies=t===null?null:{lanes:t.lanes,firstContext:t.firstContext}),n=n.sibling;return fe(we,we.current&1|2),e.child}t=t.sibling}s.tail!==null&&xe()>Hi&&(e.flags|=128,r=!0,Os(s,!1),e.lanes=4194304)}else{if(!r)if(t=Al(o),t!==null){if(e.flags|=128,r=!0,n=t.updateQueue,n!==null&&(e.updateQueue=n,e.flags|=4),Os(s,!0),s.tail===null&&s.tailMode==="hidden"&&!o.alternate&&!_e)return nt(e),null}else 2*xe()-s.renderingStartTime>Hi&&n!==1073741824&&(e.flags|=128,r=!0,Os(s,!1),e.lanes=4194304);s.isBackwards?(o.sibling=e.child,e.child=o):(n=s.last,n!==null?n.sibling=o:e.child=o,s.last=o)}return s.tail!==null?(e=s.tail,s.rendering=e,s.tail=e.sibling,s.renderingStartTime=xe(),e.sibling=null,n=we.current,fe(we,r?n&1|2:n&1),e):(nt(e),null);case 22:case 23:return Yd(),r=e.memoizedState!==null,t!==null&&t.memoizedState!==null!==r&&(e.flags|=8192),r&&e.mode&1?It&1073741824&&(nt(e),e.subtreeFlags&6&&(e.flags|=8192)):nt(e),null;case 24:return null;case 25:return null}throw Error(B(156,e.tag))}function xS(t,e){switch(Nd(e),e.tag){case 1:return vt(e.type)&&vl(),t=e.flags,t&65536?(e.flags=t&-65537|128,e):null;case 3:return Wi(),ye(_t),ye(at),Fd(),t=e.flags,t&65536&&!(t&128)?(e.flags=t&-65537|128,e):null;case 5:return Ud(e),null;case 13:if(ye(we),t=e.memoizedState,t!==null&&t.dehydrated!==null){if(e.alternate===null)throw Error(B(340));zi()}return t=e.flags,t&65536?(e.flags=t&-65537|128,e):null;case 19:return ye(we),null;case 4:return Wi(),null;case 10:return Vd(e.type._context),null;case 22:case 23:return Yd(),null;case 24:return null;default:return null}}var Oa=!1,st=!1,NS=typeof WeakSet=="function"?WeakSet:Set,H=null;function Ci(t,e){var n=t.ref;if(n!==null)if(typeof n=="function")try{n(null)}catch(r){Ae(t,e,r)}else n.current=null}function kh(t,e,n){try{n()}catch(r){Ae(t,e,r)}}var sg=!1;function DS(t,e){if(ch=ml,t=q_(),Pd(t)){if("selectionStart"in t)var n={start:t.selectionStart,end:t.selectionEnd};else e:{n=(n=t.ownerDocument)&&n.defaultView||window;var r=n.getSelection&&n.getSelection();if(r&&r.rangeCount!==0){n=r.anchorNode;var i=r.anchorOffset,s=r.focusNode;r=r.focusOffset;try{n.nodeType,s.nodeType}catch{n=null;break e}var o=0,l=-1,u=-1,h=0,f=0,m=t,_=null;t:for(;;){for(var R;m!==n||i!==0&&m.nodeType!==3||(l=o+i),m!==s||r!==0&&m.nodeType!==3||(u=o+r),m.nodeType===3&&(o+=m.nodeValue.length),(R=m.firstChild)!==null;)_=m,m=R;for(;;){if(m===t)break t;if(_===n&&++h===i&&(l=o),_===s&&++f===r&&(u=o),(R=m.nextSibling)!==null)break;m=_,_=m.parentNode}m=R}n=l===-1||u===-1?null:{start:l,end:u}}else n=null}n=n||{start:0,end:0}}else n=null;for(hh={focusedElem:t,selectionRange:n},ml=!1,H=e;H!==null;)if(e=H,t=e.child,(e.subtreeFlags&1028)!==0&&t!==null)t.return=e,H=t;else for(;H!==null;){e=H;try{var k=e.alternate;if(e.flags&1024)switch(e.tag){case 0:case 11:case 15:break;case 1:if(k!==null){var x=k.memoizedProps,C=k.memoizedState,w=e.stateNode,g=w.getSnapshotBeforeUpdate(e.elementType===e.type?x:Ft(e.type,x),C);w.__reactInternalSnapshotBeforeUpdate=g}break;case 3:var T=e.stateNode.containerInfo;T.nodeType===1?T.textContent="":T.nodeType===9&&T.documentElement&&T.removeChild(T.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(B(163))}}catch(D){Ae(e,e.return,D)}if(t=e.sibling,t!==null){t.return=e.return,H=t;break}H=e.return}return k=sg,sg=!1,k}function Js(t,e,n){var r=e.updateQueue;if(r=r!==null?r.lastEffect:null,r!==null){var i=r=r.next;do{if((i.tag&t)===t){var s=i.destroy;i.destroy=void 0,s!==void 0&&kh(e,n,s)}i=i.next}while(i!==r)}}function au(t,e){if(e=e.updateQueue,e=e!==null?e.lastEffect:null,e!==null){var n=e=e.next;do{if((n.tag&t)===t){var r=n.create;n.destroy=r()}n=n.next}while(n!==e)}}function Ch(t){var e=t.ref;if(e!==null){var n=t.stateNode;switch(t.tag){case 5:t=n;break;default:t=n}typeof e=="function"?e(t):e.current=t}}function Bv(t){var e=t.alternate;e!==null&&(t.alternate=null,Bv(e)),t.child=null,t.deletions=null,t.sibling=null,t.tag===5&&(e=t.stateNode,e!==null&&(delete e[nn],delete e[_o],delete e[ph],delete e[pS],delete e[mS])),t.stateNode=null,t.return=null,t.dependencies=null,t.memoizedProps=null,t.memoizedState=null,t.pendingProps=null,t.stateNode=null,t.updateQueue=null}function zv(t){return t.tag===5||t.tag===3||t.tag===4}function og(t){e:for(;;){for(;t.sibling===null;){if(t.return===null||zv(t.return))return null;t=t.return}for(t.sibling.return=t.return,t=t.sibling;t.tag!==5&&t.tag!==6&&t.tag!==18;){if(t.flags&2||t.child===null||t.tag===4)continue e;t.child.return=t,t=t.child}if(!(t.flags&2))return t.stateNode}}function Ph(t,e,n){var r=t.tag;if(r===5||r===6)t=t.stateNode,e?n.nodeType===8?n.parentNode.insertBefore(t,e):n.insertBefore(t,e):(n.nodeType===8?(e=n.parentNode,e.insertBefore(t,n)):(e=n,e.appendChild(t)),n=n._reactRootContainer,n!=null||e.onclick!==null||(e.onclick=_l));else if(r!==4&&(t=t.child,t!==null))for(Ph(t,e,n),t=t.sibling;t!==null;)Ph(t,e,n),t=t.sibling}function xh(t,e,n){var r=t.tag;if(r===5||r===6)t=t.stateNode,e?n.insertBefore(t,e):n.appendChild(t);else if(r!==4&&(t=t.child,t!==null))for(xh(t,e,n),t=t.sibling;t!==null;)xh(t,e,n),t=t.sibling}var qe=null,Bt=!1;function qn(t,e,n){for(n=n.child;n!==null;)$v(t,e,n),n=n.sibling}function $v(t,e,n){if(sn&&typeof sn.onCommitFiberUnmount=="function")try{sn.onCommitFiberUnmount(Zl,n)}catch{}switch(n.tag){case 5:st||Ci(n,e);case 6:var r=qe,i=Bt;qe=null,qn(t,e,n),qe=r,Bt=i,qe!==null&&(Bt?(t=qe,n=n.stateNode,t.nodeType===8?t.parentNode.removeChild(n):t.removeChild(n)):qe.removeChild(n.stateNode));break;case 18:qe!==null&&(Bt?(t=qe,n=n.stateNode,t.nodeType===8?_c(t.parentNode,n):t.nodeType===1&&_c(t,n),fo(t)):_c(qe,n.stateNode));break;case 4:r=qe,i=Bt,qe=n.stateNode.containerInfo,Bt=!0,qn(t,e,n),qe=r,Bt=i;break;case 0:case 11:case 14:case 15:if(!st&&(r=n.updateQueue,r!==null&&(r=r.lastEffect,r!==null))){i=r=r.next;do{var s=i,o=s.destroy;s=s.tag,o!==void 0&&(s&2||s&4)&&kh(n,e,o),i=i.next}while(i!==r)}qn(t,e,n);break;case 1:if(!st&&(Ci(n,e),r=n.stateNode,typeof r.componentWillUnmount=="function"))try{r.props=n.memoizedProps,r.state=n.memoizedState,r.componentWillUnmount()}catch(l){Ae(n,e,l)}qn(t,e,n);break;case 21:qn(t,e,n);break;case 22:n.mode&1?(st=(r=st)||n.memoizedState!==null,qn(t,e,n),st=r):qn(t,e,n);break;default:qn(t,e,n)}}function ag(t){var e=t.updateQueue;if(e!==null){t.updateQueue=null;var n=t.stateNode;n===null&&(n=t.stateNode=new NS),e.forEach(function(r){var i=BS.bind(null,t,r);n.has(r)||(n.add(r),r.then(i,i))})}}function Ut(t,e){var n=e.deletions;if(n!==null)for(var r=0;r<n.length;r++){var i=n[r];try{var s=t,o=e,l=o;e:for(;l!==null;){switch(l.tag){case 5:qe=l.stateNode,Bt=!1;break e;case 3:qe=l.stateNode.containerInfo,Bt=!0;break e;case 4:qe=l.stateNode.containerInfo,Bt=!0;break e}l=l.return}if(qe===null)throw Error(B(160));$v(s,o,i),qe=null,Bt=!1;var u=i.alternate;u!==null&&(u.return=null),i.return=null}catch(h){Ae(i,e,h)}}if(e.subtreeFlags&12854)for(e=e.child;e!==null;)Wv(e,t),e=e.sibling}function Wv(t,e){var n=t.alternate,r=t.flags;switch(t.tag){case 0:case 11:case 14:case 15:if(Ut(e,t),Zt(t),r&4){try{Js(3,t,t.return),au(3,t)}catch(x){Ae(t,t.return,x)}try{Js(5,t,t.return)}catch(x){Ae(t,t.return,x)}}break;case 1:Ut(e,t),Zt(t),r&512&&n!==null&&Ci(n,n.return);break;case 5:if(Ut(e,t),Zt(t),r&512&&n!==null&&Ci(n,n.return),t.flags&32){var i=t.stateNode;try{lo(i,"")}catch(x){Ae(t,t.return,x)}}if(r&4&&(i=t.stateNode,i!=null)){var s=t.memoizedProps,o=n!==null?n.memoizedProps:s,l=t.type,u=t.updateQueue;if(t.updateQueue=null,u!==null)try{l==="input"&&s.type==="radio"&&s.name!=null&&d_(i,s),eh(l,o);var h=eh(l,s);for(o=0;o<u.length;o+=2){var f=u[o],m=u[o+1];f==="style"?y_(i,m):f==="dangerouslySetInnerHTML"?m_(i,m):f==="children"?lo(i,m):gd(i,f,m,h)}switch(l){case"input":Qc(i,s);break;case"textarea":f_(i,s);break;case"select":var _=i._wrapperState.wasMultiple;i._wrapperState.wasMultiple=!!s.multiple;var R=s.value;R!=null?xi(i,!!s.multiple,R,!1):_!==!!s.multiple&&(s.defaultValue!=null?xi(i,!!s.multiple,s.defaultValue,!0):xi(i,!!s.multiple,s.multiple?[]:"",!1))}i[_o]=s}catch(x){Ae(t,t.return,x)}}break;case 6:if(Ut(e,t),Zt(t),r&4){if(t.stateNode===null)throw Error(B(162));i=t.stateNode,s=t.memoizedProps;try{i.nodeValue=s}catch(x){Ae(t,t.return,x)}}break;case 3:if(Ut(e,t),Zt(t),r&4&&n!==null&&n.memoizedState.isDehydrated)try{fo(e.containerInfo)}catch(x){Ae(t,t.return,x)}break;case 4:Ut(e,t),Zt(t);break;case 13:Ut(e,t),Zt(t),i=t.child,i.flags&8192&&(s=i.memoizedState!==null,i.stateNode.isHidden=s,!s||i.alternate!==null&&i.alternate.memoizedState!==null||(Qd=xe())),r&4&&ag(t);break;case 22:if(f=n!==null&&n.memoizedState!==null,t.mode&1?(st=(h=st)||f,Ut(e,t),st=h):Ut(e,t),Zt(t),r&8192){if(h=t.memoizedState!==null,(t.stateNode.isHidden=h)&&!f&&t.mode&1)for(H=t,f=t.child;f!==null;){for(m=H=f;H!==null;){switch(_=H,R=_.child,_.tag){case 0:case 11:case 14:case 15:Js(4,_,_.return);break;case 1:Ci(_,_.return);var k=_.stateNode;if(typeof k.componentWillUnmount=="function"){r=_,n=_.return;try{e=r,k.props=e.memoizedProps,k.state=e.memoizedState,k.componentWillUnmount()}catch(x){Ae(r,n,x)}}break;case 5:Ci(_,_.return);break;case 22:if(_.memoizedState!==null){ug(m);continue}}R!==null?(R.return=_,H=R):ug(m)}f=f.sibling}e:for(f=null,m=t;;){if(m.tag===5){if(f===null){f=m;try{i=m.stateNode,h?(s=i.style,typeof s.setProperty=="function"?s.setProperty("display","none","important"):s.display="none"):(l=m.stateNode,u=m.memoizedProps.style,o=u!=null&&u.hasOwnProperty("display")?u.display:null,l.style.display=g_("display",o))}catch(x){Ae(t,t.return,x)}}}else if(m.tag===6){if(f===null)try{m.stateNode.nodeValue=h?"":m.memoizedProps}catch(x){Ae(t,t.return,x)}}else if((m.tag!==22&&m.tag!==23||m.memoizedState===null||m===t)&&m.child!==null){m.child.return=m,m=m.child;continue}if(m===t)break e;for(;m.sibling===null;){if(m.return===null||m.return===t)break e;f===m&&(f=null),m=m.return}f===m&&(f=null),m.sibling.return=m.return,m=m.sibling}}break;case 19:Ut(e,t),Zt(t),r&4&&ag(t);break;case 21:break;default:Ut(e,t),Zt(t)}}function Zt(t){var e=t.flags;if(e&2){try{e:{for(var n=t.return;n!==null;){if(zv(n)){var r=n;break e}n=n.return}throw Error(B(160))}switch(r.tag){case 5:var i=r.stateNode;r.flags&32&&(lo(i,""),r.flags&=-33);var s=og(t);xh(t,s,i);break;case 3:case 4:var o=r.stateNode.containerInfo,l=og(t);Ph(t,l,o);break;default:throw Error(B(161))}}catch(u){Ae(t,t.return,u)}t.flags&=-3}e&4096&&(t.flags&=-4097)}function OS(t,e,n){H=t,qv(t)}function qv(t,e,n){for(var r=(t.mode&1)!==0;H!==null;){var i=H,s=i.child;if(i.tag===22&&r){var o=i.memoizedState!==null||Oa;if(!o){var l=i.alternate,u=l!==null&&l.memoizedState!==null||st;l=Oa;var h=st;if(Oa=o,(st=u)&&!h)for(H=i;H!==null;)o=H,u=o.child,o.tag===22&&o.memoizedState!==null?cg(i):u!==null?(u.return=o,H=u):cg(i);for(;s!==null;)H=s,qv(s),s=s.sibling;H=i,Oa=l,st=h}lg(t)}else i.subtreeFlags&8772&&s!==null?(s.return=i,H=s):lg(t)}}function lg(t){for(;H!==null;){var e=H;if(e.flags&8772){var n=e.alternate;try{if(e.flags&8772)switch(e.tag){case 0:case 11:case 15:st||au(5,e);break;case 1:var r=e.stateNode;if(e.flags&4&&!st)if(n===null)r.componentDidMount();else{var i=e.elementType===e.type?n.memoizedProps:Ft(e.type,n.memoizedProps);r.componentDidUpdate(i,n.memoizedState,r.__reactInternalSnapshotBeforeUpdate)}var s=e.updateQueue;s!==null&&Hm(e,s,r);break;case 3:var o=e.updateQueue;if(o!==null){if(n=null,e.child!==null)switch(e.child.tag){case 5:n=e.child.stateNode;break;case 1:n=e.child.stateNode}Hm(e,o,n)}break;case 5:var l=e.stateNode;if(n===null&&e.flags&4){n=l;var u=e.memoizedProps;switch(e.type){case"button":case"input":case"select":case"textarea":u.autoFocus&&n.focus();break;case"img":u.src&&(n.src=u.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(e.memoizedState===null){var h=e.alternate;if(h!==null){var f=h.memoizedState;if(f!==null){var m=f.dehydrated;m!==null&&fo(m)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(B(163))}st||e.flags&512&&Ch(e)}catch(_){Ae(e,e.return,_)}}if(e===t){H=null;break}if(n=e.sibling,n!==null){n.return=e.return,H=n;break}H=e.return}}function ug(t){for(;H!==null;){var e=H;if(e===t){H=null;break}var n=e.sibling;if(n!==null){n.return=e.return,H=n;break}H=e.return}}function cg(t){for(;H!==null;){var e=H;try{switch(e.tag){case 0:case 11:case 15:var n=e.return;try{au(4,e)}catch(u){Ae(e,n,u)}break;case 1:var r=e.stateNode;if(typeof r.componentDidMount=="function"){var i=e.return;try{r.componentDidMount()}catch(u){Ae(e,i,u)}}var s=e.return;try{Ch(e)}catch(u){Ae(e,s,u)}break;case 5:var o=e.return;try{Ch(e)}catch(u){Ae(e,o,u)}}}catch(u){Ae(e,e.return,u)}if(e===t){H=null;break}var l=e.sibling;if(l!==null){l.return=e.return,H=l;break}H=e.return}}var bS=Math.ceil,Pl=Fn.ReactCurrentDispatcher,Kd=Fn.ReactCurrentOwner,bt=Fn.ReactCurrentBatchConfig,oe=0,$e=null,be=null,Ge=0,It=0,Pi=Rr(0),je=0,So=null,Xr=0,lu=0,Gd=0,Zs=null,gt=null,Qd=0,Hi=1/0,Tn=null,xl=!1,Nh=null,hr=null,ba=!1,rr=null,Nl=0,eo=0,Dh=null,Ja=-1,Za=0;function ft(){return oe&6?xe():Ja!==-1?Ja:Ja=xe()}function dr(t){return t.mode&1?oe&2&&Ge!==0?Ge&-Ge:yS.transition!==null?(Za===0&&(Za=P_()),Za):(t=ce,t!==0||(t=window.event,t=t===void 0?16:L_(t.type)),t):1}function qt(t,e,n,r){if(50<eo)throw eo=0,Dh=null,Error(B(185));jo(t,n,r),(!(oe&2)||t!==$e)&&(t===$e&&(!(oe&2)&&(lu|=n),je===4&&Yn(t,Ge)),wt(t,r),n===1&&oe===0&&!(e.mode&1)&&(Hi=xe()+500,iu&&Ar()))}function wt(t,e){var n=t.callbackNode;yI(t,e);var r=pl(t,t===$e?Ge:0);if(r===0)n!==null&&vm(n),t.callbackNode=null,t.callbackPriority=0;else if(e=r&-r,t.callbackPriority!==e){if(n!=null&&vm(n),e===1)t.tag===0?gS(hg.bind(null,t)):tv(hg.bind(null,t)),dS(function(){!(oe&6)&&Ar()}),n=null;else{switch(x_(r)){case 1:n=Ed;break;case 4:n=k_;break;case 16:n=fl;break;case 536870912:n=C_;break;default:n=fl}n=Zv(n,Hv.bind(null,t))}t.callbackPriority=e,t.callbackNode=n}}function Hv(t,e){if(Ja=-1,Za=0,oe&6)throw Error(B(327));var n=t.callbackNode;if(Vi()&&t.callbackNode!==n)return null;var r=pl(t,t===$e?Ge:0);if(r===0)return null;if(r&30||r&t.expiredLanes||e)e=Dl(t,r);else{e=r;var i=oe;oe|=2;var s=Gv();($e!==t||Ge!==e)&&(Tn=null,Hi=xe()+500,Fr(t,e));do try{MS();break}catch(l){Kv(t,l)}while(!0);bd(),Pl.current=s,oe=i,be!==null?e=0:($e=null,Ge=0,e=je)}if(e!==0){if(e===2&&(i=sh(t),i!==0&&(r=i,e=Oh(t,i))),e===1)throw n=So,Fr(t,0),Yn(t,r),wt(t,xe()),n;if(e===6)Yn(t,r);else{if(i=t.current.alternate,!(r&30)&&!VS(i)&&(e=Dl(t,r),e===2&&(s=sh(t),s!==0&&(r=s,e=Oh(t,s))),e===1))throw n=So,Fr(t,0),Yn(t,r),wt(t,xe()),n;switch(t.finishedWork=i,t.finishedLanes=r,e){case 0:case 1:throw Error(B(345));case 2:Or(t,gt,Tn);break;case 3:if(Yn(t,r),(r&130023424)===r&&(e=Qd+500-xe(),10<e)){if(pl(t,0)!==0)break;if(i=t.suspendedLanes,(i&r)!==r){ft(),t.pingedLanes|=t.suspendedLanes&i;break}t.timeoutHandle=fh(Or.bind(null,t,gt,Tn),e);break}Or(t,gt,Tn);break;case 4:if(Yn(t,r),(r&4194240)===r)break;for(e=t.eventTimes,i=-1;0<r;){var o=31-Wt(r);s=1<<o,o=e[o],o>i&&(i=o),r&=~s}if(r=i,r=xe()-r,r=(120>r?120:480>r?480:1080>r?1080:1920>r?1920:3e3>r?3e3:4320>r?4320:1960*bS(r/1960))-r,10<r){t.timeoutHandle=fh(Or.bind(null,t,gt,Tn),r);break}Or(t,gt,Tn);break;case 5:Or(t,gt,Tn);break;default:throw Error(B(329))}}}return wt(t,xe()),t.callbackNode===n?Hv.bind(null,t):null}function Oh(t,e){var n=Zs;return t.current.memoizedState.isDehydrated&&(Fr(t,e).flags|=256),t=Dl(t,e),t!==2&&(e=gt,gt=n,e!==null&&bh(e)),t}function bh(t){gt===null?gt=t:gt.push.apply(gt,t)}function VS(t){for(var e=t;;){if(e.flags&16384){var n=e.updateQueue;if(n!==null&&(n=n.stores,n!==null))for(var r=0;r<n.length;r++){var i=n[r],s=i.getSnapshot;i=i.value;try{if(!Yt(s(),i))return!1}catch{return!1}}}if(n=e.child,e.subtreeFlags&16384&&n!==null)n.return=e,e=n;else{if(e===t)break;for(;e.sibling===null;){if(e.return===null||e.return===t)return!0;e=e.return}e.sibling.return=e.return,e=e.sibling}}return!0}function Yn(t,e){for(e&=~Gd,e&=~lu,t.suspendedLanes|=e,t.pingedLanes&=~e,t=t.expirationTimes;0<e;){var n=31-Wt(e),r=1<<n;t[n]=-1,e&=~r}}function hg(t){if(oe&6)throw Error(B(327));Vi();var e=pl(t,0);if(!(e&1))return wt(t,xe()),null;var n=Dl(t,e);if(t.tag!==0&&n===2){var r=sh(t);r!==0&&(e=r,n=Oh(t,r))}if(n===1)throw n=So,Fr(t,0),Yn(t,e),wt(t,xe()),n;if(n===6)throw Error(B(345));return t.finishedWork=t.current.alternate,t.finishedLanes=e,Or(t,gt,Tn),wt(t,xe()),null}function Xd(t,e){var n=oe;oe|=1;try{return t(e)}finally{oe=n,oe===0&&(Hi=xe()+500,iu&&Ar())}}function Yr(t){rr!==null&&rr.tag===0&&!(oe&6)&&Vi();var e=oe;oe|=1;var n=bt.transition,r=ce;try{if(bt.transition=null,ce=1,t)return t()}finally{ce=r,bt.transition=n,oe=e,!(oe&6)&&Ar()}}function Yd(){It=Pi.current,ye(Pi)}function Fr(t,e){t.finishedWork=null,t.finishedLanes=0;var n=t.timeoutHandle;if(n!==-1&&(t.timeoutHandle=-1,hS(n)),be!==null)for(n=be.return;n!==null;){var r=n;switch(Nd(r),r.tag){case 1:r=r.type.childContextTypes,r!=null&&vl();break;case 3:Wi(),ye(_t),ye(at),Fd();break;case 5:Ud(r);break;case 4:Wi();break;case 13:ye(we);break;case 19:ye(we);break;case 10:Vd(r.type._context);break;case 22:case 23:Yd()}n=n.return}if($e=t,be=t=fr(t.current,null),Ge=It=e,je=0,So=null,Gd=lu=Xr=0,gt=Zs=null,Lr!==null){for(e=0;e<Lr.length;e++)if(n=Lr[e],r=n.interleaved,r!==null){n.interleaved=null;var i=r.next,s=n.pending;if(s!==null){var o=s.next;s.next=i,r.next=o}n.pending=r}Lr=null}return t}function Kv(t,e){do{var n=be;try{if(bd(),Qa.current=Cl,kl){for(var r=Ee.memoizedState;r!==null;){var i=r.queue;i!==null&&(i.pending=null),r=r.next}kl=!1}if(Qr=0,ze=Me=Ee=null,Ys=!1,Eo=0,Kd.current=null,n===null||n.return===null){je=1,So=e,be=null;break}e:{var s=t,o=n.return,l=n,u=e;if(e=Ge,l.flags|=32768,u!==null&&typeof u=="object"&&typeof u.then=="function"){var h=u,f=l,m=f.tag;if(!(f.mode&1)&&(m===0||m===11||m===15)){var _=f.alternate;_?(f.updateQueue=_.updateQueue,f.memoizedState=_.memoizedState,f.lanes=_.lanes):(f.updateQueue=null,f.memoizedState=null)}var R=Jm(o);if(R!==null){R.flags&=-257,Zm(R,o,l,s,e),R.mode&1&&Ym(s,h,e),e=R,u=h;var k=e.updateQueue;if(k===null){var x=new Set;x.add(u),e.updateQueue=x}else k.add(u);break e}else{if(!(e&1)){Ym(s,h,e),Jd();break e}u=Error(B(426))}}else if(_e&&l.mode&1){var C=Jm(o);if(C!==null){!(C.flags&65536)&&(C.flags|=256),Zm(C,o,l,s,e),Dd(qi(u,l));break e}}s=u=qi(u,l),je!==4&&(je=2),Zs===null?Zs=[s]:Zs.push(s),s=o;do{switch(s.tag){case 3:s.flags|=65536,e&=-e,s.lanes|=e;var w=xv(s,u,e);qm(s,w);break e;case 1:l=u;var g=s.type,T=s.stateNode;if(!(s.flags&128)&&(typeof g.getDerivedStateFromError=="function"||T!==null&&typeof T.componentDidCatch=="function"&&(hr===null||!hr.has(T)))){s.flags|=65536,e&=-e,s.lanes|=e;var D=Nv(s,l,e);qm(s,D);break e}}s=s.return}while(s!==null)}Xv(n)}catch(j){e=j,be===n&&n!==null&&(be=n=n.return);continue}break}while(!0)}function Gv(){var t=Pl.current;return Pl.current=Cl,t===null?Cl:t}function Jd(){(je===0||je===3||je===2)&&(je=4),$e===null||!(Xr&268435455)&&!(lu&268435455)||Yn($e,Ge)}function Dl(t,e){var n=oe;oe|=2;var r=Gv();($e!==t||Ge!==e)&&(Tn=null,Fr(t,e));do try{LS();break}catch(i){Kv(t,i)}while(!0);if(bd(),oe=n,Pl.current=r,be!==null)throw Error(B(261));return $e=null,Ge=0,je}function LS(){for(;be!==null;)Qv(be)}function MS(){for(;be!==null&&!lI();)Qv(be)}function Qv(t){var e=Jv(t.alternate,t,It);t.memoizedProps=t.pendingProps,e===null?Xv(t):be=e,Kd.current=null}function Xv(t){var e=t;do{var n=e.alternate;if(t=e.return,e.flags&32768){if(n=xS(n,e),n!==null){n.flags&=32767,be=n;return}if(t!==null)t.flags|=32768,t.subtreeFlags=0,t.deletions=null;else{je=6,be=null;return}}else if(n=PS(n,e,It),n!==null){be=n;return}if(e=e.sibling,e!==null){be=e;return}be=e=t}while(e!==null);je===0&&(je=5)}function Or(t,e,n){var r=ce,i=bt.transition;try{bt.transition=null,ce=1,jS(t,e,n,r)}finally{bt.transition=i,ce=r}return null}function jS(t,e,n,r){do Vi();while(rr!==null);if(oe&6)throw Error(B(327));n=t.finishedWork;var i=t.finishedLanes;if(n===null)return null;if(t.finishedWork=null,t.finishedLanes=0,n===t.current)throw Error(B(177));t.callbackNode=null,t.callbackPriority=0;var s=n.lanes|n.childLanes;if(_I(t,s),t===$e&&(be=$e=null,Ge=0),!(n.subtreeFlags&2064)&&!(n.flags&2064)||ba||(ba=!0,Zv(fl,function(){return Vi(),null})),s=(n.flags&15990)!==0,n.subtreeFlags&15990||s){s=bt.transition,bt.transition=null;var o=ce;ce=1;var l=oe;oe|=4,Kd.current=null,DS(t,n),Wv(n,t),iS(hh),ml=!!ch,hh=ch=null,t.current=n,OS(n),uI(),oe=l,ce=o,bt.transition=s}else t.current=n;if(ba&&(ba=!1,rr=t,Nl=i),s=t.pendingLanes,s===0&&(hr=null),dI(n.stateNode),wt(t,xe()),e!==null)for(r=t.onRecoverableError,n=0;n<e.length;n++)i=e[n],r(i.value,{componentStack:i.stack,digest:i.digest});if(xl)throw xl=!1,t=Nh,Nh=null,t;return Nl&1&&t.tag!==0&&Vi(),s=t.pendingLanes,s&1?t===Dh?eo++:(eo=0,Dh=t):eo=0,Ar(),null}function Vi(){if(rr!==null){var t=x_(Nl),e=bt.transition,n=ce;try{if(bt.transition=null,ce=16>t?16:t,rr===null)var r=!1;else{if(t=rr,rr=null,Nl=0,oe&6)throw Error(B(331));var i=oe;for(oe|=4,H=t.current;H!==null;){var s=H,o=s.child;if(H.flags&16){var l=s.deletions;if(l!==null){for(var u=0;u<l.length;u++){var h=l[u];for(H=h;H!==null;){var f=H;switch(f.tag){case 0:case 11:case 15:Js(8,f,s)}var m=f.child;if(m!==null)m.return=f,H=m;else for(;H!==null;){f=H;var _=f.sibling,R=f.return;if(Bv(f),f===h){H=null;break}if(_!==null){_.return=R,H=_;break}H=R}}}var k=s.alternate;if(k!==null){var x=k.child;if(x!==null){k.child=null;do{var C=x.sibling;x.sibling=null,x=C}while(x!==null)}}H=s}}if(s.subtreeFlags&2064&&o!==null)o.return=s,H=o;else e:for(;H!==null;){if(s=H,s.flags&2048)switch(s.tag){case 0:case 11:case 15:Js(9,s,s.return)}var w=s.sibling;if(w!==null){w.return=s.return,H=w;break e}H=s.return}}var g=t.current;for(H=g;H!==null;){o=H;var T=o.child;if(o.subtreeFlags&2064&&T!==null)T.return=o,H=T;else e:for(o=g;H!==null;){if(l=H,l.flags&2048)try{switch(l.tag){case 0:case 11:case 15:au(9,l)}}catch(j){Ae(l,l.return,j)}if(l===o){H=null;break e}var D=l.sibling;if(D!==null){D.return=l.return,H=D;break e}H=l.return}}if(oe=i,Ar(),sn&&typeof sn.onPostCommitFiberRoot=="function")try{sn.onPostCommitFiberRoot(Zl,t)}catch{}r=!0}return r}finally{ce=n,bt.transition=e}}return!1}function dg(t,e,n){e=qi(n,e),e=xv(t,e,1),t=cr(t,e,1),e=ft(),t!==null&&(jo(t,1,e),wt(t,e))}function Ae(t,e,n){if(t.tag===3)dg(t,t,n);else for(;e!==null;){if(e.tag===3){dg(e,t,n);break}else if(e.tag===1){var r=e.stateNode;if(typeof e.type.getDerivedStateFromError=="function"||typeof r.componentDidCatch=="function"&&(hr===null||!hr.has(r))){t=qi(n,t),t=Nv(e,t,1),e=cr(e,t,1),t=ft(),e!==null&&(jo(e,1,t),wt(e,t));break}}e=e.return}}function US(t,e,n){var r=t.pingCache;r!==null&&r.delete(e),e=ft(),t.pingedLanes|=t.suspendedLanes&n,$e===t&&(Ge&n)===n&&(je===4||je===3&&(Ge&130023424)===Ge&&500>xe()-Qd?Fr(t,0):Gd|=n),wt(t,e)}function Yv(t,e){e===0&&(t.mode&1?(e=Sa,Sa<<=1,!(Sa&130023424)&&(Sa=4194304)):e=1);var n=ft();t=bn(t,e),t!==null&&(jo(t,e,n),wt(t,n))}function FS(t){var e=t.memoizedState,n=0;e!==null&&(n=e.retryLane),Yv(t,n)}function BS(t,e){var n=0;switch(t.tag){case 13:var r=t.stateNode,i=t.memoizedState;i!==null&&(n=i.retryLane);break;case 19:r=t.stateNode;break;default:throw Error(B(314))}r!==null&&r.delete(e),Yv(t,n)}var Jv;Jv=function(t,e,n){if(t!==null)if(t.memoizedProps!==e.pendingProps||_t.current)yt=!0;else{if(!(t.lanes&n)&&!(e.flags&128))return yt=!1,CS(t,e,n);yt=!!(t.flags&131072)}else yt=!1,_e&&e.flags&1048576&&nv(e,Tl,e.index);switch(e.lanes=0,e.tag){case 2:var r=e.type;Ya(t,e),t=e.pendingProps;var i=Bi(e,at.current);bi(e,n),i=zd(null,e,r,t,i,n);var s=$d();return e.flags|=1,typeof i=="object"&&i!==null&&typeof i.render=="function"&&i.$$typeof===void 0?(e.tag=1,e.memoizedState=null,e.updateQueue=null,vt(r)?(s=!0,wl(e)):s=!1,e.memoizedState=i.state!==null&&i.state!==void 0?i.state:null,Md(e),i.updater=ou,e.stateNode=i,i._reactInternals=e,wh(e,r,t,n),e=Ih(null,e,r,!0,s,n)):(e.tag=0,_e&&s&&xd(e),dt(null,e,i,n),e=e.child),e;case 16:r=e.elementType;e:{switch(Ya(t,e),t=e.pendingProps,i=r._init,r=i(r._payload),e.type=r,i=e.tag=$S(r),t=Ft(r,t),i){case 0:e=Th(null,e,r,t,n);break e;case 1:e=ng(null,e,r,t,n);break e;case 11:e=eg(null,e,r,t,n);break e;case 14:e=tg(null,e,r,Ft(r.type,t),n);break e}throw Error(B(306,r,""))}return e;case 0:return r=e.type,i=e.pendingProps,i=e.elementType===r?i:Ft(r,i),Th(t,e,r,i,n);case 1:return r=e.type,i=e.pendingProps,i=e.elementType===r?i:Ft(r,i),ng(t,e,r,i,n);case 3:e:{if(Vv(e),t===null)throw Error(B(387));r=e.pendingProps,s=e.memoizedState,i=s.element,lv(t,e),Rl(e,r,null,n);var o=e.memoizedState;if(r=o.element,s.isDehydrated)if(s={element:r,isDehydrated:!1,cache:o.cache,pendingSuspenseBoundaries:o.pendingSuspenseBoundaries,transitions:o.transitions},e.updateQueue.baseState=s,e.memoizedState=s,e.flags&256){i=qi(Error(B(423)),e),e=rg(t,e,r,n,i);break e}else if(r!==i){i=qi(Error(B(424)),e),e=rg(t,e,r,n,i);break e}else for(St=ur(e.stateNode.containerInfo.firstChild),At=e,_e=!0,zt=null,n=ov(e,null,r,n),e.child=n;n;)n.flags=n.flags&-3|4096,n=n.sibling;else{if(zi(),r===i){e=Vn(t,e,n);break e}dt(t,e,r,n)}e=e.child}return e;case 5:return uv(e),t===null&&yh(e),r=e.type,i=e.pendingProps,s=t!==null?t.memoizedProps:null,o=i.children,dh(r,i)?o=null:s!==null&&dh(r,s)&&(e.flags|=32),bv(t,e),dt(t,e,o,n),e.child;case 6:return t===null&&yh(e),null;case 13:return Lv(t,e,n);case 4:return jd(e,e.stateNode.containerInfo),r=e.pendingProps,t===null?e.child=$i(e,null,r,n):dt(t,e,r,n),e.child;case 11:return r=e.type,i=e.pendingProps,i=e.elementType===r?i:Ft(r,i),eg(t,e,r,i,n);case 7:return dt(t,e,e.pendingProps,n),e.child;case 8:return dt(t,e,e.pendingProps.children,n),e.child;case 12:return dt(t,e,e.pendingProps.children,n),e.child;case 10:e:{if(r=e.type._context,i=e.pendingProps,s=e.memoizedProps,o=i.value,fe(Il,r._currentValue),r._currentValue=o,s!==null)if(Yt(s.value,o)){if(s.children===i.children&&!_t.current){e=Vn(t,e,n);break e}}else for(s=e.child,s!==null&&(s.return=e);s!==null;){var l=s.dependencies;if(l!==null){o=s.child;for(var u=l.firstContext;u!==null;){if(u.context===r){if(s.tag===1){u=Nn(-1,n&-n),u.tag=2;var h=s.updateQueue;if(h!==null){h=h.shared;var f=h.pending;f===null?u.next=u:(u.next=f.next,f.next=u),h.pending=u}}s.lanes|=n,u=s.alternate,u!==null&&(u.lanes|=n),_h(s.return,n,e),l.lanes|=n;break}u=u.next}}else if(s.tag===10)o=s.type===e.type?null:s.child;else if(s.tag===18){if(o=s.return,o===null)throw Error(B(341));o.lanes|=n,l=o.alternate,l!==null&&(l.lanes|=n),_h(o,n,e),o=s.sibling}else o=s.child;if(o!==null)o.return=s;else for(o=s;o!==null;){if(o===e){o=null;break}if(s=o.sibling,s!==null){s.return=o.return,o=s;break}o=o.return}s=o}dt(t,e,i.children,n),e=e.child}return e;case 9:return i=e.type,r=e.pendingProps.children,bi(e,n),i=Vt(i),r=r(i),e.flags|=1,dt(t,e,r,n),e.child;case 14:return r=e.type,i=Ft(r,e.pendingProps),i=Ft(r.type,i),tg(t,e,r,i,n);case 15:return Dv(t,e,e.type,e.pendingProps,n);case 17:return r=e.type,i=e.pendingProps,i=e.elementType===r?i:Ft(r,i),Ya(t,e),e.tag=1,vt(r)?(t=!0,wl(e)):t=!1,bi(e,n),Pv(e,r,i),wh(e,r,i,n),Ih(null,e,r,!0,t,n);case 19:return Mv(t,e,n);case 22:return Ov(t,e,n)}throw Error(B(156,e.tag))};function Zv(t,e){return A_(t,e)}function zS(t,e,n,r){this.tag=t,this.key=n,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.ref=null,this.pendingProps=e,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=r,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function Ot(t,e,n,r){return new zS(t,e,n,r)}function Zd(t){return t=t.prototype,!(!t||!t.isReactComponent)}function $S(t){if(typeof t=="function")return Zd(t)?1:0;if(t!=null){if(t=t.$$typeof,t===_d)return 11;if(t===vd)return 14}return 2}function fr(t,e){var n=t.alternate;return n===null?(n=Ot(t.tag,e,t.key,t.mode),n.elementType=t.elementType,n.type=t.type,n.stateNode=t.stateNode,n.alternate=t,t.alternate=n):(n.pendingProps=e,n.type=t.type,n.flags=0,n.subtreeFlags=0,n.deletions=null),n.flags=t.flags&14680064,n.childLanes=t.childLanes,n.lanes=t.lanes,n.child=t.child,n.memoizedProps=t.memoizedProps,n.memoizedState=t.memoizedState,n.updateQueue=t.updateQueue,e=t.dependencies,n.dependencies=e===null?null:{lanes:e.lanes,firstContext:e.firstContext},n.sibling=t.sibling,n.index=t.index,n.ref=t.ref,n}function el(t,e,n,r,i,s){var o=2;if(r=t,typeof t=="function")Zd(t)&&(o=1);else if(typeof t=="string")o=5;else e:switch(t){case vi:return Br(n.children,i,s,e);case yd:o=8,i|=8;break;case Wc:return t=Ot(12,n,e,i|2),t.elementType=Wc,t.lanes=s,t;case qc:return t=Ot(13,n,e,i),t.elementType=qc,t.lanes=s,t;case Hc:return t=Ot(19,n,e,i),t.elementType=Hc,t.lanes=s,t;case u_:return uu(n,i,s,e);default:if(typeof t=="object"&&t!==null)switch(t.$$typeof){case a_:o=10;break e;case l_:o=9;break e;case _d:o=11;break e;case vd:o=14;break e;case Gn:o=16,r=null;break e}throw Error(B(130,t==null?t:typeof t,""))}return e=Ot(o,n,e,i),e.elementType=t,e.type=r,e.lanes=s,e}function Br(t,e,n,r){return t=Ot(7,t,r,e),t.lanes=n,t}function uu(t,e,n,r){return t=Ot(22,t,r,e),t.elementType=u_,t.lanes=n,t.stateNode={isHidden:!1},t}function Ac(t,e,n){return t=Ot(6,t,null,e),t.lanes=n,t}function kc(t,e,n){return e=Ot(4,t.children!==null?t.children:[],t.key,e),e.lanes=n,e.stateNode={containerInfo:t.containerInfo,pendingChildren:null,implementation:t.implementation},e}function WS(t,e,n,r,i){this.tag=e,this.containerInfo=t,this.finishedWork=this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.pendingContext=this.context=null,this.callbackPriority=0,this.eventTimes=ac(0),this.expirationTimes=ac(-1),this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=ac(0),this.identifierPrefix=r,this.onRecoverableError=i,this.mutableSourceEagerHydrationData=null}function ef(t,e,n,r,i,s,o,l,u){return t=new WS(t,e,n,l,u),e===1?(e=1,s===!0&&(e|=8)):e=0,s=Ot(3,null,null,e),t.current=s,s.stateNode=t,s.memoizedState={element:r,isDehydrated:n,cache:null,transitions:null,pendingSuspenseBoundaries:null},Md(s),t}function qS(t,e,n){var r=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:_i,key:r==null?null:""+r,children:t,containerInfo:e,implementation:n}}function ew(t){if(!t)return vr;t=t._reactInternals;e:{if(si(t)!==t||t.tag!==1)throw Error(B(170));var e=t;do{switch(e.tag){case 3:e=e.stateNode.context;break e;case 1:if(vt(e.type)){e=e.stateNode.__reactInternalMemoizedMergedChildContext;break e}}e=e.return}while(e!==null);throw Error(B(171))}if(t.tag===1){var n=t.type;if(vt(n))return ev(t,n,e)}return e}function tw(t,e,n,r,i,s,o,l,u){return t=ef(n,r,!0,t,i,s,o,l,u),t.context=ew(null),n=t.current,r=ft(),i=dr(n),s=Nn(r,i),s.callback=e??null,cr(n,s,i),t.current.lanes=i,jo(t,i,r),wt(t,r),t}function cu(t,e,n,r){var i=e.current,s=ft(),o=dr(i);return n=ew(n),e.context===null?e.context=n:e.pendingContext=n,e=Nn(s,o),e.payload={element:t},r=r===void 0?null:r,r!==null&&(e.callback=r),t=cr(i,e,o),t!==null&&(qt(t,i,o,s),Ga(t,i,o)),o}function Ol(t){if(t=t.current,!t.child)return null;switch(t.child.tag){case 5:return t.child.stateNode;default:return t.child.stateNode}}function fg(t,e){if(t=t.memoizedState,t!==null&&t.dehydrated!==null){var n=t.retryLane;t.retryLane=n!==0&&n<e?n:e}}function tf(t,e){fg(t,e),(t=t.alternate)&&fg(t,e)}function HS(){return null}var nw=typeof reportError=="function"?reportError:function(t){console.error(t)};function nf(t){this._internalRoot=t}hu.prototype.render=nf.prototype.render=function(t){var e=this._internalRoot;if(e===null)throw Error(B(409));cu(t,e,null,null)};hu.prototype.unmount=nf.prototype.unmount=function(){var t=this._internalRoot;if(t!==null){this._internalRoot=null;var e=t.containerInfo;Yr(function(){cu(null,t,null,null)}),e[On]=null}};function hu(t){this._internalRoot=t}hu.prototype.unstable_scheduleHydration=function(t){if(t){var e=O_();t={blockedOn:null,target:t,priority:e};for(var n=0;n<Xn.length&&e!==0&&e<Xn[n].priority;n++);Xn.splice(n,0,t),n===0&&V_(t)}};function rf(t){return!(!t||t.nodeType!==1&&t.nodeType!==9&&t.nodeType!==11)}function du(t){return!(!t||t.nodeType!==1&&t.nodeType!==9&&t.nodeType!==11&&(t.nodeType!==8||t.nodeValue!==" react-mount-point-unstable "))}function pg(){}function KS(t,e,n,r,i){if(i){if(typeof r=="function"){var s=r;r=function(){var h=Ol(o);s.call(h)}}var o=tw(e,r,t,0,null,!1,!1,"",pg);return t._reactRootContainer=o,t[On]=o.current,go(t.nodeType===8?t.parentNode:t),Yr(),o}for(;i=t.lastChild;)t.removeChild(i);if(typeof r=="function"){var l=r;r=function(){var h=Ol(u);l.call(h)}}var u=ef(t,0,!1,null,null,!1,!1,"",pg);return t._reactRootContainer=u,t[On]=u.current,go(t.nodeType===8?t.parentNode:t),Yr(function(){cu(e,u,n,r)}),u}function fu(t,e,n,r,i){var s=n._reactRootContainer;if(s){var o=s;if(typeof i=="function"){var l=i;i=function(){var u=Ol(o);l.call(u)}}cu(e,o,t,i)}else o=KS(n,e,t,i,r);return Ol(o)}N_=function(t){switch(t.tag){case 3:var e=t.stateNode;if(e.current.memoizedState.isDehydrated){var n=Fs(e.pendingLanes);n!==0&&(Td(e,n|1),wt(e,xe()),!(oe&6)&&(Hi=xe()+500,Ar()))}break;case 13:Yr(function(){var r=bn(t,1);if(r!==null){var i=ft();qt(r,t,1,i)}}),tf(t,1)}};Id=function(t){if(t.tag===13){var e=bn(t,134217728);if(e!==null){var n=ft();qt(e,t,134217728,n)}tf(t,134217728)}};D_=function(t){if(t.tag===13){var e=dr(t),n=bn(t,e);if(n!==null){var r=ft();qt(n,t,e,r)}tf(t,e)}};O_=function(){return ce};b_=function(t,e){var n=ce;try{return ce=t,e()}finally{ce=n}};nh=function(t,e,n){switch(e){case"input":if(Qc(t,n),e=n.name,n.type==="radio"&&e!=null){for(n=t;n.parentNode;)n=n.parentNode;for(n=n.querySelectorAll("input[name="+JSON.stringify(""+e)+'][type="radio"]'),e=0;e<n.length;e++){var r=n[e];if(r!==t&&r.form===t.form){var i=ru(r);if(!i)throw Error(B(90));h_(r),Qc(r,i)}}}break;case"textarea":f_(t,n);break;case"select":e=n.value,e!=null&&xi(t,!!n.multiple,e,!1)}};w_=Xd;E_=Yr;var GS={usingClientEntryPoint:!1,Events:[Fo,Ii,ru,__,v_,Xd]},bs={findFiberByHostInstance:Vr,bundleType:0,version:"18.3.1",rendererPackageName:"react-dom"},QS={bundleType:bs.bundleType,version:bs.version,rendererPackageName:bs.rendererPackageName,rendererConfig:bs.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:Fn.ReactCurrentDispatcher,findHostInstanceByFiber:function(t){return t=S_(t),t===null?null:t.stateNode},findFiberByHostInstance:bs.findFiberByHostInstance||HS,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.3.1-next-f1338f8080-20240426"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"){var Va=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!Va.isDisabled&&Va.supportsFiber)try{Zl=Va.inject(QS),sn=Va}catch{}}Ct.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=GS;Ct.createPortal=function(t,e){var n=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!rf(e))throw Error(B(200));return qS(t,e,null,n)};Ct.createRoot=function(t,e){if(!rf(t))throw Error(B(299));var n=!1,r="",i=nw;return e!=null&&(e.unstable_strictMode===!0&&(n=!0),e.identifierPrefix!==void 0&&(r=e.identifierPrefix),e.onRecoverableError!==void 0&&(i=e.onRecoverableError)),e=ef(t,1,!1,null,null,n,!1,r,i),t[On]=e.current,go(t.nodeType===8?t.parentNode:t),new nf(e)};Ct.findDOMNode=function(t){if(t==null)return null;if(t.nodeType===1)return t;var e=t._reactInternals;if(e===void 0)throw typeof t.render=="function"?Error(B(188)):(t=Object.keys(t).join(","),Error(B(268,t)));return t=S_(e),t=t===null?null:t.stateNode,t};Ct.flushSync=function(t){return Yr(t)};Ct.hydrate=function(t,e,n){if(!du(e))throw Error(B(200));return fu(null,t,e,!0,n)};Ct.hydrateRoot=function(t,e,n){if(!rf(t))throw Error(B(405));var r=n!=null&&n.hydratedSources||null,i=!1,s="",o=nw;if(n!=null&&(n.unstable_strictMode===!0&&(i=!0),n.identifierPrefix!==void 0&&(s=n.identifierPrefix),n.onRecoverableError!==void 0&&(o=n.onRecoverableError)),e=tw(e,null,t,1,n??null,i,!1,s,o),t[On]=e.current,go(t),r)for(t=0;t<r.length;t++)n=r[t],i=n._getVersion,i=i(n._source),e.mutableSourceEagerHydrationData==null?e.mutableSourceEagerHydrationData=[n,i]:e.mutableSourceEagerHydrationData.push(n,i);return new hu(e)};Ct.render=function(t,e,n){if(!du(e))throw Error(B(200));return fu(null,t,e,!1,n)};Ct.unmountComponentAtNode=function(t){if(!du(t))throw Error(B(40));return t._reactRootContainer?(Yr(function(){fu(null,null,t,!1,function(){t._reactRootContainer=null,t[On]=null})}),!0):!1};Ct.unstable_batchedUpdates=Xd;Ct.unstable_renderSubtreeIntoContainer=function(t,e,n,r){if(!du(n))throw Error(B(200));if(t==null||t._reactInternals===void 0)throw Error(B(38));return fu(t,e,n,!1,r)};Ct.version="18.3.1-next-f1338f8080-20240426";function rw(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(rw)}catch(t){console.error(t)}}rw(),r_.exports=Ct;var XS=r_.exports,mg=XS;zc.createRoot=mg.createRoot,zc.hydrateRoot=mg.hydrateRoot;/**
 * @remix-run/router v1.23.2
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */function Ro(){return Ro=Object.assign?Object.assign.bind():function(t){for(var e=1;e<arguments.length;e++){var n=arguments[e];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(t[r]=n[r])}return t},Ro.apply(this,arguments)}var ir;(function(t){t.Pop="POP",t.Push="PUSH",t.Replace="REPLACE"})(ir||(ir={}));const gg="popstate";function YS(t){t===void 0&&(t={});function e(r,i){let{pathname:s,search:o,hash:l}=r.location;return Vh("",{pathname:s,search:o,hash:l},i.state&&i.state.usr||null,i.state&&i.state.key||"default")}function n(r,i){return typeof i=="string"?i:bl(i)}return ZS(e,n,null,t)}function Te(t,e){if(t===!1||t===null||typeof t>"u")throw new Error(e)}function sf(t,e){if(!t){typeof console<"u"&&console.warn(e);try{throw new Error(e)}catch{}}}function JS(){return Math.random().toString(36).substr(2,8)}function yg(t,e){return{usr:t.state,key:t.key,idx:e}}function Vh(t,e,n,r){return n===void 0&&(n=null),Ro({pathname:typeof t=="string"?t:t.pathname,search:"",hash:""},typeof e=="string"?ss(e):e,{state:n,key:e&&e.key||r||JS()})}function bl(t){let{pathname:e="/",search:n="",hash:r=""}=t;return n&&n!=="?"&&(e+=n.charAt(0)==="?"?n:"?"+n),r&&r!=="#"&&(e+=r.charAt(0)==="#"?r:"#"+r),e}function ss(t){let e={};if(t){let n=t.indexOf("#");n>=0&&(e.hash=t.substr(n),t=t.substr(0,n));let r=t.indexOf("?");r>=0&&(e.search=t.substr(r),t=t.substr(0,r)),t&&(e.pathname=t)}return e}function ZS(t,e,n,r){r===void 0&&(r={});let{window:i=document.defaultView,v5Compat:s=!1}=r,o=i.history,l=ir.Pop,u=null,h=f();h==null&&(h=0,o.replaceState(Ro({},o.state,{idx:h}),""));function f(){return(o.state||{idx:null}).idx}function m(){l=ir.Pop;let C=f(),w=C==null?null:C-h;h=C,u&&u({action:l,location:x.location,delta:w})}function _(C,w){l=ir.Push;let g=Vh(x.location,C,w);h=f()+1;let T=yg(g,h),D=x.createHref(g);try{o.pushState(T,"",D)}catch(j){if(j instanceof DOMException&&j.name==="DataCloneError")throw j;i.location.assign(D)}s&&u&&u({action:l,location:x.location,delta:1})}function R(C,w){l=ir.Replace;let g=Vh(x.location,C,w);h=f();let T=yg(g,h),D=x.createHref(g);o.replaceState(T,"",D),s&&u&&u({action:l,location:x.location,delta:0})}function k(C){let w=i.location.origin!=="null"?i.location.origin:i.location.href,g=typeof C=="string"?C:bl(C);return g=g.replace(/ $/,"%20"),Te(w,"No window.location.(origin|href) available to create URL for href: "+g),new URL(g,w)}let x={get action(){return l},get location(){return t(i,o)},listen(C){if(u)throw new Error("A history only accepts one active listener");return i.addEventListener(gg,m),u=C,()=>{i.removeEventListener(gg,m),u=null}},createHref(C){return e(i,C)},createURL:k,encodeLocation(C){let w=k(C);return{pathname:w.pathname,search:w.search,hash:w.hash}},push:_,replace:R,go(C){return o.go(C)}};return x}var _g;(function(t){t.data="data",t.deferred="deferred",t.redirect="redirect",t.error="error"})(_g||(_g={}));function eR(t,e,n){return n===void 0&&(n="/"),tR(t,e,n)}function tR(t,e,n,r){let i=typeof e=="string"?ss(e):e,s=Ki(i.pathname||"/",n);if(s==null)return null;let o=iw(t);nR(o);let l=null;for(let u=0;l==null&&u<o.length;++u){let h=fR(s);l=hR(o[u],h)}return l}function iw(t,e,n,r){e===void 0&&(e=[]),n===void 0&&(n=[]),r===void 0&&(r="");let i=(s,o,l)=>{let u={relativePath:l===void 0?s.path||"":l,caseSensitive:s.caseSensitive===!0,childrenIndex:o,route:s};u.relativePath.startsWith("/")&&(Te(u.relativePath.startsWith(r),'Absolute route path "'+u.relativePath+'" nested under path '+('"'+r+'" is not valid. An absolute child route path ')+"must start with the combined path of all its parent routes."),u.relativePath=u.relativePath.slice(r.length));let h=pr([r,u.relativePath]),f=n.concat(u);s.children&&s.children.length>0&&(Te(s.index!==!0,"Index routes must not have child routes. Please remove "+('all child routes from route path "'+h+'".')),iw(s.children,e,f,h)),!(s.path==null&&!s.index)&&e.push({path:h,score:uR(h,s.index),routesMeta:f})};return t.forEach((s,o)=>{var l;if(s.path===""||!((l=s.path)!=null&&l.includes("?")))i(s,o);else for(let u of sw(s.path))i(s,o,u)}),e}function sw(t){let e=t.split("/");if(e.length===0)return[];let[n,...r]=e,i=n.endsWith("?"),s=n.replace(/\?$/,"");if(r.length===0)return i?[s,""]:[s];let o=sw(r.join("/")),l=[];return l.push(...o.map(u=>u===""?s:[s,u].join("/"))),i&&l.push(...o),l.map(u=>t.startsWith("/")&&u===""?"/":u)}function nR(t){t.sort((e,n)=>e.score!==n.score?n.score-e.score:cR(e.routesMeta.map(r=>r.childrenIndex),n.routesMeta.map(r=>r.childrenIndex)))}const rR=/^:[\w-]+$/,iR=3,sR=2,oR=1,aR=10,lR=-2,vg=t=>t==="*";function uR(t,e){let n=t.split("/"),r=n.length;return n.some(vg)&&(r+=lR),e&&(r+=sR),n.filter(i=>!vg(i)).reduce((i,s)=>i+(rR.test(s)?iR:s===""?oR:aR),r)}function cR(t,e){return t.length===e.length&&t.slice(0,-1).every((r,i)=>r===e[i])?t[t.length-1]-e[e.length-1]:0}function hR(t,e,n){let{routesMeta:r}=t,i={},s="/",o=[];for(let l=0;l<r.length;++l){let u=r[l],h=l===r.length-1,f=s==="/"?e:e.slice(s.length)||"/",m=Lh({path:u.relativePath,caseSensitive:u.caseSensitive,end:h},f),_=u.route;if(!m)return null;Object.assign(i,m.params),o.push({params:i,pathname:pr([s,m.pathname]),pathnameBase:_R(pr([s,m.pathnameBase])),route:_}),m.pathnameBase!=="/"&&(s=pr([s,m.pathnameBase]))}return o}function Lh(t,e){typeof t=="string"&&(t={path:t,caseSensitive:!1,end:!0});let[n,r]=dR(t.path,t.caseSensitive,t.end),i=e.match(n);if(!i)return null;let s=i[0],o=s.replace(/(.)\/+$/,"$1"),l=i.slice(1);return{params:r.reduce((h,f,m)=>{let{paramName:_,isOptional:R}=f;if(_==="*"){let x=l[m]||"";o=s.slice(0,s.length-x.length).replace(/(.)\/+$/,"$1")}const k=l[m];return R&&!k?h[_]=void 0:h[_]=(k||"").replace(/%2F/g,"/"),h},{}),pathname:s,pathnameBase:o,pattern:t}}function dR(t,e,n){e===void 0&&(e=!1),n===void 0&&(n=!0),sf(t==="*"||!t.endsWith("*")||t.endsWith("/*"),'Route path "'+t+'" will be treated as if it were '+('"'+t.replace(/\*$/,"/*")+'" because the `*` character must ')+"always follow a `/` in the pattern. To get rid of this warning, "+('please change the route path to "'+t.replace(/\*$/,"/*")+'".'));let r=[],i="^"+t.replace(/\/*\*?$/,"").replace(/^\/*/,"/").replace(/[\\.*+^${}|()[\]]/g,"\\$&").replace(/\/:([\w-]+)(\?)?/g,(o,l,u)=>(r.push({paramName:l,isOptional:u!=null}),u?"/?([^\\/]+)?":"/([^\\/]+)"));return t.endsWith("*")?(r.push({paramName:"*"}),i+=t==="*"||t==="/*"?"(.*)$":"(?:\\/(.+)|\\/*)$"):n?i+="\\/*$":t!==""&&t!=="/"&&(i+="(?:(?=\\/|$))"),[new RegExp(i,e?void 0:"i"),r]}function fR(t){try{return t.split("/").map(e=>decodeURIComponent(e).replace(/\//g,"%2F")).join("/")}catch(e){return sf(!1,'The URL path "'+t+'" could not be decoded because it is is a malformed URL segment. This is probably due to a bad percent '+("encoding ("+e+").")),t}}function Ki(t,e){if(e==="/")return t;if(!t.toLowerCase().startsWith(e.toLowerCase()))return null;let n=e.endsWith("/")?e.length-1:e.length,r=t.charAt(n);return r&&r!=="/"?null:t.slice(n)||"/"}const pR=/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i,mR=t=>pR.test(t);function gR(t,e){e===void 0&&(e="/");let{pathname:n,search:r="",hash:i=""}=typeof t=="string"?ss(t):t,s;if(n)if(mR(n))s=n;else{if(n.includes("//")){let o=n;n=n.replace(/\/\/+/g,"/"),sf(!1,"Pathnames cannot have embedded double slashes - normalizing "+(o+" -> "+n))}n.startsWith("/")?s=wg(n.substring(1),"/"):s=wg(n,e)}else s=e;return{pathname:s,search:vR(r),hash:wR(i)}}function wg(t,e){let n=e.replace(/\/+$/,"").split("/");return t.split("/").forEach(i=>{i===".."?n.length>1&&n.pop():i!=="."&&n.push(i)}),n.length>1?n.join("/"):"/"}function Cc(t,e,n,r){return"Cannot include a '"+t+"' character in a manually specified "+("`to."+e+"` field ["+JSON.stringify(r)+"].  Please separate it out to the ")+("`to."+n+"` field. Alternatively you may provide the full path as ")+'a string in <Link to="..."> and the router will parse it for you.'}function yR(t){return t.filter((e,n)=>n===0||e.route.path&&e.route.path.length>0)}function of(t,e){let n=yR(t);return e?n.map((r,i)=>i===n.length-1?r.pathname:r.pathnameBase):n.map(r=>r.pathnameBase)}function af(t,e,n,r){r===void 0&&(r=!1);let i;typeof t=="string"?i=ss(t):(i=Ro({},t),Te(!i.pathname||!i.pathname.includes("?"),Cc("?","pathname","search",i)),Te(!i.pathname||!i.pathname.includes("#"),Cc("#","pathname","hash",i)),Te(!i.search||!i.search.includes("#"),Cc("#","search","hash",i)));let s=t===""||i.pathname==="",o=s?"/":i.pathname,l;if(o==null)l=n;else{let m=e.length-1;if(!r&&o.startsWith("..")){let _=o.split("/");for(;_[0]==="..";)_.shift(),m-=1;i.pathname=_.join("/")}l=m>=0?e[m]:"/"}let u=gR(i,l),h=o&&o!=="/"&&o.endsWith("/"),f=(s||o===".")&&n.endsWith("/");return!u.pathname.endsWith("/")&&(h||f)&&(u.pathname+="/"),u}const pr=t=>t.join("/").replace(/\/\/+/g,"/"),_R=t=>t.replace(/\/+$/,"").replace(/^\/*/,"/"),vR=t=>!t||t==="?"?"":t.startsWith("?")?t:"?"+t,wR=t=>!t||t==="#"?"":t.startsWith("#")?t:"#"+t;function ER(t){return t!=null&&typeof t.status=="number"&&typeof t.statusText=="string"&&typeof t.internal=="boolean"&&"data"in t}const ow=["post","put","patch","delete"];new Set(ow);const TR=["get",...ow];new Set(TR);/**
 * React Router v6.30.3
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */function Ao(){return Ao=Object.assign?Object.assign.bind():function(t){for(var e=1;e<arguments.length;e++){var n=arguments[e];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(t[r]=n[r])}return t},Ao.apply(this,arguments)}const pu=b.createContext(null),aw=b.createContext(null),Bn=b.createContext(null),mu=b.createContext(null),kr=b.createContext({outlet:null,matches:[],isDataRoute:!1}),lw=b.createContext(null);function IR(t,e){let{relative:n}=e===void 0?{}:e;os()||Te(!1);let{basename:r,navigator:i}=b.useContext(Bn),{hash:s,pathname:o,search:l}=gu(t,{relative:n}),u=o;return r!=="/"&&(u=o==="/"?r:pr([r,o])),i.createHref({pathname:u,search:l,hash:s})}function os(){return b.useContext(mu)!=null}function as(){return os()||Te(!1),b.useContext(mu).location}function uw(t){b.useContext(Bn).static||b.useLayoutEffect(t)}function cw(){let{isDataRoute:t}=b.useContext(kr);return t?LR():SR()}function SR(){os()||Te(!1);let t=b.useContext(pu),{basename:e,future:n,navigator:r}=b.useContext(Bn),{matches:i}=b.useContext(kr),{pathname:s}=as(),o=JSON.stringify(of(i,n.v7_relativeSplatPath)),l=b.useRef(!1);return uw(()=>{l.current=!0}),b.useCallback(function(h,f){if(f===void 0&&(f={}),!l.current)return;if(typeof h=="number"){r.go(h);return}let m=af(h,JSON.parse(o),s,f.relative==="path");t==null&&e!=="/"&&(m.pathname=m.pathname==="/"?e:pr([e,m.pathname])),(f.replace?r.replace:r.push)(m,f.state,f)},[e,r,o,s,t])}function gu(t,e){let{relative:n}=e===void 0?{}:e,{future:r}=b.useContext(Bn),{matches:i}=b.useContext(kr),{pathname:s}=as(),o=JSON.stringify(of(i,r.v7_relativeSplatPath));return b.useMemo(()=>af(t,JSON.parse(o),s,n==="path"),[t,o,s,n])}function RR(t,e){return AR(t,e)}function AR(t,e,n,r){os()||Te(!1);let{navigator:i}=b.useContext(Bn),{matches:s}=b.useContext(kr),o=s[s.length-1],l=o?o.params:{};o&&o.pathname;let u=o?o.pathnameBase:"/";o&&o.route;let h=as(),f;if(e){var m;let C=typeof e=="string"?ss(e):e;u==="/"||(m=C.pathname)!=null&&m.startsWith(u)||Te(!1),f=C}else f=h;let _=f.pathname||"/",R=_;if(u!=="/"){let C=u.replace(/^\//,"").split("/");R="/"+_.replace(/^\//,"").split("/").slice(C.length).join("/")}let k=eR(t,{pathname:R}),x=NR(k&&k.map(C=>Object.assign({},C,{params:Object.assign({},l,C.params),pathname:pr([u,i.encodeLocation?i.encodeLocation(C.pathname).pathname:C.pathname]),pathnameBase:C.pathnameBase==="/"?u:pr([u,i.encodeLocation?i.encodeLocation(C.pathnameBase).pathname:C.pathnameBase])})),s,n,r);return e&&x?b.createElement(mu.Provider,{value:{location:Ao({pathname:"/",search:"",hash:"",state:null,key:"default"},f),navigationType:ir.Pop}},x):x}function kR(){let t=VR(),e=ER(t)?t.status+" "+t.statusText:t instanceof Error?t.message:JSON.stringify(t),n=t instanceof Error?t.stack:null,i={padding:"0.5rem",backgroundColor:"rgba(200,200,200, 0.5)"};return b.createElement(b.Fragment,null,b.createElement("h2",null,"Unexpected Application Error!"),b.createElement("h3",{style:{fontStyle:"italic"}},e),n?b.createElement("pre",{style:i},n):null,null)}const CR=b.createElement(kR,null);class PR extends b.Component{constructor(e){super(e),this.state={location:e.location,revalidation:e.revalidation,error:e.error}}static getDerivedStateFromError(e){return{error:e}}static getDerivedStateFromProps(e,n){return n.location!==e.location||n.revalidation!=="idle"&&e.revalidation==="idle"?{error:e.error,location:e.location,revalidation:e.revalidation}:{error:e.error!==void 0?e.error:n.error,location:n.location,revalidation:e.revalidation||n.revalidation}}componentDidCatch(e,n){console.error("React Router caught the following error during render",e,n)}render(){return this.state.error!==void 0?b.createElement(kr.Provider,{value:this.props.routeContext},b.createElement(lw.Provider,{value:this.state.error,children:this.props.component})):this.props.children}}function xR(t){let{routeContext:e,match:n,children:r}=t,i=b.useContext(pu);return i&&i.static&&i.staticContext&&(n.route.errorElement||n.route.ErrorBoundary)&&(i.staticContext._deepestRenderedBoundaryId=n.route.id),b.createElement(kr.Provider,{value:e},r)}function NR(t,e,n,r){var i;if(e===void 0&&(e=[]),n===void 0&&(n=null),r===void 0&&(r=null),t==null){var s;if(!n)return null;if(n.errors)t=n.matches;else if((s=r)!=null&&s.v7_partialHydration&&e.length===0&&!n.initialized&&n.matches.length>0)t=n.matches;else return null}let o=t,l=(i=n)==null?void 0:i.errors;if(l!=null){let f=o.findIndex(m=>m.route.id&&(l==null?void 0:l[m.route.id])!==void 0);f>=0||Te(!1),o=o.slice(0,Math.min(o.length,f+1))}let u=!1,h=-1;if(n&&r&&r.v7_partialHydration)for(let f=0;f<o.length;f++){let m=o[f];if((m.route.HydrateFallback||m.route.hydrateFallbackElement)&&(h=f),m.route.id){let{loaderData:_,errors:R}=n,k=m.route.loader&&_[m.route.id]===void 0&&(!R||R[m.route.id]===void 0);if(m.route.lazy||k){u=!0,h>=0?o=o.slice(0,h+1):o=[o[0]];break}}}return o.reduceRight((f,m,_)=>{let R,k=!1,x=null,C=null;n&&(R=l&&m.route.id?l[m.route.id]:void 0,x=m.route.errorElement||CR,u&&(h<0&&_===0?(MR("route-fallback"),k=!0,C=null):h===_&&(k=!0,C=m.route.hydrateFallbackElement||null)));let w=e.concat(o.slice(0,_+1)),g=()=>{let T;return R?T=x:k?T=C:m.route.Component?T=b.createElement(m.route.Component,null):m.route.element?T=m.route.element:T=f,b.createElement(xR,{match:m,routeContext:{outlet:f,matches:w,isDataRoute:n!=null},children:T})};return n&&(m.route.ErrorBoundary||m.route.errorElement||_===0)?b.createElement(PR,{location:n.location,revalidation:n.revalidation,component:x,error:R,children:g(),routeContext:{outlet:null,matches:w,isDataRoute:!0}}):g()},null)}var hw=function(t){return t.UseBlocker="useBlocker",t.UseRevalidator="useRevalidator",t.UseNavigateStable="useNavigate",t}(hw||{}),dw=function(t){return t.UseBlocker="useBlocker",t.UseLoaderData="useLoaderData",t.UseActionData="useActionData",t.UseRouteError="useRouteError",t.UseNavigation="useNavigation",t.UseRouteLoaderData="useRouteLoaderData",t.UseMatches="useMatches",t.UseRevalidator="useRevalidator",t.UseNavigateStable="useNavigate",t.UseRouteId="useRouteId",t}(dw||{});function DR(t){let e=b.useContext(pu);return e||Te(!1),e}function OR(t){let e=b.useContext(aw);return e||Te(!1),e}function bR(t){let e=b.useContext(kr);return e||Te(!1),e}function fw(t){let e=bR(),n=e.matches[e.matches.length-1];return n.route.id||Te(!1),n.route.id}function VR(){var t;let e=b.useContext(lw),n=OR(),r=fw();return e!==void 0?e:(t=n.errors)==null?void 0:t[r]}function LR(){let{router:t}=DR(hw.UseNavigateStable),e=fw(dw.UseNavigateStable),n=b.useRef(!1);return uw(()=>{n.current=!0}),b.useCallback(function(i,s){s===void 0&&(s={}),n.current&&(typeof i=="number"?t.navigate(i):t.navigate(i,Ao({fromRouteId:e},s)))},[t,e])}const Eg={};function MR(t,e,n){Eg[t]||(Eg[t]=!0)}function jR(t,e){t==null||t.v7_startTransition,t==null||t.v7_relativeSplatPath}function Tg(t){let{to:e,replace:n,state:r,relative:i}=t;os()||Te(!1);let{future:s,static:o}=b.useContext(Bn),{matches:l}=b.useContext(kr),{pathname:u}=as(),h=cw(),f=af(e,of(l,s.v7_relativeSplatPath),u,i==="path"),m=JSON.stringify(f);return b.useEffect(()=>h(JSON.parse(m),{replace:n,state:r,relative:i}),[h,m,i,n,r]),null}function Kn(t){Te(!1)}function UR(t){let{basename:e="/",children:n=null,location:r,navigationType:i=ir.Pop,navigator:s,static:o=!1,future:l}=t;os()&&Te(!1);let u=e.replace(/^\/*/,"/"),h=b.useMemo(()=>({basename:u,navigator:s,static:o,future:Ao({v7_relativeSplatPath:!1},l)}),[u,l,s,o]);typeof r=="string"&&(r=ss(r));let{pathname:f="/",search:m="",hash:_="",state:R=null,key:k="default"}=r,x=b.useMemo(()=>{let C=Ki(f,u);return C==null?null:{location:{pathname:C,search:m,hash:_,state:R,key:k},navigationType:i}},[u,f,m,_,R,k,i]);return x==null?null:b.createElement(Bn.Provider,{value:h},b.createElement(mu.Provider,{children:n,value:x}))}function FR(t){let{children:e,location:n}=t;return RR(Mh(e),n)}new Promise(()=>{});function Mh(t,e){e===void 0&&(e=[]);let n=[];return b.Children.forEach(t,(r,i)=>{if(!b.isValidElement(r))return;let s=[...e,i];if(r.type===b.Fragment){n.push.apply(n,Mh(r.props.children,s));return}r.type!==Kn&&Te(!1),!r.props.index||!r.props.children||Te(!1);let o={id:r.props.id||s.join("-"),caseSensitive:r.props.caseSensitive,element:r.props.element,Component:r.props.Component,index:r.props.index,path:r.props.path,loader:r.props.loader,action:r.props.action,errorElement:r.props.errorElement,ErrorBoundary:r.props.ErrorBoundary,hasErrorBoundary:r.props.ErrorBoundary!=null||r.props.errorElement!=null,shouldRevalidate:r.props.shouldRevalidate,handle:r.props.handle,lazy:r.props.lazy};r.props.children&&(o.children=Mh(r.props.children,s)),n.push(o)}),n}/**
 * React Router DOM v6.30.3
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */function Vl(){return Vl=Object.assign?Object.assign.bind():function(t){for(var e=1;e<arguments.length;e++){var n=arguments[e];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(t[r]=n[r])}return t},Vl.apply(this,arguments)}function pw(t,e){if(t==null)return{};var n={},r=Object.keys(t),i,s;for(s=0;s<r.length;s++)i=r[s],!(e.indexOf(i)>=0)&&(n[i]=t[i]);return n}function BR(t){return!!(t.metaKey||t.altKey||t.ctrlKey||t.shiftKey)}function zR(t,e){return t.button===0&&(!e||e==="_self")&&!BR(t)}const $R=["onClick","relative","reloadDocument","replace","state","target","to","preventScrollReset","viewTransition"],WR=["aria-current","caseSensitive","className","end","style","to","viewTransition","children"],qR="6";try{window.__reactRouterVersion=qR}catch{}const HR=b.createContext({isTransitioning:!1}),KR="startTransition",Ig=UT[KR];function GR(t){let{basename:e,children:n,future:r,window:i}=t,s=b.useRef();s.current==null&&(s.current=YS({window:i,v5Compat:!0}));let o=s.current,[l,u]=b.useState({action:o.action,location:o.location}),{v7_startTransition:h}=r||{},f=b.useCallback(m=>{h&&Ig?Ig(()=>u(m)):u(m)},[u,h]);return b.useLayoutEffect(()=>o.listen(f),[o,f]),b.useEffect(()=>jR(r),[r]),b.createElement(UR,{basename:e,children:n,location:l.location,navigationType:l.action,navigator:o,future:r})}const QR=typeof window<"u"&&typeof window.document<"u"&&typeof window.document.createElement<"u",XR=/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i,YR=b.forwardRef(function(e,n){let{onClick:r,relative:i,reloadDocument:s,replace:o,state:l,target:u,to:h,preventScrollReset:f,viewTransition:m}=e,_=pw(e,$R),{basename:R}=b.useContext(Bn),k,x=!1;if(typeof h=="string"&&XR.test(h)&&(k=h,QR))try{let T=new URL(window.location.href),D=h.startsWith("//")?new URL(T.protocol+h):new URL(h),j=Ki(D.pathname,R);D.origin===T.origin&&j!=null?h=j+D.search+D.hash:x=!0}catch{}let C=IR(h,{relative:i}),w=ZR(h,{replace:o,state:l,target:u,preventScrollReset:f,relative:i,viewTransition:m});function g(T){r&&r(T),T.defaultPrevented||w(T)}return b.createElement("a",Vl({},_,{href:k||C,onClick:x||s?r:g,ref:n,target:u}))}),Vs=b.forwardRef(function(e,n){let{"aria-current":r="page",caseSensitive:i=!1,className:s="",end:o=!1,style:l,to:u,viewTransition:h,children:f}=e,m=pw(e,WR),_=gu(u,{relative:m.relative}),R=as(),k=b.useContext(aw),{navigator:x,basename:C}=b.useContext(Bn),w=k!=null&&eA(_)&&h===!0,g=x.encodeLocation?x.encodeLocation(_).pathname:_.pathname,T=R.pathname,D=k&&k.navigation&&k.navigation.location?k.navigation.location.pathname:null;i||(T=T.toLowerCase(),D=D?D.toLowerCase():null,g=g.toLowerCase()),D&&C&&(D=Ki(D,C)||D);const j=g!=="/"&&g.endsWith("/")?g.length-1:g.length;let U=T===g||!o&&T.startsWith(g)&&T.charAt(j)==="/",I=D!=null&&(D===g||!o&&D.startsWith(g)&&D.charAt(g.length)==="/"),v={isActive:U,isPending:I,isTransitioning:w},E=U?r:void 0,S;typeof s=="function"?S=s(v):S=[s,U?"active":null,I?"pending":null,w?"transitioning":null].filter(Boolean).join(" ");let P=typeof l=="function"?l(v):l;return b.createElement(YR,Vl({},m,{"aria-current":E,className:S,ref:n,style:P,to:u,viewTransition:h}),typeof f=="function"?f(v):f)});var jh;(function(t){t.UseScrollRestoration="useScrollRestoration",t.UseSubmit="useSubmit",t.UseSubmitFetcher="useSubmitFetcher",t.UseFetcher="useFetcher",t.useViewTransitionState="useViewTransitionState"})(jh||(jh={}));var Sg;(function(t){t.UseFetcher="useFetcher",t.UseFetchers="useFetchers",t.UseScrollRestoration="useScrollRestoration"})(Sg||(Sg={}));function JR(t){let e=b.useContext(pu);return e||Te(!1),e}function ZR(t,e){let{target:n,replace:r,state:i,preventScrollReset:s,relative:o,viewTransition:l}=e===void 0?{}:e,u=cw(),h=as(),f=gu(t,{relative:o});return b.useCallback(m=>{if(zR(m,n)){m.preventDefault();let _=r!==void 0?r:bl(h)===bl(f);u(t,{replace:_,state:i,preventScrollReset:s,relative:o,viewTransition:l})}},[h,u,f,r,i,n,t,s,o,l])}function eA(t,e){e===void 0&&(e={});let n=b.useContext(HR);n==null&&Te(!1);let{basename:r}=JR(jh.useViewTransitionState),i=gu(t,{relative:e.relative});if(!n.isTransitioning)return!1;let s=Ki(n.currentLocation.pathname,r)||n.currentLocation.pathname,o=Ki(n.nextLocation.pathname,r)||n.nextLocation.pathname;return Lh(i.pathname,o)!=null||Lh(i.pathname,s)!=null}var Rg={};/**
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
 */const mw=function(t){const e=[];let n=0;for(let r=0;r<t.length;r++){let i=t.charCodeAt(r);i<128?e[n++]=i:i<2048?(e[n++]=i>>6|192,e[n++]=i&63|128):(i&64512)===55296&&r+1<t.length&&(t.charCodeAt(r+1)&64512)===56320?(i=65536+((i&1023)<<10)+(t.charCodeAt(++r)&1023),e[n++]=i>>18|240,e[n++]=i>>12&63|128,e[n++]=i>>6&63|128,e[n++]=i&63|128):(e[n++]=i>>12|224,e[n++]=i>>6&63|128,e[n++]=i&63|128)}return e},tA=function(t){const e=[];let n=0,r=0;for(;n<t.length;){const i=t[n++];if(i<128)e[r++]=String.fromCharCode(i);else if(i>191&&i<224){const s=t[n++];e[r++]=String.fromCharCode((i&31)<<6|s&63)}else if(i>239&&i<365){const s=t[n++],o=t[n++],l=t[n++],u=((i&7)<<18|(s&63)<<12|(o&63)<<6|l&63)-65536;e[r++]=String.fromCharCode(55296+(u>>10)),e[r++]=String.fromCharCode(56320+(u&1023))}else{const s=t[n++],o=t[n++];e[r++]=String.fromCharCode((i&15)<<12|(s&63)<<6|o&63)}}return e.join("")},gw={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(t,e){if(!Array.isArray(t))throw Error("encodeByteArray takes an array as a parameter");this.init_();const n=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,r=[];for(let i=0;i<t.length;i+=3){const s=t[i],o=i+1<t.length,l=o?t[i+1]:0,u=i+2<t.length,h=u?t[i+2]:0,f=s>>2,m=(s&3)<<4|l>>4;let _=(l&15)<<2|h>>6,R=h&63;u||(R=64,o||(_=64)),r.push(n[f],n[m],n[_],n[R])}return r.join("")},encodeString(t,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(t):this.encodeByteArray(mw(t),e)},decodeString(t,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(t):tA(this.decodeStringToByteArray(t,e))},decodeStringToByteArray(t,e){this.init_();const n=e?this.charToByteMapWebSafe_:this.charToByteMap_,r=[];for(let i=0;i<t.length;){const s=n[t.charAt(i++)],l=i<t.length?n[t.charAt(i)]:0;++i;const h=i<t.length?n[t.charAt(i)]:64;++i;const m=i<t.length?n[t.charAt(i)]:64;if(++i,s==null||l==null||h==null||m==null)throw new nA;const _=s<<2|l>>4;if(r.push(_),h!==64){const R=l<<4&240|h>>2;if(r.push(R),m!==64){const k=h<<6&192|m;r.push(k)}}}return r},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let t=0;t<this.ENCODED_VALS.length;t++)this.byteToCharMap_[t]=this.ENCODED_VALS.charAt(t),this.charToByteMap_[this.byteToCharMap_[t]]=t,this.byteToCharMapWebSafe_[t]=this.ENCODED_VALS_WEBSAFE.charAt(t),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[t]]=t,t>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(t)]=t,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(t)]=t)}}};class nA extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const rA=function(t){const e=mw(t);return gw.encodeByteArray(e,!0)},Ll=function(t){return rA(t).replace(/\./g,"")},yw=function(t){try{return gw.decodeString(t,!0)}catch(e){console.error("base64Decode failed: ",e)}return null};/**
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
 */function iA(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
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
 */const sA=()=>iA().__FIREBASE_DEFAULTS__,oA=()=>{if(typeof process>"u"||typeof Rg>"u")return;const t=Rg.__FIREBASE_DEFAULTS__;if(t)return JSON.parse(t)},aA=()=>{if(typeof document>"u")return;let t;try{t=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const e=t&&yw(t[1]);return e&&JSON.parse(e)},yu=()=>{try{return sA()||oA()||aA()}catch(t){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${t}`);return}},_w=t=>{var e,n;return(n=(e=yu())===null||e===void 0?void 0:e.emulatorHosts)===null||n===void 0?void 0:n[t]},vw=t=>{const e=_w(t);if(!e)return;const n=e.lastIndexOf(":");if(n<=0||n+1===e.length)throw new Error(`Invalid host ${e} with no separate hostname and port!`);const r=parseInt(e.substring(n+1),10);return e[0]==="["?[e.substring(1,n-1),r]:[e.substring(0,n),r]},ww=()=>{var t;return(t=yu())===null||t===void 0?void 0:t.config},Ew=t=>{var e;return(e=yu())===null||e===void 0?void 0:e[`_${t}`]};/**
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
 */class lA{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,n)=>{this.resolve=e,this.reject=n})}wrapCallback(e){return(n,r)=>{n?this.reject(n):this.resolve(r),typeof e=="function"&&(this.promise.catch(()=>{}),e.length===1?e(n):e(n,r))}}}/**
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
 */function Tw(t,e){if(t.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');const n={alg:"none",type:"JWT"},r=e||"demo-project",i=t.iat||0,s=t.sub||t.user_id;if(!s)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");const o=Object.assign({iss:`https://securetoken.google.com/${r}`,aud:r,iat:i,exp:i+3600,auth_time:i,sub:s,user_id:s,firebase:{sign_in_provider:"custom",identities:{}}},t);return[Ll(JSON.stringify(n)),Ll(JSON.stringify(o)),""].join(".")}/**
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
 */function lt(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function uA(){return typeof window<"u"&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(lt())}function cA(){var t;const e=(t=yu())===null||t===void 0?void 0:t.forceEnvironment;if(e==="node")return!0;if(e==="browser")return!1;try{return Object.prototype.toString.call(global.process)==="[object process]"}catch{return!1}}function hA(){return typeof navigator<"u"&&navigator.userAgent==="Cloudflare-Workers"}function dA(){const t=typeof chrome=="object"?chrome.runtime:typeof browser=="object"?browser.runtime:void 0;return typeof t=="object"&&t.id!==void 0}function fA(){return typeof navigator=="object"&&navigator.product==="ReactNative"}function pA(){const t=lt();return t.indexOf("MSIE ")>=0||t.indexOf("Trident/")>=0}function mA(){return!cA()&&!!navigator.userAgent&&navigator.userAgent.includes("Safari")&&!navigator.userAgent.includes("Chrome")}function gA(){try{return typeof indexedDB=="object"}catch{return!1}}function yA(){return new Promise((t,e)=>{try{let n=!0;const r="validate-browser-context-for-indexeddb-analytics-module",i=self.indexedDB.open(r);i.onsuccess=()=>{i.result.close(),n||self.indexedDB.deleteDatabase(r),t(!0)},i.onupgradeneeded=()=>{n=!1},i.onerror=()=>{var s;e(((s=i.error)===null||s===void 0?void 0:s.message)||"")}}catch(n){e(n)}})}/**
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
 */const _A="FirebaseError";class gn extends Error{constructor(e,n,r){super(n),this.code=e,this.customData=r,this.name=_A,Object.setPrototypeOf(this,gn.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,zo.prototype.create)}}class zo{constructor(e,n,r){this.service=e,this.serviceName=n,this.errors=r}create(e,...n){const r=n[0]||{},i=`${this.service}/${e}`,s=this.errors[e],o=s?vA(s,r):"Error",l=`${this.serviceName}: ${o} (${i}).`;return new gn(i,l,r)}}function vA(t,e){return t.replace(wA,(n,r)=>{const i=e[r];return i!=null?String(i):`<${r}?>`})}const wA=/\{\$([^}]+)}/g;function EA(t){for(const e in t)if(Object.prototype.hasOwnProperty.call(t,e))return!1;return!0}function Ml(t,e){if(t===e)return!0;const n=Object.keys(t),r=Object.keys(e);for(const i of n){if(!r.includes(i))return!1;const s=t[i],o=e[i];if(Ag(s)&&Ag(o)){if(!Ml(s,o))return!1}else if(s!==o)return!1}for(const i of r)if(!n.includes(i))return!1;return!0}function Ag(t){return t!==null&&typeof t=="object"}/**
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
 */function $o(t){const e=[];for(const[n,r]of Object.entries(t))Array.isArray(r)?r.forEach(i=>{e.push(encodeURIComponent(n)+"="+encodeURIComponent(i))}):e.push(encodeURIComponent(n)+"="+encodeURIComponent(r));return e.length?"&"+e.join("&"):""}function TA(t,e){const n=new IA(t,e);return n.subscribe.bind(n)}class IA{constructor(e,n){this.observers=[],this.unsubscribes=[],this.observerCount=0,this.task=Promise.resolve(),this.finalized=!1,this.onNoObservers=n,this.task.then(()=>{e(this)}).catch(r=>{this.error(r)})}next(e){this.forEachObserver(n=>{n.next(e)})}error(e){this.forEachObserver(n=>{n.error(e)}),this.close(e)}complete(){this.forEachObserver(e=>{e.complete()}),this.close()}subscribe(e,n,r){let i;if(e===void 0&&n===void 0&&r===void 0)throw new Error("Missing Observer.");SA(e,["next","error","complete"])?i=e:i={next:e,error:n,complete:r},i.next===void 0&&(i.next=Pc),i.error===void 0&&(i.error=Pc),i.complete===void 0&&(i.complete=Pc);const s=this.unsubscribeOne.bind(this,this.observers.length);return this.finalized&&this.task.then(()=>{try{this.finalError?i.error(this.finalError):i.complete()}catch{}}),this.observers.push(i),s}unsubscribeOne(e){this.observers===void 0||this.observers[e]===void 0||(delete this.observers[e],this.observerCount-=1,this.observerCount===0&&this.onNoObservers!==void 0&&this.onNoObservers(this))}forEachObserver(e){if(!this.finalized)for(let n=0;n<this.observers.length;n++)this.sendOne(n,e)}sendOne(e,n){this.task.then(()=>{if(this.observers!==void 0&&this.observers[e]!==void 0)try{n(this.observers[e])}catch(r){typeof console<"u"&&console.error&&console.error(r)}})}close(e){this.finalized||(this.finalized=!0,e!==void 0&&(this.finalError=e),this.task.then(()=>{this.observers=void 0,this.onNoObservers=void 0}))}}function SA(t,e){if(typeof t!="object"||t===null)return!1;for(const n of e)if(n in t&&typeof t[n]=="function")return!0;return!1}function Pc(){}/**
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
 */function Fe(t){return t&&t._delegate?t._delegate:t}class wr{constructor(e,n,r){this.name=e,this.instanceFactory=n,this.type=r,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}}/**
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
 */const br="[DEFAULT]";/**
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
 */class RA{constructor(e,n){this.name=e,this.container=n,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){const n=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(n)){const r=new lA;if(this.instancesDeferred.set(n,r),this.isInitialized(n)||this.shouldAutoInitialize())try{const i=this.getOrInitializeService({instanceIdentifier:n});i&&r.resolve(i)}catch{}}return this.instancesDeferred.get(n).promise}getImmediate(e){var n;const r=this.normalizeInstanceIdentifier(e==null?void 0:e.identifier),i=(n=e==null?void 0:e.optional)!==null&&n!==void 0?n:!1;if(this.isInitialized(r)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:r})}catch(s){if(i)return null;throw s}else{if(i)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,!!this.shouldAutoInitialize()){if(kA(e))try{this.getOrInitializeService({instanceIdentifier:br})}catch{}for(const[n,r]of this.instancesDeferred.entries()){const i=this.normalizeInstanceIdentifier(n);try{const s=this.getOrInitializeService({instanceIdentifier:i});r.resolve(s)}catch{}}}}clearInstance(e=br){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){const e=Array.from(this.instances.values());await Promise.all([...e.filter(n=>"INTERNAL"in n).map(n=>n.INTERNAL.delete()),...e.filter(n=>"_delete"in n).map(n=>n._delete())])}isComponentSet(){return this.component!=null}isInitialized(e=br){return this.instances.has(e)}getOptions(e=br){return this.instancesOptions.get(e)||{}}initialize(e={}){const{options:n={}}=e,r=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(r))throw Error(`${this.name}(${r}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const i=this.getOrInitializeService({instanceIdentifier:r,options:n});for(const[s,o]of this.instancesDeferred.entries()){const l=this.normalizeInstanceIdentifier(s);r===l&&o.resolve(i)}return i}onInit(e,n){var r;const i=this.normalizeInstanceIdentifier(n),s=(r=this.onInitCallbacks.get(i))!==null&&r!==void 0?r:new Set;s.add(e),this.onInitCallbacks.set(i,s);const o=this.instances.get(i);return o&&e(o,i),()=>{s.delete(e)}}invokeOnInitCallbacks(e,n){const r=this.onInitCallbacks.get(n);if(r)for(const i of r)try{i(e,n)}catch{}}getOrInitializeService({instanceIdentifier:e,options:n={}}){let r=this.instances.get(e);if(!r&&this.component&&(r=this.component.instanceFactory(this.container,{instanceIdentifier:AA(e),options:n}),this.instances.set(e,r),this.instancesOptions.set(e,n),this.invokeOnInitCallbacks(r,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,r)}catch{}return r||null}normalizeInstanceIdentifier(e=br){return this.component?this.component.multipleInstances?e:br:e}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function AA(t){return t===br?void 0:t}function kA(t){return t.instantiationMode==="EAGER"}/**
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
 */class CA{constructor(e){this.name=e,this.providers=new Map}addComponent(e){const n=this.getProvider(e.name);if(n.isComponentSet())throw new Error(`Component ${e.name} has already been registered with ${this.name}`);n.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);const n=new RA(e,this);return this.providers.set(e,n),n}getProviders(){return Array.from(this.providers.values())}}/**
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
 */var ie;(function(t){t[t.DEBUG=0]="DEBUG",t[t.VERBOSE=1]="VERBOSE",t[t.INFO=2]="INFO",t[t.WARN=3]="WARN",t[t.ERROR=4]="ERROR",t[t.SILENT=5]="SILENT"})(ie||(ie={}));const PA={debug:ie.DEBUG,verbose:ie.VERBOSE,info:ie.INFO,warn:ie.WARN,error:ie.ERROR,silent:ie.SILENT},xA=ie.INFO,NA={[ie.DEBUG]:"log",[ie.VERBOSE]:"log",[ie.INFO]:"info",[ie.WARN]:"warn",[ie.ERROR]:"error"},DA=(t,e,...n)=>{if(e<t.logLevel)return;const r=new Date().toISOString(),i=NA[e];if(i)console[i](`[${r}]  ${t.name}:`,...n);else throw new Error(`Attempted to log a message with an invalid logType (value: ${e})`)};class lf{constructor(e){this.name=e,this._logLevel=xA,this._logHandler=DA,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in ie))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel=typeof e=="string"?PA[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if(typeof e!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,ie.DEBUG,...e),this._logHandler(this,ie.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,ie.VERBOSE,...e),this._logHandler(this,ie.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,ie.INFO,...e),this._logHandler(this,ie.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,ie.WARN,...e),this._logHandler(this,ie.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,ie.ERROR,...e),this._logHandler(this,ie.ERROR,...e)}}const OA=(t,e)=>e.some(n=>t instanceof n);let kg,Cg;function bA(){return kg||(kg=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function VA(){return Cg||(Cg=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const Iw=new WeakMap,Uh=new WeakMap,Sw=new WeakMap,xc=new WeakMap,uf=new WeakMap;function LA(t){const e=new Promise((n,r)=>{const i=()=>{t.removeEventListener("success",s),t.removeEventListener("error",o)},s=()=>{n(mr(t.result)),i()},o=()=>{r(t.error),i()};t.addEventListener("success",s),t.addEventListener("error",o)});return e.then(n=>{n instanceof IDBCursor&&Iw.set(n,t)}).catch(()=>{}),uf.set(e,t),e}function MA(t){if(Uh.has(t))return;const e=new Promise((n,r)=>{const i=()=>{t.removeEventListener("complete",s),t.removeEventListener("error",o),t.removeEventListener("abort",o)},s=()=>{n(),i()},o=()=>{r(t.error||new DOMException("AbortError","AbortError")),i()};t.addEventListener("complete",s),t.addEventListener("error",o),t.addEventListener("abort",o)});Uh.set(t,e)}let Fh={get(t,e,n){if(t instanceof IDBTransaction){if(e==="done")return Uh.get(t);if(e==="objectStoreNames")return t.objectStoreNames||Sw.get(t);if(e==="store")return n.objectStoreNames[1]?void 0:n.objectStore(n.objectStoreNames[0])}return mr(t[e])},set(t,e,n){return t[e]=n,!0},has(t,e){return t instanceof IDBTransaction&&(e==="done"||e==="store")?!0:e in t}};function jA(t){Fh=t(Fh)}function UA(t){return t===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(e,...n){const r=t.call(Nc(this),e,...n);return Sw.set(r,e.sort?e.sort():[e]),mr(r)}:VA().includes(t)?function(...e){return t.apply(Nc(this),e),mr(Iw.get(this))}:function(...e){return mr(t.apply(Nc(this),e))}}function FA(t){return typeof t=="function"?UA(t):(t instanceof IDBTransaction&&MA(t),OA(t,bA())?new Proxy(t,Fh):t)}function mr(t){if(t instanceof IDBRequest)return LA(t);if(xc.has(t))return xc.get(t);const e=FA(t);return e!==t&&(xc.set(t,e),uf.set(e,t)),e}const Nc=t=>uf.get(t);function BA(t,e,{blocked:n,upgrade:r,blocking:i,terminated:s}={}){const o=indexedDB.open(t,e),l=mr(o);return r&&o.addEventListener("upgradeneeded",u=>{r(mr(o.result),u.oldVersion,u.newVersion,mr(o.transaction),u)}),n&&o.addEventListener("blocked",u=>n(u.oldVersion,u.newVersion,u)),l.then(u=>{s&&u.addEventListener("close",()=>s()),i&&u.addEventListener("versionchange",h=>i(h.oldVersion,h.newVersion,h))}).catch(()=>{}),l}const zA=["get","getKey","getAll","getAllKeys","count"],$A=["put","add","delete","clear"],Dc=new Map;function Pg(t,e){if(!(t instanceof IDBDatabase&&!(e in t)&&typeof e=="string"))return;if(Dc.get(e))return Dc.get(e);const n=e.replace(/FromIndex$/,""),r=e!==n,i=$A.includes(n);if(!(n in(r?IDBIndex:IDBObjectStore).prototype)||!(i||zA.includes(n)))return;const s=async function(o,...l){const u=this.transaction(o,i?"readwrite":"readonly");let h=u.store;return r&&(h=h.index(l.shift())),(await Promise.all([h[n](...l),i&&u.done]))[0]};return Dc.set(e,s),s}jA(t=>({...t,get:(e,n,r)=>Pg(e,n)||t.get(e,n,r),has:(e,n)=>!!Pg(e,n)||t.has(e,n)}));/**
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
 */class WA{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(n=>{if(qA(n)){const r=n.getImmediate();return`${r.library}/${r.version}`}else return null}).filter(n=>n).join(" ")}}function qA(t){const e=t.getComponent();return(e==null?void 0:e.type)==="VERSION"}const Bh="@firebase/app",xg="0.10.13";/**
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
 */const Ln=new lf("@firebase/app"),HA="@firebase/app-compat",KA="@firebase/analytics-compat",GA="@firebase/analytics",QA="@firebase/app-check-compat",XA="@firebase/app-check",YA="@firebase/auth",JA="@firebase/auth-compat",ZA="@firebase/database",ek="@firebase/data-connect",tk="@firebase/database-compat",nk="@firebase/functions",rk="@firebase/functions-compat",ik="@firebase/installations",sk="@firebase/installations-compat",ok="@firebase/messaging",ak="@firebase/messaging-compat",lk="@firebase/performance",uk="@firebase/performance-compat",ck="@firebase/remote-config",hk="@firebase/remote-config-compat",dk="@firebase/storage",fk="@firebase/storage-compat",pk="@firebase/firestore",mk="@firebase/vertexai-preview",gk="@firebase/firestore-compat",yk="firebase",_k="10.14.1";/**
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
 */const zh="[DEFAULT]",vk={[Bh]:"fire-core",[HA]:"fire-core-compat",[GA]:"fire-analytics",[KA]:"fire-analytics-compat",[XA]:"fire-app-check",[QA]:"fire-app-check-compat",[YA]:"fire-auth",[JA]:"fire-auth-compat",[ZA]:"fire-rtdb",[ek]:"fire-data-connect",[tk]:"fire-rtdb-compat",[nk]:"fire-fn",[rk]:"fire-fn-compat",[ik]:"fire-iid",[sk]:"fire-iid-compat",[ok]:"fire-fcm",[ak]:"fire-fcm-compat",[lk]:"fire-perf",[uk]:"fire-perf-compat",[ck]:"fire-rc",[hk]:"fire-rc-compat",[dk]:"fire-gcs",[fk]:"fire-gcs-compat",[pk]:"fire-fst",[gk]:"fire-fst-compat",[mk]:"fire-vertex","fire-js":"fire-js",[yk]:"fire-js-all"};/**
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
 */const jl=new Map,wk=new Map,$h=new Map;function Ng(t,e){try{t.container.addComponent(e)}catch(n){Ln.debug(`Component ${e.name} failed to register with FirebaseApp ${t.name}`,n)}}function Jr(t){const e=t.name;if($h.has(e))return Ln.debug(`There were multiple attempts to register component ${e}.`),!1;$h.set(e,t);for(const n of jl.values())Ng(n,t);for(const n of wk.values())Ng(n,t);return!0}function _u(t,e){const n=t.container.getProvider("heartbeat").getImmediate({optional:!0});return n&&n.triggerHeartbeat(),t.container.getProvider(e)}function kn(t){return t.settings!==void 0}/**
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
 */const Ek={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},gr=new zo("app","Firebase",Ek);/**
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
 */class Tk{constructor(e,n,r){this._isDeleted=!1,this._options=Object.assign({},e),this._config=Object.assign({},n),this._name=n.name,this._automaticDataCollectionEnabled=n.automaticDataCollectionEnabled,this._container=r,this.container.addComponent(new wr("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw gr.create("app-deleted",{appName:this._name})}}/**
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
 */const oi=_k;function Rw(t,e={}){let n=t;typeof e!="object"&&(e={name:e});const r=Object.assign({name:zh,automaticDataCollectionEnabled:!1},e),i=r.name;if(typeof i!="string"||!i)throw gr.create("bad-app-name",{appName:String(i)});if(n||(n=ww()),!n)throw gr.create("no-options");const s=jl.get(i);if(s){if(Ml(n,s.options)&&Ml(r,s.config))return s;throw gr.create("duplicate-app",{appName:i})}const o=new CA(i);for(const u of $h.values())o.addComponent(u);const l=new Tk(n,r,o);return jl.set(i,l),l}function cf(t=zh){const e=jl.get(t);if(!e&&t===zh&&ww())return Rw();if(!e)throw gr.create("no-app",{appName:t});return e}function an(t,e,n){var r;let i=(r=vk[t])!==null&&r!==void 0?r:t;n&&(i+=`-${n}`);const s=i.match(/\s|\//),o=e.match(/\s|\//);if(s||o){const l=[`Unable to register library "${i}" with version "${e}":`];s&&l.push(`library name "${i}" contains illegal characters (whitespace or "/")`),s&&o&&l.push("and"),o&&l.push(`version name "${e}" contains illegal characters (whitespace or "/")`),Ln.warn(l.join(" "));return}Jr(new wr(`${i}-version`,()=>({library:i,version:e}),"VERSION"))}/**
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
 */const Ik="firebase-heartbeat-database",Sk=1,ko="firebase-heartbeat-store";let Oc=null;function Aw(){return Oc||(Oc=BA(Ik,Sk,{upgrade:(t,e)=>{switch(e){case 0:try{t.createObjectStore(ko)}catch(n){console.warn(n)}}}}).catch(t=>{throw gr.create("idb-open",{originalErrorMessage:t.message})})),Oc}async function Rk(t){try{const n=(await Aw()).transaction(ko),r=await n.objectStore(ko).get(kw(t));return await n.done,r}catch(e){if(e instanceof gn)Ln.warn(e.message);else{const n=gr.create("idb-get",{originalErrorMessage:e==null?void 0:e.message});Ln.warn(n.message)}}}async function Dg(t,e){try{const r=(await Aw()).transaction(ko,"readwrite");await r.objectStore(ko).put(e,kw(t)),await r.done}catch(n){if(n instanceof gn)Ln.warn(n.message);else{const r=gr.create("idb-set",{originalErrorMessage:n==null?void 0:n.message});Ln.warn(r.message)}}}function kw(t){return`${t.name}!${t.options.appId}`}/**
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
 */const Ak=1024,kk=30*24*60*60*1e3;class Ck{constructor(e){this.container=e,this._heartbeatsCache=null;const n=this.container.getProvider("app").getImmediate();this._storage=new xk(n),this._heartbeatsCachePromise=this._storage.read().then(r=>(this._heartbeatsCache=r,r))}async triggerHeartbeat(){var e,n;try{const i=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),s=Og();return((e=this._heartbeatsCache)===null||e===void 0?void 0:e.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((n=this._heartbeatsCache)===null||n===void 0?void 0:n.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===s||this._heartbeatsCache.heartbeats.some(o=>o.date===s)?void 0:(this._heartbeatsCache.heartbeats.push({date:s,agent:i}),this._heartbeatsCache.heartbeats=this._heartbeatsCache.heartbeats.filter(o=>{const l=new Date(o.date).valueOf();return Date.now()-l<=kk}),this._storage.overwrite(this._heartbeatsCache))}catch(r){Ln.warn(r)}}async getHeartbeatsHeader(){var e;try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,((e=this._heartbeatsCache)===null||e===void 0?void 0:e.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";const n=Og(),{heartbeatsToSend:r,unsentEntries:i}=Pk(this._heartbeatsCache.heartbeats),s=Ll(JSON.stringify({version:2,heartbeats:r}));return this._heartbeatsCache.lastSentHeartbeatDate=n,i.length>0?(this._heartbeatsCache.heartbeats=i,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),s}catch(n){return Ln.warn(n),""}}}function Og(){return new Date().toISOString().substring(0,10)}function Pk(t,e=Ak){const n=[];let r=t.slice();for(const i of t){const s=n.find(o=>o.agent===i.agent);if(s){if(s.dates.push(i.date),bg(n)>e){s.dates.pop();break}}else if(n.push({agent:i.agent,dates:[i.date]}),bg(n)>e){n.pop();break}r=r.slice(1)}return{heartbeatsToSend:n,unsentEntries:r}}class xk{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return gA()?yA().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const n=await Rk(this.app);return n!=null&&n.heartbeats?n:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(e){var n;if(await this._canUseIndexedDBPromise){const i=await this.read();return Dg(this.app,{lastSentHeartbeatDate:(n=e.lastSentHeartbeatDate)!==null&&n!==void 0?n:i.lastSentHeartbeatDate,heartbeats:e.heartbeats})}else return}async add(e){var n;if(await this._canUseIndexedDBPromise){const i=await this.read();return Dg(this.app,{lastSentHeartbeatDate:(n=e.lastSentHeartbeatDate)!==null&&n!==void 0?n:i.lastSentHeartbeatDate,heartbeats:[...i.heartbeats,...e.heartbeats]})}else return}}function bg(t){return Ll(JSON.stringify({version:2,heartbeats:t})).length}/**
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
 */function Nk(t){Jr(new wr("platform-logger",e=>new WA(e),"PRIVATE")),Jr(new wr("heartbeat",e=>new Ck(e),"PRIVATE")),an(Bh,xg,t),an(Bh,xg,"esm2017"),an("fire-js","")}Nk("");function hf(t,e){var n={};for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&e.indexOf(r)<0&&(n[r]=t[r]);if(t!=null&&typeof Object.getOwnPropertySymbols=="function")for(var i=0,r=Object.getOwnPropertySymbols(t);i<r.length;i++)e.indexOf(r[i])<0&&Object.prototype.propertyIsEnumerable.call(t,r[i])&&(n[r[i]]=t[r[i]]);return n}function Cw(){return{"dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK."}}const Dk=Cw,Pw=new zo("auth","Firebase",Cw());/**
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
 */const Ul=new lf("@firebase/auth");function Ok(t,...e){Ul.logLevel<=ie.WARN&&Ul.warn(`Auth (${oi}): ${t}`,...e)}function tl(t,...e){Ul.logLevel<=ie.ERROR&&Ul.error(`Auth (${oi}): ${t}`,...e)}/**
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
 */function dn(t,...e){throw ff(t,...e)}function Ht(t,...e){return ff(t,...e)}function df(t,e,n){const r=Object.assign(Object.assign({},Dk()),{[e]:n});return new zo("auth","Firebase",r).create(e,{appName:t.name})}function zr(t){return df(t,"operation-not-supported-in-this-environment","Operations that alter the current user are not supported in conjunction with FirebaseServerApp")}function bk(t,e,n){const r=n;if(!(e instanceof r))throw r.name!==e.constructor.name&&dn(t,"argument-error"),df(t,"argument-error",`Type of ${e.constructor.name} does not match expected instance.Did you pass a reference from a different Auth SDK?`)}function ff(t,...e){if(typeof t!="string"){const n=e[0],r=[...e.slice(1)];return r[0]&&(r[0].appName=t.name),t._errorFactory.create(n,...r)}return Pw.create(t,...e)}function Y(t,e,...n){if(!t)throw ff(e,...n)}function Cn(t){const e="INTERNAL ASSERTION FAILED: "+t;throw tl(e),new Error(e)}function Mn(t,e){t||Cn(e)}/**
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
 */function Wh(){var t;return typeof self<"u"&&((t=self.location)===null||t===void 0?void 0:t.href)||""}function Vk(){return Vg()==="http:"||Vg()==="https:"}function Vg(){var t;return typeof self<"u"&&((t=self.location)===null||t===void 0?void 0:t.protocol)||null}/**
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
 */function Lk(){return typeof navigator<"u"&&navigator&&"onLine"in navigator&&typeof navigator.onLine=="boolean"&&(Vk()||dA()||"connection"in navigator)?navigator.onLine:!0}function Mk(){if(typeof navigator>"u")return null;const t=navigator;return t.languages&&t.languages[0]||t.language||null}/**
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
 */class Wo{constructor(e,n){this.shortDelay=e,this.longDelay=n,Mn(n>e,"Short delay should be less than long delay!"),this.isMobile=uA()||fA()}get(){return Lk()?this.isMobile?this.longDelay:this.shortDelay:Math.min(5e3,this.shortDelay)}}/**
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
 */function pf(t,e){Mn(t.emulator,"Emulator should always be set here");const{url:n}=t.emulator;return e?`${n}${e.startsWith("/")?e.slice(1):e}`:n}/**
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
 */class xw{static initialize(e,n,r){this.fetchImpl=e,n&&(this.headersImpl=n),r&&(this.responseImpl=r)}static fetch(){if(this.fetchImpl)return this.fetchImpl;if(typeof self<"u"&&"fetch"in self)return self.fetch;if(typeof globalThis<"u"&&globalThis.fetch)return globalThis.fetch;if(typeof fetch<"u")return fetch;Cn("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static headers(){if(this.headersImpl)return this.headersImpl;if(typeof self<"u"&&"Headers"in self)return self.Headers;if(typeof globalThis<"u"&&globalThis.Headers)return globalThis.Headers;if(typeof Headers<"u")return Headers;Cn("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static response(){if(this.responseImpl)return this.responseImpl;if(typeof self<"u"&&"Response"in self)return self.Response;if(typeof globalThis<"u"&&globalThis.Response)return globalThis.Response;if(typeof Response<"u")return Response;Cn("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}}/**
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
 */const jk={CREDENTIAL_MISMATCH:"custom-token-mismatch",MISSING_CUSTOM_TOKEN:"internal-error",INVALID_IDENTIFIER:"invalid-email",MISSING_CONTINUE_URI:"internal-error",INVALID_PASSWORD:"wrong-password",MISSING_PASSWORD:"missing-password",INVALID_LOGIN_CREDENTIALS:"invalid-credential",EMAIL_EXISTS:"email-already-in-use",PASSWORD_LOGIN_DISABLED:"operation-not-allowed",INVALID_IDP_RESPONSE:"invalid-credential",INVALID_PENDING_TOKEN:"invalid-credential",FEDERATED_USER_ID_ALREADY_LINKED:"credential-already-in-use",MISSING_REQ_TYPE:"internal-error",EMAIL_NOT_FOUND:"user-not-found",RESET_PASSWORD_EXCEED_LIMIT:"too-many-requests",EXPIRED_OOB_CODE:"expired-action-code",INVALID_OOB_CODE:"invalid-action-code",MISSING_OOB_CODE:"internal-error",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"requires-recent-login",INVALID_ID_TOKEN:"invalid-user-token",TOKEN_EXPIRED:"user-token-expired",USER_NOT_FOUND:"user-token-expired",TOO_MANY_ATTEMPTS_TRY_LATER:"too-many-requests",PASSWORD_DOES_NOT_MEET_REQUIREMENTS:"password-does-not-meet-requirements",INVALID_CODE:"invalid-verification-code",INVALID_SESSION_INFO:"invalid-verification-id",INVALID_TEMPORARY_PROOF:"invalid-credential",MISSING_SESSION_INFO:"missing-verification-id",SESSION_EXPIRED:"code-expired",MISSING_ANDROID_PACKAGE_NAME:"missing-android-pkg-name",UNAUTHORIZED_DOMAIN:"unauthorized-continue-uri",INVALID_OAUTH_CLIENT_ID:"invalid-oauth-client-id",ADMIN_ONLY_OPERATION:"admin-restricted-operation",INVALID_MFA_PENDING_CREDENTIAL:"invalid-multi-factor-session",MFA_ENROLLMENT_NOT_FOUND:"multi-factor-info-not-found",MISSING_MFA_ENROLLMENT_ID:"missing-multi-factor-info",MISSING_MFA_PENDING_CREDENTIAL:"missing-multi-factor-session",SECOND_FACTOR_EXISTS:"second-factor-already-in-use",SECOND_FACTOR_LIMIT_EXCEEDED:"maximum-second-factor-count-exceeded",BLOCKING_FUNCTION_ERROR_RESPONSE:"internal-error",RECAPTCHA_NOT_ENABLED:"recaptcha-not-enabled",MISSING_RECAPTCHA_TOKEN:"missing-recaptcha-token",INVALID_RECAPTCHA_TOKEN:"invalid-recaptcha-token",INVALID_RECAPTCHA_ACTION:"invalid-recaptcha-action",MISSING_CLIENT_TYPE:"missing-client-type",MISSING_RECAPTCHA_VERSION:"missing-recaptcha-version",INVALID_RECAPTCHA_VERSION:"invalid-recaptcha-version",INVALID_REQ_TYPE:"invalid-req-type"};/**
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
 */const Uk=new Wo(3e4,6e4);function mf(t,e){return t.tenantId&&!e.tenantId?Object.assign(Object.assign({},e),{tenantId:t.tenantId}):e}async function ls(t,e,n,r,i={}){return Nw(t,i,async()=>{let s={},o={};r&&(e==="GET"?o=r:s={body:JSON.stringify(r)});const l=$o(Object.assign({key:t.config.apiKey},o)).slice(1),u=await t._getAdditionalHeaders();u["Content-Type"]="application/json",t.languageCode&&(u["X-Firebase-Locale"]=t.languageCode);const h=Object.assign({method:e,headers:u},s);return hA()||(h.referrerPolicy="no-referrer"),xw.fetch()(Dw(t,t.config.apiHost,n,l),h)})}async function Nw(t,e,n){t._canInitEmulator=!1;const r=Object.assign(Object.assign({},jk),e);try{const i=new Bk(t),s=await Promise.race([n(),i.promise]);i.clearNetworkTimeout();const o=await s.json();if("needConfirmation"in o)throw La(t,"account-exists-with-different-credential",o);if(s.ok&&!("errorMessage"in o))return o;{const l=s.ok?o.errorMessage:o.error.message,[u,h]=l.split(" : ");if(u==="FEDERATED_USER_ID_ALREADY_LINKED")throw La(t,"credential-already-in-use",o);if(u==="EMAIL_EXISTS")throw La(t,"email-already-in-use",o);if(u==="USER_DISABLED")throw La(t,"user-disabled",o);const f=r[u]||u.toLowerCase().replace(/[_\s]+/g,"-");if(h)throw df(t,f,h);dn(t,f)}}catch(i){if(i instanceof gn)throw i;dn(t,"network-request-failed",{message:String(i)})}}async function Fk(t,e,n,r,i={}){const s=await ls(t,e,n,r,i);return"mfaPendingCredential"in s&&dn(t,"multi-factor-auth-required",{_serverResponse:s}),s}function Dw(t,e,n,r){const i=`${e}${n}?${r}`;return t.config.emulator?pf(t.config,i):`${t.config.apiScheme}://${i}`}class Bk{constructor(e){this.auth=e,this.timer=null,this.promise=new Promise((n,r)=>{this.timer=setTimeout(()=>r(Ht(this.auth,"network-request-failed")),Uk.get())})}clearNetworkTimeout(){clearTimeout(this.timer)}}function La(t,e,n){const r={appName:t.name};n.email&&(r.email=n.email),n.phoneNumber&&(r.phoneNumber=n.phoneNumber);const i=Ht(t,e,r);return i.customData._tokenResponse=n,i}/**
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
 */async function zk(t,e){return ls(t,"POST","/v1/accounts:delete",e)}async function Ow(t,e){return ls(t,"POST","/v1/accounts:lookup",e)}/**
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
 */function to(t){if(t)try{const e=new Date(Number(t));if(!isNaN(e.getTime()))return e.toUTCString()}catch{}}async function $k(t,e=!1){const n=Fe(t),r=await n.getIdToken(e),i=gf(r);Y(i&&i.exp&&i.auth_time&&i.iat,n.auth,"internal-error");const s=typeof i.firebase=="object"?i.firebase:void 0,o=s==null?void 0:s.sign_in_provider;return{claims:i,token:r,authTime:to(bc(i.auth_time)),issuedAtTime:to(bc(i.iat)),expirationTime:to(bc(i.exp)),signInProvider:o||null,signInSecondFactor:(s==null?void 0:s.sign_in_second_factor)||null}}function bc(t){return Number(t)*1e3}function gf(t){const[e,n,r]=t.split(".");if(e===void 0||n===void 0||r===void 0)return tl("JWT malformed, contained fewer than 3 sections"),null;try{const i=yw(n);return i?JSON.parse(i):(tl("Failed to decode base64 JWT payload"),null)}catch(i){return tl("Caught error parsing JWT payload as JSON",i==null?void 0:i.toString()),null}}function Lg(t){const e=gf(t);return Y(e,"internal-error"),Y(typeof e.exp<"u","internal-error"),Y(typeof e.iat<"u","internal-error"),Number(e.exp)-Number(e.iat)}/**
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
 */async function Co(t,e,n=!1){if(n)return e;try{return await e}catch(r){throw r instanceof gn&&Wk(r)&&t.auth.currentUser===t&&await t.auth.signOut(),r}}function Wk({code:t}){return t==="auth/user-disabled"||t==="auth/user-token-expired"}/**
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
 */class qk{constructor(e){this.user=e,this.isRunning=!1,this.timerId=null,this.errorBackoff=3e4}_start(){this.isRunning||(this.isRunning=!0,this.schedule())}_stop(){this.isRunning&&(this.isRunning=!1,this.timerId!==null&&clearTimeout(this.timerId))}getInterval(e){var n;if(e){const r=this.errorBackoff;return this.errorBackoff=Math.min(this.errorBackoff*2,96e4),r}else{this.errorBackoff=3e4;const i=((n=this.user.stsTokenManager.expirationTime)!==null&&n!==void 0?n:0)-Date.now()-3e5;return Math.max(0,i)}}schedule(e=!1){if(!this.isRunning)return;const n=this.getInterval(e);this.timerId=setTimeout(async()=>{await this.iteration()},n)}async iteration(){try{await this.user.getIdToken(!0)}catch(e){(e==null?void 0:e.code)==="auth/network-request-failed"&&this.schedule(!0);return}this.schedule()}}/**
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
 */class qh{constructor(e,n){this.createdAt=e,this.lastLoginAt=n,this._initializeTime()}_initializeTime(){this.lastSignInTime=to(this.lastLoginAt),this.creationTime=to(this.createdAt)}_copy(e){this.createdAt=e.createdAt,this.lastLoginAt=e.lastLoginAt,this._initializeTime()}toJSON(){return{createdAt:this.createdAt,lastLoginAt:this.lastLoginAt}}}/**
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
 */async function Fl(t){var e;const n=t.auth,r=await t.getIdToken(),i=await Co(t,Ow(n,{idToken:r}));Y(i==null?void 0:i.users.length,n,"internal-error");const s=i.users[0];t._notifyReloadListener(s);const o=!((e=s.providerUserInfo)===null||e===void 0)&&e.length?bw(s.providerUserInfo):[],l=Kk(t.providerData,o),u=t.isAnonymous,h=!(t.email&&s.passwordHash)&&!(l!=null&&l.length),f=u?h:!1,m={uid:s.localId,displayName:s.displayName||null,photoURL:s.photoUrl||null,email:s.email||null,emailVerified:s.emailVerified||!1,phoneNumber:s.phoneNumber||null,tenantId:s.tenantId||null,providerData:l,metadata:new qh(s.createdAt,s.lastLoginAt),isAnonymous:f};Object.assign(t,m)}async function Hk(t){const e=Fe(t);await Fl(e),await e.auth._persistUserIfCurrent(e),e.auth._notifyListenersIfCurrent(e)}function Kk(t,e){return[...t.filter(r=>!e.some(i=>i.providerId===r.providerId)),...e]}function bw(t){return t.map(e=>{var{providerId:n}=e,r=hf(e,["providerId"]);return{providerId:n,uid:r.rawId||"",displayName:r.displayName||null,email:r.email||null,phoneNumber:r.phoneNumber||null,photoURL:r.photoUrl||null}})}/**
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
 */async function Gk(t,e){const n=await Nw(t,{},async()=>{const r=$o({grant_type:"refresh_token",refresh_token:e}).slice(1),{tokenApiHost:i,apiKey:s}=t.config,o=Dw(t,i,"/v1/token",`key=${s}`),l=await t._getAdditionalHeaders();return l["Content-Type"]="application/x-www-form-urlencoded",xw.fetch()(o,{method:"POST",headers:l,body:r})});return{accessToken:n.access_token,expiresIn:n.expires_in,refreshToken:n.refresh_token}}async function Qk(t,e){return ls(t,"POST","/v2/accounts:revokeToken",mf(t,e))}/**
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
 */class Li{constructor(){this.refreshToken=null,this.accessToken=null,this.expirationTime=null}get isExpired(){return!this.expirationTime||Date.now()>this.expirationTime-3e4}updateFromServerResponse(e){Y(e.idToken,"internal-error"),Y(typeof e.idToken<"u","internal-error"),Y(typeof e.refreshToken<"u","internal-error");const n="expiresIn"in e&&typeof e.expiresIn<"u"?Number(e.expiresIn):Lg(e.idToken);this.updateTokensAndExpiration(e.idToken,e.refreshToken,n)}updateFromIdToken(e){Y(e.length!==0,"internal-error");const n=Lg(e);this.updateTokensAndExpiration(e,null,n)}async getToken(e,n=!1){return!n&&this.accessToken&&!this.isExpired?this.accessToken:(Y(this.refreshToken,e,"user-token-expired"),this.refreshToken?(await this.refresh(e,this.refreshToken),this.accessToken):null)}clearRefreshToken(){this.refreshToken=null}async refresh(e,n){const{accessToken:r,refreshToken:i,expiresIn:s}=await Gk(e,n);this.updateTokensAndExpiration(r,i,Number(s))}updateTokensAndExpiration(e,n,r){this.refreshToken=n||null,this.accessToken=e||null,this.expirationTime=Date.now()+r*1e3}static fromJSON(e,n){const{refreshToken:r,accessToken:i,expirationTime:s}=n,o=new Li;return r&&(Y(typeof r=="string","internal-error",{appName:e}),o.refreshToken=r),i&&(Y(typeof i=="string","internal-error",{appName:e}),o.accessToken=i),s&&(Y(typeof s=="number","internal-error",{appName:e}),o.expirationTime=s),o}toJSON(){return{refreshToken:this.refreshToken,accessToken:this.accessToken,expirationTime:this.expirationTime}}_assign(e){this.accessToken=e.accessToken,this.refreshToken=e.refreshToken,this.expirationTime=e.expirationTime}_clone(){return Object.assign(new Li,this.toJSON())}_performRefresh(){return Cn("not implemented")}}/**
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
 */function Hn(t,e){Y(typeof t=="string"||typeof t>"u","internal-error",{appName:e})}class Pn{constructor(e){var{uid:n,auth:r,stsTokenManager:i}=e,s=hf(e,["uid","auth","stsTokenManager"]);this.providerId="firebase",this.proactiveRefresh=new qk(this),this.reloadUserInfo=null,this.reloadListener=null,this.uid=n,this.auth=r,this.stsTokenManager=i,this.accessToken=i.accessToken,this.displayName=s.displayName||null,this.email=s.email||null,this.emailVerified=s.emailVerified||!1,this.phoneNumber=s.phoneNumber||null,this.photoURL=s.photoURL||null,this.isAnonymous=s.isAnonymous||!1,this.tenantId=s.tenantId||null,this.providerData=s.providerData?[...s.providerData]:[],this.metadata=new qh(s.createdAt||void 0,s.lastLoginAt||void 0)}async getIdToken(e){const n=await Co(this,this.stsTokenManager.getToken(this.auth,e));return Y(n,this.auth,"internal-error"),this.accessToken!==n&&(this.accessToken=n,await this.auth._persistUserIfCurrent(this),this.auth._notifyListenersIfCurrent(this)),n}getIdTokenResult(e){return $k(this,e)}reload(){return Hk(this)}_assign(e){this!==e&&(Y(this.uid===e.uid,this.auth,"internal-error"),this.displayName=e.displayName,this.photoURL=e.photoURL,this.email=e.email,this.emailVerified=e.emailVerified,this.phoneNumber=e.phoneNumber,this.isAnonymous=e.isAnonymous,this.tenantId=e.tenantId,this.providerData=e.providerData.map(n=>Object.assign({},n)),this.metadata._copy(e.metadata),this.stsTokenManager._assign(e.stsTokenManager))}_clone(e){const n=new Pn(Object.assign(Object.assign({},this),{auth:e,stsTokenManager:this.stsTokenManager._clone()}));return n.metadata._copy(this.metadata),n}_onReload(e){Y(!this.reloadListener,this.auth,"internal-error"),this.reloadListener=e,this.reloadUserInfo&&(this._notifyReloadListener(this.reloadUserInfo),this.reloadUserInfo=null)}_notifyReloadListener(e){this.reloadListener?this.reloadListener(e):this.reloadUserInfo=e}_startProactiveRefresh(){this.proactiveRefresh._start()}_stopProactiveRefresh(){this.proactiveRefresh._stop()}async _updateTokensIfNecessary(e,n=!1){let r=!1;e.idToken&&e.idToken!==this.stsTokenManager.accessToken&&(this.stsTokenManager.updateFromServerResponse(e),r=!0),n&&await Fl(this),await this.auth._persistUserIfCurrent(this),r&&this.auth._notifyListenersIfCurrent(this)}async delete(){if(kn(this.auth.app))return Promise.reject(zr(this.auth));const e=await this.getIdToken();return await Co(this,zk(this.auth,{idToken:e})),this.stsTokenManager.clearRefreshToken(),this.auth.signOut()}toJSON(){return Object.assign(Object.assign({uid:this.uid,email:this.email||void 0,emailVerified:this.emailVerified,displayName:this.displayName||void 0,isAnonymous:this.isAnonymous,photoURL:this.photoURL||void 0,phoneNumber:this.phoneNumber||void 0,tenantId:this.tenantId||void 0,providerData:this.providerData.map(e=>Object.assign({},e)),stsTokenManager:this.stsTokenManager.toJSON(),_redirectEventId:this._redirectEventId},this.metadata.toJSON()),{apiKey:this.auth.config.apiKey,appName:this.auth.name})}get refreshToken(){return this.stsTokenManager.refreshToken||""}static _fromJSON(e,n){var r,i,s,o,l,u,h,f;const m=(r=n.displayName)!==null&&r!==void 0?r:void 0,_=(i=n.email)!==null&&i!==void 0?i:void 0,R=(s=n.phoneNumber)!==null&&s!==void 0?s:void 0,k=(o=n.photoURL)!==null&&o!==void 0?o:void 0,x=(l=n.tenantId)!==null&&l!==void 0?l:void 0,C=(u=n._redirectEventId)!==null&&u!==void 0?u:void 0,w=(h=n.createdAt)!==null&&h!==void 0?h:void 0,g=(f=n.lastLoginAt)!==null&&f!==void 0?f:void 0,{uid:T,emailVerified:D,isAnonymous:j,providerData:U,stsTokenManager:I}=n;Y(T&&I,e,"internal-error");const v=Li.fromJSON(this.name,I);Y(typeof T=="string",e,"internal-error"),Hn(m,e.name),Hn(_,e.name),Y(typeof D=="boolean",e,"internal-error"),Y(typeof j=="boolean",e,"internal-error"),Hn(R,e.name),Hn(k,e.name),Hn(x,e.name),Hn(C,e.name),Hn(w,e.name),Hn(g,e.name);const E=new Pn({uid:T,auth:e,email:_,emailVerified:D,displayName:m,isAnonymous:j,photoURL:k,phoneNumber:R,tenantId:x,stsTokenManager:v,createdAt:w,lastLoginAt:g});return U&&Array.isArray(U)&&(E.providerData=U.map(S=>Object.assign({},S))),C&&(E._redirectEventId=C),E}static async _fromIdTokenResponse(e,n,r=!1){const i=new Li;i.updateFromServerResponse(n);const s=new Pn({uid:n.localId,auth:e,stsTokenManager:i,isAnonymous:r});return await Fl(s),s}static async _fromGetAccountInfoResponse(e,n,r){const i=n.users[0];Y(i.localId!==void 0,"internal-error");const s=i.providerUserInfo!==void 0?bw(i.providerUserInfo):[],o=!(i.email&&i.passwordHash)&&!(s!=null&&s.length),l=new Li;l.updateFromIdToken(r);const u=new Pn({uid:i.localId,auth:e,stsTokenManager:l,isAnonymous:o}),h={uid:i.localId,displayName:i.displayName||null,photoURL:i.photoUrl||null,email:i.email||null,emailVerified:i.emailVerified||!1,phoneNumber:i.phoneNumber||null,tenantId:i.tenantId||null,providerData:s,metadata:new qh(i.createdAt,i.lastLoginAt),isAnonymous:!(i.email&&i.passwordHash)&&!(s!=null&&s.length)};return Object.assign(u,h),u}}/**
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
 */const Mg=new Map;function xn(t){Mn(t instanceof Function,"Expected a class definition");let e=Mg.get(t);return e?(Mn(e instanceof t,"Instance stored in cache mismatched with class"),e):(e=new t,Mg.set(t,e),e)}/**
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
 */class Vw{constructor(){this.type="NONE",this.storage={}}async _isAvailable(){return!0}async _set(e,n){this.storage[e]=n}async _get(e){const n=this.storage[e];return n===void 0?null:n}async _remove(e){delete this.storage[e]}_addListener(e,n){}_removeListener(e,n){}}Vw.type="NONE";const jg=Vw;/**
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
 */function nl(t,e,n){return`firebase:${t}:${e}:${n}`}class Mi{constructor(e,n,r){this.persistence=e,this.auth=n,this.userKey=r;const{config:i,name:s}=this.auth;this.fullUserKey=nl(this.userKey,i.apiKey,s),this.fullPersistenceKey=nl("persistence",i.apiKey,s),this.boundEventHandler=n._onStorageEvent.bind(n),this.persistence._addListener(this.fullUserKey,this.boundEventHandler)}setCurrentUser(e){return this.persistence._set(this.fullUserKey,e.toJSON())}async getCurrentUser(){const e=await this.persistence._get(this.fullUserKey);return e?Pn._fromJSON(this.auth,e):null}removeCurrentUser(){return this.persistence._remove(this.fullUserKey)}savePersistenceForRedirect(){return this.persistence._set(this.fullPersistenceKey,this.persistence.type)}async setPersistence(e){if(this.persistence===e)return;const n=await this.getCurrentUser();if(await this.removeCurrentUser(),this.persistence=e,n)return this.setCurrentUser(n)}delete(){this.persistence._removeListener(this.fullUserKey,this.boundEventHandler)}static async create(e,n,r="authUser"){if(!n.length)return new Mi(xn(jg),e,r);const i=(await Promise.all(n.map(async h=>{if(await h._isAvailable())return h}))).filter(h=>h);let s=i[0]||xn(jg);const o=nl(r,e.config.apiKey,e.name);let l=null;for(const h of n)try{const f=await h._get(o);if(f){const m=Pn._fromJSON(e,f);h!==s&&(l=m),s=h;break}}catch{}const u=i.filter(h=>h._shouldAllowMigration);return!s._shouldAllowMigration||!u.length?new Mi(s,e,r):(s=u[0],l&&await s._set(o,l.toJSON()),await Promise.all(n.map(async h=>{if(h!==s)try{await h._remove(o)}catch{}})),new Mi(s,e,r))}}/**
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
 */function Ug(t){const e=t.toLowerCase();if(e.includes("opera/")||e.includes("opr/")||e.includes("opios/"))return"Opera";if(Uw(e))return"IEMobile";if(e.includes("msie")||e.includes("trident/"))return"IE";if(e.includes("edge/"))return"Edge";if(Lw(e))return"Firefox";if(e.includes("silk/"))return"Silk";if(Bw(e))return"Blackberry";if(zw(e))return"Webos";if(Mw(e))return"Safari";if((e.includes("chrome/")||jw(e))&&!e.includes("edge/"))return"Chrome";if(Fw(e))return"Android";{const n=/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/,r=t.match(n);if((r==null?void 0:r.length)===2)return r[1]}return"Other"}function Lw(t=lt()){return/firefox\//i.test(t)}function Mw(t=lt()){const e=t.toLowerCase();return e.includes("safari/")&&!e.includes("chrome/")&&!e.includes("crios/")&&!e.includes("android")}function jw(t=lt()){return/crios\//i.test(t)}function Uw(t=lt()){return/iemobile/i.test(t)}function Fw(t=lt()){return/android/i.test(t)}function Bw(t=lt()){return/blackberry/i.test(t)}function zw(t=lt()){return/webos/i.test(t)}function yf(t=lt()){return/iphone|ipad|ipod/i.test(t)||/macintosh/i.test(t)&&/mobile/i.test(t)}function Xk(t=lt()){var e;return yf(t)&&!!(!((e=window.navigator)===null||e===void 0)&&e.standalone)}function Yk(){return pA()&&document.documentMode===10}function $w(t=lt()){return yf(t)||Fw(t)||zw(t)||Bw(t)||/windows phone/i.test(t)||Uw(t)}/**
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
 */function Ww(t,e=[]){let n;switch(t){case"Browser":n=Ug(lt());break;case"Worker":n=`${Ug(lt())}-${t}`;break;default:n=t}const r=e.length?e.join(","):"FirebaseCore-web";return`${n}/JsCore/${oi}/${r}`}/**
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
 */class Jk{constructor(e){this.auth=e,this.queue=[]}pushCallback(e,n){const r=s=>new Promise((o,l)=>{try{const u=e(s);o(u)}catch(u){l(u)}});r.onAbort=n,this.queue.push(r);const i=this.queue.length-1;return()=>{this.queue[i]=()=>Promise.resolve()}}async runMiddleware(e){if(this.auth.currentUser===e)return;const n=[];try{for(const r of this.queue)await r(e),r.onAbort&&n.push(r.onAbort)}catch(r){n.reverse();for(const i of n)try{i()}catch{}throw this.auth._errorFactory.create("login-blocked",{originalMessage:r==null?void 0:r.message})}}}/**
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
 */async function Zk(t,e={}){return ls(t,"GET","/v2/passwordPolicy",mf(t,e))}/**
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
 */const eC=6;class tC{constructor(e){var n,r,i,s;const o=e.customStrengthOptions;this.customStrengthOptions={},this.customStrengthOptions.minPasswordLength=(n=o.minPasswordLength)!==null&&n!==void 0?n:eC,o.maxPasswordLength&&(this.customStrengthOptions.maxPasswordLength=o.maxPasswordLength),o.containsLowercaseCharacter!==void 0&&(this.customStrengthOptions.containsLowercaseLetter=o.containsLowercaseCharacter),o.containsUppercaseCharacter!==void 0&&(this.customStrengthOptions.containsUppercaseLetter=o.containsUppercaseCharacter),o.containsNumericCharacter!==void 0&&(this.customStrengthOptions.containsNumericCharacter=o.containsNumericCharacter),o.containsNonAlphanumericCharacter!==void 0&&(this.customStrengthOptions.containsNonAlphanumericCharacter=o.containsNonAlphanumericCharacter),this.enforcementState=e.enforcementState,this.enforcementState==="ENFORCEMENT_STATE_UNSPECIFIED"&&(this.enforcementState="OFF"),this.allowedNonAlphanumericCharacters=(i=(r=e.allowedNonAlphanumericCharacters)===null||r===void 0?void 0:r.join(""))!==null&&i!==void 0?i:"",this.forceUpgradeOnSignin=(s=e.forceUpgradeOnSignin)!==null&&s!==void 0?s:!1,this.schemaVersion=e.schemaVersion}validatePassword(e){var n,r,i,s,o,l;const u={isValid:!0,passwordPolicy:this};return this.validatePasswordLengthOptions(e,u),this.validatePasswordCharacterOptions(e,u),u.isValid&&(u.isValid=(n=u.meetsMinPasswordLength)!==null&&n!==void 0?n:!0),u.isValid&&(u.isValid=(r=u.meetsMaxPasswordLength)!==null&&r!==void 0?r:!0),u.isValid&&(u.isValid=(i=u.containsLowercaseLetter)!==null&&i!==void 0?i:!0),u.isValid&&(u.isValid=(s=u.containsUppercaseLetter)!==null&&s!==void 0?s:!0),u.isValid&&(u.isValid=(o=u.containsNumericCharacter)!==null&&o!==void 0?o:!0),u.isValid&&(u.isValid=(l=u.containsNonAlphanumericCharacter)!==null&&l!==void 0?l:!0),u}validatePasswordLengthOptions(e,n){const r=this.customStrengthOptions.minPasswordLength,i=this.customStrengthOptions.maxPasswordLength;r&&(n.meetsMinPasswordLength=e.length>=r),i&&(n.meetsMaxPasswordLength=e.length<=i)}validatePasswordCharacterOptions(e,n){this.updatePasswordCharacterOptionsStatuses(n,!1,!1,!1,!1);let r;for(let i=0;i<e.length;i++)r=e.charAt(i),this.updatePasswordCharacterOptionsStatuses(n,r>="a"&&r<="z",r>="A"&&r<="Z",r>="0"&&r<="9",this.allowedNonAlphanumericCharacters.includes(r))}updatePasswordCharacterOptionsStatuses(e,n,r,i,s){this.customStrengthOptions.containsLowercaseLetter&&(e.containsLowercaseLetter||(e.containsLowercaseLetter=n)),this.customStrengthOptions.containsUppercaseLetter&&(e.containsUppercaseLetter||(e.containsUppercaseLetter=r)),this.customStrengthOptions.containsNumericCharacter&&(e.containsNumericCharacter||(e.containsNumericCharacter=i)),this.customStrengthOptions.containsNonAlphanumericCharacter&&(e.containsNonAlphanumericCharacter||(e.containsNonAlphanumericCharacter=s))}}/**
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
 */class nC{constructor(e,n,r,i){this.app=e,this.heartbeatServiceProvider=n,this.appCheckServiceProvider=r,this.config=i,this.currentUser=null,this.emulatorConfig=null,this.operations=Promise.resolve(),this.authStateSubscription=new Fg(this),this.idTokenSubscription=new Fg(this),this.beforeStateQueue=new Jk(this),this.redirectUser=null,this.isProactiveRefreshEnabled=!1,this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION=1,this._canInitEmulator=!0,this._isInitialized=!1,this._deleted=!1,this._initializationPromise=null,this._popupRedirectResolver=null,this._errorFactory=Pw,this._agentRecaptchaConfig=null,this._tenantRecaptchaConfigs={},this._projectPasswordPolicy=null,this._tenantPasswordPolicies={},this.lastNotifiedUid=void 0,this.languageCode=null,this.tenantId=null,this.settings={appVerificationDisabledForTesting:!1},this.frameworks=[],this.name=e.name,this.clientVersion=i.sdkClientVersion}_initializeWithPersistence(e,n){return n&&(this._popupRedirectResolver=xn(n)),this._initializationPromise=this.queue(async()=>{var r,i;if(!this._deleted&&(this.persistenceManager=await Mi.create(this,e),!this._deleted)){if(!((r=this._popupRedirectResolver)===null||r===void 0)&&r._shouldInitProactively)try{await this._popupRedirectResolver._initialize(this)}catch{}await this.initializeCurrentUser(n),this.lastNotifiedUid=((i=this.currentUser)===null||i===void 0?void 0:i.uid)||null,!this._deleted&&(this._isInitialized=!0)}}),this._initializationPromise}async _onStorageEvent(){if(this._deleted)return;const e=await this.assertedPersistence.getCurrentUser();if(!(!this.currentUser&&!e)){if(this.currentUser&&e&&this.currentUser.uid===e.uid){this._currentUser._assign(e),await this.currentUser.getIdToken();return}await this._updateCurrentUser(e,!0)}}async initializeCurrentUserFromIdToken(e){try{const n=await Ow(this,{idToken:e}),r=await Pn._fromGetAccountInfoResponse(this,n,e);await this.directlySetCurrentUser(r)}catch(n){console.warn("FirebaseServerApp could not login user with provided authIdToken: ",n),await this.directlySetCurrentUser(null)}}async initializeCurrentUser(e){var n;if(kn(this.app)){const o=this.app.settings.authIdToken;return o?new Promise(l=>{setTimeout(()=>this.initializeCurrentUserFromIdToken(o).then(l,l))}):this.directlySetCurrentUser(null)}const r=await this.assertedPersistence.getCurrentUser();let i=r,s=!1;if(e&&this.config.authDomain){await this.getOrInitRedirectPersistenceManager();const o=(n=this.redirectUser)===null||n===void 0?void 0:n._redirectEventId,l=i==null?void 0:i._redirectEventId,u=await this.tryRedirectSignIn(e);(!o||o===l)&&(u!=null&&u.user)&&(i=u.user,s=!0)}if(!i)return this.directlySetCurrentUser(null);if(!i._redirectEventId){if(s)try{await this.beforeStateQueue.runMiddleware(i)}catch(o){i=r,this._popupRedirectResolver._overrideRedirectResult(this,()=>Promise.reject(o))}return i?this.reloadAndSetCurrentUserOrClear(i):this.directlySetCurrentUser(null)}return Y(this._popupRedirectResolver,this,"argument-error"),await this.getOrInitRedirectPersistenceManager(),this.redirectUser&&this.redirectUser._redirectEventId===i._redirectEventId?this.directlySetCurrentUser(i):this.reloadAndSetCurrentUserOrClear(i)}async tryRedirectSignIn(e){let n=null;try{n=await this._popupRedirectResolver._completeRedirectFn(this,e,!0)}catch{await this._setRedirectUser(null)}return n}async reloadAndSetCurrentUserOrClear(e){try{await Fl(e)}catch(n){if((n==null?void 0:n.code)!=="auth/network-request-failed")return this.directlySetCurrentUser(null)}return this.directlySetCurrentUser(e)}useDeviceLanguage(){this.languageCode=Mk()}async _delete(){this._deleted=!0}async updateCurrentUser(e){if(kn(this.app))return Promise.reject(zr(this));const n=e?Fe(e):null;return n&&Y(n.auth.config.apiKey===this.config.apiKey,this,"invalid-user-token"),this._updateCurrentUser(n&&n._clone(this))}async _updateCurrentUser(e,n=!1){if(!this._deleted)return e&&Y(this.tenantId===e.tenantId,this,"tenant-id-mismatch"),n||await this.beforeStateQueue.runMiddleware(e),this.queue(async()=>{await this.directlySetCurrentUser(e),this.notifyAuthListeners()})}async signOut(){return kn(this.app)?Promise.reject(zr(this)):(await this.beforeStateQueue.runMiddleware(null),(this.redirectPersistenceManager||this._popupRedirectResolver)&&await this._setRedirectUser(null),this._updateCurrentUser(null,!0))}setPersistence(e){return kn(this.app)?Promise.reject(zr(this)):this.queue(async()=>{await this.assertedPersistence.setPersistence(xn(e))})}_getRecaptchaConfig(){return this.tenantId==null?this._agentRecaptchaConfig:this._tenantRecaptchaConfigs[this.tenantId]}async validatePassword(e){this._getPasswordPolicyInternal()||await this._updatePasswordPolicy();const n=this._getPasswordPolicyInternal();return n.schemaVersion!==this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION?Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version",{})):n.validatePassword(e)}_getPasswordPolicyInternal(){return this.tenantId===null?this._projectPasswordPolicy:this._tenantPasswordPolicies[this.tenantId]}async _updatePasswordPolicy(){const e=await Zk(this),n=new tC(e);this.tenantId===null?this._projectPasswordPolicy=n:this._tenantPasswordPolicies[this.tenantId]=n}_getPersistence(){return this.assertedPersistence.persistence.type}_updateErrorMap(e){this._errorFactory=new zo("auth","Firebase",e())}onAuthStateChanged(e,n,r){return this.registerStateListener(this.authStateSubscription,e,n,r)}beforeAuthStateChanged(e,n){return this.beforeStateQueue.pushCallback(e,n)}onIdTokenChanged(e,n,r){return this.registerStateListener(this.idTokenSubscription,e,n,r)}authStateReady(){return new Promise((e,n)=>{if(this.currentUser)e();else{const r=this.onAuthStateChanged(()=>{r(),e()},n)}})}async revokeAccessToken(e){if(this.currentUser){const n=await this.currentUser.getIdToken(),r={providerId:"apple.com",tokenType:"ACCESS_TOKEN",token:e,idToken:n};this.tenantId!=null&&(r.tenantId=this.tenantId),await Qk(this,r)}}toJSON(){var e;return{apiKey:this.config.apiKey,authDomain:this.config.authDomain,appName:this.name,currentUser:(e=this._currentUser)===null||e===void 0?void 0:e.toJSON()}}async _setRedirectUser(e,n){const r=await this.getOrInitRedirectPersistenceManager(n);return e===null?r.removeCurrentUser():r.setCurrentUser(e)}async getOrInitRedirectPersistenceManager(e){if(!this.redirectPersistenceManager){const n=e&&xn(e)||this._popupRedirectResolver;Y(n,this,"argument-error"),this.redirectPersistenceManager=await Mi.create(this,[xn(n._redirectPersistence)],"redirectUser"),this.redirectUser=await this.redirectPersistenceManager.getCurrentUser()}return this.redirectPersistenceManager}async _redirectUserForId(e){var n,r;return this._isInitialized&&await this.queue(async()=>{}),((n=this._currentUser)===null||n===void 0?void 0:n._redirectEventId)===e?this._currentUser:((r=this.redirectUser)===null||r===void 0?void 0:r._redirectEventId)===e?this.redirectUser:null}async _persistUserIfCurrent(e){if(e===this.currentUser)return this.queue(async()=>this.directlySetCurrentUser(e))}_notifyListenersIfCurrent(e){e===this.currentUser&&this.notifyAuthListeners()}_key(){return`${this.config.authDomain}:${this.config.apiKey}:${this.name}`}_startProactiveRefresh(){this.isProactiveRefreshEnabled=!0,this.currentUser&&this._currentUser._startProactiveRefresh()}_stopProactiveRefresh(){this.isProactiveRefreshEnabled=!1,this.currentUser&&this._currentUser._stopProactiveRefresh()}get _currentUser(){return this.currentUser}notifyAuthListeners(){var e,n;if(!this._isInitialized)return;this.idTokenSubscription.next(this.currentUser);const r=(n=(e=this.currentUser)===null||e===void 0?void 0:e.uid)!==null&&n!==void 0?n:null;this.lastNotifiedUid!==r&&(this.lastNotifiedUid=r,this.authStateSubscription.next(this.currentUser))}registerStateListener(e,n,r,i){if(this._deleted)return()=>{};const s=typeof n=="function"?n:n.next.bind(n);let o=!1;const l=this._isInitialized?Promise.resolve():this._initializationPromise;if(Y(l,this,"internal-error"),l.then(()=>{o||s(this.currentUser)}),typeof n=="function"){const u=e.addObserver(n,r,i);return()=>{o=!0,u()}}else{const u=e.addObserver(n);return()=>{o=!0,u()}}}async directlySetCurrentUser(e){this.currentUser&&this.currentUser!==e&&this._currentUser._stopProactiveRefresh(),e&&this.isProactiveRefreshEnabled&&e._startProactiveRefresh(),this.currentUser=e,e?await this.assertedPersistence.setCurrentUser(e):await this.assertedPersistence.removeCurrentUser()}queue(e){return this.operations=this.operations.then(e,e),this.operations}get assertedPersistence(){return Y(this.persistenceManager,this,"internal-error"),this.persistenceManager}_logFramework(e){!e||this.frameworks.includes(e)||(this.frameworks.push(e),this.frameworks.sort(),this.clientVersion=Ww(this.config.clientPlatform,this._getFrameworks()))}_getFrameworks(){return this.frameworks}async _getAdditionalHeaders(){var e;const n={"X-Client-Version":this.clientVersion};this.app.options.appId&&(n["X-Firebase-gmpid"]=this.app.options.appId);const r=await((e=this.heartbeatServiceProvider.getImmediate({optional:!0}))===null||e===void 0?void 0:e.getHeartbeatsHeader());r&&(n["X-Firebase-Client"]=r);const i=await this._getAppCheckToken();return i&&(n["X-Firebase-AppCheck"]=i),n}async _getAppCheckToken(){var e;const n=await((e=this.appCheckServiceProvider.getImmediate({optional:!0}))===null||e===void 0?void 0:e.getToken());return n!=null&&n.error&&Ok(`Error while retrieving App Check token: ${n.error}`),n==null?void 0:n.token}}function vu(t){return Fe(t)}class Fg{constructor(e){this.auth=e,this.observer=null,this.addObserver=TA(n=>this.observer=n)}get next(){return Y(this.observer,this.auth,"internal-error"),this.observer.next.bind(this.observer)}}/**
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
 */let _f={async loadJS(){throw new Error("Unable to load external scripts")},recaptchaV2Script:"",recaptchaEnterpriseScript:"",gapiScript:""};function rC(t){_f=t}function iC(t){return _f.loadJS(t)}function sC(){return _f.gapiScript}function oC(t){return`__${t}${Math.floor(Math.random()*1e6)}`}/**
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
 */function aC(t,e){const n=_u(t,"auth");if(n.isInitialized()){const i=n.getImmediate(),s=n.getOptions();if(Ml(s,e??{}))return i;dn(i,"already-initialized")}return n.initialize({options:e})}function lC(t,e){const n=(e==null?void 0:e.persistence)||[],r=(Array.isArray(n)?n:[n]).map(xn);e!=null&&e.errorMap&&t._updateErrorMap(e.errorMap),t._initializeWithPersistence(r,e==null?void 0:e.popupRedirectResolver)}function uC(t,e,n){const r=vu(t);Y(r._canInitEmulator,r,"emulator-config-failed"),Y(/^https?:\/\//.test(e),r,"invalid-emulator-scheme");const i=!1,s=qw(e),{host:o,port:l}=cC(e),u=l===null?"":`:${l}`;r.config.emulator={url:`${s}//${o}${u}/`},r.settings.appVerificationDisabledForTesting=!0,r.emulatorConfig=Object.freeze({host:o,port:l,protocol:s.replace(":",""),options:Object.freeze({disableWarnings:i})}),hC()}function qw(t){const e=t.indexOf(":");return e<0?"":t.substr(0,e+1)}function cC(t){const e=qw(t),n=/(\/\/)?([^?#/]+)/.exec(t.substr(e.length));if(!n)return{host:"",port:null};const r=n[2].split("@").pop()||"",i=/^(\[[^\]]+\])(:|$)/.exec(r);if(i){const s=i[1];return{host:s,port:Bg(r.substr(s.length+1))}}else{const[s,o]=r.split(":");return{host:s,port:Bg(o)}}}function Bg(t){if(!t)return null;const e=Number(t);return isNaN(e)?null:e}function hC(){function t(){const e=document.createElement("p"),n=e.style;e.innerText="Running in emulator mode. Do not use with production credentials.",n.position="fixed",n.width="100%",n.backgroundColor="#ffffff",n.border=".1em solid #000000",n.color="#b50000",n.bottom="0px",n.left="0px",n.margin="0px",n.zIndex="10000",n.textAlign="center",e.classList.add("firebase-emulator-warning"),document.body.appendChild(e)}typeof console<"u"&&typeof console.info=="function"&&console.info("WARNING: You are using the Auth Emulator, which is intended for local testing only.  Do not use with production credentials."),typeof window<"u"&&typeof document<"u"&&(document.readyState==="loading"?window.addEventListener("DOMContentLoaded",t):t())}/**
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
 */class Hw{constructor(e,n){this.providerId=e,this.signInMethod=n}toJSON(){return Cn("not implemented")}_getIdTokenResponse(e){return Cn("not implemented")}_linkToIdToken(e,n){return Cn("not implemented")}_getReauthenticationResolver(e){return Cn("not implemented")}}/**
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
 */async function ji(t,e){return Fk(t,"POST","/v1/accounts:signInWithIdp",mf(t,e))}/**
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
 */const dC="http://localhost";class Zr extends Hw{constructor(){super(...arguments),this.pendingToken=null}static _fromParams(e){const n=new Zr(e.providerId,e.signInMethod);return e.idToken||e.accessToken?(e.idToken&&(n.idToken=e.idToken),e.accessToken&&(n.accessToken=e.accessToken),e.nonce&&!e.pendingToken&&(n.nonce=e.nonce),e.pendingToken&&(n.pendingToken=e.pendingToken)):e.oauthToken&&e.oauthTokenSecret?(n.accessToken=e.oauthToken,n.secret=e.oauthTokenSecret):dn("argument-error"),n}toJSON(){return{idToken:this.idToken,accessToken:this.accessToken,secret:this.secret,nonce:this.nonce,pendingToken:this.pendingToken,providerId:this.providerId,signInMethod:this.signInMethod}}static fromJSON(e){const n=typeof e=="string"?JSON.parse(e):e,{providerId:r,signInMethod:i}=n,s=hf(n,["providerId","signInMethod"]);if(!r||!i)return null;const o=new Zr(r,i);return o.idToken=s.idToken||void 0,o.accessToken=s.accessToken||void 0,o.secret=s.secret,o.nonce=s.nonce,o.pendingToken=s.pendingToken||null,o}_getIdTokenResponse(e){const n=this.buildRequest();return ji(e,n)}_linkToIdToken(e,n){const r=this.buildRequest();return r.idToken=n,ji(e,r)}_getReauthenticationResolver(e){const n=this.buildRequest();return n.autoCreate=!1,ji(e,n)}buildRequest(){const e={requestUri:dC,returnSecureToken:!0};if(this.pendingToken)e.pendingToken=this.pendingToken;else{const n={};this.idToken&&(n.id_token=this.idToken),this.accessToken&&(n.access_token=this.accessToken),this.secret&&(n.oauth_token_secret=this.secret),n.providerId=this.providerId,this.nonce&&!this.pendingToken&&(n.nonce=this.nonce),e.postBody=$o(n)}return e}}/**
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
 */class vf{constructor(e){this.providerId=e,this.defaultLanguageCode=null,this.customParameters={}}setDefaultLanguage(e){this.defaultLanguageCode=e}setCustomParameters(e){return this.customParameters=e,this}getCustomParameters(){return this.customParameters}}/**
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
 */class qo extends vf{constructor(){super(...arguments),this.scopes=[]}addScope(e){return this.scopes.includes(e)||this.scopes.push(e),this}getScopes(){return[...this.scopes]}}/**
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
 */class Jn extends qo{constructor(){super("facebook.com")}static credential(e){return Zr._fromParams({providerId:Jn.PROVIDER_ID,signInMethod:Jn.FACEBOOK_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return Jn.credentialFromTaggedObject(e)}static credentialFromError(e){return Jn.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return Jn.credential(e.oauthAccessToken)}catch{return null}}}Jn.FACEBOOK_SIGN_IN_METHOD="facebook.com";Jn.PROVIDER_ID="facebook.com";/**
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
 */class Sn extends qo{constructor(){super("google.com"),this.addScope("profile")}static credential(e,n){return Zr._fromParams({providerId:Sn.PROVIDER_ID,signInMethod:Sn.GOOGLE_SIGN_IN_METHOD,idToken:e,accessToken:n})}static credentialFromResult(e){return Sn.credentialFromTaggedObject(e)}static credentialFromError(e){return Sn.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthIdToken:n,oauthAccessToken:r}=e;if(!n&&!r)return null;try{return Sn.credential(n,r)}catch{return null}}}Sn.GOOGLE_SIGN_IN_METHOD="google.com";Sn.PROVIDER_ID="google.com";/**
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
 */class Zn extends qo{constructor(){super("github.com")}static credential(e){return Zr._fromParams({providerId:Zn.PROVIDER_ID,signInMethod:Zn.GITHUB_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return Zn.credentialFromTaggedObject(e)}static credentialFromError(e){return Zn.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return Zn.credential(e.oauthAccessToken)}catch{return null}}}Zn.GITHUB_SIGN_IN_METHOD="github.com";Zn.PROVIDER_ID="github.com";/**
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
 */class er extends qo{constructor(){super("twitter.com")}static credential(e,n){return Zr._fromParams({providerId:er.PROVIDER_ID,signInMethod:er.TWITTER_SIGN_IN_METHOD,oauthToken:e,oauthTokenSecret:n})}static credentialFromResult(e){return er.credentialFromTaggedObject(e)}static credentialFromError(e){return er.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthAccessToken:n,oauthTokenSecret:r}=e;if(!n||!r)return null;try{return er.credential(n,r)}catch{return null}}}er.TWITTER_SIGN_IN_METHOD="twitter.com";er.PROVIDER_ID="twitter.com";/**
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
 */class Gi{constructor(e){this.user=e.user,this.providerId=e.providerId,this._tokenResponse=e._tokenResponse,this.operationType=e.operationType}static async _fromIdTokenResponse(e,n,r,i=!1){const s=await Pn._fromIdTokenResponse(e,r,i),o=zg(r);return new Gi({user:s,providerId:o,_tokenResponse:r,operationType:n})}static async _forOperation(e,n,r){await e._updateTokensIfNecessary(r,!0);const i=zg(r);return new Gi({user:e,providerId:i,_tokenResponse:r,operationType:n})}}function zg(t){return t.providerId?t.providerId:"phoneNumber"in t?"phone":null}/**
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
 */class Bl extends gn{constructor(e,n,r,i){var s;super(n.code,n.message),this.operationType=r,this.user=i,Object.setPrototypeOf(this,Bl.prototype),this.customData={appName:e.name,tenantId:(s=e.tenantId)!==null&&s!==void 0?s:void 0,_serverResponse:n.customData._serverResponse,operationType:r}}static _fromErrorAndOperation(e,n,r,i){return new Bl(e,n,r,i)}}function Kw(t,e,n,r){return(e==="reauthenticate"?n._getReauthenticationResolver(t):n._getIdTokenResponse(t)).catch(s=>{throw s.code==="auth/multi-factor-auth-required"?Bl._fromErrorAndOperation(t,s,e,r):s})}async function fC(t,e,n=!1){const r=await Co(t,e._linkToIdToken(t.auth,await t.getIdToken()),n);return Gi._forOperation(t,"link",r)}/**
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
 */async function pC(t,e,n=!1){const{auth:r}=t;if(kn(r.app))return Promise.reject(zr(r));const i="reauthenticate";try{const s=await Co(t,Kw(r,i,e,t),n);Y(s.idToken,r,"internal-error");const o=gf(s.idToken);Y(o,r,"internal-error");const{sub:l}=o;return Y(t.uid===l,r,"user-mismatch"),Gi._forOperation(t,i,s)}catch(s){throw(s==null?void 0:s.code)==="auth/user-not-found"&&dn(r,"user-mismatch"),s}}/**
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
 */async function mC(t,e,n=!1){if(kn(t.app))return Promise.reject(zr(t));const r="signIn",i=await Kw(t,r,e),s=await Gi._fromIdTokenResponse(t,r,i);return n||await t._updateCurrentUser(s.user),s}function gC(t,e,n,r){return Fe(t).onIdTokenChanged(e,n,r)}function yC(t,e,n){return Fe(t).beforeAuthStateChanged(e,n)}function _C(t,e,n,r){return Fe(t).onAuthStateChanged(e,n,r)}function vC(t){return Fe(t).signOut()}const zl="__sak";/**
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
 */class Gw{constructor(e,n){this.storageRetriever=e,this.type=n}_isAvailable(){try{return this.storage?(this.storage.setItem(zl,"1"),this.storage.removeItem(zl),Promise.resolve(!0)):Promise.resolve(!1)}catch{return Promise.resolve(!1)}}_set(e,n){return this.storage.setItem(e,JSON.stringify(n)),Promise.resolve()}_get(e){const n=this.storage.getItem(e);return Promise.resolve(n?JSON.parse(n):null)}_remove(e){return this.storage.removeItem(e),Promise.resolve()}get storage(){return this.storageRetriever()}}/**
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
 */const wC=1e3,EC=10;class Qw extends Gw{constructor(){super(()=>window.localStorage,"LOCAL"),this.boundEventHandler=(e,n)=>this.onStorageEvent(e,n),this.listeners={},this.localCache={},this.pollTimer=null,this.fallbackToPolling=$w(),this._shouldAllowMigration=!0}forAllChangedKeys(e){for(const n of Object.keys(this.listeners)){const r=this.storage.getItem(n),i=this.localCache[n];r!==i&&e(n,i,r)}}onStorageEvent(e,n=!1){if(!e.key){this.forAllChangedKeys((o,l,u)=>{this.notifyListeners(o,u)});return}const r=e.key;n?this.detachListener():this.stopPolling();const i=()=>{const o=this.storage.getItem(r);!n&&this.localCache[r]===o||this.notifyListeners(r,o)},s=this.storage.getItem(r);Yk()&&s!==e.newValue&&e.newValue!==e.oldValue?setTimeout(i,EC):i()}notifyListeners(e,n){this.localCache[e]=n;const r=this.listeners[e];if(r)for(const i of Array.from(r))i(n&&JSON.parse(n))}startPolling(){this.stopPolling(),this.pollTimer=setInterval(()=>{this.forAllChangedKeys((e,n,r)=>{this.onStorageEvent(new StorageEvent("storage",{key:e,oldValue:n,newValue:r}),!0)})},wC)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}attachListener(){window.addEventListener("storage",this.boundEventHandler)}detachListener(){window.removeEventListener("storage",this.boundEventHandler)}_addListener(e,n){Object.keys(this.listeners).length===0&&(this.fallbackToPolling?this.startPolling():this.attachListener()),this.listeners[e]||(this.listeners[e]=new Set,this.localCache[e]=this.storage.getItem(e)),this.listeners[e].add(n)}_removeListener(e,n){this.listeners[e]&&(this.listeners[e].delete(n),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&(this.detachListener(),this.stopPolling())}async _set(e,n){await super._set(e,n),this.localCache[e]=JSON.stringify(n)}async _get(e){const n=await super._get(e);return this.localCache[e]=JSON.stringify(n),n}async _remove(e){await super._remove(e),delete this.localCache[e]}}Qw.type="LOCAL";const TC=Qw;/**
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
 */class Xw extends Gw{constructor(){super(()=>window.sessionStorage,"SESSION")}_addListener(e,n){}_removeListener(e,n){}}Xw.type="SESSION";const Yw=Xw;/**
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
 */function IC(t){return Promise.all(t.map(async e=>{try{return{fulfilled:!0,value:await e}}catch(n){return{fulfilled:!1,reason:n}}}))}/**
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
 */class wu{constructor(e){this.eventTarget=e,this.handlersMap={},this.boundEventHandler=this.handleEvent.bind(this)}static _getInstance(e){const n=this.receivers.find(i=>i.isListeningto(e));if(n)return n;const r=new wu(e);return this.receivers.push(r),r}isListeningto(e){return this.eventTarget===e}async handleEvent(e){const n=e,{eventId:r,eventType:i,data:s}=n.data,o=this.handlersMap[i];if(!(o!=null&&o.size))return;n.ports[0].postMessage({status:"ack",eventId:r,eventType:i});const l=Array.from(o).map(async h=>h(n.origin,s)),u=await IC(l);n.ports[0].postMessage({status:"done",eventId:r,eventType:i,response:u})}_subscribe(e,n){Object.keys(this.handlersMap).length===0&&this.eventTarget.addEventListener("message",this.boundEventHandler),this.handlersMap[e]||(this.handlersMap[e]=new Set),this.handlersMap[e].add(n)}_unsubscribe(e,n){this.handlersMap[e]&&n&&this.handlersMap[e].delete(n),(!n||this.handlersMap[e].size===0)&&delete this.handlersMap[e],Object.keys(this.handlersMap).length===0&&this.eventTarget.removeEventListener("message",this.boundEventHandler)}}wu.receivers=[];/**
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
 */function wf(t="",e=10){let n="";for(let r=0;r<e;r++)n+=Math.floor(Math.random()*10);return t+n}/**
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
 */class SC{constructor(e){this.target=e,this.handlers=new Set}removeMessageHandler(e){e.messageChannel&&(e.messageChannel.port1.removeEventListener("message",e.onMessage),e.messageChannel.port1.close()),this.handlers.delete(e)}async _send(e,n,r=50){const i=typeof MessageChannel<"u"?new MessageChannel:null;if(!i)throw new Error("connection_unavailable");let s,o;return new Promise((l,u)=>{const h=wf("",20);i.port1.start();const f=setTimeout(()=>{u(new Error("unsupported_event"))},r);o={messageChannel:i,onMessage(m){const _=m;if(_.data.eventId===h)switch(_.data.status){case"ack":clearTimeout(f),s=setTimeout(()=>{u(new Error("timeout"))},3e3);break;case"done":clearTimeout(s),l(_.data.response);break;default:clearTimeout(f),clearTimeout(s),u(new Error("invalid_response"));break}}},this.handlers.add(o),i.port1.addEventListener("message",o.onMessage),this.target.postMessage({eventType:e,eventId:h,data:n},[i.port2])}).finally(()=>{o&&this.removeMessageHandler(o)})}}/**
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
 */function ln(){return window}function RC(t){ln().location.href=t}/**
 * @license
 * Copyright 2020 Google LLC.
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
 */function Jw(){return typeof ln().WorkerGlobalScope<"u"&&typeof ln().importScripts=="function"}async function AC(){if(!(navigator!=null&&navigator.serviceWorker))return null;try{return(await navigator.serviceWorker.ready).active}catch{return null}}function kC(){var t;return((t=navigator==null?void 0:navigator.serviceWorker)===null||t===void 0?void 0:t.controller)||null}function CC(){return Jw()?self:null}/**
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
 */const Zw="firebaseLocalStorageDb",PC=1,$l="firebaseLocalStorage",eE="fbase_key";class Ho{constructor(e){this.request=e}toPromise(){return new Promise((e,n)=>{this.request.addEventListener("success",()=>{e(this.request.result)}),this.request.addEventListener("error",()=>{n(this.request.error)})})}}function Eu(t,e){return t.transaction([$l],e?"readwrite":"readonly").objectStore($l)}function xC(){const t=indexedDB.deleteDatabase(Zw);return new Ho(t).toPromise()}function Hh(){const t=indexedDB.open(Zw,PC);return new Promise((e,n)=>{t.addEventListener("error",()=>{n(t.error)}),t.addEventListener("upgradeneeded",()=>{const r=t.result;try{r.createObjectStore($l,{keyPath:eE})}catch(i){n(i)}}),t.addEventListener("success",async()=>{const r=t.result;r.objectStoreNames.contains($l)?e(r):(r.close(),await xC(),e(await Hh()))})})}async function $g(t,e,n){const r=Eu(t,!0).put({[eE]:e,value:n});return new Ho(r).toPromise()}async function NC(t,e){const n=Eu(t,!1).get(e),r=await new Ho(n).toPromise();return r===void 0?null:r.value}function Wg(t,e){const n=Eu(t,!0).delete(e);return new Ho(n).toPromise()}const DC=800,OC=3;class tE{constructor(){this.type="LOCAL",this._shouldAllowMigration=!0,this.listeners={},this.localCache={},this.pollTimer=null,this.pendingWrites=0,this.receiver=null,this.sender=null,this.serviceWorkerReceiverAvailable=!1,this.activeServiceWorker=null,this._workerInitializationPromise=this.initializeServiceWorkerMessaging().then(()=>{},()=>{})}async _openDb(){return this.db?this.db:(this.db=await Hh(),this.db)}async _withRetries(e){let n=0;for(;;)try{const r=await this._openDb();return await e(r)}catch(r){if(n++>OC)throw r;this.db&&(this.db.close(),this.db=void 0)}}async initializeServiceWorkerMessaging(){return Jw()?this.initializeReceiver():this.initializeSender()}async initializeReceiver(){this.receiver=wu._getInstance(CC()),this.receiver._subscribe("keyChanged",async(e,n)=>({keyProcessed:(await this._poll()).includes(n.key)})),this.receiver._subscribe("ping",async(e,n)=>["keyChanged"])}async initializeSender(){var e,n;if(this.activeServiceWorker=await AC(),!this.activeServiceWorker)return;this.sender=new SC(this.activeServiceWorker);const r=await this.sender._send("ping",{},800);r&&!((e=r[0])===null||e===void 0)&&e.fulfilled&&!((n=r[0])===null||n===void 0)&&n.value.includes("keyChanged")&&(this.serviceWorkerReceiverAvailable=!0)}async notifyServiceWorker(e){if(!(!this.sender||!this.activeServiceWorker||kC()!==this.activeServiceWorker))try{await this.sender._send("keyChanged",{key:e},this.serviceWorkerReceiverAvailable?800:50)}catch{}}async _isAvailable(){try{if(!indexedDB)return!1;const e=await Hh();return await $g(e,zl,"1"),await Wg(e,zl),!0}catch{}return!1}async _withPendingWrite(e){this.pendingWrites++;try{await e()}finally{this.pendingWrites--}}async _set(e,n){return this._withPendingWrite(async()=>(await this._withRetries(r=>$g(r,e,n)),this.localCache[e]=n,this.notifyServiceWorker(e)))}async _get(e){const n=await this._withRetries(r=>NC(r,e));return this.localCache[e]=n,n}async _remove(e){return this._withPendingWrite(async()=>(await this._withRetries(n=>Wg(n,e)),delete this.localCache[e],this.notifyServiceWorker(e)))}async _poll(){const e=await this._withRetries(i=>{const s=Eu(i,!1).getAll();return new Ho(s).toPromise()});if(!e)return[];if(this.pendingWrites!==0)return[];const n=[],r=new Set;if(e.length!==0)for(const{fbase_key:i,value:s}of e)r.add(i),JSON.stringify(this.localCache[i])!==JSON.stringify(s)&&(this.notifyListeners(i,s),n.push(i));for(const i of Object.keys(this.localCache))this.localCache[i]&&!r.has(i)&&(this.notifyListeners(i,null),n.push(i));return n}notifyListeners(e,n){this.localCache[e]=n;const r=this.listeners[e];if(r)for(const i of Array.from(r))i(n)}startPolling(){this.stopPolling(),this.pollTimer=setInterval(async()=>this._poll(),DC)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}_addListener(e,n){Object.keys(this.listeners).length===0&&this.startPolling(),this.listeners[e]||(this.listeners[e]=new Set,this._get(e)),this.listeners[e].add(n)}_removeListener(e,n){this.listeners[e]&&(this.listeners[e].delete(n),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&this.stopPolling()}}tE.type="LOCAL";const bC=tE;new Wo(3e4,6e4);/**
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
 */function nE(t,e){return e?xn(e):(Y(t._popupRedirectResolver,t,"argument-error"),t._popupRedirectResolver)}/**
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
 */class Ef extends Hw{constructor(e){super("custom","custom"),this.params=e}_getIdTokenResponse(e){return ji(e,this._buildIdpRequest())}_linkToIdToken(e,n){return ji(e,this._buildIdpRequest(n))}_getReauthenticationResolver(e){return ji(e,this._buildIdpRequest())}_buildIdpRequest(e){const n={requestUri:this.params.requestUri,sessionId:this.params.sessionId,postBody:this.params.postBody,tenantId:this.params.tenantId,pendingToken:this.params.pendingToken,returnSecureToken:!0,returnIdpCredential:!0};return e&&(n.idToken=e),n}}function VC(t){return mC(t.auth,new Ef(t),t.bypassAuthState)}function LC(t){const{auth:e,user:n}=t;return Y(n,e,"internal-error"),pC(n,new Ef(t),t.bypassAuthState)}async function MC(t){const{auth:e,user:n}=t;return Y(n,e,"internal-error"),fC(n,new Ef(t),t.bypassAuthState)}/**
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
 */class rE{constructor(e,n,r,i,s=!1){this.auth=e,this.resolver=r,this.user=i,this.bypassAuthState=s,this.pendingPromise=null,this.eventManager=null,this.filter=Array.isArray(n)?n:[n]}execute(){return new Promise(async(e,n)=>{this.pendingPromise={resolve:e,reject:n};try{this.eventManager=await this.resolver._initialize(this.auth),await this.onExecution(),this.eventManager.registerConsumer(this)}catch(r){this.reject(r)}})}async onAuthEvent(e){const{urlResponse:n,sessionId:r,postBody:i,tenantId:s,error:o,type:l}=e;if(o){this.reject(o);return}const u={auth:this.auth,requestUri:n,sessionId:r,tenantId:s||void 0,postBody:i||void 0,user:this.user,bypassAuthState:this.bypassAuthState};try{this.resolve(await this.getIdpTask(l)(u))}catch(h){this.reject(h)}}onError(e){this.reject(e)}getIdpTask(e){switch(e){case"signInViaPopup":case"signInViaRedirect":return VC;case"linkViaPopup":case"linkViaRedirect":return MC;case"reauthViaPopup":case"reauthViaRedirect":return LC;default:dn(this.auth,"internal-error")}}resolve(e){Mn(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.resolve(e),this.unregisterAndCleanUp()}reject(e){Mn(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.reject(e),this.unregisterAndCleanUp()}unregisterAndCleanUp(){this.eventManager&&this.eventManager.unregisterConsumer(this),this.pendingPromise=null,this.cleanUp()}}/**
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
 */const jC=new Wo(2e3,1e4);async function UC(t,e,n){if(kn(t.app))return Promise.reject(Ht(t,"operation-not-supported-in-this-environment"));const r=vu(t);bk(t,e,vf);const i=nE(r,n);return new jr(r,"signInViaPopup",e,i).executeNotNull()}class jr extends rE{constructor(e,n,r,i,s){super(e,n,i,s),this.provider=r,this.authWindow=null,this.pollId=null,jr.currentPopupAction&&jr.currentPopupAction.cancel(),jr.currentPopupAction=this}async executeNotNull(){const e=await this.execute();return Y(e,this.auth,"internal-error"),e}async onExecution(){Mn(this.filter.length===1,"Popup operations only handle one event");const e=wf();this.authWindow=await this.resolver._openPopup(this.auth,this.provider,this.filter[0],e),this.authWindow.associatedEvent=e,this.resolver._originValidation(this.auth).catch(n=>{this.reject(n)}),this.resolver._isIframeWebStorageSupported(this.auth,n=>{n||this.reject(Ht(this.auth,"web-storage-unsupported"))}),this.pollUserCancellation()}get eventId(){var e;return((e=this.authWindow)===null||e===void 0?void 0:e.associatedEvent)||null}cancel(){this.reject(Ht(this.auth,"cancelled-popup-request"))}cleanUp(){this.authWindow&&this.authWindow.close(),this.pollId&&window.clearTimeout(this.pollId),this.authWindow=null,this.pollId=null,jr.currentPopupAction=null}pollUserCancellation(){const e=()=>{var n,r;if(!((r=(n=this.authWindow)===null||n===void 0?void 0:n.window)===null||r===void 0)&&r.closed){this.pollId=window.setTimeout(()=>{this.pollId=null,this.reject(Ht(this.auth,"popup-closed-by-user"))},8e3);return}this.pollId=window.setTimeout(e,jC.get())};e()}}jr.currentPopupAction=null;/**
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
 */const FC="pendingRedirect",rl=new Map;class BC extends rE{constructor(e,n,r=!1){super(e,["signInViaRedirect","linkViaRedirect","reauthViaRedirect","unknown"],n,void 0,r),this.eventId=null}async execute(){let e=rl.get(this.auth._key());if(!e){try{const r=await zC(this.resolver,this.auth)?await super.execute():null;e=()=>Promise.resolve(r)}catch(n){e=()=>Promise.reject(n)}rl.set(this.auth._key(),e)}return this.bypassAuthState||rl.set(this.auth._key(),()=>Promise.resolve(null)),e()}async onAuthEvent(e){if(e.type==="signInViaRedirect")return super.onAuthEvent(e);if(e.type==="unknown"){this.resolve(null);return}if(e.eventId){const n=await this.auth._redirectUserForId(e.eventId);if(n)return this.user=n,super.onAuthEvent(e);this.resolve(null)}}async onExecution(){}cleanUp(){}}async function zC(t,e){const n=qC(e),r=WC(t);if(!await r._isAvailable())return!1;const i=await r._get(n)==="true";return await r._remove(n),i}function $C(t,e){rl.set(t._key(),e)}function WC(t){return xn(t._redirectPersistence)}function qC(t){return nl(FC,t.config.apiKey,t.name)}async function HC(t,e,n=!1){if(kn(t.app))return Promise.reject(zr(t));const r=vu(t),i=nE(r,e),o=await new BC(r,i,n).execute();return o&&!n&&(delete o.user._redirectEventId,await r._persistUserIfCurrent(o.user),await r._setRedirectUser(null,e)),o}/**
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
 */const KC=10*60*1e3;class GC{constructor(e){this.auth=e,this.cachedEventUids=new Set,this.consumers=new Set,this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1,this.lastProcessedEventTime=Date.now()}registerConsumer(e){this.consumers.add(e),this.queuedRedirectEvent&&this.isEventForConsumer(this.queuedRedirectEvent,e)&&(this.sendToConsumer(this.queuedRedirectEvent,e),this.saveEventToCache(this.queuedRedirectEvent),this.queuedRedirectEvent=null)}unregisterConsumer(e){this.consumers.delete(e)}onEvent(e){if(this.hasEventBeenHandled(e))return!1;let n=!1;return this.consumers.forEach(r=>{this.isEventForConsumer(e,r)&&(n=!0,this.sendToConsumer(e,r),this.saveEventToCache(e))}),this.hasHandledPotentialRedirect||!QC(e)||(this.hasHandledPotentialRedirect=!0,n||(this.queuedRedirectEvent=e,n=!0)),n}sendToConsumer(e,n){var r;if(e.error&&!iE(e)){const i=((r=e.error.code)===null||r===void 0?void 0:r.split("auth/")[1])||"internal-error";n.onError(Ht(this.auth,i))}else n.onAuthEvent(e)}isEventForConsumer(e,n){const r=n.eventId===null||!!e.eventId&&e.eventId===n.eventId;return n.filter.includes(e.type)&&r}hasEventBeenHandled(e){return Date.now()-this.lastProcessedEventTime>=KC&&this.cachedEventUids.clear(),this.cachedEventUids.has(qg(e))}saveEventToCache(e){this.cachedEventUids.add(qg(e)),this.lastProcessedEventTime=Date.now()}}function qg(t){return[t.type,t.eventId,t.sessionId,t.tenantId].filter(e=>e).join("-")}function iE({type:t,error:e}){return t==="unknown"&&(e==null?void 0:e.code)==="auth/no-auth-event"}function QC(t){switch(t.type){case"signInViaRedirect":case"linkViaRedirect":case"reauthViaRedirect":return!0;case"unknown":return iE(t);default:return!1}}/**
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
 */async function XC(t,e={}){return ls(t,"GET","/v1/projects",e)}/**
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
 */const YC=/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,JC=/^https?/;async function ZC(t){if(t.config.emulator)return;const{authorizedDomains:e}=await XC(t);for(const n of e)try{if(eP(n))return}catch{}dn(t,"unauthorized-domain")}function eP(t){const e=Wh(),{protocol:n,hostname:r}=new URL(e);if(t.startsWith("chrome-extension://")){const o=new URL(t);return o.hostname===""&&r===""?n==="chrome-extension:"&&t.replace("chrome-extension://","")===e.replace("chrome-extension://",""):n==="chrome-extension:"&&o.hostname===r}if(!JC.test(n))return!1;if(YC.test(t))return r===t;const i=t.replace(/\./g,"\\.");return new RegExp("^(.+\\."+i+"|"+i+")$","i").test(r)}/**
 * @license
 * Copyright 2020 Google LLC.
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
 */const tP=new Wo(3e4,6e4);function Hg(){const t=ln().___jsl;if(t!=null&&t.H){for(const e of Object.keys(t.H))if(t.H[e].r=t.H[e].r||[],t.H[e].L=t.H[e].L||[],t.H[e].r=[...t.H[e].L],t.CP)for(let n=0;n<t.CP.length;n++)t.CP[n]=null}}function nP(t){return new Promise((e,n)=>{var r,i,s;function o(){Hg(),gapi.load("gapi.iframes",{callback:()=>{e(gapi.iframes.getContext())},ontimeout:()=>{Hg(),n(Ht(t,"network-request-failed"))},timeout:tP.get()})}if(!((i=(r=ln().gapi)===null||r===void 0?void 0:r.iframes)===null||i===void 0)&&i.Iframe)e(gapi.iframes.getContext());else if(!((s=ln().gapi)===null||s===void 0)&&s.load)o();else{const l=oC("iframefcb");return ln()[l]=()=>{gapi.load?o():n(Ht(t,"network-request-failed"))},iC(`${sC()}?onload=${l}`).catch(u=>n(u))}}).catch(e=>{throw il=null,e})}let il=null;function rP(t){return il=il||nP(t),il}/**
 * @license
 * Copyright 2020 Google LLC.
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
 */const iP=new Wo(5e3,15e3),sP="__/auth/iframe",oP="emulator/auth/iframe",aP={style:{position:"absolute",top:"-100px",width:"1px",height:"1px"},"aria-hidden":"true",tabindex:"-1"},lP=new Map([["identitytoolkit.googleapis.com","p"],["staging-identitytoolkit.sandbox.googleapis.com","s"],["test-identitytoolkit.sandbox.googleapis.com","t"]]);function uP(t){const e=t.config;Y(e.authDomain,t,"auth-domain-config-required");const n=e.emulator?pf(e,oP):`https://${t.config.authDomain}/${sP}`,r={apiKey:e.apiKey,appName:t.name,v:oi},i=lP.get(t.config.apiHost);i&&(r.eid=i);const s=t._getFrameworks();return s.length&&(r.fw=s.join(",")),`${n}?${$o(r).slice(1)}`}async function cP(t){const e=await rP(t),n=ln().gapi;return Y(n,t,"internal-error"),e.open({where:document.body,url:uP(t),messageHandlersFilter:n.iframes.CROSS_ORIGIN_IFRAMES_FILTER,attributes:aP,dontclear:!0},r=>new Promise(async(i,s)=>{await r.restyle({setHideOnLeave:!1});const o=Ht(t,"network-request-failed"),l=ln().setTimeout(()=>{s(o)},iP.get());function u(){ln().clearTimeout(l),i(r)}r.ping(u).then(u,()=>{s(o)})}))}/**
 * @license
 * Copyright 2020 Google LLC.
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
 */const hP={location:"yes",resizable:"yes",statusbar:"yes",toolbar:"no"},dP=500,fP=600,pP="_blank",mP="http://localhost";class Kg{constructor(e){this.window=e,this.associatedEvent=null}close(){if(this.window)try{this.window.close()}catch{}}}function gP(t,e,n,r=dP,i=fP){const s=Math.max((window.screen.availHeight-i)/2,0).toString(),o=Math.max((window.screen.availWidth-r)/2,0).toString();let l="";const u=Object.assign(Object.assign({},hP),{width:r.toString(),height:i.toString(),top:s,left:o}),h=lt().toLowerCase();n&&(l=jw(h)?pP:n),Lw(h)&&(e=e||mP,u.scrollbars="yes");const f=Object.entries(u).reduce((_,[R,k])=>`${_}${R}=${k},`,"");if(Xk(h)&&l!=="_self")return yP(e||"",l),new Kg(null);const m=window.open(e||"",l,f);Y(m,t,"popup-blocked");try{m.focus()}catch{}return new Kg(m)}function yP(t,e){const n=document.createElement("a");n.href=t,n.target=e;const r=document.createEvent("MouseEvent");r.initMouseEvent("click",!0,!0,window,1,0,0,0,0,!1,!1,!1,!1,1,null),n.dispatchEvent(r)}/**
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
 */const _P="__/auth/handler",vP="emulator/auth/handler",wP=encodeURIComponent("fac");async function Gg(t,e,n,r,i,s){Y(t.config.authDomain,t,"auth-domain-config-required"),Y(t.config.apiKey,t,"invalid-api-key");const o={apiKey:t.config.apiKey,appName:t.name,authType:n,redirectUrl:r,v:oi,eventId:i};if(e instanceof vf){e.setDefaultLanguage(t.languageCode),o.providerId=e.providerId||"",EA(e.getCustomParameters())||(o.customParameters=JSON.stringify(e.getCustomParameters()));for(const[f,m]of Object.entries({}))o[f]=m}if(e instanceof qo){const f=e.getScopes().filter(m=>m!=="");f.length>0&&(o.scopes=f.join(","))}t.tenantId&&(o.tid=t.tenantId);const l=o;for(const f of Object.keys(l))l[f]===void 0&&delete l[f];const u=await t._getAppCheckToken(),h=u?`#${wP}=${encodeURIComponent(u)}`:"";return`${EP(t)}?${$o(l).slice(1)}${h}`}function EP({config:t}){return t.emulator?pf(t,vP):`https://${t.authDomain}/${_P}`}/**
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
 */const Vc="webStorageSupport";class TP{constructor(){this.eventManagers={},this.iframes={},this.originValidationPromises={},this._redirectPersistence=Yw,this._completeRedirectFn=HC,this._overrideRedirectResult=$C}async _openPopup(e,n,r,i){var s;Mn((s=this.eventManagers[e._key()])===null||s===void 0?void 0:s.manager,"_initialize() not called before _openPopup()");const o=await Gg(e,n,r,Wh(),i);return gP(e,o,wf())}async _openRedirect(e,n,r,i){await this._originValidation(e);const s=await Gg(e,n,r,Wh(),i);return RC(s),new Promise(()=>{})}_initialize(e){const n=e._key();if(this.eventManagers[n]){const{manager:i,promise:s}=this.eventManagers[n];return i?Promise.resolve(i):(Mn(s,"If manager is not set, promise should be"),s)}const r=this.initAndGetManager(e);return this.eventManagers[n]={promise:r},r.catch(()=>{delete this.eventManagers[n]}),r}async initAndGetManager(e){const n=await cP(e),r=new GC(e);return n.register("authEvent",i=>(Y(i==null?void 0:i.authEvent,e,"invalid-auth-event"),{status:r.onEvent(i.authEvent)?"ACK":"ERROR"}),gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER),this.eventManagers[e._key()]={manager:r},this.iframes[e._key()]=n,r}_isIframeWebStorageSupported(e,n){this.iframes[e._key()].send(Vc,{type:Vc},i=>{var s;const o=(s=i==null?void 0:i[0])===null||s===void 0?void 0:s[Vc];o!==void 0&&n(!!o),dn(e,"internal-error")},gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER)}_originValidation(e){const n=e._key();return this.originValidationPromises[n]||(this.originValidationPromises[n]=ZC(e)),this.originValidationPromises[n]}get _shouldInitProactively(){return $w()||Mw()||yf()}}const IP=TP;var Qg="@firebase/auth",Xg="1.7.9";/**
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
 */class SP{constructor(e){this.auth=e,this.internalListeners=new Map}getUid(){var e;return this.assertAuthConfigured(),((e=this.auth.currentUser)===null||e===void 0?void 0:e.uid)||null}async getToken(e){return this.assertAuthConfigured(),await this.auth._initializationPromise,this.auth.currentUser?{accessToken:await this.auth.currentUser.getIdToken(e)}:null}addAuthTokenListener(e){if(this.assertAuthConfigured(),this.internalListeners.has(e))return;const n=this.auth.onIdTokenChanged(r=>{e((r==null?void 0:r.stsTokenManager.accessToken)||null)});this.internalListeners.set(e,n),this.updateProactiveRefresh()}removeAuthTokenListener(e){this.assertAuthConfigured();const n=this.internalListeners.get(e);n&&(this.internalListeners.delete(e),n(),this.updateProactiveRefresh())}assertAuthConfigured(){Y(this.auth._initializationPromise,"dependent-sdk-initialized-before-auth")}updateProactiveRefresh(){this.internalListeners.size>0?this.auth._startProactiveRefresh():this.auth._stopProactiveRefresh()}}/**
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
 */function RP(t){switch(t){case"Node":return"node";case"ReactNative":return"rn";case"Worker":return"webworker";case"Cordova":return"cordova";case"WebExtension":return"web-extension";default:return}}function AP(t){Jr(new wr("auth",(e,{options:n})=>{const r=e.getProvider("app").getImmediate(),i=e.getProvider("heartbeat"),s=e.getProvider("app-check-internal"),{apiKey:o,authDomain:l}=r.options;Y(o&&!o.includes(":"),"invalid-api-key",{appName:r.name});const u={apiKey:o,authDomain:l,clientPlatform:t,apiHost:"identitytoolkit.googleapis.com",tokenApiHost:"securetoken.googleapis.com",apiScheme:"https",sdkClientVersion:Ww(t)},h=new nC(r,i,s,u);return lC(h,n),h},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((e,n,r)=>{e.getProvider("auth-internal").initialize()})),Jr(new wr("auth-internal",e=>{const n=vu(e.getProvider("auth").getImmediate());return(r=>new SP(r))(n)},"PRIVATE").setInstantiationMode("EXPLICIT")),an(Qg,Xg,RP(t)),an(Qg,Xg,"esm2017")}/**
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
 */const kP=5*60,CP=Ew("authIdTokenMaxAge")||kP;let Yg=null;const PP=t=>async e=>{const n=e&&await e.getIdTokenResult(),r=n&&(new Date().getTime()-Date.parse(n.issuedAtTime))/1e3;if(r&&r>CP)return;const i=n==null?void 0:n.token;Yg!==i&&(Yg=i,await fetch(t,{method:i?"POST":"DELETE",headers:i?{Authorization:`Bearer ${i}`}:{}}))};function xP(t=cf()){const e=_u(t,"auth");if(e.isInitialized())return e.getImmediate();const n=aC(t,{popupRedirectResolver:IP,persistence:[bC,TC,Yw]}),r=Ew("authTokenSyncURL");if(r&&typeof isSecureContext=="boolean"&&isSecureContext){const s=new URL(r,location.origin);if(location.origin===s.origin){const o=PP(s.toString());yC(n,o,()=>o(n.currentUser)),gC(n,l=>o(l))}}const i=_w("auth");return i&&uC(n,`http://${i}`),n}function NP(){var t,e;return(e=(t=document.getElementsByTagName("head"))===null||t===void 0?void 0:t[0])!==null&&e!==void 0?e:document}rC({loadJS(t){return new Promise((e,n)=>{const r=document.createElement("script");r.setAttribute("src",t),r.onload=e,r.onerror=i=>{const s=Ht("internal-error");s.customData=i,n(s)},r.type="text/javascript",r.charset="UTF-8",NP().appendChild(r)})},gapiScript:"https://apis.google.com/js/api.js",recaptchaV2Script:"https://www.google.com/recaptcha/api.js",recaptchaEnterpriseScript:"https://www.google.com/recaptcha/enterprise.js?render="});AP("Browser");var DP="firebase",OP="10.14.1";/**
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
 */an(DP,OP,"app");var Jg=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var $r,sE;(function(){var t;/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/function e(I,v){function E(){}E.prototype=v.prototype,I.D=v.prototype,I.prototype=new E,I.prototype.constructor=I,I.C=function(S,P,N){for(var A=Array(arguments.length-2),W=2;W<arguments.length;W++)A[W-2]=arguments[W];return v.prototype[P].apply(S,A)}}function n(){this.blockSize=-1}function r(){this.blockSize=-1,this.blockSize=64,this.g=Array(4),this.B=Array(this.blockSize),this.o=this.h=0,this.s()}e(r,n),r.prototype.s=function(){this.g[0]=1732584193,this.g[1]=4023233417,this.g[2]=2562383102,this.g[3]=271733878,this.o=this.h=0};function i(I,v,E){E||(E=0);var S=Array(16);if(typeof v=="string")for(var P=0;16>P;++P)S[P]=v.charCodeAt(E++)|v.charCodeAt(E++)<<8|v.charCodeAt(E++)<<16|v.charCodeAt(E++)<<24;else for(P=0;16>P;++P)S[P]=v[E++]|v[E++]<<8|v[E++]<<16|v[E++]<<24;v=I.g[0],E=I.g[1],P=I.g[2];var N=I.g[3],A=v+(N^E&(P^N))+S[0]+3614090360&4294967295;v=E+(A<<7&4294967295|A>>>25),A=N+(P^v&(E^P))+S[1]+3905402710&4294967295,N=v+(A<<12&4294967295|A>>>20),A=P+(E^N&(v^E))+S[2]+606105819&4294967295,P=N+(A<<17&4294967295|A>>>15),A=E+(v^P&(N^v))+S[3]+3250441966&4294967295,E=P+(A<<22&4294967295|A>>>10),A=v+(N^E&(P^N))+S[4]+4118548399&4294967295,v=E+(A<<7&4294967295|A>>>25),A=N+(P^v&(E^P))+S[5]+1200080426&4294967295,N=v+(A<<12&4294967295|A>>>20),A=P+(E^N&(v^E))+S[6]+2821735955&4294967295,P=N+(A<<17&4294967295|A>>>15),A=E+(v^P&(N^v))+S[7]+4249261313&4294967295,E=P+(A<<22&4294967295|A>>>10),A=v+(N^E&(P^N))+S[8]+1770035416&4294967295,v=E+(A<<7&4294967295|A>>>25),A=N+(P^v&(E^P))+S[9]+2336552879&4294967295,N=v+(A<<12&4294967295|A>>>20),A=P+(E^N&(v^E))+S[10]+4294925233&4294967295,P=N+(A<<17&4294967295|A>>>15),A=E+(v^P&(N^v))+S[11]+2304563134&4294967295,E=P+(A<<22&4294967295|A>>>10),A=v+(N^E&(P^N))+S[12]+1804603682&4294967295,v=E+(A<<7&4294967295|A>>>25),A=N+(P^v&(E^P))+S[13]+4254626195&4294967295,N=v+(A<<12&4294967295|A>>>20),A=P+(E^N&(v^E))+S[14]+2792965006&4294967295,P=N+(A<<17&4294967295|A>>>15),A=E+(v^P&(N^v))+S[15]+1236535329&4294967295,E=P+(A<<22&4294967295|A>>>10),A=v+(P^N&(E^P))+S[1]+4129170786&4294967295,v=E+(A<<5&4294967295|A>>>27),A=N+(E^P&(v^E))+S[6]+3225465664&4294967295,N=v+(A<<9&4294967295|A>>>23),A=P+(v^E&(N^v))+S[11]+643717713&4294967295,P=N+(A<<14&4294967295|A>>>18),A=E+(N^v&(P^N))+S[0]+3921069994&4294967295,E=P+(A<<20&4294967295|A>>>12),A=v+(P^N&(E^P))+S[5]+3593408605&4294967295,v=E+(A<<5&4294967295|A>>>27),A=N+(E^P&(v^E))+S[10]+38016083&4294967295,N=v+(A<<9&4294967295|A>>>23),A=P+(v^E&(N^v))+S[15]+3634488961&4294967295,P=N+(A<<14&4294967295|A>>>18),A=E+(N^v&(P^N))+S[4]+3889429448&4294967295,E=P+(A<<20&4294967295|A>>>12),A=v+(P^N&(E^P))+S[9]+568446438&4294967295,v=E+(A<<5&4294967295|A>>>27),A=N+(E^P&(v^E))+S[14]+3275163606&4294967295,N=v+(A<<9&4294967295|A>>>23),A=P+(v^E&(N^v))+S[3]+4107603335&4294967295,P=N+(A<<14&4294967295|A>>>18),A=E+(N^v&(P^N))+S[8]+1163531501&4294967295,E=P+(A<<20&4294967295|A>>>12),A=v+(P^N&(E^P))+S[13]+2850285829&4294967295,v=E+(A<<5&4294967295|A>>>27),A=N+(E^P&(v^E))+S[2]+4243563512&4294967295,N=v+(A<<9&4294967295|A>>>23),A=P+(v^E&(N^v))+S[7]+1735328473&4294967295,P=N+(A<<14&4294967295|A>>>18),A=E+(N^v&(P^N))+S[12]+2368359562&4294967295,E=P+(A<<20&4294967295|A>>>12),A=v+(E^P^N)+S[5]+4294588738&4294967295,v=E+(A<<4&4294967295|A>>>28),A=N+(v^E^P)+S[8]+2272392833&4294967295,N=v+(A<<11&4294967295|A>>>21),A=P+(N^v^E)+S[11]+1839030562&4294967295,P=N+(A<<16&4294967295|A>>>16),A=E+(P^N^v)+S[14]+4259657740&4294967295,E=P+(A<<23&4294967295|A>>>9),A=v+(E^P^N)+S[1]+2763975236&4294967295,v=E+(A<<4&4294967295|A>>>28),A=N+(v^E^P)+S[4]+1272893353&4294967295,N=v+(A<<11&4294967295|A>>>21),A=P+(N^v^E)+S[7]+4139469664&4294967295,P=N+(A<<16&4294967295|A>>>16),A=E+(P^N^v)+S[10]+3200236656&4294967295,E=P+(A<<23&4294967295|A>>>9),A=v+(E^P^N)+S[13]+681279174&4294967295,v=E+(A<<4&4294967295|A>>>28),A=N+(v^E^P)+S[0]+3936430074&4294967295,N=v+(A<<11&4294967295|A>>>21),A=P+(N^v^E)+S[3]+3572445317&4294967295,P=N+(A<<16&4294967295|A>>>16),A=E+(P^N^v)+S[6]+76029189&4294967295,E=P+(A<<23&4294967295|A>>>9),A=v+(E^P^N)+S[9]+3654602809&4294967295,v=E+(A<<4&4294967295|A>>>28),A=N+(v^E^P)+S[12]+3873151461&4294967295,N=v+(A<<11&4294967295|A>>>21),A=P+(N^v^E)+S[15]+530742520&4294967295,P=N+(A<<16&4294967295|A>>>16),A=E+(P^N^v)+S[2]+3299628645&4294967295,E=P+(A<<23&4294967295|A>>>9),A=v+(P^(E|~N))+S[0]+4096336452&4294967295,v=E+(A<<6&4294967295|A>>>26),A=N+(E^(v|~P))+S[7]+1126891415&4294967295,N=v+(A<<10&4294967295|A>>>22),A=P+(v^(N|~E))+S[14]+2878612391&4294967295,P=N+(A<<15&4294967295|A>>>17),A=E+(N^(P|~v))+S[5]+4237533241&4294967295,E=P+(A<<21&4294967295|A>>>11),A=v+(P^(E|~N))+S[12]+1700485571&4294967295,v=E+(A<<6&4294967295|A>>>26),A=N+(E^(v|~P))+S[3]+2399980690&4294967295,N=v+(A<<10&4294967295|A>>>22),A=P+(v^(N|~E))+S[10]+4293915773&4294967295,P=N+(A<<15&4294967295|A>>>17),A=E+(N^(P|~v))+S[1]+2240044497&4294967295,E=P+(A<<21&4294967295|A>>>11),A=v+(P^(E|~N))+S[8]+1873313359&4294967295,v=E+(A<<6&4294967295|A>>>26),A=N+(E^(v|~P))+S[15]+4264355552&4294967295,N=v+(A<<10&4294967295|A>>>22),A=P+(v^(N|~E))+S[6]+2734768916&4294967295,P=N+(A<<15&4294967295|A>>>17),A=E+(N^(P|~v))+S[13]+1309151649&4294967295,E=P+(A<<21&4294967295|A>>>11),A=v+(P^(E|~N))+S[4]+4149444226&4294967295,v=E+(A<<6&4294967295|A>>>26),A=N+(E^(v|~P))+S[11]+3174756917&4294967295,N=v+(A<<10&4294967295|A>>>22),A=P+(v^(N|~E))+S[2]+718787259&4294967295,P=N+(A<<15&4294967295|A>>>17),A=E+(N^(P|~v))+S[9]+3951481745&4294967295,I.g[0]=I.g[0]+v&4294967295,I.g[1]=I.g[1]+(P+(A<<21&4294967295|A>>>11))&4294967295,I.g[2]=I.g[2]+P&4294967295,I.g[3]=I.g[3]+N&4294967295}r.prototype.u=function(I,v){v===void 0&&(v=I.length);for(var E=v-this.blockSize,S=this.B,P=this.h,N=0;N<v;){if(P==0)for(;N<=E;)i(this,I,N),N+=this.blockSize;if(typeof I=="string"){for(;N<v;)if(S[P++]=I.charCodeAt(N++),P==this.blockSize){i(this,S),P=0;break}}else for(;N<v;)if(S[P++]=I[N++],P==this.blockSize){i(this,S),P=0;break}}this.h=P,this.o+=v},r.prototype.v=function(){var I=Array((56>this.h?this.blockSize:2*this.blockSize)-this.h);I[0]=128;for(var v=1;v<I.length-8;++v)I[v]=0;var E=8*this.o;for(v=I.length-8;v<I.length;++v)I[v]=E&255,E/=256;for(this.u(I),I=Array(16),v=E=0;4>v;++v)for(var S=0;32>S;S+=8)I[E++]=this.g[v]>>>S&255;return I};function s(I,v){var E=l;return Object.prototype.hasOwnProperty.call(E,I)?E[I]:E[I]=v(I)}function o(I,v){this.h=v;for(var E=[],S=!0,P=I.length-1;0<=P;P--){var N=I[P]|0;S&&N==v||(E[P]=N,S=!1)}this.g=E}var l={};function u(I){return-128<=I&&128>I?s(I,function(v){return new o([v|0],0>v?-1:0)}):new o([I|0],0>I?-1:0)}function h(I){if(isNaN(I)||!isFinite(I))return m;if(0>I)return C(h(-I));for(var v=[],E=1,S=0;I>=E;S++)v[S]=I/E|0,E*=4294967296;return new o(v,0)}function f(I,v){if(I.length==0)throw Error("number format error: empty string");if(v=v||10,2>v||36<v)throw Error("radix out of range: "+v);if(I.charAt(0)=="-")return C(f(I.substring(1),v));if(0<=I.indexOf("-"))throw Error('number format error: interior "-" character');for(var E=h(Math.pow(v,8)),S=m,P=0;P<I.length;P+=8){var N=Math.min(8,I.length-P),A=parseInt(I.substring(P,P+N),v);8>N?(N=h(Math.pow(v,N)),S=S.j(N).add(h(A))):(S=S.j(E),S=S.add(h(A)))}return S}var m=u(0),_=u(1),R=u(16777216);t=o.prototype,t.m=function(){if(x(this))return-C(this).m();for(var I=0,v=1,E=0;E<this.g.length;E++){var S=this.i(E);I+=(0<=S?S:4294967296+S)*v,v*=4294967296}return I},t.toString=function(I){if(I=I||10,2>I||36<I)throw Error("radix out of range: "+I);if(k(this))return"0";if(x(this))return"-"+C(this).toString(I);for(var v=h(Math.pow(I,6)),E=this,S="";;){var P=D(E,v).g;E=w(E,P.j(v));var N=((0<E.g.length?E.g[0]:E.h)>>>0).toString(I);if(E=P,k(E))return N+S;for(;6>N.length;)N="0"+N;S=N+S}},t.i=function(I){return 0>I?0:I<this.g.length?this.g[I]:this.h};function k(I){if(I.h!=0)return!1;for(var v=0;v<I.g.length;v++)if(I.g[v]!=0)return!1;return!0}function x(I){return I.h==-1}t.l=function(I){return I=w(this,I),x(I)?-1:k(I)?0:1};function C(I){for(var v=I.g.length,E=[],S=0;S<v;S++)E[S]=~I.g[S];return new o(E,~I.h).add(_)}t.abs=function(){return x(this)?C(this):this},t.add=function(I){for(var v=Math.max(this.g.length,I.g.length),E=[],S=0,P=0;P<=v;P++){var N=S+(this.i(P)&65535)+(I.i(P)&65535),A=(N>>>16)+(this.i(P)>>>16)+(I.i(P)>>>16);S=A>>>16,N&=65535,A&=65535,E[P]=A<<16|N}return new o(E,E[E.length-1]&-2147483648?-1:0)};function w(I,v){return I.add(C(v))}t.j=function(I){if(k(this)||k(I))return m;if(x(this))return x(I)?C(this).j(C(I)):C(C(this).j(I));if(x(I))return C(this.j(C(I)));if(0>this.l(R)&&0>I.l(R))return h(this.m()*I.m());for(var v=this.g.length+I.g.length,E=[],S=0;S<2*v;S++)E[S]=0;for(S=0;S<this.g.length;S++)for(var P=0;P<I.g.length;P++){var N=this.i(S)>>>16,A=this.i(S)&65535,W=I.i(P)>>>16,ve=I.i(P)&65535;E[2*S+2*P]+=A*ve,g(E,2*S+2*P),E[2*S+2*P+1]+=N*ve,g(E,2*S+2*P+1),E[2*S+2*P+1]+=A*W,g(E,2*S+2*P+1),E[2*S+2*P+2]+=N*W,g(E,2*S+2*P+2)}for(S=0;S<v;S++)E[S]=E[2*S+1]<<16|E[2*S];for(S=v;S<2*v;S++)E[S]=0;return new o(E,0)};function g(I,v){for(;(I[v]&65535)!=I[v];)I[v+1]+=I[v]>>>16,I[v]&=65535,v++}function T(I,v){this.g=I,this.h=v}function D(I,v){if(k(v))throw Error("division by zero");if(k(I))return new T(m,m);if(x(I))return v=D(C(I),v),new T(C(v.g),C(v.h));if(x(v))return v=D(I,C(v)),new T(C(v.g),v.h);if(30<I.g.length){if(x(I)||x(v))throw Error("slowDivide_ only works with positive integers.");for(var E=_,S=v;0>=S.l(I);)E=j(E),S=j(S);var P=U(E,1),N=U(S,1);for(S=U(S,2),E=U(E,2);!k(S);){var A=N.add(S);0>=A.l(I)&&(P=P.add(E),N=A),S=U(S,1),E=U(E,1)}return v=w(I,P.j(v)),new T(P,v)}for(P=m;0<=I.l(v);){for(E=Math.max(1,Math.floor(I.m()/v.m())),S=Math.ceil(Math.log(E)/Math.LN2),S=48>=S?1:Math.pow(2,S-48),N=h(E),A=N.j(v);x(A)||0<A.l(I);)E-=S,N=h(E),A=N.j(v);k(N)&&(N=_),P=P.add(N),I=w(I,A)}return new T(P,I)}t.A=function(I){return D(this,I).h},t.and=function(I){for(var v=Math.max(this.g.length,I.g.length),E=[],S=0;S<v;S++)E[S]=this.i(S)&I.i(S);return new o(E,this.h&I.h)},t.or=function(I){for(var v=Math.max(this.g.length,I.g.length),E=[],S=0;S<v;S++)E[S]=this.i(S)|I.i(S);return new o(E,this.h|I.h)},t.xor=function(I){for(var v=Math.max(this.g.length,I.g.length),E=[],S=0;S<v;S++)E[S]=this.i(S)^I.i(S);return new o(E,this.h^I.h)};function j(I){for(var v=I.g.length+1,E=[],S=0;S<v;S++)E[S]=I.i(S)<<1|I.i(S-1)>>>31;return new o(E,I.h)}function U(I,v){var E=v>>5;v%=32;for(var S=I.g.length-E,P=[],N=0;N<S;N++)P[N]=0<v?I.i(N+E)>>>v|I.i(N+E+1)<<32-v:I.i(N+E);return new o(P,I.h)}r.prototype.digest=r.prototype.v,r.prototype.reset=r.prototype.s,r.prototype.update=r.prototype.u,sE=r,o.prototype.add=o.prototype.add,o.prototype.multiply=o.prototype.j,o.prototype.modulo=o.prototype.A,o.prototype.compare=o.prototype.l,o.prototype.toNumber=o.prototype.m,o.prototype.toString=o.prototype.toString,o.prototype.getBits=o.prototype.i,o.fromNumber=h,o.fromString=f,$r=o}).apply(typeof Jg<"u"?Jg:typeof self<"u"?self:typeof window<"u"?window:{});var Ma=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var oE,zs,aE,sl,Kh,lE,uE,cE;(function(){var t,e=typeof Object.defineProperties=="function"?Object.defineProperty:function(a,c,d){return a==Array.prototype||a==Object.prototype||(a[c]=d.value),a};function n(a){a=[typeof globalThis=="object"&&globalThis,a,typeof window=="object"&&window,typeof self=="object"&&self,typeof Ma=="object"&&Ma];for(var c=0;c<a.length;++c){var d=a[c];if(d&&d.Math==Math)return d}throw Error("Cannot find global object")}var r=n(this);function i(a,c){if(c)e:{var d=r;a=a.split(".");for(var y=0;y<a.length-1;y++){var O=a[y];if(!(O in d))break e;d=d[O]}a=a[a.length-1],y=d[a],c=c(y),c!=y&&c!=null&&e(d,a,{configurable:!0,writable:!0,value:c})}}function s(a,c){a instanceof String&&(a+="");var d=0,y=!1,O={next:function(){if(!y&&d<a.length){var V=d++;return{value:c(V,a[V]),done:!1}}return y=!0,{done:!0,value:void 0}}};return O[Symbol.iterator]=function(){return O},O}i("Array.prototype.values",function(a){return a||function(){return s(this,function(c,d){return d})}});/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/var o=o||{},l=this||self;function u(a){var c=typeof a;return c=c!="object"?c:a?Array.isArray(a)?"array":c:"null",c=="array"||c=="object"&&typeof a.length=="number"}function h(a){var c=typeof a;return c=="object"&&a!=null||c=="function"}function f(a,c,d){return a.call.apply(a.bind,arguments)}function m(a,c,d){if(!a)throw Error();if(2<arguments.length){var y=Array.prototype.slice.call(arguments,2);return function(){var O=Array.prototype.slice.call(arguments);return Array.prototype.unshift.apply(O,y),a.apply(c,O)}}return function(){return a.apply(c,arguments)}}function _(a,c,d){return _=Function.prototype.bind&&Function.prototype.bind.toString().indexOf("native code")!=-1?f:m,_.apply(null,arguments)}function R(a,c){var d=Array.prototype.slice.call(arguments,1);return function(){var y=d.slice();return y.push.apply(y,arguments),a.apply(this,y)}}function k(a,c){function d(){}d.prototype=c.prototype,a.aa=c.prototype,a.prototype=new d,a.prototype.constructor=a,a.Qb=function(y,O,V){for(var $=Array(arguments.length-2),de=2;de<arguments.length;de++)$[de-2]=arguments[de];return c.prototype[O].apply(y,$)}}function x(a){const c=a.length;if(0<c){const d=Array(c);for(let y=0;y<c;y++)d[y]=a[y];return d}return[]}function C(a,c){for(let d=1;d<arguments.length;d++){const y=arguments[d];if(u(y)){const O=a.length||0,V=y.length||0;a.length=O+V;for(let $=0;$<V;$++)a[O+$]=y[$]}else a.push(y)}}class w{constructor(c,d){this.i=c,this.j=d,this.h=0,this.g=null}get(){let c;return 0<this.h?(this.h--,c=this.g,this.g=c.next,c.next=null):c=this.i(),c}}function g(a){return/^[\s\xa0]*$/.test(a)}function T(){var a=l.navigator;return a&&(a=a.userAgent)?a:""}function D(a){return D[" "](a),a}D[" "]=function(){};var j=T().indexOf("Gecko")!=-1&&!(T().toLowerCase().indexOf("webkit")!=-1&&T().indexOf("Edge")==-1)&&!(T().indexOf("Trident")!=-1||T().indexOf("MSIE")!=-1)&&T().indexOf("Edge")==-1;function U(a,c,d){for(const y in a)c.call(d,a[y],y,a)}function I(a,c){for(const d in a)c.call(void 0,a[d],d,a)}function v(a){const c={};for(const d in a)c[d]=a[d];return c}const E="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function S(a,c){let d,y;for(let O=1;O<arguments.length;O++){y=arguments[O];for(d in y)a[d]=y[d];for(let V=0;V<E.length;V++)d=E[V],Object.prototype.hasOwnProperty.call(y,d)&&(a[d]=y[d])}}function P(a){var c=1;a=a.split(":");const d=[];for(;0<c&&a.length;)d.push(a.shift()),c--;return a.length&&d.push(a.join(":")),d}function N(a){l.setTimeout(()=>{throw a},0)}function A(){var a=L;let c=null;return a.g&&(c=a.g,a.g=a.g.next,a.g||(a.h=null),c.next=null),c}class W{constructor(){this.h=this.g=null}add(c,d){const y=ve.get();y.set(c,d),this.h?this.h.next=y:this.g=y,this.h=y}}var ve=new w(()=>new De,a=>a.reset());class De{constructor(){this.next=this.g=this.h=null}set(c,d){this.h=c,this.g=d,this.next=null}reset(){this.next=this.g=this.h=null}}let Le,q=!1,L=new W,z=()=>{const a=l.Promise.resolve(void 0);Le=()=>{a.then(X)}};var X=()=>{for(var a;a=A();){try{a.h.call(a.g)}catch(d){N(d)}var c=ve;c.j(a),100>c.h&&(c.h++,a.next=c.g,c.g=a)}q=!1};function te(){this.s=this.s,this.C=this.C}te.prototype.s=!1,te.prototype.ma=function(){this.s||(this.s=!0,this.N())},te.prototype.N=function(){if(this.C)for(;this.C.length;)this.C.shift()()};function ue(a,c){this.type=a,this.g=this.target=c,this.defaultPrevented=!1}ue.prototype.h=function(){this.defaultPrevented=!0};var Mt=function(){if(!l.addEventListener||!Object.defineProperty)return!1;var a=!1,c=Object.defineProperty({},"passive",{get:function(){a=!0}});try{const d=()=>{};l.addEventListener("test",d,c),l.removeEventListener("test",d,c)}catch{}return a}();function yn(a,c){if(ue.call(this,a?a.type:""),this.relatedTarget=this.g=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.state=null,this.pointerId=0,this.pointerType="",this.i=null,a){var d=this.type=a.type,y=a.changedTouches&&a.changedTouches.length?a.changedTouches[0]:null;if(this.target=a.target||a.srcElement,this.g=c,c=a.relatedTarget){if(j){e:{try{D(c.nodeName);var O=!0;break e}catch{}O=!1}O||(c=null)}}else d=="mouseover"?c=a.fromElement:d=="mouseout"&&(c=a.toElement);this.relatedTarget=c,y?(this.clientX=y.clientX!==void 0?y.clientX:y.pageX,this.clientY=y.clientY!==void 0?y.clientY:y.pageY,this.screenX=y.screenX||0,this.screenY=y.screenY||0):(this.clientX=a.clientX!==void 0?a.clientX:a.pageX,this.clientY=a.clientY!==void 0?a.clientY:a.pageY,this.screenX=a.screenX||0,this.screenY=a.screenY||0),this.button=a.button,this.key=a.key||"",this.ctrlKey=a.ctrlKey,this.altKey=a.altKey,this.shiftKey=a.shiftKey,this.metaKey=a.metaKey,this.pointerId=a.pointerId||0,this.pointerType=typeof a.pointerType=="string"?a.pointerType:_n[a.pointerType]||"",this.state=a.state,this.i=a,a.defaultPrevented&&yn.aa.h.call(this)}}k(yn,ue);var _n={2:"touch",3:"pen",4:"mouse"};yn.prototype.h=function(){yn.aa.h.call(this);var a=this.i;a.preventDefault?a.preventDefault():a.returnValue=!1};var vn="closure_listenable_"+(1e6*Math.random()|0),q0=0;function H0(a,c,d,y,O){this.listener=a,this.proxy=null,this.src=c,this.type=d,this.capture=!!y,this.ha=O,this.key=++q0,this.da=this.fa=!1}function ta(a){a.da=!0,a.listener=null,a.proxy=null,a.src=null,a.ha=null}function na(a){this.src=a,this.g={},this.h=0}na.prototype.add=function(a,c,d,y,O){var V=a.toString();a=this.g[V],a||(a=this.g[V]=[],this.h++);var $=bu(a,c,y,O);return-1<$?(c=a[$],d||(c.fa=!1)):(c=new H0(c,this.src,V,!!y,O),c.fa=d,a.push(c)),c};function Ou(a,c){var d=c.type;if(d in a.g){var y=a.g[d],O=Array.prototype.indexOf.call(y,c,void 0),V;(V=0<=O)&&Array.prototype.splice.call(y,O,1),V&&(ta(c),a.g[d].length==0&&(delete a.g[d],a.h--))}}function bu(a,c,d,y){for(var O=0;O<a.length;++O){var V=a[O];if(!V.da&&V.listener==c&&V.capture==!!d&&V.ha==y)return O}return-1}var Vu="closure_lm_"+(1e6*Math.random()|0),Lu={};function lp(a,c,d,y,O){if(Array.isArray(c)){for(var V=0;V<c.length;V++)lp(a,c[V],d,y,O);return null}return d=hp(d),a&&a[vn]?a.K(c,d,h(y)?!!y.capture:!1,O):K0(a,c,d,!1,y,O)}function K0(a,c,d,y,O,V){if(!c)throw Error("Invalid event type");var $=h(O)?!!O.capture:!!O,de=ju(a);if(de||(a[Vu]=de=new na(a)),d=de.add(c,d,y,$,V),d.proxy)return d;if(y=G0(),d.proxy=y,y.src=a,y.listener=d,a.addEventListener)Mt||(O=$),O===void 0&&(O=!1),a.addEventListener(c.toString(),y,O);else if(a.attachEvent)a.attachEvent(cp(c.toString()),y);else if(a.addListener&&a.removeListener)a.addListener(y);else throw Error("addEventListener and attachEvent are unavailable.");return d}function G0(){function a(d){return c.call(a.src,a.listener,d)}const c=Q0;return a}function up(a,c,d,y,O){if(Array.isArray(c))for(var V=0;V<c.length;V++)up(a,c[V],d,y,O);else y=h(y)?!!y.capture:!!y,d=hp(d),a&&a[vn]?(a=a.i,c=String(c).toString(),c in a.g&&(V=a.g[c],d=bu(V,d,y,O),-1<d&&(ta(V[d]),Array.prototype.splice.call(V,d,1),V.length==0&&(delete a.g[c],a.h--)))):a&&(a=ju(a))&&(c=a.g[c.toString()],a=-1,c&&(a=bu(c,d,y,O)),(d=-1<a?c[a]:null)&&Mu(d))}function Mu(a){if(typeof a!="number"&&a&&!a.da){var c=a.src;if(c&&c[vn])Ou(c.i,a);else{var d=a.type,y=a.proxy;c.removeEventListener?c.removeEventListener(d,y,a.capture):c.detachEvent?c.detachEvent(cp(d),y):c.addListener&&c.removeListener&&c.removeListener(y),(d=ju(c))?(Ou(d,a),d.h==0&&(d.src=null,c[Vu]=null)):ta(a)}}}function cp(a){return a in Lu?Lu[a]:Lu[a]="on"+a}function Q0(a,c){if(a.da)a=!0;else{c=new yn(c,this);var d=a.listener,y=a.ha||a.src;a.fa&&Mu(a),a=d.call(y,c)}return a}function ju(a){return a=a[Vu],a instanceof na?a:null}var Uu="__closure_events_fn_"+(1e9*Math.random()>>>0);function hp(a){return typeof a=="function"?a:(a[Uu]||(a[Uu]=function(c){return a.handleEvent(c)}),a[Uu])}function Je(){te.call(this),this.i=new na(this),this.M=this,this.F=null}k(Je,te),Je.prototype[vn]=!0,Je.prototype.removeEventListener=function(a,c,d,y){up(this,a,c,d,y)};function ut(a,c){var d,y=a.F;if(y)for(d=[];y;y=y.F)d.push(y);if(a=a.M,y=c.type||c,typeof c=="string")c=new ue(c,a);else if(c instanceof ue)c.target=c.target||a;else{var O=c;c=new ue(y,a),S(c,O)}if(O=!0,d)for(var V=d.length-1;0<=V;V--){var $=c.g=d[V];O=ra($,y,!0,c)&&O}if($=c.g=a,O=ra($,y,!0,c)&&O,O=ra($,y,!1,c)&&O,d)for(V=0;V<d.length;V++)$=c.g=d[V],O=ra($,y,!1,c)&&O}Je.prototype.N=function(){if(Je.aa.N.call(this),this.i){var a=this.i,c;for(c in a.g){for(var d=a.g[c],y=0;y<d.length;y++)ta(d[y]);delete a.g[c],a.h--}}this.F=null},Je.prototype.K=function(a,c,d,y){return this.i.add(String(a),c,!1,d,y)},Je.prototype.L=function(a,c,d,y){return this.i.add(String(a),c,!0,d,y)};function ra(a,c,d,y){if(c=a.i.g[String(c)],!c)return!0;c=c.concat();for(var O=!0,V=0;V<c.length;++V){var $=c[V];if($&&!$.da&&$.capture==d){var de=$.listener,We=$.ha||$.src;$.fa&&Ou(a.i,$),O=de.call(We,y)!==!1&&O}}return O&&!y.defaultPrevented}function dp(a,c,d){if(typeof a=="function")d&&(a=_(a,d));else if(a&&typeof a.handleEvent=="function")a=_(a.handleEvent,a);else throw Error("Invalid listener argument");return 2147483647<Number(c)?-1:l.setTimeout(a,c||0)}function fp(a){a.g=dp(()=>{a.g=null,a.i&&(a.i=!1,fp(a))},a.l);const c=a.h;a.h=null,a.m.apply(null,c)}class X0 extends te{constructor(c,d){super(),this.m=c,this.l=d,this.h=null,this.i=!1,this.g=null}j(c){this.h=arguments,this.g?this.i=!0:fp(this)}N(){super.N(),this.g&&(l.clearTimeout(this.g),this.g=null,this.i=!1,this.h=null)}}function ps(a){te.call(this),this.h=a,this.g={}}k(ps,te);var pp=[];function mp(a){U(a.g,function(c,d){this.g.hasOwnProperty(d)&&Mu(c)},a),a.g={}}ps.prototype.N=function(){ps.aa.N.call(this),mp(this)},ps.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented")};var Fu=l.JSON.stringify,Y0=l.JSON.parse,J0=class{stringify(a){return l.JSON.stringify(a,void 0)}parse(a){return l.JSON.parse(a,void 0)}};function Bu(){}Bu.prototype.h=null;function gp(a){return a.h||(a.h=a.i())}function yp(){}var ms={OPEN:"a",kb:"b",Ja:"c",wb:"d"};function zu(){ue.call(this,"d")}k(zu,ue);function $u(){ue.call(this,"c")}k($u,ue);var Cr={},_p=null;function ia(){return _p=_p||new Je}Cr.La="serverreachability";function vp(a){ue.call(this,Cr.La,a)}k(vp,ue);function gs(a){const c=ia();ut(c,new vp(c))}Cr.STAT_EVENT="statevent";function wp(a,c){ue.call(this,Cr.STAT_EVENT,a),this.stat=c}k(wp,ue);function ct(a){const c=ia();ut(c,new wp(c,a))}Cr.Ma="timingevent";function Ep(a,c){ue.call(this,Cr.Ma,a),this.size=c}k(Ep,ue);function ys(a,c){if(typeof a!="function")throw Error("Fn must not be null and must be a function");return l.setTimeout(function(){a()},c)}function _s(){this.g=!0}_s.prototype.xa=function(){this.g=!1};function Z0(a,c,d,y,O,V){a.info(function(){if(a.g)if(V)for(var $="",de=V.split("&"),We=0;We<de.length;We++){var ae=de[We].split("=");if(1<ae.length){var Ze=ae[0];ae=ae[1];var et=Ze.split("_");$=2<=et.length&&et[1]=="type"?$+(Ze+"="+ae+"&"):$+(Ze+"=redacted&")}}else $=null;else $=V;return"XMLHTTP REQ ("+y+") [attempt "+O+"]: "+c+`
`+d+`
`+$})}function eT(a,c,d,y,O,V,$){a.info(function(){return"XMLHTTP RESP ("+y+") [ attempt "+O+"]: "+c+`
`+d+`
`+V+" "+$})}function ci(a,c,d,y){a.info(function(){return"XMLHTTP TEXT ("+c+"): "+nT(a,d)+(y?" "+y:"")})}function tT(a,c){a.info(function(){return"TIMEOUT: "+c})}_s.prototype.info=function(){};function nT(a,c){if(!a.g)return c;if(!c)return null;try{var d=JSON.parse(c);if(d){for(a=0;a<d.length;a++)if(Array.isArray(d[a])){var y=d[a];if(!(2>y.length)){var O=y[1];if(Array.isArray(O)&&!(1>O.length)){var V=O[0];if(V!="noop"&&V!="stop"&&V!="close")for(var $=1;$<O.length;$++)O[$]=""}}}}return Fu(d)}catch{return c}}var sa={NO_ERROR:0,gb:1,tb:2,sb:3,nb:4,rb:5,ub:6,Ia:7,TIMEOUT:8,xb:9},Tp={lb:"complete",Hb:"success",Ja:"error",Ia:"abort",zb:"ready",Ab:"readystatechange",TIMEOUT:"timeout",vb:"incrementaldata",yb:"progress",ob:"downloadprogress",Pb:"uploadprogress"},Wu;function oa(){}k(oa,Bu),oa.prototype.g=function(){return new XMLHttpRequest},oa.prototype.i=function(){return{}},Wu=new oa;function zn(a,c,d,y){this.j=a,this.i=c,this.l=d,this.R=y||1,this.U=new ps(this),this.I=45e3,this.H=null,this.o=!1,this.m=this.A=this.v=this.L=this.F=this.S=this.B=null,this.D=[],this.g=null,this.C=0,this.s=this.u=null,this.X=-1,this.J=!1,this.O=0,this.M=null,this.W=this.K=this.T=this.P=!1,this.h=new Ip}function Ip(){this.i=null,this.g="",this.h=!1}var Sp={},qu={};function Hu(a,c,d){a.L=1,a.v=ca(wn(c)),a.m=d,a.P=!0,Rp(a,null)}function Rp(a,c){a.F=Date.now(),aa(a),a.A=wn(a.v);var d=a.A,y=a.R;Array.isArray(y)||(y=[String(y)]),Up(d.i,"t",y),a.C=0,d=a.j.J,a.h=new Ip,a.g=rm(a.j,d?c:null,!a.m),0<a.O&&(a.M=new X0(_(a.Y,a,a.g),a.O)),c=a.U,d=a.g,y=a.ca;var O="readystatechange";Array.isArray(O)||(O&&(pp[0]=O.toString()),O=pp);for(var V=0;V<O.length;V++){var $=lp(d,O[V],y||c.handleEvent,!1,c.h||c);if(!$)break;c.g[$.key]=$}c=a.H?v(a.H):{},a.m?(a.u||(a.u="POST"),c["Content-Type"]="application/x-www-form-urlencoded",a.g.ea(a.A,a.u,a.m,c)):(a.u="GET",a.g.ea(a.A,a.u,null,c)),gs(),Z0(a.i,a.u,a.A,a.l,a.R,a.m)}zn.prototype.ca=function(a){a=a.target;const c=this.M;c&&En(a)==3?c.j():this.Y(a)},zn.prototype.Y=function(a){try{if(a==this.g)e:{const et=En(this.g);var c=this.g.Ba();const fi=this.g.Z();if(!(3>et)&&(et!=3||this.g&&(this.h.h||this.g.oa()||Hp(this.g)))){this.J||et!=4||c==7||(c==8||0>=fi?gs(3):gs(2)),Ku(this);var d=this.g.Z();this.X=d;t:if(Ap(this)){var y=Hp(this.g);a="";var O=y.length,V=En(this.g)==4;if(!this.h.i){if(typeof TextDecoder>"u"){Pr(this),vs(this);var $="";break t}this.h.i=new l.TextDecoder}for(c=0;c<O;c++)this.h.h=!0,a+=this.h.i.decode(y[c],{stream:!(V&&c==O-1)});y.length=0,this.h.g+=a,this.C=0,$=this.h.g}else $=this.g.oa();if(this.o=d==200,eT(this.i,this.u,this.A,this.l,this.R,et,d),this.o){if(this.T&&!this.K){t:{if(this.g){var de,We=this.g;if((de=We.g?We.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!g(de)){var ae=de;break t}}ae=null}if(d=ae)ci(this.i,this.l,d,"Initial handshake response via X-HTTP-Initial-Response"),this.K=!0,Gu(this,d);else{this.o=!1,this.s=3,ct(12),Pr(this),vs(this);break e}}if(this.P){d=!0;let jt;for(;!this.J&&this.C<$.length;)if(jt=rT(this,$),jt==qu){et==4&&(this.s=4,ct(14),d=!1),ci(this.i,this.l,null,"[Incomplete Response]");break}else if(jt==Sp){this.s=4,ct(15),ci(this.i,this.l,$,"[Invalid Chunk]"),d=!1;break}else ci(this.i,this.l,jt,null),Gu(this,jt);if(Ap(this)&&this.C!=0&&(this.h.g=this.h.g.slice(this.C),this.C=0),et!=4||$.length!=0||this.h.h||(this.s=1,ct(16),d=!1),this.o=this.o&&d,!d)ci(this.i,this.l,$,"[Invalid Chunked Response]"),Pr(this),vs(this);else if(0<$.length&&!this.W){this.W=!0;var Ze=this.j;Ze.g==this&&Ze.ba&&!Ze.M&&(Ze.j.info("Great, no buffering proxy detected. Bytes received: "+$.length),ec(Ze),Ze.M=!0,ct(11))}}else ci(this.i,this.l,$,null),Gu(this,$);et==4&&Pr(this),this.o&&!this.J&&(et==4?Zp(this.j,this):(this.o=!1,aa(this)))}else wT(this.g),d==400&&0<$.indexOf("Unknown SID")?(this.s=3,ct(12)):(this.s=0,ct(13)),Pr(this),vs(this)}}}catch{}finally{}};function Ap(a){return a.g?a.u=="GET"&&a.L!=2&&a.j.Ca:!1}function rT(a,c){var d=a.C,y=c.indexOf(`
`,d);return y==-1?qu:(d=Number(c.substring(d,y)),isNaN(d)?Sp:(y+=1,y+d>c.length?qu:(c=c.slice(y,y+d),a.C=y+d,c)))}zn.prototype.cancel=function(){this.J=!0,Pr(this)};function aa(a){a.S=Date.now()+a.I,kp(a,a.I)}function kp(a,c){if(a.B!=null)throw Error("WatchDog timer not null");a.B=ys(_(a.ba,a),c)}function Ku(a){a.B&&(l.clearTimeout(a.B),a.B=null)}zn.prototype.ba=function(){this.B=null;const a=Date.now();0<=a-this.S?(tT(this.i,this.A),this.L!=2&&(gs(),ct(17)),Pr(this),this.s=2,vs(this)):kp(this,this.S-a)};function vs(a){a.j.G==0||a.J||Zp(a.j,a)}function Pr(a){Ku(a);var c=a.M;c&&typeof c.ma=="function"&&c.ma(),a.M=null,mp(a.U),a.g&&(c=a.g,a.g=null,c.abort(),c.ma())}function Gu(a,c){try{var d=a.j;if(d.G!=0&&(d.g==a||Qu(d.h,a))){if(!a.K&&Qu(d.h,a)&&d.G==3){try{var y=d.Da.g.parse(c)}catch{y=null}if(Array.isArray(y)&&y.length==3){var O=y;if(O[0]==0){e:if(!d.u){if(d.g)if(d.g.F+3e3<a.F)ga(d),pa(d);else break e;Zu(d),ct(18)}}else d.za=O[1],0<d.za-d.T&&37500>O[2]&&d.F&&d.v==0&&!d.C&&(d.C=ys(_(d.Za,d),6e3));if(1>=xp(d.h)&&d.ca){try{d.ca()}catch{}d.ca=void 0}}else Nr(d,11)}else if((a.K||d.g==a)&&ga(d),!g(c))for(O=d.Da.g.parse(c),c=0;c<O.length;c++){let ae=O[c];if(d.T=ae[0],ae=ae[1],d.G==2)if(ae[0]=="c"){d.K=ae[1],d.ia=ae[2];const Ze=ae[3];Ze!=null&&(d.la=Ze,d.j.info("VER="+d.la));const et=ae[4];et!=null&&(d.Aa=et,d.j.info("SVER="+d.Aa));const fi=ae[5];fi!=null&&typeof fi=="number"&&0<fi&&(y=1.5*fi,d.L=y,d.j.info("backChannelRequestTimeoutMs_="+y)),y=d;const jt=a.g;if(jt){const _a=jt.g?jt.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(_a){var V=y.h;V.g||_a.indexOf("spdy")==-1&&_a.indexOf("quic")==-1&&_a.indexOf("h2")==-1||(V.j=V.l,V.g=new Set,V.h&&(Xu(V,V.h),V.h=null))}if(y.D){const tc=jt.g?jt.g.getResponseHeader("X-HTTP-Session-Id"):null;tc&&(y.ya=tc,pe(y.I,y.D,tc))}}d.G=3,d.l&&d.l.ua(),d.ba&&(d.R=Date.now()-a.F,d.j.info("Handshake RTT: "+d.R+"ms")),y=d;var $=a;if(y.qa=nm(y,y.J?y.ia:null,y.W),$.K){Np(y.h,$);var de=$,We=y.L;We&&(de.I=We),de.B&&(Ku(de),aa(de)),y.g=$}else Yp(y);0<d.i.length&&ma(d)}else ae[0]!="stop"&&ae[0]!="close"||Nr(d,7);else d.G==3&&(ae[0]=="stop"||ae[0]=="close"?ae[0]=="stop"?Nr(d,7):Ju(d):ae[0]!="noop"&&d.l&&d.l.ta(ae),d.v=0)}}gs(4)}catch{}}var iT=class{constructor(a,c){this.g=a,this.map=c}};function Cp(a){this.l=a||10,l.PerformanceNavigationTiming?(a=l.performance.getEntriesByType("navigation"),a=0<a.length&&(a[0].nextHopProtocol=="hq"||a[0].nextHopProtocol=="h2")):a=!!(l.chrome&&l.chrome.loadTimes&&l.chrome.loadTimes()&&l.chrome.loadTimes().wasFetchedViaSpdy),this.j=a?this.l:1,this.g=null,1<this.j&&(this.g=new Set),this.h=null,this.i=[]}function Pp(a){return a.h?!0:a.g?a.g.size>=a.j:!1}function xp(a){return a.h?1:a.g?a.g.size:0}function Qu(a,c){return a.h?a.h==c:a.g?a.g.has(c):!1}function Xu(a,c){a.g?a.g.add(c):a.h=c}function Np(a,c){a.h&&a.h==c?a.h=null:a.g&&a.g.has(c)&&a.g.delete(c)}Cp.prototype.cancel=function(){if(this.i=Dp(this),this.h)this.h.cancel(),this.h=null;else if(this.g&&this.g.size!==0){for(const a of this.g.values())a.cancel();this.g.clear()}};function Dp(a){if(a.h!=null)return a.i.concat(a.h.D);if(a.g!=null&&a.g.size!==0){let c=a.i;for(const d of a.g.values())c=c.concat(d.D);return c}return x(a.i)}function sT(a){if(a.V&&typeof a.V=="function")return a.V();if(typeof Map<"u"&&a instanceof Map||typeof Set<"u"&&a instanceof Set)return Array.from(a.values());if(typeof a=="string")return a.split("");if(u(a)){for(var c=[],d=a.length,y=0;y<d;y++)c.push(a[y]);return c}c=[],d=0;for(y in a)c[d++]=a[y];return c}function oT(a){if(a.na&&typeof a.na=="function")return a.na();if(!a.V||typeof a.V!="function"){if(typeof Map<"u"&&a instanceof Map)return Array.from(a.keys());if(!(typeof Set<"u"&&a instanceof Set)){if(u(a)||typeof a=="string"){var c=[];a=a.length;for(var d=0;d<a;d++)c.push(d);return c}c=[],d=0;for(const y in a)c[d++]=y;return c}}}function Op(a,c){if(a.forEach&&typeof a.forEach=="function")a.forEach(c,void 0);else if(u(a)||typeof a=="string")Array.prototype.forEach.call(a,c,void 0);else for(var d=oT(a),y=sT(a),O=y.length,V=0;V<O;V++)c.call(void 0,y[V],d&&d[V],a)}var bp=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");function aT(a,c){if(a){a=a.split("&");for(var d=0;d<a.length;d++){var y=a[d].indexOf("="),O=null;if(0<=y){var V=a[d].substring(0,y);O=a[d].substring(y+1)}else V=a[d];c(V,O?decodeURIComponent(O.replace(/\+/g," ")):"")}}}function xr(a){if(this.g=this.o=this.j="",this.s=null,this.m=this.l="",this.h=!1,a instanceof xr){this.h=a.h,la(this,a.j),this.o=a.o,this.g=a.g,ua(this,a.s),this.l=a.l;var c=a.i,d=new Ts;d.i=c.i,c.g&&(d.g=new Map(c.g),d.h=c.h),Vp(this,d),this.m=a.m}else a&&(c=String(a).match(bp))?(this.h=!1,la(this,c[1]||"",!0),this.o=ws(c[2]||""),this.g=ws(c[3]||"",!0),ua(this,c[4]),this.l=ws(c[5]||"",!0),Vp(this,c[6]||"",!0),this.m=ws(c[7]||"")):(this.h=!1,this.i=new Ts(null,this.h))}xr.prototype.toString=function(){var a=[],c=this.j;c&&a.push(Es(c,Lp,!0),":");var d=this.g;return(d||c=="file")&&(a.push("//"),(c=this.o)&&a.push(Es(c,Lp,!0),"@"),a.push(encodeURIComponent(String(d)).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),d=this.s,d!=null&&a.push(":",String(d))),(d=this.l)&&(this.g&&d.charAt(0)!="/"&&a.push("/"),a.push(Es(d,d.charAt(0)=="/"?cT:uT,!0))),(d=this.i.toString())&&a.push("?",d),(d=this.m)&&a.push("#",Es(d,dT)),a.join("")};function wn(a){return new xr(a)}function la(a,c,d){a.j=d?ws(c,!0):c,a.j&&(a.j=a.j.replace(/:$/,""))}function ua(a,c){if(c){if(c=Number(c),isNaN(c)||0>c)throw Error("Bad port number "+c);a.s=c}else a.s=null}function Vp(a,c,d){c instanceof Ts?(a.i=c,fT(a.i,a.h)):(d||(c=Es(c,hT)),a.i=new Ts(c,a.h))}function pe(a,c,d){a.i.set(c,d)}function ca(a){return pe(a,"zx",Math.floor(2147483648*Math.random()).toString(36)+Math.abs(Math.floor(2147483648*Math.random())^Date.now()).toString(36)),a}function ws(a,c){return a?c?decodeURI(a.replace(/%25/g,"%2525")):decodeURIComponent(a):""}function Es(a,c,d){return typeof a=="string"?(a=encodeURI(a).replace(c,lT),d&&(a=a.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),a):null}function lT(a){return a=a.charCodeAt(0),"%"+(a>>4&15).toString(16)+(a&15).toString(16)}var Lp=/[#\/\?@]/g,uT=/[#\?:]/g,cT=/[#\?]/g,hT=/[#\?@]/g,dT=/#/g;function Ts(a,c){this.h=this.g=null,this.i=a||null,this.j=!!c}function $n(a){a.g||(a.g=new Map,a.h=0,a.i&&aT(a.i,function(c,d){a.add(decodeURIComponent(c.replace(/\+/g," ")),d)}))}t=Ts.prototype,t.add=function(a,c){$n(this),this.i=null,a=hi(this,a);var d=this.g.get(a);return d||this.g.set(a,d=[]),d.push(c),this.h+=1,this};function Mp(a,c){$n(a),c=hi(a,c),a.g.has(c)&&(a.i=null,a.h-=a.g.get(c).length,a.g.delete(c))}function jp(a,c){return $n(a),c=hi(a,c),a.g.has(c)}t.forEach=function(a,c){$n(this),this.g.forEach(function(d,y){d.forEach(function(O){a.call(c,O,y,this)},this)},this)},t.na=function(){$n(this);const a=Array.from(this.g.values()),c=Array.from(this.g.keys()),d=[];for(let y=0;y<c.length;y++){const O=a[y];for(let V=0;V<O.length;V++)d.push(c[y])}return d},t.V=function(a){$n(this);let c=[];if(typeof a=="string")jp(this,a)&&(c=c.concat(this.g.get(hi(this,a))));else{a=Array.from(this.g.values());for(let d=0;d<a.length;d++)c=c.concat(a[d])}return c},t.set=function(a,c){return $n(this),this.i=null,a=hi(this,a),jp(this,a)&&(this.h-=this.g.get(a).length),this.g.set(a,[c]),this.h+=1,this},t.get=function(a,c){return a?(a=this.V(a),0<a.length?String(a[0]):c):c};function Up(a,c,d){Mp(a,c),0<d.length&&(a.i=null,a.g.set(hi(a,c),x(d)),a.h+=d.length)}t.toString=function(){if(this.i)return this.i;if(!this.g)return"";const a=[],c=Array.from(this.g.keys());for(var d=0;d<c.length;d++){var y=c[d];const V=encodeURIComponent(String(y)),$=this.V(y);for(y=0;y<$.length;y++){var O=V;$[y]!==""&&(O+="="+encodeURIComponent(String($[y]))),a.push(O)}}return this.i=a.join("&")};function hi(a,c){return c=String(c),a.j&&(c=c.toLowerCase()),c}function fT(a,c){c&&!a.j&&($n(a),a.i=null,a.g.forEach(function(d,y){var O=y.toLowerCase();y!=O&&(Mp(this,y),Up(this,O,d))},a)),a.j=c}function pT(a,c){const d=new _s;if(l.Image){const y=new Image;y.onload=R(Wn,d,"TestLoadImage: loaded",!0,c,y),y.onerror=R(Wn,d,"TestLoadImage: error",!1,c,y),y.onabort=R(Wn,d,"TestLoadImage: abort",!1,c,y),y.ontimeout=R(Wn,d,"TestLoadImage: timeout",!1,c,y),l.setTimeout(function(){y.ontimeout&&y.ontimeout()},1e4),y.src=a}else c(!1)}function mT(a,c){const d=new _s,y=new AbortController,O=setTimeout(()=>{y.abort(),Wn(d,"TestPingServer: timeout",!1,c)},1e4);fetch(a,{signal:y.signal}).then(V=>{clearTimeout(O),V.ok?Wn(d,"TestPingServer: ok",!0,c):Wn(d,"TestPingServer: server error",!1,c)}).catch(()=>{clearTimeout(O),Wn(d,"TestPingServer: error",!1,c)})}function Wn(a,c,d,y,O){try{O&&(O.onload=null,O.onerror=null,O.onabort=null,O.ontimeout=null),y(d)}catch{}}function gT(){this.g=new J0}function yT(a,c,d){const y=d||"";try{Op(a,function(O,V){let $=O;h(O)&&($=Fu(O)),c.push(y+V+"="+encodeURIComponent($))})}catch(O){throw c.push(y+"type="+encodeURIComponent("_badmap")),O}}function ha(a){this.l=a.Ub||null,this.j=a.eb||!1}k(ha,Bu),ha.prototype.g=function(){return new da(this.l,this.j)},ha.prototype.i=function(a){return function(){return a}}({});function da(a,c){Je.call(this),this.D=a,this.o=c,this.m=void 0,this.status=this.readyState=0,this.responseType=this.responseText=this.response=this.statusText="",this.onreadystatechange=null,this.u=new Headers,this.h=null,this.B="GET",this.A="",this.g=!1,this.v=this.j=this.l=null}k(da,Je),t=da.prototype,t.open=function(a,c){if(this.readyState!=0)throw this.abort(),Error("Error reopening a connection");this.B=a,this.A=c,this.readyState=1,Ss(this)},t.send=function(a){if(this.readyState!=1)throw this.abort(),Error("need to call open() first. ");this.g=!0;const c={headers:this.u,method:this.B,credentials:this.m,cache:void 0};a&&(c.body=a),(this.D||l).fetch(new Request(this.A,c)).then(this.Sa.bind(this),this.ga.bind(this))},t.abort=function(){this.response=this.responseText="",this.u=new Headers,this.status=0,this.j&&this.j.cancel("Request was aborted.").catch(()=>{}),1<=this.readyState&&this.g&&this.readyState!=4&&(this.g=!1,Is(this)),this.readyState=0},t.Sa=function(a){if(this.g&&(this.l=a,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=a.headers,this.readyState=2,Ss(this)),this.g&&(this.readyState=3,Ss(this),this.g)))if(this.responseType==="arraybuffer")a.arrayBuffer().then(this.Qa.bind(this),this.ga.bind(this));else if(typeof l.ReadableStream<"u"&&"body"in a){if(this.j=a.body.getReader(),this.o){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=[]}else this.response=this.responseText="",this.v=new TextDecoder;Fp(this)}else a.text().then(this.Ra.bind(this),this.ga.bind(this))};function Fp(a){a.j.read().then(a.Pa.bind(a)).catch(a.ga.bind(a))}t.Pa=function(a){if(this.g){if(this.o&&a.value)this.response.push(a.value);else if(!this.o){var c=a.value?a.value:new Uint8Array(0);(c=this.v.decode(c,{stream:!a.done}))&&(this.response=this.responseText+=c)}a.done?Is(this):Ss(this),this.readyState==3&&Fp(this)}},t.Ra=function(a){this.g&&(this.response=this.responseText=a,Is(this))},t.Qa=function(a){this.g&&(this.response=a,Is(this))},t.ga=function(){this.g&&Is(this)};function Is(a){a.readyState=4,a.l=null,a.j=null,a.v=null,Ss(a)}t.setRequestHeader=function(a,c){this.u.append(a,c)},t.getResponseHeader=function(a){return this.h&&this.h.get(a.toLowerCase())||""},t.getAllResponseHeaders=function(){if(!this.h)return"";const a=[],c=this.h.entries();for(var d=c.next();!d.done;)d=d.value,a.push(d[0]+": "+d[1]),d=c.next();return a.join(`\r
`)};function Ss(a){a.onreadystatechange&&a.onreadystatechange.call(a)}Object.defineProperty(da.prototype,"withCredentials",{get:function(){return this.m==="include"},set:function(a){this.m=a?"include":"same-origin"}});function Bp(a){let c="";return U(a,function(d,y){c+=y,c+=":",c+=d,c+=`\r
`}),c}function Yu(a,c,d){e:{for(y in d){var y=!1;break e}y=!0}y||(d=Bp(d),typeof a=="string"?d!=null&&encodeURIComponent(String(d)):pe(a,c,d))}function Re(a){Je.call(this),this.headers=new Map,this.o=a||null,this.h=!1,this.v=this.g=null,this.D="",this.m=0,this.l="",this.j=this.B=this.u=this.A=!1,this.I=null,this.H="",this.J=!1}k(Re,Je);var _T=/^https?$/i,vT=["POST","PUT"];t=Re.prototype,t.Ha=function(a){this.J=a},t.ea=function(a,c,d,y){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.D+"; newUri="+a);c=c?c.toUpperCase():"GET",this.D=a,this.l="",this.m=0,this.A=!1,this.h=!0,this.g=this.o?this.o.g():Wu.g(),this.v=this.o?gp(this.o):gp(Wu),this.g.onreadystatechange=_(this.Ea,this);try{this.B=!0,this.g.open(c,String(a),!0),this.B=!1}catch(V){zp(this,V);return}if(a=d||"",d=new Map(this.headers),y)if(Object.getPrototypeOf(y)===Object.prototype)for(var O in y)d.set(O,y[O]);else if(typeof y.keys=="function"&&typeof y.get=="function")for(const V of y.keys())d.set(V,y.get(V));else throw Error("Unknown input type for opt_headers: "+String(y));y=Array.from(d.keys()).find(V=>V.toLowerCase()=="content-type"),O=l.FormData&&a instanceof l.FormData,!(0<=Array.prototype.indexOf.call(vT,c,void 0))||y||O||d.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");for(const[V,$]of d)this.g.setRequestHeader(V,$);this.H&&(this.g.responseType=this.H),"withCredentials"in this.g&&this.g.withCredentials!==this.J&&(this.g.withCredentials=this.J);try{qp(this),this.u=!0,this.g.send(a),this.u=!1}catch(V){zp(this,V)}};function zp(a,c){a.h=!1,a.g&&(a.j=!0,a.g.abort(),a.j=!1),a.l=c,a.m=5,$p(a),fa(a)}function $p(a){a.A||(a.A=!0,ut(a,"complete"),ut(a,"error"))}t.abort=function(a){this.g&&this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1,this.m=a||7,ut(this,"complete"),ut(this,"abort"),fa(this))},t.N=function(){this.g&&(this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1),fa(this,!0)),Re.aa.N.call(this)},t.Ea=function(){this.s||(this.B||this.u||this.j?Wp(this):this.bb())},t.bb=function(){Wp(this)};function Wp(a){if(a.h&&typeof o<"u"&&(!a.v[1]||En(a)!=4||a.Z()!=2)){if(a.u&&En(a)==4)dp(a.Ea,0,a);else if(ut(a,"readystatechange"),En(a)==4){a.h=!1;try{const $=a.Z();e:switch($){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var c=!0;break e;default:c=!1}var d;if(!(d=c)){var y;if(y=$===0){var O=String(a.D).match(bp)[1]||null;!O&&l.self&&l.self.location&&(O=l.self.location.protocol.slice(0,-1)),y=!_T.test(O?O.toLowerCase():"")}d=y}if(d)ut(a,"complete"),ut(a,"success");else{a.m=6;try{var V=2<En(a)?a.g.statusText:""}catch{V=""}a.l=V+" ["+a.Z()+"]",$p(a)}}finally{fa(a)}}}}function fa(a,c){if(a.g){qp(a);const d=a.g,y=a.v[0]?()=>{}:null;a.g=null,a.v=null,c||ut(a,"ready");try{d.onreadystatechange=y}catch{}}}function qp(a){a.I&&(l.clearTimeout(a.I),a.I=null)}t.isActive=function(){return!!this.g};function En(a){return a.g?a.g.readyState:0}t.Z=function(){try{return 2<En(this)?this.g.status:-1}catch{return-1}},t.oa=function(){try{return this.g?this.g.responseText:""}catch{return""}},t.Oa=function(a){if(this.g){var c=this.g.responseText;return a&&c.indexOf(a)==0&&(c=c.substring(a.length)),Y0(c)}};function Hp(a){try{if(!a.g)return null;if("response"in a.g)return a.g.response;switch(a.H){case"":case"text":return a.g.responseText;case"arraybuffer":if("mozResponseArrayBuffer"in a.g)return a.g.mozResponseArrayBuffer}return null}catch{return null}}function wT(a){const c={};a=(a.g&&2<=En(a)&&a.g.getAllResponseHeaders()||"").split(`\r
`);for(let y=0;y<a.length;y++){if(g(a[y]))continue;var d=P(a[y]);const O=d[0];if(d=d[1],typeof d!="string")continue;d=d.trim();const V=c[O]||[];c[O]=V,V.push(d)}I(c,function(y){return y.join(", ")})}t.Ba=function(){return this.m},t.Ka=function(){return typeof this.l=="string"?this.l:String(this.l)};function Rs(a,c,d){return d&&d.internalChannelParams&&d.internalChannelParams[a]||c}function Kp(a){this.Aa=0,this.i=[],this.j=new _s,this.ia=this.qa=this.I=this.W=this.g=this.ya=this.D=this.H=this.m=this.S=this.o=null,this.Ya=this.U=0,this.Va=Rs("failFast",!1,a),this.F=this.C=this.u=this.s=this.l=null,this.X=!0,this.za=this.T=-1,this.Y=this.v=this.B=0,this.Ta=Rs("baseRetryDelayMs",5e3,a),this.cb=Rs("retryDelaySeedMs",1e4,a),this.Wa=Rs("forwardChannelMaxRetries",2,a),this.wa=Rs("forwardChannelRequestTimeoutMs",2e4,a),this.pa=a&&a.xmlHttpFactory||void 0,this.Xa=a&&a.Tb||void 0,this.Ca=a&&a.useFetchStreams||!1,this.L=void 0,this.J=a&&a.supportsCrossDomainXhr||!1,this.K="",this.h=new Cp(a&&a.concurrentRequestLimit),this.Da=new gT,this.P=a&&a.fastHandshake||!1,this.O=a&&a.encodeInitMessageHeaders||!1,this.P&&this.O&&(this.O=!1),this.Ua=a&&a.Rb||!1,a&&a.xa&&this.j.xa(),a&&a.forceLongPolling&&(this.X=!1),this.ba=!this.P&&this.X&&a&&a.detectBufferingProxy||!1,this.ja=void 0,a&&a.longPollingTimeout&&0<a.longPollingTimeout&&(this.ja=a.longPollingTimeout),this.ca=void 0,this.R=0,this.M=!1,this.ka=this.A=null}t=Kp.prototype,t.la=8,t.G=1,t.connect=function(a,c,d,y){ct(0),this.W=a,this.H=c||{},d&&y!==void 0&&(this.H.OSID=d,this.H.OAID=y),this.F=this.X,this.I=nm(this,null,this.W),ma(this)};function Ju(a){if(Gp(a),a.G==3){var c=a.U++,d=wn(a.I);if(pe(d,"SID",a.K),pe(d,"RID",c),pe(d,"TYPE","terminate"),As(a,d),c=new zn(a,a.j,c),c.L=2,c.v=ca(wn(d)),d=!1,l.navigator&&l.navigator.sendBeacon)try{d=l.navigator.sendBeacon(c.v.toString(),"")}catch{}!d&&l.Image&&(new Image().src=c.v,d=!0),d||(c.g=rm(c.j,null),c.g.ea(c.v)),c.F=Date.now(),aa(c)}tm(a)}function pa(a){a.g&&(ec(a),a.g.cancel(),a.g=null)}function Gp(a){pa(a),a.u&&(l.clearTimeout(a.u),a.u=null),ga(a),a.h.cancel(),a.s&&(typeof a.s=="number"&&l.clearTimeout(a.s),a.s=null)}function ma(a){if(!Pp(a.h)&&!a.s){a.s=!0;var c=a.Ga;Le||z(),q||(Le(),q=!0),L.add(c,a),a.B=0}}function ET(a,c){return xp(a.h)>=a.h.j-(a.s?1:0)?!1:a.s?(a.i=c.D.concat(a.i),!0):a.G==1||a.G==2||a.B>=(a.Va?0:a.Wa)?!1:(a.s=ys(_(a.Ga,a,c),em(a,a.B)),a.B++,!0)}t.Ga=function(a){if(this.s)if(this.s=null,this.G==1){if(!a){this.U=Math.floor(1e5*Math.random()),a=this.U++;const O=new zn(this,this.j,a);let V=this.o;if(this.S&&(V?(V=v(V),S(V,this.S)):V=this.S),this.m!==null||this.O||(O.H=V,V=null),this.P)e:{for(var c=0,d=0;d<this.i.length;d++){t:{var y=this.i[d];if("__data__"in y.map&&(y=y.map.__data__,typeof y=="string")){y=y.length;break t}y=void 0}if(y===void 0)break;if(c+=y,4096<c){c=d;break e}if(c===4096||d===this.i.length-1){c=d+1;break e}}c=1e3}else c=1e3;c=Xp(this,O,c),d=wn(this.I),pe(d,"RID",a),pe(d,"CVER",22),this.D&&pe(d,"X-HTTP-Session-Id",this.D),As(this,d),V&&(this.O?c="headers="+encodeURIComponent(String(Bp(V)))+"&"+c:this.m&&Yu(d,this.m,V)),Xu(this.h,O),this.Ua&&pe(d,"TYPE","init"),this.P?(pe(d,"$req",c),pe(d,"SID","null"),O.T=!0,Hu(O,d,null)):Hu(O,d,c),this.G=2}}else this.G==3&&(a?Qp(this,a):this.i.length==0||Pp(this.h)||Qp(this))};function Qp(a,c){var d;c?d=c.l:d=a.U++;const y=wn(a.I);pe(y,"SID",a.K),pe(y,"RID",d),pe(y,"AID",a.T),As(a,y),a.m&&a.o&&Yu(y,a.m,a.o),d=new zn(a,a.j,d,a.B+1),a.m===null&&(d.H=a.o),c&&(a.i=c.D.concat(a.i)),c=Xp(a,d,1e3),d.I=Math.round(.5*a.wa)+Math.round(.5*a.wa*Math.random()),Xu(a.h,d),Hu(d,y,c)}function As(a,c){a.H&&U(a.H,function(d,y){pe(c,y,d)}),a.l&&Op({},function(d,y){pe(c,y,d)})}function Xp(a,c,d){d=Math.min(a.i.length,d);var y=a.l?_(a.l.Na,a.l,a):null;e:{var O=a.i;let V=-1;for(;;){const $=["count="+d];V==-1?0<d?(V=O[0].g,$.push("ofs="+V)):V=0:$.push("ofs="+V);let de=!0;for(let We=0;We<d;We++){let ae=O[We].g;const Ze=O[We].map;if(ae-=V,0>ae)V=Math.max(0,O[We].g-100),de=!1;else try{yT(Ze,$,"req"+ae+"_")}catch{y&&y(Ze)}}if(de){y=$.join("&");break e}}}return a=a.i.splice(0,d),c.D=a,y}function Yp(a){if(!a.g&&!a.u){a.Y=1;var c=a.Fa;Le||z(),q||(Le(),q=!0),L.add(c,a),a.v=0}}function Zu(a){return a.g||a.u||3<=a.v?!1:(a.Y++,a.u=ys(_(a.Fa,a),em(a,a.v)),a.v++,!0)}t.Fa=function(){if(this.u=null,Jp(this),this.ba&&!(this.M||this.g==null||0>=this.R)){var a=2*this.R;this.j.info("BP detection timer enabled: "+a),this.A=ys(_(this.ab,this),a)}},t.ab=function(){this.A&&(this.A=null,this.j.info("BP detection timeout reached."),this.j.info("Buffering proxy detected and switch to long-polling!"),this.F=!1,this.M=!0,ct(10),pa(this),Jp(this))};function ec(a){a.A!=null&&(l.clearTimeout(a.A),a.A=null)}function Jp(a){a.g=new zn(a,a.j,"rpc",a.Y),a.m===null&&(a.g.H=a.o),a.g.O=0;var c=wn(a.qa);pe(c,"RID","rpc"),pe(c,"SID",a.K),pe(c,"AID",a.T),pe(c,"CI",a.F?"0":"1"),!a.F&&a.ja&&pe(c,"TO",a.ja),pe(c,"TYPE","xmlhttp"),As(a,c),a.m&&a.o&&Yu(c,a.m,a.o),a.L&&(a.g.I=a.L);var d=a.g;a=a.ia,d.L=1,d.v=ca(wn(c)),d.m=null,d.P=!0,Rp(d,a)}t.Za=function(){this.C!=null&&(this.C=null,pa(this),Zu(this),ct(19))};function ga(a){a.C!=null&&(l.clearTimeout(a.C),a.C=null)}function Zp(a,c){var d=null;if(a.g==c){ga(a),ec(a),a.g=null;var y=2}else if(Qu(a.h,c))d=c.D,Np(a.h,c),y=1;else return;if(a.G!=0){if(c.o)if(y==1){d=c.m?c.m.length:0,c=Date.now()-c.F;var O=a.B;y=ia(),ut(y,new Ep(y,d)),ma(a)}else Yp(a);else if(O=c.s,O==3||O==0&&0<c.X||!(y==1&&ET(a,c)||y==2&&Zu(a)))switch(d&&0<d.length&&(c=a.h,c.i=c.i.concat(d)),O){case 1:Nr(a,5);break;case 4:Nr(a,10);break;case 3:Nr(a,6);break;default:Nr(a,2)}}}function em(a,c){let d=a.Ta+Math.floor(Math.random()*a.cb);return a.isActive()||(d*=2),d*c}function Nr(a,c){if(a.j.info("Error code "+c),c==2){var d=_(a.fb,a),y=a.Xa;const O=!y;y=new xr(y||"//www.google.com/images/cleardot.gif"),l.location&&l.location.protocol=="http"||la(y,"https"),ca(y),O?pT(y.toString(),d):mT(y.toString(),d)}else ct(2);a.G=0,a.l&&a.l.sa(c),tm(a),Gp(a)}t.fb=function(a){a?(this.j.info("Successfully pinged google.com"),ct(2)):(this.j.info("Failed to ping google.com"),ct(1))};function tm(a){if(a.G=0,a.ka=[],a.l){const c=Dp(a.h);(c.length!=0||a.i.length!=0)&&(C(a.ka,c),C(a.ka,a.i),a.h.i.length=0,x(a.i),a.i.length=0),a.l.ra()}}function nm(a,c,d){var y=d instanceof xr?wn(d):new xr(d);if(y.g!="")c&&(y.g=c+"."+y.g),ua(y,y.s);else{var O=l.location;y=O.protocol,c=c?c+"."+O.hostname:O.hostname,O=+O.port;var V=new xr(null);y&&la(V,y),c&&(V.g=c),O&&ua(V,O),d&&(V.l=d),y=V}return d=a.D,c=a.ya,d&&c&&pe(y,d,c),pe(y,"VER",a.la),As(a,y),y}function rm(a,c,d){if(c&&!a.J)throw Error("Can't create secondary domain capable XhrIo object.");return c=a.Ca&&!a.pa?new Re(new ha({eb:d})):new Re(a.pa),c.Ha(a.J),c}t.isActive=function(){return!!this.l&&this.l.isActive(this)};function im(){}t=im.prototype,t.ua=function(){},t.ta=function(){},t.sa=function(){},t.ra=function(){},t.isActive=function(){return!0},t.Na=function(){};function ya(){}ya.prototype.g=function(a,c){return new Tt(a,c)};function Tt(a,c){Je.call(this),this.g=new Kp(c),this.l=a,this.h=c&&c.messageUrlParams||null,a=c&&c.messageHeaders||null,c&&c.clientProtocolHeaderRequired&&(a?a["X-Client-Protocol"]="webchannel":a={"X-Client-Protocol":"webchannel"}),this.g.o=a,a=c&&c.initMessageHeaders||null,c&&c.messageContentType&&(a?a["X-WebChannel-Content-Type"]=c.messageContentType:a={"X-WebChannel-Content-Type":c.messageContentType}),c&&c.va&&(a?a["X-WebChannel-Client-Profile"]=c.va:a={"X-WebChannel-Client-Profile":c.va}),this.g.S=a,(a=c&&c.Sb)&&!g(a)&&(this.g.m=a),this.v=c&&c.supportsCrossDomainXhr||!1,this.u=c&&c.sendRawJson||!1,(c=c&&c.httpSessionIdParam)&&!g(c)&&(this.g.D=c,a=this.h,a!==null&&c in a&&(a=this.h,c in a&&delete a[c])),this.j=new di(this)}k(Tt,Je),Tt.prototype.m=function(){this.g.l=this.j,this.v&&(this.g.J=!0),this.g.connect(this.l,this.h||void 0)},Tt.prototype.close=function(){Ju(this.g)},Tt.prototype.o=function(a){var c=this.g;if(typeof a=="string"){var d={};d.__data__=a,a=d}else this.u&&(d={},d.__data__=Fu(a),a=d);c.i.push(new iT(c.Ya++,a)),c.G==3&&ma(c)},Tt.prototype.N=function(){this.g.l=null,delete this.j,Ju(this.g),delete this.g,Tt.aa.N.call(this)};function sm(a){zu.call(this),a.__headers__&&(this.headers=a.__headers__,this.statusCode=a.__status__,delete a.__headers__,delete a.__status__);var c=a.__sm__;if(c){e:{for(const d in c){a=d;break e}a=void 0}(this.i=a)&&(a=this.i,c=c!==null&&a in c?c[a]:void 0),this.data=c}else this.data=a}k(sm,zu);function om(){$u.call(this),this.status=1}k(om,$u);function di(a){this.g=a}k(di,im),di.prototype.ua=function(){ut(this.g,"a")},di.prototype.ta=function(a){ut(this.g,new sm(a))},di.prototype.sa=function(a){ut(this.g,new om)},di.prototype.ra=function(){ut(this.g,"b")},ya.prototype.createWebChannel=ya.prototype.g,Tt.prototype.send=Tt.prototype.o,Tt.prototype.open=Tt.prototype.m,Tt.prototype.close=Tt.prototype.close,cE=function(){return new ya},uE=function(){return ia()},lE=Cr,Kh={mb:0,pb:1,qb:2,Jb:3,Ob:4,Lb:5,Mb:6,Kb:7,Ib:8,Nb:9,PROXY:10,NOPROXY:11,Gb:12,Cb:13,Db:14,Bb:15,Eb:16,Fb:17,ib:18,hb:19,jb:20},sa.NO_ERROR=0,sa.TIMEOUT=8,sa.HTTP_ERROR=6,sl=sa,Tp.COMPLETE="complete",aE=Tp,yp.EventType=ms,ms.OPEN="a",ms.CLOSE="b",ms.ERROR="c",ms.MESSAGE="d",Je.prototype.listen=Je.prototype.K,zs=yp,Re.prototype.listenOnce=Re.prototype.L,Re.prototype.getLastError=Re.prototype.Ka,Re.prototype.getLastErrorCode=Re.prototype.Ba,Re.prototype.getStatus=Re.prototype.Z,Re.prototype.getResponseJson=Re.prototype.Oa,Re.prototype.getResponseText=Re.prototype.oa,Re.prototype.send=Re.prototype.ea,Re.prototype.setWithCredentials=Re.prototype.Ha,oE=Re}).apply(typeof Ma<"u"?Ma:typeof self<"u"?self:typeof window<"u"?window:{});const Zg="@firebase/firestore";/**
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
 */class it{constructor(e){this.uid=e}isAuthenticated(){return this.uid!=null}toKey(){return this.isAuthenticated()?"uid:"+this.uid:"anonymous-user"}isEqual(e){return e.uid===this.uid}}it.UNAUTHENTICATED=new it(null),it.GOOGLE_CREDENTIALS=new it("google-credentials-uid"),it.FIRST_PARTY=new it("first-party-uid"),it.MOCK_USER=new it("mock-user");/**
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
 */let us="10.14.0";/**
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
 */const ei=new lf("@firebase/firestore");function Ls(){return ei.logLevel}function G(t,...e){if(ei.logLevel<=ie.DEBUG){const n=e.map(Tf);ei.debug(`Firestore (${us}): ${t}`,...n)}}function jn(t,...e){if(ei.logLevel<=ie.ERROR){const n=e.map(Tf);ei.error(`Firestore (${us}): ${t}`,...n)}}function Qi(t,...e){if(ei.logLevel<=ie.WARN){const n=e.map(Tf);ei.warn(`Firestore (${us}): ${t}`,...n)}}function Tf(t){if(typeof t=="string")return t;try{/**
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
*/return function(n){return JSON.stringify(n)}(t)}catch{return t}}/**
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
 */function J(t="Unexpected state"){const e=`FIRESTORE (${us}) INTERNAL ASSERTION FAILED: `+t;throw jn(e),new Error(e)}function he(t,e){t||J()}function ee(t,e){return t}/**
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
 */const M={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class K extends gn{constructor(e,n){super(e,n),this.code=e,this.message=n,this.toString=()=>`${this.name}: [code=${this.code}]: ${this.message}`}}/**
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
 */class Wr{constructor(){this.promise=new Promise((e,n)=>{this.resolve=e,this.reject=n})}}/**
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
 */class hE{constructor(e,n){this.user=n,this.type="OAuth",this.headers=new Map,this.headers.set("Authorization",`Bearer ${e}`)}}class bP{getToken(){return Promise.resolve(null)}invalidateToken(){}start(e,n){e.enqueueRetryable(()=>n(it.UNAUTHENTICATED))}shutdown(){}}class VP{constructor(e){this.token=e,this.changeListener=null}getToken(){return Promise.resolve(this.token)}invalidateToken(){}start(e,n){this.changeListener=n,e.enqueueRetryable(()=>n(this.token.user))}shutdown(){this.changeListener=null}}class LP{constructor(e){this.t=e,this.currentUser=it.UNAUTHENTICATED,this.i=0,this.forceRefresh=!1,this.auth=null}start(e,n){he(this.o===void 0);let r=this.i;const i=u=>this.i!==r?(r=this.i,n(u)):Promise.resolve();let s=new Wr;this.o=()=>{this.i++,this.currentUser=this.u(),s.resolve(),s=new Wr,e.enqueueRetryable(()=>i(this.currentUser))};const o=()=>{const u=s;e.enqueueRetryable(async()=>{await u.promise,await i(this.currentUser)})},l=u=>{G("FirebaseAuthCredentialsProvider","Auth detected"),this.auth=u,this.o&&(this.auth.addAuthTokenListener(this.o),o())};this.t.onInit(u=>l(u)),setTimeout(()=>{if(!this.auth){const u=this.t.getImmediate({optional:!0});u?l(u):(G("FirebaseAuthCredentialsProvider","Auth not yet detected"),s.resolve(),s=new Wr)}},0),o()}getToken(){const e=this.i,n=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(n).then(r=>this.i!==e?(G("FirebaseAuthCredentialsProvider","getToken aborted due to token change."),this.getToken()):r?(he(typeof r.accessToken=="string"),new hE(r.accessToken,this.currentUser)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.auth&&this.o&&this.auth.removeAuthTokenListener(this.o),this.o=void 0}u(){const e=this.auth&&this.auth.getUid();return he(e===null||typeof e=="string"),new it(e)}}class MP{constructor(e,n,r){this.l=e,this.h=n,this.P=r,this.type="FirstParty",this.user=it.FIRST_PARTY,this.I=new Map}T(){return this.P?this.P():null}get headers(){this.I.set("X-Goog-AuthUser",this.l);const e=this.T();return e&&this.I.set("Authorization",e),this.h&&this.I.set("X-Goog-Iam-Authorization-Token",this.h),this.I}}class jP{constructor(e,n,r){this.l=e,this.h=n,this.P=r}getToken(){return Promise.resolve(new MP(this.l,this.h,this.P))}start(e,n){e.enqueueRetryable(()=>n(it.FIRST_PARTY))}shutdown(){}invalidateToken(){}}class UP{constructor(e){this.value=e,this.type="AppCheck",this.headers=new Map,e&&e.length>0&&this.headers.set("x-firebase-appcheck",this.value)}}class FP{constructor(e){this.A=e,this.forceRefresh=!1,this.appCheck=null,this.R=null}start(e,n){he(this.o===void 0);const r=s=>{s.error!=null&&G("FirebaseAppCheckTokenProvider",`Error getting App Check token; using placeholder token instead. Error: ${s.error.message}`);const o=s.token!==this.R;return this.R=s.token,G("FirebaseAppCheckTokenProvider",`Received ${o?"new":"existing"} token.`),o?n(s.token):Promise.resolve()};this.o=s=>{e.enqueueRetryable(()=>r(s))};const i=s=>{G("FirebaseAppCheckTokenProvider","AppCheck detected"),this.appCheck=s,this.o&&this.appCheck.addTokenListener(this.o)};this.A.onInit(s=>i(s)),setTimeout(()=>{if(!this.appCheck){const s=this.A.getImmediate({optional:!0});s?i(s):G("FirebaseAppCheckTokenProvider","AppCheck not yet detected")}},0)}getToken(){const e=this.forceRefresh;return this.forceRefresh=!1,this.appCheck?this.appCheck.getToken(e).then(n=>n?(he(typeof n.token=="string"),this.R=n.token,new UP(n.token)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.appCheck&&this.o&&this.appCheck.removeTokenListener(this.o),this.o=void 0}}/**
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
 */function BP(t){const e=typeof self<"u"&&(self.crypto||self.msCrypto),n=new Uint8Array(t);if(e&&typeof e.getRandomValues=="function")e.getRandomValues(n);else for(let r=0;r<t;r++)n[r]=Math.floor(256*Math.random());return n}/**
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
 */class dE{static newId(){const e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",n=Math.floor(256/e.length)*e.length;let r="";for(;r.length<20;){const i=BP(40);for(let s=0;s<i.length;++s)r.length<20&&i[s]<n&&(r+=e.charAt(i[s]%e.length))}return r}}function le(t,e){return t<e?-1:t>e?1:0}function Xi(t,e,n){return t.length===e.length&&t.every((r,i)=>n(r,e[i]))}/**
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
 */class Ue{constructor(e,n){if(this.seconds=e,this.nanoseconds=n,n<0)throw new K(M.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+n);if(n>=1e9)throw new K(M.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+n);if(e<-62135596800)throw new K(M.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e);if(e>=253402300800)throw new K(M.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e)}static now(){return Ue.fromMillis(Date.now())}static fromDate(e){return Ue.fromMillis(e.getTime())}static fromMillis(e){const n=Math.floor(e/1e3),r=Math.floor(1e6*(e-1e3*n));return new Ue(n,r)}toDate(){return new Date(this.toMillis())}toMillis(){return 1e3*this.seconds+this.nanoseconds/1e6}_compareTo(e){return this.seconds===e.seconds?le(this.nanoseconds,e.nanoseconds):le(this.seconds,e.seconds)}isEqual(e){return e.seconds===this.seconds&&e.nanoseconds===this.nanoseconds}toString(){return"Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")"}toJSON(){return{seconds:this.seconds,nanoseconds:this.nanoseconds}}valueOf(){const e=this.seconds- -62135596800;return String(e).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0")}}/**
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
 */class Z{constructor(e){this.timestamp=e}static fromTimestamp(e){return new Z(e)}static min(){return new Z(new Ue(0,0))}static max(){return new Z(new Ue(253402300799,999999999))}compareTo(e){return this.timestamp._compareTo(e.timestamp)}isEqual(e){return this.timestamp.isEqual(e.timestamp)}toMicroseconds(){return 1e6*this.timestamp.seconds+this.timestamp.nanoseconds/1e3}toString(){return"SnapshotVersion("+this.timestamp.toString()+")"}toTimestamp(){return this.timestamp}}/**
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
 */class Po{constructor(e,n,r){n===void 0?n=0:n>e.length&&J(),r===void 0?r=e.length-n:r>e.length-n&&J(),this.segments=e,this.offset=n,this.len=r}get length(){return this.len}isEqual(e){return Po.comparator(this,e)===0}child(e){const n=this.segments.slice(this.offset,this.limit());return e instanceof Po?e.forEach(r=>{n.push(r)}):n.push(e),this.construct(n)}limit(){return this.offset+this.length}popFirst(e){return e=e===void 0?1:e,this.construct(this.segments,this.offset+e,this.length-e)}popLast(){return this.construct(this.segments,this.offset,this.length-1)}firstSegment(){return this.segments[this.offset]}lastSegment(){return this.get(this.length-1)}get(e){return this.segments[this.offset+e]}isEmpty(){return this.length===0}isPrefixOf(e){if(e.length<this.length)return!1;for(let n=0;n<this.length;n++)if(this.get(n)!==e.get(n))return!1;return!0}isImmediateParentOf(e){if(this.length+1!==e.length)return!1;for(let n=0;n<this.length;n++)if(this.get(n)!==e.get(n))return!1;return!0}forEach(e){for(let n=this.offset,r=this.limit();n<r;n++)e(this.segments[n])}toArray(){return this.segments.slice(this.offset,this.limit())}static comparator(e,n){const r=Math.min(e.length,n.length);for(let i=0;i<r;i++){const s=e.get(i),o=n.get(i);if(s<o)return-1;if(s>o)return 1}return e.length<n.length?-1:e.length>n.length?1:0}}class ge extends Po{construct(e,n,r){return new ge(e,n,r)}canonicalString(){return this.toArray().join("/")}toString(){return this.canonicalString()}toUriEncodedString(){return this.toArray().map(encodeURIComponent).join("/")}static fromString(...e){const n=[];for(const r of e){if(r.indexOf("//")>=0)throw new K(M.INVALID_ARGUMENT,`Invalid segment (${r}). Paths must not contain // in them.`);n.push(...r.split("/").filter(i=>i.length>0))}return new ge(n)}static emptyPath(){return new ge([])}}const zP=/^[_a-zA-Z][_a-zA-Z0-9]*$/;class Ke extends Po{construct(e,n,r){return new Ke(e,n,r)}static isValidIdentifier(e){return zP.test(e)}canonicalString(){return this.toArray().map(e=>(e=e.replace(/\\/g,"\\\\").replace(/`/g,"\\`"),Ke.isValidIdentifier(e)||(e="`"+e+"`"),e)).join(".")}toString(){return this.canonicalString()}isKeyField(){return this.length===1&&this.get(0)==="__name__"}static keyField(){return new Ke(["__name__"])}static fromServerFormat(e){const n=[];let r="",i=0;const s=()=>{if(r.length===0)throw new K(M.INVALID_ARGUMENT,`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);n.push(r),r=""};let o=!1;for(;i<e.length;){const l=e[i];if(l==="\\"){if(i+1===e.length)throw new K(M.INVALID_ARGUMENT,"Path has trailing escape character: "+e);const u=e[i+1];if(u!=="\\"&&u!=="."&&u!=="`")throw new K(M.INVALID_ARGUMENT,"Path has invalid escape sequence: "+e);r+=u,i+=2}else l==="`"?(o=!o,i++):l!=="."||o?(r+=l,i++):(s(),i++)}if(s(),o)throw new K(M.INVALID_ARGUMENT,"Unterminated ` in path: "+e);return new Ke(n)}static emptyPath(){return new Ke([])}}/**
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
 */class Q{constructor(e){this.path=e}static fromPath(e){return new Q(ge.fromString(e))}static fromName(e){return new Q(ge.fromString(e).popFirst(5))}static empty(){return new Q(ge.emptyPath())}get collectionGroup(){return this.path.popLast().lastSegment()}hasCollectionId(e){return this.path.length>=2&&this.path.get(this.path.length-2)===e}getCollectionGroup(){return this.path.get(this.path.length-2)}getCollectionPath(){return this.path.popLast()}isEqual(e){return e!==null&&ge.comparator(this.path,e.path)===0}toString(){return this.path.toString()}static comparator(e,n){return ge.comparator(e.path,n.path)}static isDocumentKey(e){return e.length%2==0}static fromSegments(e){return new Q(new ge(e.slice()))}}function $P(t,e){const n=t.toTimestamp().seconds,r=t.toTimestamp().nanoseconds+1,i=Z.fromTimestamp(r===1e9?new Ue(n+1,0):new Ue(n,r));return new Er(i,Q.empty(),e)}function WP(t){return new Er(t.readTime,t.key,-1)}class Er{constructor(e,n,r){this.readTime=e,this.documentKey=n,this.largestBatchId=r}static min(){return new Er(Z.min(),Q.empty(),-1)}static max(){return new Er(Z.max(),Q.empty(),-1)}}function qP(t,e){let n=t.readTime.compareTo(e.readTime);return n!==0?n:(n=Q.comparator(t.documentKey,e.documentKey),n!==0?n:le(t.largestBatchId,e.largestBatchId))}/**
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
 */const HP="The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.";class KP{constructor(){this.onCommittedListeners=[]}addOnCommittedListener(e){this.onCommittedListeners.push(e)}raiseOnCommittedEvent(){this.onCommittedListeners.forEach(e=>e())}}/**
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
 */async function Ko(t){if(t.code!==M.FAILED_PRECONDITION||t.message!==HP)throw t;G("LocalStore","Unexpectedly lost primary lease")}/**
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
 */class F{constructor(e){this.nextCallback=null,this.catchCallback=null,this.result=void 0,this.error=void 0,this.isDone=!1,this.callbackAttached=!1,e(n=>{this.isDone=!0,this.result=n,this.nextCallback&&this.nextCallback(n)},n=>{this.isDone=!0,this.error=n,this.catchCallback&&this.catchCallback(n)})}catch(e){return this.next(void 0,e)}next(e,n){return this.callbackAttached&&J(),this.callbackAttached=!0,this.isDone?this.error?this.wrapFailure(n,this.error):this.wrapSuccess(e,this.result):new F((r,i)=>{this.nextCallback=s=>{this.wrapSuccess(e,s).next(r,i)},this.catchCallback=s=>{this.wrapFailure(n,s).next(r,i)}})}toPromise(){return new Promise((e,n)=>{this.next(e,n)})}wrapUserFunction(e){try{const n=e();return n instanceof F?n:F.resolve(n)}catch(n){return F.reject(n)}}wrapSuccess(e,n){return e?this.wrapUserFunction(()=>e(n)):F.resolve(n)}wrapFailure(e,n){return e?this.wrapUserFunction(()=>e(n)):F.reject(n)}static resolve(e){return new F((n,r)=>{n(e)})}static reject(e){return new F((n,r)=>{r(e)})}static waitFor(e){return new F((n,r)=>{let i=0,s=0,o=!1;e.forEach(l=>{++i,l.next(()=>{++s,o&&s===i&&n()},u=>r(u))}),o=!0,s===i&&n()})}static or(e){let n=F.resolve(!1);for(const r of e)n=n.next(i=>i?F.resolve(i):r());return n}static forEach(e,n){const r=[];return e.forEach((i,s)=>{r.push(n.call(this,i,s))}),this.waitFor(r)}static mapArray(e,n){return new F((r,i)=>{const s=e.length,o=new Array(s);let l=0;for(let u=0;u<s;u++){const h=u;n(e[h]).next(f=>{o[h]=f,++l,l===s&&r(o)},f=>i(f))}})}static doWhile(e,n){return new F((r,i)=>{const s=()=>{e()===!0?n().next(()=>{s()},i):r()};s()})}}function GP(t){const e=t.match(/Android ([\d.]+)/i),n=e?e[1].split(".").slice(0,2).join("."):"-1";return Number(n)}function Go(t){return t.name==="IndexedDbTransactionError"}/**
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
 */class If{constructor(e,n){this.previousValue=e,n&&(n.sequenceNumberHandler=r=>this.ie(r),this.se=r=>n.writeSequenceNumber(r))}ie(e){return this.previousValue=Math.max(e,this.previousValue),this.previousValue}next(){const e=++this.previousValue;return this.se&&this.se(e),e}}If.oe=-1;function Tu(t){return t==null}function Wl(t){return t===0&&1/t==-1/0}function QP(t){return typeof t=="number"&&Number.isInteger(t)&&!Wl(t)&&t<=Number.MAX_SAFE_INTEGER&&t>=Number.MIN_SAFE_INTEGER}/**
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
 */function ey(t){let e=0;for(const n in t)Object.prototype.hasOwnProperty.call(t,n)&&e++;return e}function cs(t,e){for(const n in t)Object.prototype.hasOwnProperty.call(t,n)&&e(n,t[n])}function fE(t){for(const e in t)if(Object.prototype.hasOwnProperty.call(t,e))return!1;return!0}/**
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
 */class Se{constructor(e,n){this.comparator=e,this.root=n||He.EMPTY}insert(e,n){return new Se(this.comparator,this.root.insert(e,n,this.comparator).copy(null,null,He.BLACK,null,null))}remove(e){return new Se(this.comparator,this.root.remove(e,this.comparator).copy(null,null,He.BLACK,null,null))}get(e){let n=this.root;for(;!n.isEmpty();){const r=this.comparator(e,n.key);if(r===0)return n.value;r<0?n=n.left:r>0&&(n=n.right)}return null}indexOf(e){let n=0,r=this.root;for(;!r.isEmpty();){const i=this.comparator(e,r.key);if(i===0)return n+r.left.size;i<0?r=r.left:(n+=r.left.size+1,r=r.right)}return-1}isEmpty(){return this.root.isEmpty()}get size(){return this.root.size}minKey(){return this.root.minKey()}maxKey(){return this.root.maxKey()}inorderTraversal(e){return this.root.inorderTraversal(e)}forEach(e){this.inorderTraversal((n,r)=>(e(n,r),!1))}toString(){const e=[];return this.inorderTraversal((n,r)=>(e.push(`${n}:${r}`),!1)),`{${e.join(", ")}}`}reverseTraversal(e){return this.root.reverseTraversal(e)}getIterator(){return new ja(this.root,null,this.comparator,!1)}getIteratorFrom(e){return new ja(this.root,e,this.comparator,!1)}getReverseIterator(){return new ja(this.root,null,this.comparator,!0)}getReverseIteratorFrom(e){return new ja(this.root,e,this.comparator,!0)}}class ja{constructor(e,n,r,i){this.isReverse=i,this.nodeStack=[];let s=1;for(;!e.isEmpty();)if(s=n?r(e.key,n):1,n&&i&&(s*=-1),s<0)e=this.isReverse?e.left:e.right;else{if(s===0){this.nodeStack.push(e);break}this.nodeStack.push(e),e=this.isReverse?e.right:e.left}}getNext(){let e=this.nodeStack.pop();const n={key:e.key,value:e.value};if(this.isReverse)for(e=e.left;!e.isEmpty();)this.nodeStack.push(e),e=e.right;else for(e=e.right;!e.isEmpty();)this.nodeStack.push(e),e=e.left;return n}hasNext(){return this.nodeStack.length>0}peek(){if(this.nodeStack.length===0)return null;const e=this.nodeStack[this.nodeStack.length-1];return{key:e.key,value:e.value}}}class He{constructor(e,n,r,i,s){this.key=e,this.value=n,this.color=r??He.RED,this.left=i??He.EMPTY,this.right=s??He.EMPTY,this.size=this.left.size+1+this.right.size}copy(e,n,r,i,s){return new He(e??this.key,n??this.value,r??this.color,i??this.left,s??this.right)}isEmpty(){return!1}inorderTraversal(e){return this.left.inorderTraversal(e)||e(this.key,this.value)||this.right.inorderTraversal(e)}reverseTraversal(e){return this.right.reverseTraversal(e)||e(this.key,this.value)||this.left.reverseTraversal(e)}min(){return this.left.isEmpty()?this:this.left.min()}minKey(){return this.min().key}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey()}insert(e,n,r){let i=this;const s=r(e,i.key);return i=s<0?i.copy(null,null,null,i.left.insert(e,n,r),null):s===0?i.copy(null,n,null,null,null):i.copy(null,null,null,null,i.right.insert(e,n,r)),i.fixUp()}removeMin(){if(this.left.isEmpty())return He.EMPTY;let e=this;return e.left.isRed()||e.left.left.isRed()||(e=e.moveRedLeft()),e=e.copy(null,null,null,e.left.removeMin(),null),e.fixUp()}remove(e,n){let r,i=this;if(n(e,i.key)<0)i.left.isEmpty()||i.left.isRed()||i.left.left.isRed()||(i=i.moveRedLeft()),i=i.copy(null,null,null,i.left.remove(e,n),null);else{if(i.left.isRed()&&(i=i.rotateRight()),i.right.isEmpty()||i.right.isRed()||i.right.left.isRed()||(i=i.moveRedRight()),n(e,i.key)===0){if(i.right.isEmpty())return He.EMPTY;r=i.right.min(),i=i.copy(r.key,r.value,null,null,i.right.removeMin())}i=i.copy(null,null,null,null,i.right.remove(e,n))}return i.fixUp()}isRed(){return this.color}fixUp(){let e=this;return e.right.isRed()&&!e.left.isRed()&&(e=e.rotateLeft()),e.left.isRed()&&e.left.left.isRed()&&(e=e.rotateRight()),e.left.isRed()&&e.right.isRed()&&(e=e.colorFlip()),e}moveRedLeft(){let e=this.colorFlip();return e.right.left.isRed()&&(e=e.copy(null,null,null,null,e.right.rotateRight()),e=e.rotateLeft(),e=e.colorFlip()),e}moveRedRight(){let e=this.colorFlip();return e.left.left.isRed()&&(e=e.rotateRight(),e=e.colorFlip()),e}rotateLeft(){const e=this.copy(null,null,He.RED,null,this.right.left);return this.right.copy(null,null,this.color,e,null)}rotateRight(){const e=this.copy(null,null,He.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,e)}colorFlip(){const e=this.left.copy(null,null,!this.left.color,null,null),n=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,e,n)}checkMaxDepth(){const e=this.check();return Math.pow(2,e)<=this.size+1}check(){if(this.isRed()&&this.left.isRed()||this.right.isRed())throw J();const e=this.left.check();if(e!==this.right.check())throw J();return e+(this.isRed()?0:1)}}He.EMPTY=null,He.RED=!0,He.BLACK=!1;He.EMPTY=new class{constructor(){this.size=0}get key(){throw J()}get value(){throw J()}get color(){throw J()}get left(){throw J()}get right(){throw J()}copy(e,n,r,i,s){return this}insert(e,n,r){return new He(e,n)}remove(e,n){return this}isEmpty(){return!0}inorderTraversal(e){return!1}reverseTraversal(e){return!1}minKey(){return null}maxKey(){return null}isRed(){return!1}checkMaxDepth(){return!0}check(){return 0}};/**
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
 */class Qe{constructor(e){this.comparator=e,this.data=new Se(this.comparator)}has(e){return this.data.get(e)!==null}first(){return this.data.minKey()}last(){return this.data.maxKey()}get size(){return this.data.size}indexOf(e){return this.data.indexOf(e)}forEach(e){this.data.inorderTraversal((n,r)=>(e(n),!1))}forEachInRange(e,n){const r=this.data.getIteratorFrom(e[0]);for(;r.hasNext();){const i=r.getNext();if(this.comparator(i.key,e[1])>=0)return;n(i.key)}}forEachWhile(e,n){let r;for(r=n!==void 0?this.data.getIteratorFrom(n):this.data.getIterator();r.hasNext();)if(!e(r.getNext().key))return}firstAfterOrEqual(e){const n=this.data.getIteratorFrom(e);return n.hasNext()?n.getNext().key:null}getIterator(){return new ty(this.data.getIterator())}getIteratorFrom(e){return new ty(this.data.getIteratorFrom(e))}add(e){return this.copy(this.data.remove(e).insert(e,!0))}delete(e){return this.has(e)?this.copy(this.data.remove(e)):this}isEmpty(){return this.data.isEmpty()}unionWith(e){let n=this;return n.size<e.size&&(n=e,e=this),e.forEach(r=>{n=n.add(r)}),n}isEqual(e){if(!(e instanceof Qe)||this.size!==e.size)return!1;const n=this.data.getIterator(),r=e.data.getIterator();for(;n.hasNext();){const i=n.getNext().key,s=r.getNext().key;if(this.comparator(i,s)!==0)return!1}return!0}toArray(){const e=[];return this.forEach(n=>{e.push(n)}),e}toString(){const e=[];return this.forEach(n=>e.push(n)),"SortedSet("+e.toString()+")"}copy(e){const n=new Qe(this.comparator);return n.data=e,n}}class ty{constructor(e){this.iter=e}getNext(){return this.iter.getNext().key}hasNext(){return this.iter.hasNext()}}/**
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
 */class $t{constructor(e){this.fields=e,e.sort(Ke.comparator)}static empty(){return new $t([])}unionWith(e){let n=new Qe(Ke.comparator);for(const r of this.fields)n=n.add(r);for(const r of e)n=n.add(r);return new $t(n.toArray())}covers(e){for(const n of this.fields)if(n.isPrefixOf(e))return!0;return!1}isEqual(e){return Xi(this.fields,e.fields,(n,r)=>n.isEqual(r))}}/**
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
 */class pE extends Error{constructor(){super(...arguments),this.name="Base64DecodeError"}}/**
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
 */class Ye{constructor(e){this.binaryString=e}static fromBase64String(e){const n=function(i){try{return atob(i)}catch(s){throw typeof DOMException<"u"&&s instanceof DOMException?new pE("Invalid base64 string: "+s):s}}(e);return new Ye(n)}static fromUint8Array(e){const n=function(i){let s="";for(let o=0;o<i.length;++o)s+=String.fromCharCode(i[o]);return s}(e);return new Ye(n)}[Symbol.iterator](){let e=0;return{next:()=>e<this.binaryString.length?{value:this.binaryString.charCodeAt(e++),done:!1}:{value:void 0,done:!0}}}toBase64(){return function(n){return btoa(n)}(this.binaryString)}toUint8Array(){return function(n){const r=new Uint8Array(n.length);for(let i=0;i<n.length;i++)r[i]=n.charCodeAt(i);return r}(this.binaryString)}approximateByteSize(){return 2*this.binaryString.length}compareTo(e){return le(this.binaryString,e.binaryString)}isEqual(e){return this.binaryString===e.binaryString}}Ye.EMPTY_BYTE_STRING=new Ye("");const XP=new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);function Tr(t){if(he(!!t),typeof t=="string"){let e=0;const n=XP.exec(t);if(he(!!n),n[1]){let i=n[1];i=(i+"000000000").substr(0,9),e=Number(i)}const r=new Date(t);return{seconds:Math.floor(r.getTime()/1e3),nanos:e}}return{seconds:Pe(t.seconds),nanos:Pe(t.nanos)}}function Pe(t){return typeof t=="number"?t:typeof t=="string"?Number(t):0}function ti(t){return typeof t=="string"?Ye.fromBase64String(t):Ye.fromUint8Array(t)}/**
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
 */function Sf(t){var e,n;return((n=(((e=t==null?void 0:t.mapValue)===null||e===void 0?void 0:e.fields)||{}).__type__)===null||n===void 0?void 0:n.stringValue)==="server_timestamp"}function Rf(t){const e=t.mapValue.fields.__previous_value__;return Sf(e)?Rf(e):e}function xo(t){const e=Tr(t.mapValue.fields.__local_write_time__.timestampValue);return new Ue(e.seconds,e.nanos)}/**
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
 */class YP{constructor(e,n,r,i,s,o,l,u,h){this.databaseId=e,this.appId=n,this.persistenceKey=r,this.host=i,this.ssl=s,this.forceLongPolling=o,this.autoDetectLongPolling=l,this.longPollingOptions=u,this.useFetchStreams=h}}class No{constructor(e,n){this.projectId=e,this.database=n||"(default)"}static empty(){return new No("","")}get isDefaultDatabase(){return this.database==="(default)"}isEqual(e){return e instanceof No&&e.projectId===this.projectId&&e.database===this.database}}/**
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
 */const Ua={mapValue:{}};function ni(t){return"nullValue"in t?0:"booleanValue"in t?1:"integerValue"in t||"doubleValue"in t?2:"timestampValue"in t?3:"stringValue"in t?5:"bytesValue"in t?6:"referenceValue"in t?7:"geoPointValue"in t?8:"arrayValue"in t?9:"mapValue"in t?Sf(t)?4:ZP(t)?9007199254740991:JP(t)?10:11:J()}function fn(t,e){if(t===e)return!0;const n=ni(t);if(n!==ni(e))return!1;switch(n){case 0:case 9007199254740991:return!0;case 1:return t.booleanValue===e.booleanValue;case 4:return xo(t).isEqual(xo(e));case 3:return function(i,s){if(typeof i.timestampValue=="string"&&typeof s.timestampValue=="string"&&i.timestampValue.length===s.timestampValue.length)return i.timestampValue===s.timestampValue;const o=Tr(i.timestampValue),l=Tr(s.timestampValue);return o.seconds===l.seconds&&o.nanos===l.nanos}(t,e);case 5:return t.stringValue===e.stringValue;case 6:return function(i,s){return ti(i.bytesValue).isEqual(ti(s.bytesValue))}(t,e);case 7:return t.referenceValue===e.referenceValue;case 8:return function(i,s){return Pe(i.geoPointValue.latitude)===Pe(s.geoPointValue.latitude)&&Pe(i.geoPointValue.longitude)===Pe(s.geoPointValue.longitude)}(t,e);case 2:return function(i,s){if("integerValue"in i&&"integerValue"in s)return Pe(i.integerValue)===Pe(s.integerValue);if("doubleValue"in i&&"doubleValue"in s){const o=Pe(i.doubleValue),l=Pe(s.doubleValue);return o===l?Wl(o)===Wl(l):isNaN(o)&&isNaN(l)}return!1}(t,e);case 9:return Xi(t.arrayValue.values||[],e.arrayValue.values||[],fn);case 10:case 11:return function(i,s){const o=i.mapValue.fields||{},l=s.mapValue.fields||{};if(ey(o)!==ey(l))return!1;for(const u in o)if(o.hasOwnProperty(u)&&(l[u]===void 0||!fn(o[u],l[u])))return!1;return!0}(t,e);default:return J()}}function Do(t,e){return(t.values||[]).find(n=>fn(n,e))!==void 0}function Yi(t,e){if(t===e)return 0;const n=ni(t),r=ni(e);if(n!==r)return le(n,r);switch(n){case 0:case 9007199254740991:return 0;case 1:return le(t.booleanValue,e.booleanValue);case 2:return function(s,o){const l=Pe(s.integerValue||s.doubleValue),u=Pe(o.integerValue||o.doubleValue);return l<u?-1:l>u?1:l===u?0:isNaN(l)?isNaN(u)?0:-1:1}(t,e);case 3:return ny(t.timestampValue,e.timestampValue);case 4:return ny(xo(t),xo(e));case 5:return le(t.stringValue,e.stringValue);case 6:return function(s,o){const l=ti(s),u=ti(o);return l.compareTo(u)}(t.bytesValue,e.bytesValue);case 7:return function(s,o){const l=s.split("/"),u=o.split("/");for(let h=0;h<l.length&&h<u.length;h++){const f=le(l[h],u[h]);if(f!==0)return f}return le(l.length,u.length)}(t.referenceValue,e.referenceValue);case 8:return function(s,o){const l=le(Pe(s.latitude),Pe(o.latitude));return l!==0?l:le(Pe(s.longitude),Pe(o.longitude))}(t.geoPointValue,e.geoPointValue);case 9:return ry(t.arrayValue,e.arrayValue);case 10:return function(s,o){var l,u,h,f;const m=s.fields||{},_=o.fields||{},R=(l=m.value)===null||l===void 0?void 0:l.arrayValue,k=(u=_.value)===null||u===void 0?void 0:u.arrayValue,x=le(((h=R==null?void 0:R.values)===null||h===void 0?void 0:h.length)||0,((f=k==null?void 0:k.values)===null||f===void 0?void 0:f.length)||0);return x!==0?x:ry(R,k)}(t.mapValue,e.mapValue);case 11:return function(s,o){if(s===Ua.mapValue&&o===Ua.mapValue)return 0;if(s===Ua.mapValue)return 1;if(o===Ua.mapValue)return-1;const l=s.fields||{},u=Object.keys(l),h=o.fields||{},f=Object.keys(h);u.sort(),f.sort();for(let m=0;m<u.length&&m<f.length;++m){const _=le(u[m],f[m]);if(_!==0)return _;const R=Yi(l[u[m]],h[f[m]]);if(R!==0)return R}return le(u.length,f.length)}(t.mapValue,e.mapValue);default:throw J()}}function ny(t,e){if(typeof t=="string"&&typeof e=="string"&&t.length===e.length)return le(t,e);const n=Tr(t),r=Tr(e),i=le(n.seconds,r.seconds);return i!==0?i:le(n.nanos,r.nanos)}function ry(t,e){const n=t.values||[],r=e.values||[];for(let i=0;i<n.length&&i<r.length;++i){const s=Yi(n[i],r[i]);if(s)return s}return le(n.length,r.length)}function Ji(t){return Gh(t)}function Gh(t){return"nullValue"in t?"null":"booleanValue"in t?""+t.booleanValue:"integerValue"in t?""+t.integerValue:"doubleValue"in t?""+t.doubleValue:"timestampValue"in t?function(n){const r=Tr(n);return`time(${r.seconds},${r.nanos})`}(t.timestampValue):"stringValue"in t?t.stringValue:"bytesValue"in t?function(n){return ti(n).toBase64()}(t.bytesValue):"referenceValue"in t?function(n){return Q.fromName(n).toString()}(t.referenceValue):"geoPointValue"in t?function(n){return`geo(${n.latitude},${n.longitude})`}(t.geoPointValue):"arrayValue"in t?function(n){let r="[",i=!0;for(const s of n.values||[])i?i=!1:r+=",",r+=Gh(s);return r+"]"}(t.arrayValue):"mapValue"in t?function(n){const r=Object.keys(n.fields||{}).sort();let i="{",s=!0;for(const o of r)s?s=!1:i+=",",i+=`${o}:${Gh(n.fields[o])}`;return i+"}"}(t.mapValue):J()}function iy(t,e){return{referenceValue:`projects/${t.projectId}/databases/${t.database}/documents/${e.path.canonicalString()}`}}function Qh(t){return!!t&&"integerValue"in t}function Af(t){return!!t&&"arrayValue"in t}function sy(t){return!!t&&"nullValue"in t}function oy(t){return!!t&&"doubleValue"in t&&isNaN(Number(t.doubleValue))}function ol(t){return!!t&&"mapValue"in t}function JP(t){var e,n;return((n=(((e=t==null?void 0:t.mapValue)===null||e===void 0?void 0:e.fields)||{}).__type__)===null||n===void 0?void 0:n.stringValue)==="__vector__"}function no(t){if(t.geoPointValue)return{geoPointValue:Object.assign({},t.geoPointValue)};if(t.timestampValue&&typeof t.timestampValue=="object")return{timestampValue:Object.assign({},t.timestampValue)};if(t.mapValue){const e={mapValue:{fields:{}}};return cs(t.mapValue.fields,(n,r)=>e.mapValue.fields[n]=no(r)),e}if(t.arrayValue){const e={arrayValue:{values:[]}};for(let n=0;n<(t.arrayValue.values||[]).length;++n)e.arrayValue.values[n]=no(t.arrayValue.values[n]);return e}return Object.assign({},t)}function ZP(t){return(((t.mapValue||{}).fields||{}).__type__||{}).stringValue==="__max__"}/**
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
 */class Dt{constructor(e){this.value=e}static empty(){return new Dt({mapValue:{}})}field(e){if(e.isEmpty())return this.value;{let n=this.value;for(let r=0;r<e.length-1;++r)if(n=(n.mapValue.fields||{})[e.get(r)],!ol(n))return null;return n=(n.mapValue.fields||{})[e.lastSegment()],n||null}}set(e,n){this.getFieldsMap(e.popLast())[e.lastSegment()]=no(n)}setAll(e){let n=Ke.emptyPath(),r={},i=[];e.forEach((o,l)=>{if(!n.isImmediateParentOf(l)){const u=this.getFieldsMap(n);this.applyChanges(u,r,i),r={},i=[],n=l.popLast()}o?r[l.lastSegment()]=no(o):i.push(l.lastSegment())});const s=this.getFieldsMap(n);this.applyChanges(s,r,i)}delete(e){const n=this.field(e.popLast());ol(n)&&n.mapValue.fields&&delete n.mapValue.fields[e.lastSegment()]}isEqual(e){return fn(this.value,e.value)}getFieldsMap(e){let n=this.value;n.mapValue.fields||(n.mapValue={fields:{}});for(let r=0;r<e.length;++r){let i=n.mapValue.fields[e.get(r)];ol(i)&&i.mapValue.fields||(i={mapValue:{fields:{}}},n.mapValue.fields[e.get(r)]=i),n=i}return n.mapValue.fields}applyChanges(e,n,r){cs(n,(i,s)=>e[i]=s);for(const i of r)delete e[i]}clone(){return new Dt(no(this.value))}}function mE(t){const e=[];return cs(t.fields,(n,r)=>{const i=new Ke([n]);if(ol(r)){const s=mE(r.mapValue).fields;if(s.length===0)e.push(i);else for(const o of s)e.push(i.child(o))}else e.push(i)}),new $t(e)}/**
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
 */class ot{constructor(e,n,r,i,s,o,l){this.key=e,this.documentType=n,this.version=r,this.readTime=i,this.createTime=s,this.data=o,this.documentState=l}static newInvalidDocument(e){return new ot(e,0,Z.min(),Z.min(),Z.min(),Dt.empty(),0)}static newFoundDocument(e,n,r,i){return new ot(e,1,n,Z.min(),r,i,0)}static newNoDocument(e,n){return new ot(e,2,n,Z.min(),Z.min(),Dt.empty(),0)}static newUnknownDocument(e,n){return new ot(e,3,n,Z.min(),Z.min(),Dt.empty(),2)}convertToFoundDocument(e,n){return!this.createTime.isEqual(Z.min())||this.documentType!==2&&this.documentType!==0||(this.createTime=e),this.version=e,this.documentType=1,this.data=n,this.documentState=0,this}convertToNoDocument(e){return this.version=e,this.documentType=2,this.data=Dt.empty(),this.documentState=0,this}convertToUnknownDocument(e){return this.version=e,this.documentType=3,this.data=Dt.empty(),this.documentState=2,this}setHasCommittedMutations(){return this.documentState=2,this}setHasLocalMutations(){return this.documentState=1,this.version=Z.min(),this}setReadTime(e){return this.readTime=e,this}get hasLocalMutations(){return this.documentState===1}get hasCommittedMutations(){return this.documentState===2}get hasPendingWrites(){return this.hasLocalMutations||this.hasCommittedMutations}isValidDocument(){return this.documentType!==0}isFoundDocument(){return this.documentType===1}isNoDocument(){return this.documentType===2}isUnknownDocument(){return this.documentType===3}isEqual(e){return e instanceof ot&&this.key.isEqual(e.key)&&this.version.isEqual(e.version)&&this.documentType===e.documentType&&this.documentState===e.documentState&&this.data.isEqual(e.data)}mutableCopy(){return new ot(this.key,this.documentType,this.version,this.readTime,this.createTime,this.data.clone(),this.documentState)}toString(){return`Document(${this.key}, ${this.version}, ${JSON.stringify(this.data.value)}, {createTime: ${this.createTime}}), {documentType: ${this.documentType}}), {documentState: ${this.documentState}})`}}/**
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
 */class ql{constructor(e,n){this.position=e,this.inclusive=n}}function ay(t,e,n){let r=0;for(let i=0;i<t.position.length;i++){const s=e[i],o=t.position[i];if(s.field.isKeyField()?r=Q.comparator(Q.fromName(o.referenceValue),n.key):r=Yi(o,n.data.field(s.field)),s.dir==="desc"&&(r*=-1),r!==0)break}return r}function ly(t,e){if(t===null)return e===null;if(e===null||t.inclusive!==e.inclusive||t.position.length!==e.position.length)return!1;for(let n=0;n<t.position.length;n++)if(!fn(t.position[n],e.position[n]))return!1;return!0}/**
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
 */class Oo{constructor(e,n="asc"){this.field=e,this.dir=n}}function e1(t,e){return t.dir===e.dir&&t.field.isEqual(e.field)}/**
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
 */class gE{}class Ve extends gE{constructor(e,n,r){super(),this.field=e,this.op=n,this.value=r}static create(e,n,r){return e.isKeyField()?n==="in"||n==="not-in"?this.createKeyFieldInFilter(e,n,r):new n1(e,n,r):n==="array-contains"?new s1(e,r):n==="in"?new o1(e,r):n==="not-in"?new a1(e,r):n==="array-contains-any"?new l1(e,r):new Ve(e,n,r)}static createKeyFieldInFilter(e,n,r){return n==="in"?new r1(e,r):new i1(e,r)}matches(e){const n=e.data.field(this.field);return this.op==="!="?n!==null&&this.matchesComparison(Yi(n,this.value)):n!==null&&ni(this.value)===ni(n)&&this.matchesComparison(Yi(n,this.value))}matchesComparison(e){switch(this.op){case"<":return e<0;case"<=":return e<=0;case"==":return e===0;case"!=":return e!==0;case">":return e>0;case">=":return e>=0;default:return J()}}isInequality(){return["<","<=",">",">=","!=","not-in"].indexOf(this.op)>=0}getFlattenedFilters(){return[this]}getFilters(){return[this]}}class Jt extends gE{constructor(e,n){super(),this.filters=e,this.op=n,this.ae=null}static create(e,n){return new Jt(e,n)}matches(e){return yE(this)?this.filters.find(n=>!n.matches(e))===void 0:this.filters.find(n=>n.matches(e))!==void 0}getFlattenedFilters(){return this.ae!==null||(this.ae=this.filters.reduce((e,n)=>e.concat(n.getFlattenedFilters()),[])),this.ae}getFilters(){return Object.assign([],this.filters)}}function yE(t){return t.op==="and"}function _E(t){return t1(t)&&yE(t)}function t1(t){for(const e of t.filters)if(e instanceof Jt)return!1;return!0}function Xh(t){if(t instanceof Ve)return t.field.canonicalString()+t.op.toString()+Ji(t.value);if(_E(t))return t.filters.map(e=>Xh(e)).join(",");{const e=t.filters.map(n=>Xh(n)).join(",");return`${t.op}(${e})`}}function vE(t,e){return t instanceof Ve?function(r,i){return i instanceof Ve&&r.op===i.op&&r.field.isEqual(i.field)&&fn(r.value,i.value)}(t,e):t instanceof Jt?function(r,i){return i instanceof Jt&&r.op===i.op&&r.filters.length===i.filters.length?r.filters.reduce((s,o,l)=>s&&vE(o,i.filters[l]),!0):!1}(t,e):void J()}function wE(t){return t instanceof Ve?function(n){return`${n.field.canonicalString()} ${n.op} ${Ji(n.value)}`}(t):t instanceof Jt?function(n){return n.op.toString()+" {"+n.getFilters().map(wE).join(" ,")+"}"}(t):"Filter"}class n1 extends Ve{constructor(e,n,r){super(e,n,r),this.key=Q.fromName(r.referenceValue)}matches(e){const n=Q.comparator(e.key,this.key);return this.matchesComparison(n)}}class r1 extends Ve{constructor(e,n){super(e,"in",n),this.keys=EE("in",n)}matches(e){return this.keys.some(n=>n.isEqual(e.key))}}class i1 extends Ve{constructor(e,n){super(e,"not-in",n),this.keys=EE("not-in",n)}matches(e){return!this.keys.some(n=>n.isEqual(e.key))}}function EE(t,e){var n;return(((n=e.arrayValue)===null||n===void 0?void 0:n.values)||[]).map(r=>Q.fromName(r.referenceValue))}class s1 extends Ve{constructor(e,n){super(e,"array-contains",n)}matches(e){const n=e.data.field(this.field);return Af(n)&&Do(n.arrayValue,this.value)}}class o1 extends Ve{constructor(e,n){super(e,"in",n)}matches(e){const n=e.data.field(this.field);return n!==null&&Do(this.value.arrayValue,n)}}class a1 extends Ve{constructor(e,n){super(e,"not-in",n)}matches(e){if(Do(this.value.arrayValue,{nullValue:"NULL_VALUE"}))return!1;const n=e.data.field(this.field);return n!==null&&!Do(this.value.arrayValue,n)}}class l1 extends Ve{constructor(e,n){super(e,"array-contains-any",n)}matches(e){const n=e.data.field(this.field);return!(!Af(n)||!n.arrayValue.values)&&n.arrayValue.values.some(r=>Do(this.value.arrayValue,r))}}/**
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
 */class u1{constructor(e,n=null,r=[],i=[],s=null,o=null,l=null){this.path=e,this.collectionGroup=n,this.orderBy=r,this.filters=i,this.limit=s,this.startAt=o,this.endAt=l,this.ue=null}}function uy(t,e=null,n=[],r=[],i=null,s=null,o=null){return new u1(t,e,n,r,i,s,o)}function kf(t){const e=ee(t);if(e.ue===null){let n=e.path.canonicalString();e.collectionGroup!==null&&(n+="|cg:"+e.collectionGroup),n+="|f:",n+=e.filters.map(r=>Xh(r)).join(","),n+="|ob:",n+=e.orderBy.map(r=>function(s){return s.field.canonicalString()+s.dir}(r)).join(","),Tu(e.limit)||(n+="|l:",n+=e.limit),e.startAt&&(n+="|lb:",n+=e.startAt.inclusive?"b:":"a:",n+=e.startAt.position.map(r=>Ji(r)).join(",")),e.endAt&&(n+="|ub:",n+=e.endAt.inclusive?"a:":"b:",n+=e.endAt.position.map(r=>Ji(r)).join(",")),e.ue=n}return e.ue}function Cf(t,e){if(t.limit!==e.limit||t.orderBy.length!==e.orderBy.length)return!1;for(let n=0;n<t.orderBy.length;n++)if(!e1(t.orderBy[n],e.orderBy[n]))return!1;if(t.filters.length!==e.filters.length)return!1;for(let n=0;n<t.filters.length;n++)if(!vE(t.filters[n],e.filters[n]))return!1;return t.collectionGroup===e.collectionGroup&&!!t.path.isEqual(e.path)&&!!ly(t.startAt,e.startAt)&&ly(t.endAt,e.endAt)}function Yh(t){return Q.isDocumentKey(t.path)&&t.collectionGroup===null&&t.filters.length===0}/**
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
 */class hs{constructor(e,n=null,r=[],i=[],s=null,o="F",l=null,u=null){this.path=e,this.collectionGroup=n,this.explicitOrderBy=r,this.filters=i,this.limit=s,this.limitType=o,this.startAt=l,this.endAt=u,this.ce=null,this.le=null,this.he=null,this.startAt,this.endAt}}function c1(t,e,n,r,i,s,o,l){return new hs(t,e,n,r,i,s,o,l)}function Pf(t){return new hs(t)}function cy(t){return t.filters.length===0&&t.limit===null&&t.startAt==null&&t.endAt==null&&(t.explicitOrderBy.length===0||t.explicitOrderBy.length===1&&t.explicitOrderBy[0].field.isKeyField())}function TE(t){return t.collectionGroup!==null}function ro(t){const e=ee(t);if(e.ce===null){e.ce=[];const n=new Set;for(const s of e.explicitOrderBy)e.ce.push(s),n.add(s.field.canonicalString());const r=e.explicitOrderBy.length>0?e.explicitOrderBy[e.explicitOrderBy.length-1].dir:"asc";(function(o){let l=new Qe(Ke.comparator);return o.filters.forEach(u=>{u.getFlattenedFilters().forEach(h=>{h.isInequality()&&(l=l.add(h.field))})}),l})(e).forEach(s=>{n.has(s.canonicalString())||s.isKeyField()||e.ce.push(new Oo(s,r))}),n.has(Ke.keyField().canonicalString())||e.ce.push(new Oo(Ke.keyField(),r))}return e.ce}function un(t){const e=ee(t);return e.le||(e.le=h1(e,ro(t))),e.le}function h1(t,e){if(t.limitType==="F")return uy(t.path,t.collectionGroup,e,t.filters,t.limit,t.startAt,t.endAt);{e=e.map(i=>{const s=i.dir==="desc"?"asc":"desc";return new Oo(i.field,s)});const n=t.endAt?new ql(t.endAt.position,t.endAt.inclusive):null,r=t.startAt?new ql(t.startAt.position,t.startAt.inclusive):null;return uy(t.path,t.collectionGroup,e,t.filters,t.limit,n,r)}}function Jh(t,e){const n=t.filters.concat([e]);return new hs(t.path,t.collectionGroup,t.explicitOrderBy.slice(),n,t.limit,t.limitType,t.startAt,t.endAt)}function Zh(t,e,n){return new hs(t.path,t.collectionGroup,t.explicitOrderBy.slice(),t.filters.slice(),e,n,t.startAt,t.endAt)}function Iu(t,e){return Cf(un(t),un(e))&&t.limitType===e.limitType}function IE(t){return`${kf(un(t))}|lt:${t.limitType}`}function mi(t){return`Query(target=${function(n){let r=n.path.canonicalString();return n.collectionGroup!==null&&(r+=" collectionGroup="+n.collectionGroup),n.filters.length>0&&(r+=`, filters: [${n.filters.map(i=>wE(i)).join(", ")}]`),Tu(n.limit)||(r+=", limit: "+n.limit),n.orderBy.length>0&&(r+=`, orderBy: [${n.orderBy.map(i=>function(o){return`${o.field.canonicalString()} (${o.dir})`}(i)).join(", ")}]`),n.startAt&&(r+=", startAt: ",r+=n.startAt.inclusive?"b:":"a:",r+=n.startAt.position.map(i=>Ji(i)).join(",")),n.endAt&&(r+=", endAt: ",r+=n.endAt.inclusive?"a:":"b:",r+=n.endAt.position.map(i=>Ji(i)).join(",")),`Target(${r})`}(un(t))}; limitType=${t.limitType})`}function Su(t,e){return e.isFoundDocument()&&function(r,i){const s=i.key.path;return r.collectionGroup!==null?i.key.hasCollectionId(r.collectionGroup)&&r.path.isPrefixOf(s):Q.isDocumentKey(r.path)?r.path.isEqual(s):r.path.isImmediateParentOf(s)}(t,e)&&function(r,i){for(const s of ro(r))if(!s.field.isKeyField()&&i.data.field(s.field)===null)return!1;return!0}(t,e)&&function(r,i){for(const s of r.filters)if(!s.matches(i))return!1;return!0}(t,e)&&function(r,i){return!(r.startAt&&!function(o,l,u){const h=ay(o,l,u);return o.inclusive?h<=0:h<0}(r.startAt,ro(r),i)||r.endAt&&!function(o,l,u){const h=ay(o,l,u);return o.inclusive?h>=0:h>0}(r.endAt,ro(r),i))}(t,e)}function d1(t){return t.collectionGroup||(t.path.length%2==1?t.path.lastSegment():t.path.get(t.path.length-2))}function SE(t){return(e,n)=>{let r=!1;for(const i of ro(t)){const s=f1(i,e,n);if(s!==0)return s;r=r||i.field.isKeyField()}return 0}}function f1(t,e,n){const r=t.field.isKeyField()?Q.comparator(e.key,n.key):function(s,o,l){const u=o.data.field(s),h=l.data.field(s);return u!==null&&h!==null?Yi(u,h):J()}(t.field,e,n);switch(t.dir){case"asc":return r;case"desc":return-1*r;default:return J()}}/**
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
 */class ds{constructor(e,n){this.mapKeyFn=e,this.equalsFn=n,this.inner={},this.innerSize=0}get(e){const n=this.mapKeyFn(e),r=this.inner[n];if(r!==void 0){for(const[i,s]of r)if(this.equalsFn(i,e))return s}}has(e){return this.get(e)!==void 0}set(e,n){const r=this.mapKeyFn(e),i=this.inner[r];if(i===void 0)return this.inner[r]=[[e,n]],void this.innerSize++;for(let s=0;s<i.length;s++)if(this.equalsFn(i[s][0],e))return void(i[s]=[e,n]);i.push([e,n]),this.innerSize++}delete(e){const n=this.mapKeyFn(e),r=this.inner[n];if(r===void 0)return!1;for(let i=0;i<r.length;i++)if(this.equalsFn(r[i][0],e))return r.length===1?delete this.inner[n]:r.splice(i,1),this.innerSize--,!0;return!1}forEach(e){cs(this.inner,(n,r)=>{for(const[i,s]of r)e(i,s)})}isEmpty(){return fE(this.inner)}size(){return this.innerSize}}/**
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
 */const p1=new Se(Q.comparator);function Un(){return p1}const RE=new Se(Q.comparator);function $s(...t){let e=RE;for(const n of t)e=e.insert(n.key,n);return e}function AE(t){let e=RE;return t.forEach((n,r)=>e=e.insert(n,r.overlayedDocument)),e}function Ur(){return io()}function kE(){return io()}function io(){return new ds(t=>t.toString(),(t,e)=>t.isEqual(e))}const m1=new Se(Q.comparator),g1=new Qe(Q.comparator);function re(...t){let e=g1;for(const n of t)e=e.add(n);return e}const y1=new Qe(le);function _1(){return y1}/**
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
 */function xf(t,e){if(t.useProto3Json){if(isNaN(e))return{doubleValue:"NaN"};if(e===1/0)return{doubleValue:"Infinity"};if(e===-1/0)return{doubleValue:"-Infinity"}}return{doubleValue:Wl(e)?"-0":e}}function CE(t){return{integerValue:""+t}}function v1(t,e){return QP(e)?CE(e):xf(t,e)}/**
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
 */class Ru{constructor(){this._=void 0}}function w1(t,e,n){return t instanceof Hl?function(i,s){const o={fields:{__type__:{stringValue:"server_timestamp"},__local_write_time__:{timestampValue:{seconds:i.seconds,nanos:i.nanoseconds}}}};return s&&Sf(s)&&(s=Rf(s)),s&&(o.fields.__previous_value__=s),{mapValue:o}}(n,e):t instanceof bo?xE(t,e):t instanceof Vo?NE(t,e):function(i,s){const o=PE(i,s),l=hy(o)+hy(i.Pe);return Qh(o)&&Qh(i.Pe)?CE(l):xf(i.serializer,l)}(t,e)}function E1(t,e,n){return t instanceof bo?xE(t,e):t instanceof Vo?NE(t,e):n}function PE(t,e){return t instanceof Kl?function(r){return Qh(r)||function(s){return!!s&&"doubleValue"in s}(r)}(e)?e:{integerValue:0}:null}class Hl extends Ru{}class bo extends Ru{constructor(e){super(),this.elements=e}}function xE(t,e){const n=DE(e);for(const r of t.elements)n.some(i=>fn(i,r))||n.push(r);return{arrayValue:{values:n}}}class Vo extends Ru{constructor(e){super(),this.elements=e}}function NE(t,e){let n=DE(e);for(const r of t.elements)n=n.filter(i=>!fn(i,r));return{arrayValue:{values:n}}}class Kl extends Ru{constructor(e,n){super(),this.serializer=e,this.Pe=n}}function hy(t){return Pe(t.integerValue||t.doubleValue)}function DE(t){return Af(t)&&t.arrayValue.values?t.arrayValue.values.slice():[]}function T1(t,e){return t.field.isEqual(e.field)&&function(r,i){return r instanceof bo&&i instanceof bo||r instanceof Vo&&i instanceof Vo?Xi(r.elements,i.elements,fn):r instanceof Kl&&i instanceof Kl?fn(r.Pe,i.Pe):r instanceof Hl&&i instanceof Hl}(t.transform,e.transform)}class I1{constructor(e,n){this.version=e,this.transformResults=n}}class cn{constructor(e,n){this.updateTime=e,this.exists=n}static none(){return new cn}static exists(e){return new cn(void 0,e)}static updateTime(e){return new cn(e)}get isNone(){return this.updateTime===void 0&&this.exists===void 0}isEqual(e){return this.exists===e.exists&&(this.updateTime?!!e.updateTime&&this.updateTime.isEqual(e.updateTime):!e.updateTime)}}function al(t,e){return t.updateTime!==void 0?e.isFoundDocument()&&e.version.isEqual(t.updateTime):t.exists===void 0||t.exists===e.isFoundDocument()}class Au{}function OE(t,e){if(!t.hasLocalMutations||e&&e.fields.length===0)return null;if(e===null)return t.isNoDocument()?new Nf(t.key,cn.none()):new Qo(t.key,t.data,cn.none());{const n=t.data,r=Dt.empty();let i=new Qe(Ke.comparator);for(let s of e.fields)if(!i.has(s)){let o=n.field(s);o===null&&s.length>1&&(s=s.popLast(),o=n.field(s)),o===null?r.delete(s):r.set(s,o),i=i.add(s)}return new ai(t.key,r,new $t(i.toArray()),cn.none())}}function S1(t,e,n){t instanceof Qo?function(i,s,o){const l=i.value.clone(),u=fy(i.fieldTransforms,s,o.transformResults);l.setAll(u),s.convertToFoundDocument(o.version,l).setHasCommittedMutations()}(t,e,n):t instanceof ai?function(i,s,o){if(!al(i.precondition,s))return void s.convertToUnknownDocument(o.version);const l=fy(i.fieldTransforms,s,o.transformResults),u=s.data;u.setAll(bE(i)),u.setAll(l),s.convertToFoundDocument(o.version,u).setHasCommittedMutations()}(t,e,n):function(i,s,o){s.convertToNoDocument(o.version).setHasCommittedMutations()}(0,e,n)}function so(t,e,n,r){return t instanceof Qo?function(s,o,l,u){if(!al(s.precondition,o))return l;const h=s.value.clone(),f=py(s.fieldTransforms,u,o);return h.setAll(f),o.convertToFoundDocument(o.version,h).setHasLocalMutations(),null}(t,e,n,r):t instanceof ai?function(s,o,l,u){if(!al(s.precondition,o))return l;const h=py(s.fieldTransforms,u,o),f=o.data;return f.setAll(bE(s)),f.setAll(h),o.convertToFoundDocument(o.version,f).setHasLocalMutations(),l===null?null:l.unionWith(s.fieldMask.fields).unionWith(s.fieldTransforms.map(m=>m.field))}(t,e,n,r):function(s,o,l){return al(s.precondition,o)?(o.convertToNoDocument(o.version).setHasLocalMutations(),null):l}(t,e,n)}function R1(t,e){let n=null;for(const r of t.fieldTransforms){const i=e.data.field(r.field),s=PE(r.transform,i||null);s!=null&&(n===null&&(n=Dt.empty()),n.set(r.field,s))}return n||null}function dy(t,e){return t.type===e.type&&!!t.key.isEqual(e.key)&&!!t.precondition.isEqual(e.precondition)&&!!function(r,i){return r===void 0&&i===void 0||!(!r||!i)&&Xi(r,i,(s,o)=>T1(s,o))}(t.fieldTransforms,e.fieldTransforms)&&(t.type===0?t.value.isEqual(e.value):t.type!==1||t.data.isEqual(e.data)&&t.fieldMask.isEqual(e.fieldMask))}class Qo extends Au{constructor(e,n,r,i=[]){super(),this.key=e,this.value=n,this.precondition=r,this.fieldTransforms=i,this.type=0}getFieldMask(){return null}}class ai extends Au{constructor(e,n,r,i,s=[]){super(),this.key=e,this.data=n,this.fieldMask=r,this.precondition=i,this.fieldTransforms=s,this.type=1}getFieldMask(){return this.fieldMask}}function bE(t){const e=new Map;return t.fieldMask.fields.forEach(n=>{if(!n.isEmpty()){const r=t.data.field(n);e.set(n,r)}}),e}function fy(t,e,n){const r=new Map;he(t.length===n.length);for(let i=0;i<n.length;i++){const s=t[i],o=s.transform,l=e.data.field(s.field);r.set(s.field,E1(o,l,n[i]))}return r}function py(t,e,n){const r=new Map;for(const i of t){const s=i.transform,o=n.data.field(i.field);r.set(i.field,w1(s,o,e))}return r}class Nf extends Au{constructor(e,n){super(),this.key=e,this.precondition=n,this.type=2,this.fieldTransforms=[]}getFieldMask(){return null}}class A1 extends Au{constructor(e,n){super(),this.key=e,this.precondition=n,this.type=3,this.fieldTransforms=[]}getFieldMask(){return null}}/**
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
 */class k1{constructor(e,n,r,i){this.batchId=e,this.localWriteTime=n,this.baseMutations=r,this.mutations=i}applyToRemoteDocument(e,n){const r=n.mutationResults;for(let i=0;i<this.mutations.length;i++){const s=this.mutations[i];s.key.isEqual(e.key)&&S1(s,e,r[i])}}applyToLocalView(e,n){for(const r of this.baseMutations)r.key.isEqual(e.key)&&(n=so(r,e,n,this.localWriteTime));for(const r of this.mutations)r.key.isEqual(e.key)&&(n=so(r,e,n,this.localWriteTime));return n}applyToLocalDocumentSet(e,n){const r=kE();return this.mutations.forEach(i=>{const s=e.get(i.key),o=s.overlayedDocument;let l=this.applyToLocalView(o,s.mutatedFields);l=n.has(i.key)?null:l;const u=OE(o,l);u!==null&&r.set(i.key,u),o.isValidDocument()||o.convertToNoDocument(Z.min())}),r}keys(){return this.mutations.reduce((e,n)=>e.add(n.key),re())}isEqual(e){return this.batchId===e.batchId&&Xi(this.mutations,e.mutations,(n,r)=>dy(n,r))&&Xi(this.baseMutations,e.baseMutations,(n,r)=>dy(n,r))}}class Df{constructor(e,n,r,i){this.batch=e,this.commitVersion=n,this.mutationResults=r,this.docVersions=i}static from(e,n,r){he(e.mutations.length===r.length);let i=function(){return m1}();const s=e.mutations;for(let o=0;o<s.length;o++)i=i.insert(s[o].key,r[o].version);return new Df(e,n,r,i)}}/**
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
 */class C1{constructor(e,n){this.largestBatchId=e,this.mutation=n}getKey(){return this.mutation.key}isEqual(e){return e!==null&&this.mutation===e.mutation}toString(){return`Overlay{
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
 */class P1{constructor(e,n){this.count=e,this.unchangedNames=n}}/**
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
 */var Oe,se;function x1(t){switch(t){default:return J();case M.CANCELLED:case M.UNKNOWN:case M.DEADLINE_EXCEEDED:case M.RESOURCE_EXHAUSTED:case M.INTERNAL:case M.UNAVAILABLE:case M.UNAUTHENTICATED:return!1;case M.INVALID_ARGUMENT:case M.NOT_FOUND:case M.ALREADY_EXISTS:case M.PERMISSION_DENIED:case M.FAILED_PRECONDITION:case M.ABORTED:case M.OUT_OF_RANGE:case M.UNIMPLEMENTED:case M.DATA_LOSS:return!0}}function VE(t){if(t===void 0)return jn("GRPC error has no .code"),M.UNKNOWN;switch(t){case Oe.OK:return M.OK;case Oe.CANCELLED:return M.CANCELLED;case Oe.UNKNOWN:return M.UNKNOWN;case Oe.DEADLINE_EXCEEDED:return M.DEADLINE_EXCEEDED;case Oe.RESOURCE_EXHAUSTED:return M.RESOURCE_EXHAUSTED;case Oe.INTERNAL:return M.INTERNAL;case Oe.UNAVAILABLE:return M.UNAVAILABLE;case Oe.UNAUTHENTICATED:return M.UNAUTHENTICATED;case Oe.INVALID_ARGUMENT:return M.INVALID_ARGUMENT;case Oe.NOT_FOUND:return M.NOT_FOUND;case Oe.ALREADY_EXISTS:return M.ALREADY_EXISTS;case Oe.PERMISSION_DENIED:return M.PERMISSION_DENIED;case Oe.FAILED_PRECONDITION:return M.FAILED_PRECONDITION;case Oe.ABORTED:return M.ABORTED;case Oe.OUT_OF_RANGE:return M.OUT_OF_RANGE;case Oe.UNIMPLEMENTED:return M.UNIMPLEMENTED;case Oe.DATA_LOSS:return M.DATA_LOSS;default:return J()}}(se=Oe||(Oe={}))[se.OK=0]="OK",se[se.CANCELLED=1]="CANCELLED",se[se.UNKNOWN=2]="UNKNOWN",se[se.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",se[se.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",se[se.NOT_FOUND=5]="NOT_FOUND",se[se.ALREADY_EXISTS=6]="ALREADY_EXISTS",se[se.PERMISSION_DENIED=7]="PERMISSION_DENIED",se[se.UNAUTHENTICATED=16]="UNAUTHENTICATED",se[se.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",se[se.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",se[se.ABORTED=10]="ABORTED",se[se.OUT_OF_RANGE=11]="OUT_OF_RANGE",se[se.UNIMPLEMENTED=12]="UNIMPLEMENTED",se[se.INTERNAL=13]="INTERNAL",se[se.UNAVAILABLE=14]="UNAVAILABLE",se[se.DATA_LOSS=15]="DATA_LOSS";/**
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
 */function N1(){return new TextEncoder}/**
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
 */const D1=new $r([4294967295,4294967295],0);function my(t){const e=N1().encode(t),n=new sE;return n.update(e),new Uint8Array(n.digest())}function gy(t){const e=new DataView(t.buffer),n=e.getUint32(0,!0),r=e.getUint32(4,!0),i=e.getUint32(8,!0),s=e.getUint32(12,!0);return[new $r([n,r],0),new $r([i,s],0)]}class Of{constructor(e,n,r){if(this.bitmap=e,this.padding=n,this.hashCount=r,n<0||n>=8)throw new Ws(`Invalid padding: ${n}`);if(r<0)throw new Ws(`Invalid hash count: ${r}`);if(e.length>0&&this.hashCount===0)throw new Ws(`Invalid hash count: ${r}`);if(e.length===0&&n!==0)throw new Ws(`Invalid padding when bitmap length is 0: ${n}`);this.Ie=8*e.length-n,this.Te=$r.fromNumber(this.Ie)}Ee(e,n,r){let i=e.add(n.multiply($r.fromNumber(r)));return i.compare(D1)===1&&(i=new $r([i.getBits(0),i.getBits(1)],0)),i.modulo(this.Te).toNumber()}de(e){return(this.bitmap[Math.floor(e/8)]&1<<e%8)!=0}mightContain(e){if(this.Ie===0)return!1;const n=my(e),[r,i]=gy(n);for(let s=0;s<this.hashCount;s++){const o=this.Ee(r,i,s);if(!this.de(o))return!1}return!0}static create(e,n,r){const i=e%8==0?0:8-e%8,s=new Uint8Array(Math.ceil(e/8)),o=new Of(s,i,n);return r.forEach(l=>o.insert(l)),o}insert(e){if(this.Ie===0)return;const n=my(e),[r,i]=gy(n);for(let s=0;s<this.hashCount;s++){const o=this.Ee(r,i,s);this.Ae(o)}}Ae(e){const n=Math.floor(e/8),r=e%8;this.bitmap[n]|=1<<r}}class Ws extends Error{constructor(){super(...arguments),this.name="BloomFilterError"}}/**
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
 */class ku{constructor(e,n,r,i,s){this.snapshotVersion=e,this.targetChanges=n,this.targetMismatches=r,this.documentUpdates=i,this.resolvedLimboDocuments=s}static createSynthesizedRemoteEventForCurrentChange(e,n,r){const i=new Map;return i.set(e,Xo.createSynthesizedTargetChangeForCurrentChange(e,n,r)),new ku(Z.min(),i,new Se(le),Un(),re())}}class Xo{constructor(e,n,r,i,s){this.resumeToken=e,this.current=n,this.addedDocuments=r,this.modifiedDocuments=i,this.removedDocuments=s}static createSynthesizedTargetChangeForCurrentChange(e,n,r){return new Xo(r,n,re(),re(),re())}}/**
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
 */class ll{constructor(e,n,r,i){this.Re=e,this.removedTargetIds=n,this.key=r,this.Ve=i}}class LE{constructor(e,n){this.targetId=e,this.me=n}}class ME{constructor(e,n,r=Ye.EMPTY_BYTE_STRING,i=null){this.state=e,this.targetIds=n,this.resumeToken=r,this.cause=i}}class yy{constructor(){this.fe=0,this.ge=vy(),this.pe=Ye.EMPTY_BYTE_STRING,this.ye=!1,this.we=!0}get current(){return this.ye}get resumeToken(){return this.pe}get Se(){return this.fe!==0}get be(){return this.we}De(e){e.approximateByteSize()>0&&(this.we=!0,this.pe=e)}ve(){let e=re(),n=re(),r=re();return this.ge.forEach((i,s)=>{switch(s){case 0:e=e.add(i);break;case 2:n=n.add(i);break;case 1:r=r.add(i);break;default:J()}}),new Xo(this.pe,this.ye,e,n,r)}Ce(){this.we=!1,this.ge=vy()}Fe(e,n){this.we=!0,this.ge=this.ge.insert(e,n)}Me(e){this.we=!0,this.ge=this.ge.remove(e)}xe(){this.fe+=1}Oe(){this.fe-=1,he(this.fe>=0)}Ne(){this.we=!0,this.ye=!0}}class O1{constructor(e){this.Le=e,this.Be=new Map,this.ke=Un(),this.qe=_y(),this.Qe=new Se(le)}Ke(e){for(const n of e.Re)e.Ve&&e.Ve.isFoundDocument()?this.$e(n,e.Ve):this.Ue(n,e.key,e.Ve);for(const n of e.removedTargetIds)this.Ue(n,e.key,e.Ve)}We(e){this.forEachTarget(e,n=>{const r=this.Ge(n);switch(e.state){case 0:this.ze(n)&&r.De(e.resumeToken);break;case 1:r.Oe(),r.Se||r.Ce(),r.De(e.resumeToken);break;case 2:r.Oe(),r.Se||this.removeTarget(n);break;case 3:this.ze(n)&&(r.Ne(),r.De(e.resumeToken));break;case 4:this.ze(n)&&(this.je(n),r.De(e.resumeToken));break;default:J()}})}forEachTarget(e,n){e.targetIds.length>0?e.targetIds.forEach(n):this.Be.forEach((r,i)=>{this.ze(i)&&n(i)})}He(e){const n=e.targetId,r=e.me.count,i=this.Je(n);if(i){const s=i.target;if(Yh(s))if(r===0){const o=new Q(s.path);this.Ue(n,o,ot.newNoDocument(o,Z.min()))}else he(r===1);else{const o=this.Ye(n);if(o!==r){const l=this.Ze(e),u=l?this.Xe(l,e,o):1;if(u!==0){this.je(n);const h=u===2?"TargetPurposeExistenceFilterMismatchBloom":"TargetPurposeExistenceFilterMismatch";this.Qe=this.Qe.insert(n,h)}}}}}Ze(e){const n=e.me.unchangedNames;if(!n||!n.bits)return null;const{bits:{bitmap:r="",padding:i=0},hashCount:s=0}=n;let o,l;try{o=ti(r).toUint8Array()}catch(u){if(u instanceof pE)return Qi("Decoding the base64 bloom filter in existence filter failed ("+u.message+"); ignoring the bloom filter and falling back to full re-query."),null;throw u}try{l=new Of(o,i,s)}catch(u){return Qi(u instanceof Ws?"BloomFilter error: ":"Applying bloom filter failed: ",u),null}return l.Ie===0?null:l}Xe(e,n,r){return n.me.count===r-this.nt(e,n.targetId)?0:2}nt(e,n){const r=this.Le.getRemoteKeysForTarget(n);let i=0;return r.forEach(s=>{const o=this.Le.tt(),l=`projects/${o.projectId}/databases/${o.database}/documents/${s.path.canonicalString()}`;e.mightContain(l)||(this.Ue(n,s,null),i++)}),i}rt(e){const n=new Map;this.Be.forEach((s,o)=>{const l=this.Je(o);if(l){if(s.current&&Yh(l.target)){const u=new Q(l.target.path);this.ke.get(u)!==null||this.it(o,u)||this.Ue(o,u,ot.newNoDocument(u,e))}s.be&&(n.set(o,s.ve()),s.Ce())}});let r=re();this.qe.forEach((s,o)=>{let l=!0;o.forEachWhile(u=>{const h=this.Je(u);return!h||h.purpose==="TargetPurposeLimboResolution"||(l=!1,!1)}),l&&(r=r.add(s))}),this.ke.forEach((s,o)=>o.setReadTime(e));const i=new ku(e,n,this.Qe,this.ke,r);return this.ke=Un(),this.qe=_y(),this.Qe=new Se(le),i}$e(e,n){if(!this.ze(e))return;const r=this.it(e,n.key)?2:0;this.Ge(e).Fe(n.key,r),this.ke=this.ke.insert(n.key,n),this.qe=this.qe.insert(n.key,this.st(n.key).add(e))}Ue(e,n,r){if(!this.ze(e))return;const i=this.Ge(e);this.it(e,n)?i.Fe(n,1):i.Me(n),this.qe=this.qe.insert(n,this.st(n).delete(e)),r&&(this.ke=this.ke.insert(n,r))}removeTarget(e){this.Be.delete(e)}Ye(e){const n=this.Ge(e).ve();return this.Le.getRemoteKeysForTarget(e).size+n.addedDocuments.size-n.removedDocuments.size}xe(e){this.Ge(e).xe()}Ge(e){let n=this.Be.get(e);return n||(n=new yy,this.Be.set(e,n)),n}st(e){let n=this.qe.get(e);return n||(n=new Qe(le),this.qe=this.qe.insert(e,n)),n}ze(e){const n=this.Je(e)!==null;return n||G("WatchChangeAggregator","Detected inactive target",e),n}Je(e){const n=this.Be.get(e);return n&&n.Se?null:this.Le.ot(e)}je(e){this.Be.set(e,new yy),this.Le.getRemoteKeysForTarget(e).forEach(n=>{this.Ue(e,n,null)})}it(e,n){return this.Le.getRemoteKeysForTarget(e).has(n)}}function _y(){return new Se(Q.comparator)}function vy(){return new Se(Q.comparator)}const b1={asc:"ASCENDING",desc:"DESCENDING"},V1={"<":"LESS_THAN","<=":"LESS_THAN_OR_EQUAL",">":"GREATER_THAN",">=":"GREATER_THAN_OR_EQUAL","==":"EQUAL","!=":"NOT_EQUAL","array-contains":"ARRAY_CONTAINS",in:"IN","not-in":"NOT_IN","array-contains-any":"ARRAY_CONTAINS_ANY"},L1={and:"AND",or:"OR"};class M1{constructor(e,n){this.databaseId=e,this.useProto3Json=n}}function ed(t,e){return t.useProto3Json||Tu(e)?e:{value:e}}function Gl(t,e){return t.useProto3Json?`${new Date(1e3*e.seconds).toISOString().replace(/\.\d*/,"").replace("Z","")}.${("000000000"+e.nanoseconds).slice(-9)}Z`:{seconds:""+e.seconds,nanos:e.nanoseconds}}function jE(t,e){return t.useProto3Json?e.toBase64():e.toUint8Array()}function j1(t,e){return Gl(t,e.toTimestamp())}function hn(t){return he(!!t),Z.fromTimestamp(function(n){const r=Tr(n);return new Ue(r.seconds,r.nanos)}(t))}function bf(t,e){return td(t,e).canonicalString()}function td(t,e){const n=function(i){return new ge(["projects",i.projectId,"databases",i.database])}(t).child("documents");return e===void 0?n:n.child(e)}function UE(t){const e=ge.fromString(t);return he(WE(e)),e}function nd(t,e){return bf(t.databaseId,e.path)}function Lc(t,e){const n=UE(e);if(n.get(1)!==t.databaseId.projectId)throw new K(M.INVALID_ARGUMENT,"Tried to deserialize key from different project: "+n.get(1)+" vs "+t.databaseId.projectId);if(n.get(3)!==t.databaseId.database)throw new K(M.INVALID_ARGUMENT,"Tried to deserialize key from different database: "+n.get(3)+" vs "+t.databaseId.database);return new Q(BE(n))}function FE(t,e){return bf(t.databaseId,e)}function U1(t){const e=UE(t);return e.length===4?ge.emptyPath():BE(e)}function rd(t){return new ge(["projects",t.databaseId.projectId,"databases",t.databaseId.database]).canonicalString()}function BE(t){return he(t.length>4&&t.get(4)==="documents"),t.popFirst(5)}function wy(t,e,n){return{name:nd(t,e),fields:n.value.mapValue.fields}}function F1(t,e){let n;if("targetChange"in e){e.targetChange;const r=function(h){return h==="NO_CHANGE"?0:h==="ADD"?1:h==="REMOVE"?2:h==="CURRENT"?3:h==="RESET"?4:J()}(e.targetChange.targetChangeType||"NO_CHANGE"),i=e.targetChange.targetIds||[],s=function(h,f){return h.useProto3Json?(he(f===void 0||typeof f=="string"),Ye.fromBase64String(f||"")):(he(f===void 0||f instanceof Buffer||f instanceof Uint8Array),Ye.fromUint8Array(f||new Uint8Array))}(t,e.targetChange.resumeToken),o=e.targetChange.cause,l=o&&function(h){const f=h.code===void 0?M.UNKNOWN:VE(h.code);return new K(f,h.message||"")}(o);n=new ME(r,i,s,l||null)}else if("documentChange"in e){e.documentChange;const r=e.documentChange;r.document,r.document.name,r.document.updateTime;const i=Lc(t,r.document.name),s=hn(r.document.updateTime),o=r.document.createTime?hn(r.document.createTime):Z.min(),l=new Dt({mapValue:{fields:r.document.fields}}),u=ot.newFoundDocument(i,s,o,l),h=r.targetIds||[],f=r.removedTargetIds||[];n=new ll(h,f,u.key,u)}else if("documentDelete"in e){e.documentDelete;const r=e.documentDelete;r.document;const i=Lc(t,r.document),s=r.readTime?hn(r.readTime):Z.min(),o=ot.newNoDocument(i,s),l=r.removedTargetIds||[];n=new ll([],l,o.key,o)}else if("documentRemove"in e){e.documentRemove;const r=e.documentRemove;r.document;const i=Lc(t,r.document),s=r.removedTargetIds||[];n=new ll([],s,i,null)}else{if(!("filter"in e))return J();{e.filter;const r=e.filter;r.targetId;const{count:i=0,unchangedNames:s}=r,o=new P1(i,s),l=r.targetId;n=new LE(l,o)}}return n}function B1(t,e){let n;if(e instanceof Qo)n={update:wy(t,e.key,e.value)};else if(e instanceof Nf)n={delete:nd(t,e.key)};else if(e instanceof ai)n={update:wy(t,e.key,e.data),updateMask:X1(e.fieldMask)};else{if(!(e instanceof A1))return J();n={verify:nd(t,e.key)}}return e.fieldTransforms.length>0&&(n.updateTransforms=e.fieldTransforms.map(r=>function(s,o){const l=o.transform;if(l instanceof Hl)return{fieldPath:o.field.canonicalString(),setToServerValue:"REQUEST_TIME"};if(l instanceof bo)return{fieldPath:o.field.canonicalString(),appendMissingElements:{values:l.elements}};if(l instanceof Vo)return{fieldPath:o.field.canonicalString(),removeAllFromArray:{values:l.elements}};if(l instanceof Kl)return{fieldPath:o.field.canonicalString(),increment:l.Pe};throw J()}(0,r))),e.precondition.isNone||(n.currentDocument=function(i,s){return s.updateTime!==void 0?{updateTime:j1(i,s.updateTime)}:s.exists!==void 0?{exists:s.exists}:J()}(t,e.precondition)),n}function z1(t,e){return t&&t.length>0?(he(e!==void 0),t.map(n=>function(i,s){let o=i.updateTime?hn(i.updateTime):hn(s);return o.isEqual(Z.min())&&(o=hn(s)),new I1(o,i.transformResults||[])}(n,e))):[]}function $1(t,e){return{documents:[FE(t,e.path)]}}function W1(t,e){const n={structuredQuery:{}},r=e.path;let i;e.collectionGroup!==null?(i=r,n.structuredQuery.from=[{collectionId:e.collectionGroup,allDescendants:!0}]):(i=r.popLast(),n.structuredQuery.from=[{collectionId:r.lastSegment()}]),n.parent=FE(t,i);const s=function(h){if(h.length!==0)return $E(Jt.create(h,"and"))}(e.filters);s&&(n.structuredQuery.where=s);const o=function(h){if(h.length!==0)return h.map(f=>function(_){return{field:gi(_.field),direction:K1(_.dir)}}(f))}(e.orderBy);o&&(n.structuredQuery.orderBy=o);const l=ed(t,e.limit);return l!==null&&(n.structuredQuery.limit=l),e.startAt&&(n.structuredQuery.startAt=function(h){return{before:h.inclusive,values:h.position}}(e.startAt)),e.endAt&&(n.structuredQuery.endAt=function(h){return{before:!h.inclusive,values:h.position}}(e.endAt)),{_t:n,parent:i}}function q1(t){let e=U1(t.parent);const n=t.structuredQuery,r=n.from?n.from.length:0;let i=null;if(r>0){he(r===1);const f=n.from[0];f.allDescendants?i=f.collectionId:e=e.child(f.collectionId)}let s=[];n.where&&(s=function(m){const _=zE(m);return _ instanceof Jt&&_E(_)?_.getFilters():[_]}(n.where));let o=[];n.orderBy&&(o=function(m){return m.map(_=>function(k){return new Oo(yi(k.field),function(C){switch(C){case"ASCENDING":return"asc";case"DESCENDING":return"desc";default:return}}(k.direction))}(_))}(n.orderBy));let l=null;n.limit&&(l=function(m){let _;return _=typeof m=="object"?m.value:m,Tu(_)?null:_}(n.limit));let u=null;n.startAt&&(u=function(m){const _=!!m.before,R=m.values||[];return new ql(R,_)}(n.startAt));let h=null;return n.endAt&&(h=function(m){const _=!m.before,R=m.values||[];return new ql(R,_)}(n.endAt)),c1(e,i,o,s,l,"F",u,h)}function H1(t,e){const n=function(i){switch(i){case"TargetPurposeListen":return null;case"TargetPurposeExistenceFilterMismatch":return"existence-filter-mismatch";case"TargetPurposeExistenceFilterMismatchBloom":return"existence-filter-mismatch-bloom";case"TargetPurposeLimboResolution":return"limbo-document";default:return J()}}(e.purpose);return n==null?null:{"goog-listen-tags":n}}function zE(t){return t.unaryFilter!==void 0?function(n){switch(n.unaryFilter.op){case"IS_NAN":const r=yi(n.unaryFilter.field);return Ve.create(r,"==",{doubleValue:NaN});case"IS_NULL":const i=yi(n.unaryFilter.field);return Ve.create(i,"==",{nullValue:"NULL_VALUE"});case"IS_NOT_NAN":const s=yi(n.unaryFilter.field);return Ve.create(s,"!=",{doubleValue:NaN});case"IS_NOT_NULL":const o=yi(n.unaryFilter.field);return Ve.create(o,"!=",{nullValue:"NULL_VALUE"});default:return J()}}(t):t.fieldFilter!==void 0?function(n){return Ve.create(yi(n.fieldFilter.field),function(i){switch(i){case"EQUAL":return"==";case"NOT_EQUAL":return"!=";case"GREATER_THAN":return">";case"GREATER_THAN_OR_EQUAL":return">=";case"LESS_THAN":return"<";case"LESS_THAN_OR_EQUAL":return"<=";case"ARRAY_CONTAINS":return"array-contains";case"IN":return"in";case"NOT_IN":return"not-in";case"ARRAY_CONTAINS_ANY":return"array-contains-any";default:return J()}}(n.fieldFilter.op),n.fieldFilter.value)}(t):t.compositeFilter!==void 0?function(n){return Jt.create(n.compositeFilter.filters.map(r=>zE(r)),function(i){switch(i){case"AND":return"and";case"OR":return"or";default:return J()}}(n.compositeFilter.op))}(t):J()}function K1(t){return b1[t]}function G1(t){return V1[t]}function Q1(t){return L1[t]}function gi(t){return{fieldPath:t.canonicalString()}}function yi(t){return Ke.fromServerFormat(t.fieldPath)}function $E(t){return t instanceof Ve?function(n){if(n.op==="=="){if(oy(n.value))return{unaryFilter:{field:gi(n.field),op:"IS_NAN"}};if(sy(n.value))return{unaryFilter:{field:gi(n.field),op:"IS_NULL"}}}else if(n.op==="!="){if(oy(n.value))return{unaryFilter:{field:gi(n.field),op:"IS_NOT_NAN"}};if(sy(n.value))return{unaryFilter:{field:gi(n.field),op:"IS_NOT_NULL"}}}return{fieldFilter:{field:gi(n.field),op:G1(n.op),value:n.value}}}(t):t instanceof Jt?function(n){const r=n.getFilters().map(i=>$E(i));return r.length===1?r[0]:{compositeFilter:{op:Q1(n.op),filters:r}}}(t):J()}function X1(t){const e=[];return t.fields.forEach(n=>e.push(n.canonicalString())),{fieldPaths:e}}function WE(t){return t.length>=4&&t.get(0)==="projects"&&t.get(2)==="databases"}/**
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
 */class sr{constructor(e,n,r,i,s=Z.min(),o=Z.min(),l=Ye.EMPTY_BYTE_STRING,u=null){this.target=e,this.targetId=n,this.purpose=r,this.sequenceNumber=i,this.snapshotVersion=s,this.lastLimboFreeSnapshotVersion=o,this.resumeToken=l,this.expectedCount=u}withSequenceNumber(e){return new sr(this.target,this.targetId,this.purpose,e,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,this.expectedCount)}withResumeToken(e,n){return new sr(this.target,this.targetId,this.purpose,this.sequenceNumber,n,this.lastLimboFreeSnapshotVersion,e,null)}withExpectedCount(e){return new sr(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,e)}withLastLimboFreeSnapshotVersion(e){return new sr(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,e,this.resumeToken,this.expectedCount)}}/**
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
 */class Y1{constructor(e){this.ct=e}}function J1(t){const e=q1({parent:t.parent,structuredQuery:t.structuredQuery});return t.limitType==="LAST"?Zh(e,e.limit,"L"):e}/**
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
 */class Z1{constructor(){this.un=new ex}addToCollectionParentIndex(e,n){return this.un.add(n),F.resolve()}getCollectionParents(e,n){return F.resolve(this.un.getEntries(n))}addFieldIndex(e,n){return F.resolve()}deleteFieldIndex(e,n){return F.resolve()}deleteAllFieldIndexes(e){return F.resolve()}createTargetIndexes(e,n){return F.resolve()}getDocumentsMatchingTarget(e,n){return F.resolve(null)}getIndexType(e,n){return F.resolve(0)}getFieldIndexes(e,n){return F.resolve([])}getNextCollectionGroupToUpdate(e){return F.resolve(null)}getMinOffset(e,n){return F.resolve(Er.min())}getMinOffsetFromCollectionGroup(e,n){return F.resolve(Er.min())}updateCollectionGroup(e,n,r){return F.resolve()}updateIndexEntries(e,n){return F.resolve()}}class ex{constructor(){this.index={}}add(e){const n=e.lastSegment(),r=e.popLast(),i=this.index[n]||new Qe(ge.comparator),s=!i.has(r);return this.index[n]=i.add(r),s}has(e){const n=e.lastSegment(),r=e.popLast(),i=this.index[n];return i&&i.has(r)}getEntries(e){return(this.index[e]||new Qe(ge.comparator)).toArray()}}/**
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
 */class Zi{constructor(e){this.Ln=e}next(){return this.Ln+=2,this.Ln}static Bn(){return new Zi(0)}static kn(){return new Zi(-1)}}/**
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
 */class tx{constructor(){this.changes=new ds(e=>e.toString(),(e,n)=>e.isEqual(n)),this.changesApplied=!1}addEntry(e){this.assertNotApplied(),this.changes.set(e.key,e)}removeEntry(e,n){this.assertNotApplied(),this.changes.set(e,ot.newInvalidDocument(e).setReadTime(n))}getEntry(e,n){this.assertNotApplied();const r=this.changes.get(n);return r!==void 0?F.resolve(r):this.getFromCache(e,n)}getEntries(e,n){return this.getAllFromCache(e,n)}apply(e){return this.assertNotApplied(),this.changesApplied=!0,this.applyChanges(e)}assertNotApplied(){}}/**
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
 */class nx{constructor(e,n){this.overlayedDocument=e,this.mutatedFields=n}}/**
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
 */class rx{constructor(e,n,r,i){this.remoteDocumentCache=e,this.mutationQueue=n,this.documentOverlayCache=r,this.indexManager=i}getDocument(e,n){let r=null;return this.documentOverlayCache.getOverlay(e,n).next(i=>(r=i,this.remoteDocumentCache.getEntry(e,n))).next(i=>(r!==null&&so(r.mutation,i,$t.empty(),Ue.now()),i))}getDocuments(e,n){return this.remoteDocumentCache.getEntries(e,n).next(r=>this.getLocalViewOfDocuments(e,r,re()).next(()=>r))}getLocalViewOfDocuments(e,n,r=re()){const i=Ur();return this.populateOverlays(e,i,n).next(()=>this.computeViews(e,n,i,r).next(s=>{let o=$s();return s.forEach((l,u)=>{o=o.insert(l,u.overlayedDocument)}),o}))}getOverlayedDocuments(e,n){const r=Ur();return this.populateOverlays(e,r,n).next(()=>this.computeViews(e,n,r,re()))}populateOverlays(e,n,r){const i=[];return r.forEach(s=>{n.has(s)||i.push(s)}),this.documentOverlayCache.getOverlays(e,i).next(s=>{s.forEach((o,l)=>{n.set(o,l)})})}computeViews(e,n,r,i){let s=Un();const o=io(),l=function(){return io()}();return n.forEach((u,h)=>{const f=r.get(h.key);i.has(h.key)&&(f===void 0||f.mutation instanceof ai)?s=s.insert(h.key,h):f!==void 0?(o.set(h.key,f.mutation.getFieldMask()),so(f.mutation,h,f.mutation.getFieldMask(),Ue.now())):o.set(h.key,$t.empty())}),this.recalculateAndSaveOverlays(e,s).next(u=>(u.forEach((h,f)=>o.set(h,f)),n.forEach((h,f)=>{var m;return l.set(h,new nx(f,(m=o.get(h))!==null&&m!==void 0?m:null))}),l))}recalculateAndSaveOverlays(e,n){const r=io();let i=new Se((o,l)=>o-l),s=re();return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(e,n).next(o=>{for(const l of o)l.keys().forEach(u=>{const h=n.get(u);if(h===null)return;let f=r.get(u)||$t.empty();f=l.applyToLocalView(h,f),r.set(u,f);const m=(i.get(l.batchId)||re()).add(u);i=i.insert(l.batchId,m)})}).next(()=>{const o=[],l=i.getReverseIterator();for(;l.hasNext();){const u=l.getNext(),h=u.key,f=u.value,m=kE();f.forEach(_=>{if(!s.has(_)){const R=OE(n.get(_),r.get(_));R!==null&&m.set(_,R),s=s.add(_)}}),o.push(this.documentOverlayCache.saveOverlays(e,h,m))}return F.waitFor(o)}).next(()=>r)}recalculateAndSaveOverlaysForDocumentKeys(e,n){return this.remoteDocumentCache.getEntries(e,n).next(r=>this.recalculateAndSaveOverlays(e,r))}getDocumentsMatchingQuery(e,n,r,i){return function(o){return Q.isDocumentKey(o.path)&&o.collectionGroup===null&&o.filters.length===0}(n)?this.getDocumentsMatchingDocumentQuery(e,n.path):TE(n)?this.getDocumentsMatchingCollectionGroupQuery(e,n,r,i):this.getDocumentsMatchingCollectionQuery(e,n,r,i)}getNextDocuments(e,n,r,i){return this.remoteDocumentCache.getAllFromCollectionGroup(e,n,r,i).next(s=>{const o=i-s.size>0?this.documentOverlayCache.getOverlaysForCollectionGroup(e,n,r.largestBatchId,i-s.size):F.resolve(Ur());let l=-1,u=s;return o.next(h=>F.forEach(h,(f,m)=>(l<m.largestBatchId&&(l=m.largestBatchId),s.get(f)?F.resolve():this.remoteDocumentCache.getEntry(e,f).next(_=>{u=u.insert(f,_)}))).next(()=>this.populateOverlays(e,h,s)).next(()=>this.computeViews(e,u,h,re())).next(f=>({batchId:l,changes:AE(f)})))})}getDocumentsMatchingDocumentQuery(e,n){return this.getDocument(e,new Q(n)).next(r=>{let i=$s();return r.isFoundDocument()&&(i=i.insert(r.key,r)),i})}getDocumentsMatchingCollectionGroupQuery(e,n,r,i){const s=n.collectionGroup;let o=$s();return this.indexManager.getCollectionParents(e,s).next(l=>F.forEach(l,u=>{const h=function(m,_){return new hs(_,null,m.explicitOrderBy.slice(),m.filters.slice(),m.limit,m.limitType,m.startAt,m.endAt)}(n,u.child(s));return this.getDocumentsMatchingCollectionQuery(e,h,r,i).next(f=>{f.forEach((m,_)=>{o=o.insert(m,_)})})}).next(()=>o))}getDocumentsMatchingCollectionQuery(e,n,r,i){let s;return this.documentOverlayCache.getOverlaysForCollection(e,n.path,r.largestBatchId).next(o=>(s=o,this.remoteDocumentCache.getDocumentsMatchingQuery(e,n,r,s,i))).next(o=>{s.forEach((u,h)=>{const f=h.getKey();o.get(f)===null&&(o=o.insert(f,ot.newInvalidDocument(f)))});let l=$s();return o.forEach((u,h)=>{const f=s.get(u);f!==void 0&&so(f.mutation,h,$t.empty(),Ue.now()),Su(n,h)&&(l=l.insert(u,h))}),l})}}/**
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
 */class ix{constructor(e){this.serializer=e,this.hr=new Map,this.Pr=new Map}getBundleMetadata(e,n){return F.resolve(this.hr.get(n))}saveBundleMetadata(e,n){return this.hr.set(n.id,function(i){return{id:i.id,version:i.version,createTime:hn(i.createTime)}}(n)),F.resolve()}getNamedQuery(e,n){return F.resolve(this.Pr.get(n))}saveNamedQuery(e,n){return this.Pr.set(n.name,function(i){return{name:i.name,query:J1(i.bundledQuery),readTime:hn(i.readTime)}}(n)),F.resolve()}}/**
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
 */class sx{constructor(){this.overlays=new Se(Q.comparator),this.Ir=new Map}getOverlay(e,n){return F.resolve(this.overlays.get(n))}getOverlays(e,n){const r=Ur();return F.forEach(n,i=>this.getOverlay(e,i).next(s=>{s!==null&&r.set(i,s)})).next(()=>r)}saveOverlays(e,n,r){return r.forEach((i,s)=>{this.ht(e,n,s)}),F.resolve()}removeOverlaysForBatchId(e,n,r){const i=this.Ir.get(r);return i!==void 0&&(i.forEach(s=>this.overlays=this.overlays.remove(s)),this.Ir.delete(r)),F.resolve()}getOverlaysForCollection(e,n,r){const i=Ur(),s=n.length+1,o=new Q(n.child("")),l=this.overlays.getIteratorFrom(o);for(;l.hasNext();){const u=l.getNext().value,h=u.getKey();if(!n.isPrefixOf(h.path))break;h.path.length===s&&u.largestBatchId>r&&i.set(u.getKey(),u)}return F.resolve(i)}getOverlaysForCollectionGroup(e,n,r,i){let s=new Se((h,f)=>h-f);const o=this.overlays.getIterator();for(;o.hasNext();){const h=o.getNext().value;if(h.getKey().getCollectionGroup()===n&&h.largestBatchId>r){let f=s.get(h.largestBatchId);f===null&&(f=Ur(),s=s.insert(h.largestBatchId,f)),f.set(h.getKey(),h)}}const l=Ur(),u=s.getIterator();for(;u.hasNext()&&(u.getNext().value.forEach((h,f)=>l.set(h,f)),!(l.size()>=i)););return F.resolve(l)}ht(e,n,r){const i=this.overlays.get(r.key);if(i!==null){const o=this.Ir.get(i.largestBatchId).delete(r.key);this.Ir.set(i.largestBatchId,o)}this.overlays=this.overlays.insert(r.key,new C1(n,r));let s=this.Ir.get(n);s===void 0&&(s=re(),this.Ir.set(n,s)),this.Ir.set(n,s.add(r.key))}}/**
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
 */class ox{constructor(){this.sessionToken=Ye.EMPTY_BYTE_STRING}getSessionToken(e){return F.resolve(this.sessionToken)}setSessionToken(e,n){return this.sessionToken=n,F.resolve()}}/**
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
 */class Vf{constructor(){this.Tr=new Qe(Be.Er),this.dr=new Qe(Be.Ar)}isEmpty(){return this.Tr.isEmpty()}addReference(e,n){const r=new Be(e,n);this.Tr=this.Tr.add(r),this.dr=this.dr.add(r)}Rr(e,n){e.forEach(r=>this.addReference(r,n))}removeReference(e,n){this.Vr(new Be(e,n))}mr(e,n){e.forEach(r=>this.removeReference(r,n))}gr(e){const n=new Q(new ge([])),r=new Be(n,e),i=new Be(n,e+1),s=[];return this.dr.forEachInRange([r,i],o=>{this.Vr(o),s.push(o.key)}),s}pr(){this.Tr.forEach(e=>this.Vr(e))}Vr(e){this.Tr=this.Tr.delete(e),this.dr=this.dr.delete(e)}yr(e){const n=new Q(new ge([])),r=new Be(n,e),i=new Be(n,e+1);let s=re();return this.dr.forEachInRange([r,i],o=>{s=s.add(o.key)}),s}containsKey(e){const n=new Be(e,0),r=this.Tr.firstAfterOrEqual(n);return r!==null&&e.isEqual(r.key)}}class Be{constructor(e,n){this.key=e,this.wr=n}static Er(e,n){return Q.comparator(e.key,n.key)||le(e.wr,n.wr)}static Ar(e,n){return le(e.wr,n.wr)||Q.comparator(e.key,n.key)}}/**
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
 */class ax{constructor(e,n){this.indexManager=e,this.referenceDelegate=n,this.mutationQueue=[],this.Sr=1,this.br=new Qe(Be.Er)}checkEmpty(e){return F.resolve(this.mutationQueue.length===0)}addMutationBatch(e,n,r,i){const s=this.Sr;this.Sr++,this.mutationQueue.length>0&&this.mutationQueue[this.mutationQueue.length-1];const o=new k1(s,n,r,i);this.mutationQueue.push(o);for(const l of i)this.br=this.br.add(new Be(l.key,s)),this.indexManager.addToCollectionParentIndex(e,l.key.path.popLast());return F.resolve(o)}lookupMutationBatch(e,n){return F.resolve(this.Dr(n))}getNextMutationBatchAfterBatchId(e,n){const r=n+1,i=this.vr(r),s=i<0?0:i;return F.resolve(this.mutationQueue.length>s?this.mutationQueue[s]:null)}getHighestUnacknowledgedBatchId(){return F.resolve(this.mutationQueue.length===0?-1:this.Sr-1)}getAllMutationBatches(e){return F.resolve(this.mutationQueue.slice())}getAllMutationBatchesAffectingDocumentKey(e,n){const r=new Be(n,0),i=new Be(n,Number.POSITIVE_INFINITY),s=[];return this.br.forEachInRange([r,i],o=>{const l=this.Dr(o.wr);s.push(l)}),F.resolve(s)}getAllMutationBatchesAffectingDocumentKeys(e,n){let r=new Qe(le);return n.forEach(i=>{const s=new Be(i,0),o=new Be(i,Number.POSITIVE_INFINITY);this.br.forEachInRange([s,o],l=>{r=r.add(l.wr)})}),F.resolve(this.Cr(r))}getAllMutationBatchesAffectingQuery(e,n){const r=n.path,i=r.length+1;let s=r;Q.isDocumentKey(s)||(s=s.child(""));const o=new Be(new Q(s),0);let l=new Qe(le);return this.br.forEachWhile(u=>{const h=u.key.path;return!!r.isPrefixOf(h)&&(h.length===i&&(l=l.add(u.wr)),!0)},o),F.resolve(this.Cr(l))}Cr(e){const n=[];return e.forEach(r=>{const i=this.Dr(r);i!==null&&n.push(i)}),n}removeMutationBatch(e,n){he(this.Fr(n.batchId,"removed")===0),this.mutationQueue.shift();let r=this.br;return F.forEach(n.mutations,i=>{const s=new Be(i.key,n.batchId);return r=r.delete(s),this.referenceDelegate.markPotentiallyOrphaned(e,i.key)}).next(()=>{this.br=r})}On(e){}containsKey(e,n){const r=new Be(n,0),i=this.br.firstAfterOrEqual(r);return F.resolve(n.isEqual(i&&i.key))}performConsistencyCheck(e){return this.mutationQueue.length,F.resolve()}Fr(e,n){return this.vr(e)}vr(e){return this.mutationQueue.length===0?0:e-this.mutationQueue[0].batchId}Dr(e){const n=this.vr(e);return n<0||n>=this.mutationQueue.length?null:this.mutationQueue[n]}}/**
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
 */class lx{constructor(e){this.Mr=e,this.docs=function(){return new Se(Q.comparator)}(),this.size=0}setIndexManager(e){this.indexManager=e}addEntry(e,n){const r=n.key,i=this.docs.get(r),s=i?i.size:0,o=this.Mr(n);return this.docs=this.docs.insert(r,{document:n.mutableCopy(),size:o}),this.size+=o-s,this.indexManager.addToCollectionParentIndex(e,r.path.popLast())}removeEntry(e){const n=this.docs.get(e);n&&(this.docs=this.docs.remove(e),this.size-=n.size)}getEntry(e,n){const r=this.docs.get(n);return F.resolve(r?r.document.mutableCopy():ot.newInvalidDocument(n))}getEntries(e,n){let r=Un();return n.forEach(i=>{const s=this.docs.get(i);r=r.insert(i,s?s.document.mutableCopy():ot.newInvalidDocument(i))}),F.resolve(r)}getDocumentsMatchingQuery(e,n,r,i){let s=Un();const o=n.path,l=new Q(o.child("")),u=this.docs.getIteratorFrom(l);for(;u.hasNext();){const{key:h,value:{document:f}}=u.getNext();if(!o.isPrefixOf(h.path))break;h.path.length>o.length+1||qP(WP(f),r)<=0||(i.has(f.key)||Su(n,f))&&(s=s.insert(f.key,f.mutableCopy()))}return F.resolve(s)}getAllFromCollectionGroup(e,n,r,i){J()}Or(e,n){return F.forEach(this.docs,r=>n(r))}newChangeBuffer(e){return new ux(this)}getSize(e){return F.resolve(this.size)}}class ux extends tx{constructor(e){super(),this.cr=e}applyChanges(e){const n=[];return this.changes.forEach((r,i)=>{i.isValidDocument()?n.push(this.cr.addEntry(e,i)):this.cr.removeEntry(r)}),F.waitFor(n)}getFromCache(e,n){return this.cr.getEntry(e,n)}getAllFromCache(e,n){return this.cr.getEntries(e,n)}}/**
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
 */class cx{constructor(e){this.persistence=e,this.Nr=new ds(n=>kf(n),Cf),this.lastRemoteSnapshotVersion=Z.min(),this.highestTargetId=0,this.Lr=0,this.Br=new Vf,this.targetCount=0,this.kr=Zi.Bn()}forEachTarget(e,n){return this.Nr.forEach((r,i)=>n(i)),F.resolve()}getLastRemoteSnapshotVersion(e){return F.resolve(this.lastRemoteSnapshotVersion)}getHighestSequenceNumber(e){return F.resolve(this.Lr)}allocateTargetId(e){return this.highestTargetId=this.kr.next(),F.resolve(this.highestTargetId)}setTargetsMetadata(e,n,r){return r&&(this.lastRemoteSnapshotVersion=r),n>this.Lr&&(this.Lr=n),F.resolve()}Kn(e){this.Nr.set(e.target,e);const n=e.targetId;n>this.highestTargetId&&(this.kr=new Zi(n),this.highestTargetId=n),e.sequenceNumber>this.Lr&&(this.Lr=e.sequenceNumber)}addTargetData(e,n){return this.Kn(n),this.targetCount+=1,F.resolve()}updateTargetData(e,n){return this.Kn(n),F.resolve()}removeTargetData(e,n){return this.Nr.delete(n.target),this.Br.gr(n.targetId),this.targetCount-=1,F.resolve()}removeTargets(e,n,r){let i=0;const s=[];return this.Nr.forEach((o,l)=>{l.sequenceNumber<=n&&r.get(l.targetId)===null&&(this.Nr.delete(o),s.push(this.removeMatchingKeysForTargetId(e,l.targetId)),i++)}),F.waitFor(s).next(()=>i)}getTargetCount(e){return F.resolve(this.targetCount)}getTargetData(e,n){const r=this.Nr.get(n)||null;return F.resolve(r)}addMatchingKeys(e,n,r){return this.Br.Rr(n,r),F.resolve()}removeMatchingKeys(e,n,r){this.Br.mr(n,r);const i=this.persistence.referenceDelegate,s=[];return i&&n.forEach(o=>{s.push(i.markPotentiallyOrphaned(e,o))}),F.waitFor(s)}removeMatchingKeysForTargetId(e,n){return this.Br.gr(n),F.resolve()}getMatchingKeysForTargetId(e,n){const r=this.Br.yr(n);return F.resolve(r)}containsKey(e,n){return F.resolve(this.Br.containsKey(n))}}/**
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
 */class hx{constructor(e,n){this.qr={},this.overlays={},this.Qr=new If(0),this.Kr=!1,this.Kr=!0,this.$r=new ox,this.referenceDelegate=e(this),this.Ur=new cx(this),this.indexManager=new Z1,this.remoteDocumentCache=function(i){return new lx(i)}(r=>this.referenceDelegate.Wr(r)),this.serializer=new Y1(n),this.Gr=new ix(this.serializer)}start(){return Promise.resolve()}shutdown(){return this.Kr=!1,Promise.resolve()}get started(){return this.Kr}setDatabaseDeletedListener(){}setNetworkEnabled(){}getIndexManager(e){return this.indexManager}getDocumentOverlayCache(e){let n=this.overlays[e.toKey()];return n||(n=new sx,this.overlays[e.toKey()]=n),n}getMutationQueue(e,n){let r=this.qr[e.toKey()];return r||(r=new ax(n,this.referenceDelegate),this.qr[e.toKey()]=r),r}getGlobalsCache(){return this.$r}getTargetCache(){return this.Ur}getRemoteDocumentCache(){return this.remoteDocumentCache}getBundleCache(){return this.Gr}runTransaction(e,n,r){G("MemoryPersistence","Starting transaction:",e);const i=new dx(this.Qr.next());return this.referenceDelegate.zr(),r(i).next(s=>this.referenceDelegate.jr(i).next(()=>s)).toPromise().then(s=>(i.raiseOnCommittedEvent(),s))}Hr(e,n){return F.or(Object.values(this.qr).map(r=>()=>r.containsKey(e,n)))}}class dx extends KP{constructor(e){super(),this.currentSequenceNumber=e}}class Lf{constructor(e){this.persistence=e,this.Jr=new Vf,this.Yr=null}static Zr(e){return new Lf(e)}get Xr(){if(this.Yr)return this.Yr;throw J()}addReference(e,n,r){return this.Jr.addReference(r,n),this.Xr.delete(r.toString()),F.resolve()}removeReference(e,n,r){return this.Jr.removeReference(r,n),this.Xr.add(r.toString()),F.resolve()}markPotentiallyOrphaned(e,n){return this.Xr.add(n.toString()),F.resolve()}removeTarget(e,n){this.Jr.gr(n.targetId).forEach(i=>this.Xr.add(i.toString()));const r=this.persistence.getTargetCache();return r.getMatchingKeysForTargetId(e,n.targetId).next(i=>{i.forEach(s=>this.Xr.add(s.toString()))}).next(()=>r.removeTargetData(e,n))}zr(){this.Yr=new Set}jr(e){const n=this.persistence.getRemoteDocumentCache().newChangeBuffer();return F.forEach(this.Xr,r=>{const i=Q.fromPath(r);return this.ei(e,i).next(s=>{s||n.removeEntry(i,Z.min())})}).next(()=>(this.Yr=null,n.apply(e)))}updateLimboDocument(e,n){return this.ei(e,n).next(r=>{r?this.Xr.delete(n.toString()):this.Xr.add(n.toString())})}Wr(e){return 0}ei(e,n){return F.or([()=>F.resolve(this.Jr.containsKey(n)),()=>this.persistence.getTargetCache().containsKey(e,n),()=>this.persistence.Hr(e,n)])}}/**
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
 */class Mf{constructor(e,n,r,i){this.targetId=e,this.fromCache=n,this.$i=r,this.Ui=i}static Wi(e,n){let r=re(),i=re();for(const s of n.docChanges)switch(s.type){case 0:r=r.add(s.doc.key);break;case 1:i=i.add(s.doc.key)}return new Mf(e,n.fromCache,r,i)}}/**
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
 */class fx{constructor(){this._documentReadCount=0}get documentReadCount(){return this._documentReadCount}incrementDocumentReadCount(e){this._documentReadCount+=e}}/**
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
 */class px{constructor(){this.Gi=!1,this.zi=!1,this.ji=100,this.Hi=function(){return mA()?8:GP(lt())>0?6:4}()}initialize(e,n){this.Ji=e,this.indexManager=n,this.Gi=!0}getDocumentsMatchingQuery(e,n,r,i){const s={result:null};return this.Yi(e,n).next(o=>{s.result=o}).next(()=>{if(!s.result)return this.Zi(e,n,i,r).next(o=>{s.result=o})}).next(()=>{if(s.result)return;const o=new fx;return this.Xi(e,n,o).next(l=>{if(s.result=l,this.zi)return this.es(e,n,o,l.size)})}).next(()=>s.result)}es(e,n,r,i){return r.documentReadCount<this.ji?(Ls()<=ie.DEBUG&&G("QueryEngine","SDK will not create cache indexes for query:",mi(n),"since it only creates cache indexes for collection contains","more than or equal to",this.ji,"documents"),F.resolve()):(Ls()<=ie.DEBUG&&G("QueryEngine","Query:",mi(n),"scans",r.documentReadCount,"local documents and returns",i,"documents as results."),r.documentReadCount>this.Hi*i?(Ls()<=ie.DEBUG&&G("QueryEngine","The SDK decides to create cache indexes for query:",mi(n),"as using cache indexes may help improve performance."),this.indexManager.createTargetIndexes(e,un(n))):F.resolve())}Yi(e,n){if(cy(n))return F.resolve(null);let r=un(n);return this.indexManager.getIndexType(e,r).next(i=>i===0?null:(n.limit!==null&&i===1&&(n=Zh(n,null,"F"),r=un(n)),this.indexManager.getDocumentsMatchingTarget(e,r).next(s=>{const o=re(...s);return this.Ji.getDocuments(e,o).next(l=>this.indexManager.getMinOffset(e,r).next(u=>{const h=this.ts(n,l);return this.ns(n,h,o,u.readTime)?this.Yi(e,Zh(n,null,"F")):this.rs(e,h,n,u)}))})))}Zi(e,n,r,i){return cy(n)||i.isEqual(Z.min())?F.resolve(null):this.Ji.getDocuments(e,r).next(s=>{const o=this.ts(n,s);return this.ns(n,o,r,i)?F.resolve(null):(Ls()<=ie.DEBUG&&G("QueryEngine","Re-using previous result from %s to execute query: %s",i.toString(),mi(n)),this.rs(e,o,n,$P(i,-1)).next(l=>l))})}ts(e,n){let r=new Qe(SE(e));return n.forEach((i,s)=>{Su(e,s)&&(r=r.add(s))}),r}ns(e,n,r,i){if(e.limit===null)return!1;if(r.size!==n.size)return!0;const s=e.limitType==="F"?n.last():n.first();return!!s&&(s.hasPendingWrites||s.version.compareTo(i)>0)}Xi(e,n,r){return Ls()<=ie.DEBUG&&G("QueryEngine","Using full collection scan to execute query:",mi(n)),this.Ji.getDocumentsMatchingQuery(e,n,Er.min(),r)}rs(e,n,r,i){return this.Ji.getDocumentsMatchingQuery(e,r,i).next(s=>(n.forEach(o=>{s=s.insert(o.key,o)}),s))}}/**
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
 */class mx{constructor(e,n,r,i){this.persistence=e,this.ss=n,this.serializer=i,this.os=new Se(le),this._s=new ds(s=>kf(s),Cf),this.us=new Map,this.cs=e.getRemoteDocumentCache(),this.Ur=e.getTargetCache(),this.Gr=e.getBundleCache(),this.ls(r)}ls(e){this.documentOverlayCache=this.persistence.getDocumentOverlayCache(e),this.indexManager=this.persistence.getIndexManager(e),this.mutationQueue=this.persistence.getMutationQueue(e,this.indexManager),this.localDocuments=new rx(this.cs,this.mutationQueue,this.documentOverlayCache,this.indexManager),this.cs.setIndexManager(this.indexManager),this.ss.initialize(this.localDocuments,this.indexManager)}collectGarbage(e){return this.persistence.runTransaction("Collect garbage","readwrite-primary",n=>e.collect(n,this.os))}}function gx(t,e,n,r){return new mx(t,e,n,r)}async function qE(t,e){const n=ee(t);return await n.persistence.runTransaction("Handle user change","readonly",r=>{let i;return n.mutationQueue.getAllMutationBatches(r).next(s=>(i=s,n.ls(e),n.mutationQueue.getAllMutationBatches(r))).next(s=>{const o=[],l=[];let u=re();for(const h of i){o.push(h.batchId);for(const f of h.mutations)u=u.add(f.key)}for(const h of s){l.push(h.batchId);for(const f of h.mutations)u=u.add(f.key)}return n.localDocuments.getDocuments(r,u).next(h=>({hs:h,removedBatchIds:o,addedBatchIds:l}))})})}function yx(t,e){const n=ee(t);return n.persistence.runTransaction("Acknowledge batch","readwrite-primary",r=>{const i=e.batch.keys(),s=n.cs.newChangeBuffer({trackRemovals:!0});return function(l,u,h,f){const m=h.batch,_=m.keys();let R=F.resolve();return _.forEach(k=>{R=R.next(()=>f.getEntry(u,k)).next(x=>{const C=h.docVersions.get(k);he(C!==null),x.version.compareTo(C)<0&&(m.applyToRemoteDocument(x,h),x.isValidDocument()&&(x.setReadTime(h.commitVersion),f.addEntry(x)))})}),R.next(()=>l.mutationQueue.removeMutationBatch(u,m))}(n,r,e,s).next(()=>s.apply(r)).next(()=>n.mutationQueue.performConsistencyCheck(r)).next(()=>n.documentOverlayCache.removeOverlaysForBatchId(r,i,e.batch.batchId)).next(()=>n.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(r,function(l){let u=re();for(let h=0;h<l.mutationResults.length;++h)l.mutationResults[h].transformResults.length>0&&(u=u.add(l.batch.mutations[h].key));return u}(e))).next(()=>n.localDocuments.getDocuments(r,i))})}function HE(t){const e=ee(t);return e.persistence.runTransaction("Get last remote snapshot version","readonly",n=>e.Ur.getLastRemoteSnapshotVersion(n))}function _x(t,e){const n=ee(t),r=e.snapshotVersion;let i=n.os;return n.persistence.runTransaction("Apply remote event","readwrite-primary",s=>{const o=n.cs.newChangeBuffer({trackRemovals:!0});i=n.os;const l=[];e.targetChanges.forEach((f,m)=>{const _=i.get(m);if(!_)return;l.push(n.Ur.removeMatchingKeys(s,f.removedDocuments,m).next(()=>n.Ur.addMatchingKeys(s,f.addedDocuments,m)));let R=_.withSequenceNumber(s.currentSequenceNumber);e.targetMismatches.get(m)!==null?R=R.withResumeToken(Ye.EMPTY_BYTE_STRING,Z.min()).withLastLimboFreeSnapshotVersion(Z.min()):f.resumeToken.approximateByteSize()>0&&(R=R.withResumeToken(f.resumeToken,r)),i=i.insert(m,R),function(x,C,w){return x.resumeToken.approximateByteSize()===0||C.snapshotVersion.toMicroseconds()-x.snapshotVersion.toMicroseconds()>=3e8?!0:w.addedDocuments.size+w.modifiedDocuments.size+w.removedDocuments.size>0}(_,R,f)&&l.push(n.Ur.updateTargetData(s,R))});let u=Un(),h=re();if(e.documentUpdates.forEach(f=>{e.resolvedLimboDocuments.has(f)&&l.push(n.persistence.referenceDelegate.updateLimboDocument(s,f))}),l.push(vx(s,o,e.documentUpdates).next(f=>{u=f.Ps,h=f.Is})),!r.isEqual(Z.min())){const f=n.Ur.getLastRemoteSnapshotVersion(s).next(m=>n.Ur.setTargetsMetadata(s,s.currentSequenceNumber,r));l.push(f)}return F.waitFor(l).next(()=>o.apply(s)).next(()=>n.localDocuments.getLocalViewOfDocuments(s,u,h)).next(()=>u)}).then(s=>(n.os=i,s))}function vx(t,e,n){let r=re(),i=re();return n.forEach(s=>r=r.add(s)),e.getEntries(t,r).next(s=>{let o=Un();return n.forEach((l,u)=>{const h=s.get(l);u.isFoundDocument()!==h.isFoundDocument()&&(i=i.add(l)),u.isNoDocument()&&u.version.isEqual(Z.min())?(e.removeEntry(l,u.readTime),o=o.insert(l,u)):!h.isValidDocument()||u.version.compareTo(h.version)>0||u.version.compareTo(h.version)===0&&h.hasPendingWrites?(e.addEntry(u),o=o.insert(l,u)):G("LocalStore","Ignoring outdated watch update for ",l,". Current version:",h.version," Watch version:",u.version)}),{Ps:o,Is:i}})}function wx(t,e){const n=ee(t);return n.persistence.runTransaction("Get next mutation batch","readonly",r=>(e===void 0&&(e=-1),n.mutationQueue.getNextMutationBatchAfterBatchId(r,e)))}function Ex(t,e){const n=ee(t);return n.persistence.runTransaction("Allocate target","readwrite",r=>{let i;return n.Ur.getTargetData(r,e).next(s=>s?(i=s,F.resolve(i)):n.Ur.allocateTargetId(r).next(o=>(i=new sr(e,o,"TargetPurposeListen",r.currentSequenceNumber),n.Ur.addTargetData(r,i).next(()=>i))))}).then(r=>{const i=n.os.get(r.targetId);return(i===null||r.snapshotVersion.compareTo(i.snapshotVersion)>0)&&(n.os=n.os.insert(r.targetId,r),n._s.set(e,r.targetId)),r})}async function id(t,e,n){const r=ee(t),i=r.os.get(e),s=n?"readwrite":"readwrite-primary";try{n||await r.persistence.runTransaction("Release target",s,o=>r.persistence.referenceDelegate.removeTarget(o,i))}catch(o){if(!Go(o))throw o;G("LocalStore",`Failed to update sequence numbers for target ${e}: ${o}`)}r.os=r.os.remove(e),r._s.delete(i.target)}function Ey(t,e,n){const r=ee(t);let i=Z.min(),s=re();return r.persistence.runTransaction("Execute query","readwrite",o=>function(u,h,f){const m=ee(u),_=m._s.get(f);return _!==void 0?F.resolve(m.os.get(_)):m.Ur.getTargetData(h,f)}(r,o,un(e)).next(l=>{if(l)return i=l.lastLimboFreeSnapshotVersion,r.Ur.getMatchingKeysForTargetId(o,l.targetId).next(u=>{s=u})}).next(()=>r.ss.getDocumentsMatchingQuery(o,e,n?i:Z.min(),n?s:re())).next(l=>(Tx(r,d1(e),l),{documents:l,Ts:s})))}function Tx(t,e,n){let r=t.us.get(e)||Z.min();n.forEach((i,s)=>{s.readTime.compareTo(r)>0&&(r=s.readTime)}),t.us.set(e,r)}class Ty{constructor(){this.activeTargetIds=_1()}fs(e){this.activeTargetIds=this.activeTargetIds.add(e)}gs(e){this.activeTargetIds=this.activeTargetIds.delete(e)}Vs(){const e={activeTargetIds:this.activeTargetIds.toArray(),updateTimeMs:Date.now()};return JSON.stringify(e)}}class Ix{constructor(){this.so=new Ty,this.oo={},this.onlineStateHandler=null,this.sequenceNumberHandler=null}addPendingMutation(e){}updateMutationState(e,n,r){}addLocalQueryTarget(e,n=!0){return n&&this.so.fs(e),this.oo[e]||"not-current"}updateQueryState(e,n,r){this.oo[e]=n}removeLocalQueryTarget(e){this.so.gs(e)}isLocalQueryTarget(e){return this.so.activeTargetIds.has(e)}clearQueryState(e){delete this.oo[e]}getAllActiveQueryTargets(){return this.so.activeTargetIds}isActiveQueryTarget(e){return this.so.activeTargetIds.has(e)}start(){return this.so=new Ty,Promise.resolve()}handleUserChange(e,n,r){}setOnlineState(e){}shutdown(){}writeSequenceNumber(e){}notifyBundleLoaded(e){}}/**
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
 */class Sx{_o(e){}shutdown(){}}/**
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
 */class Iy{constructor(){this.ao=()=>this.uo(),this.co=()=>this.lo(),this.ho=[],this.Po()}_o(e){this.ho.push(e)}shutdown(){window.removeEventListener("online",this.ao),window.removeEventListener("offline",this.co)}Po(){window.addEventListener("online",this.ao),window.addEventListener("offline",this.co)}uo(){G("ConnectivityMonitor","Network connectivity changed: AVAILABLE");for(const e of this.ho)e(0)}lo(){G("ConnectivityMonitor","Network connectivity changed: UNAVAILABLE");for(const e of this.ho)e(1)}static D(){return typeof window<"u"&&window.addEventListener!==void 0&&window.removeEventListener!==void 0}}/**
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
 */let Fa=null;function Mc(){return Fa===null?Fa=function(){return 268435456+Math.round(2147483648*Math.random())}():Fa++,"0x"+Fa.toString(16)}/**
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
 */const Rx={BatchGetDocuments:"batchGet",Commit:"commit",RunQuery:"runQuery",RunAggregationQuery:"runAggregationQuery"};/**
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
 */class Ax{constructor(e){this.Io=e.Io,this.To=e.To}Eo(e){this.Ao=e}Ro(e){this.Vo=e}mo(e){this.fo=e}onMessage(e){this.po=e}close(){this.To()}send(e){this.Io(e)}yo(){this.Ao()}wo(){this.Vo()}So(e){this.fo(e)}bo(e){this.po(e)}}/**
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
 */const rt="WebChannelConnection";class kx extends class{constructor(n){this.databaseInfo=n,this.databaseId=n.databaseId;const r=n.ssl?"https":"http",i=encodeURIComponent(this.databaseId.projectId),s=encodeURIComponent(this.databaseId.database);this.Do=r+"://"+n.host,this.vo=`projects/${i}/databases/${s}`,this.Co=this.databaseId.database==="(default)"?`project_id=${i}`:`project_id=${i}&database_id=${s}`}get Fo(){return!1}Mo(n,r,i,s,o){const l=Mc(),u=this.xo(n,r.toUriEncodedString());G("RestConnection",`Sending RPC '${n}' ${l}:`,u,i);const h={"google-cloud-resource-prefix":this.vo,"x-goog-request-params":this.Co};return this.Oo(h,s,o),this.No(n,u,h,i).then(f=>(G("RestConnection",`Received RPC '${n}' ${l}: `,f),f),f=>{throw Qi("RestConnection",`RPC '${n}' ${l} failed with error: `,f,"url: ",u,"request:",i),f})}Lo(n,r,i,s,o,l){return this.Mo(n,r,i,s,o)}Oo(n,r,i){n["X-Goog-Api-Client"]=function(){return"gl-js/ fire/"+us}(),n["Content-Type"]="text/plain",this.databaseInfo.appId&&(n["X-Firebase-GMPID"]=this.databaseInfo.appId),r&&r.headers.forEach((s,o)=>n[o]=s),i&&i.headers.forEach((s,o)=>n[o]=s)}xo(n,r){const i=Rx[n];return`${this.Do}/v1/${r}:${i}`}terminate(){}}{constructor(e){super(e),this.forceLongPolling=e.forceLongPolling,this.autoDetectLongPolling=e.autoDetectLongPolling,this.useFetchStreams=e.useFetchStreams,this.longPollingOptions=e.longPollingOptions}No(e,n,r,i){const s=Mc();return new Promise((o,l)=>{const u=new oE;u.setWithCredentials(!0),u.listenOnce(aE.COMPLETE,()=>{try{switch(u.getLastErrorCode()){case sl.NO_ERROR:const f=u.getResponseJson();G(rt,`XHR for RPC '${e}' ${s} received:`,JSON.stringify(f)),o(f);break;case sl.TIMEOUT:G(rt,`RPC '${e}' ${s} timed out`),l(new K(M.DEADLINE_EXCEEDED,"Request time out"));break;case sl.HTTP_ERROR:const m=u.getStatus();if(G(rt,`RPC '${e}' ${s} failed with status:`,m,"response text:",u.getResponseText()),m>0){let _=u.getResponseJson();Array.isArray(_)&&(_=_[0]);const R=_==null?void 0:_.error;if(R&&R.status&&R.message){const k=function(C){const w=C.toLowerCase().replace(/_/g,"-");return Object.values(M).indexOf(w)>=0?w:M.UNKNOWN}(R.status);l(new K(k,R.message))}else l(new K(M.UNKNOWN,"Server responded with status "+u.getStatus()))}else l(new K(M.UNAVAILABLE,"Connection failed."));break;default:J()}}finally{G(rt,`RPC '${e}' ${s} completed.`)}});const h=JSON.stringify(i);G(rt,`RPC '${e}' ${s} sending request:`,i),u.send(n,"POST",h,r,15)})}Bo(e,n,r){const i=Mc(),s=[this.Do,"/","google.firestore.v1.Firestore","/",e,"/channel"],o=cE(),l=uE(),u={httpSessionIdParam:"gsessionid",initMessageHeaders:{},messageUrlParams:{database:`projects/${this.databaseId.projectId}/databases/${this.databaseId.database}`},sendRawJson:!0,supportsCrossDomainXhr:!0,internalChannelParams:{forwardChannelRequestTimeoutMs:6e5},forceLongPolling:this.forceLongPolling,detectBufferingProxy:this.autoDetectLongPolling},h=this.longPollingOptions.timeoutSeconds;h!==void 0&&(u.longPollingTimeout=Math.round(1e3*h)),this.useFetchStreams&&(u.useFetchStreams=!0),this.Oo(u.initMessageHeaders,n,r),u.encodeInitMessageHeaders=!0;const f=s.join("");G(rt,`Creating RPC '${e}' stream ${i}: ${f}`,u);const m=o.createWebChannel(f,u);let _=!1,R=!1;const k=new Ax({Io:C=>{R?G(rt,`Not sending because RPC '${e}' stream ${i} is closed:`,C):(_||(G(rt,`Opening RPC '${e}' stream ${i} transport.`),m.open(),_=!0),G(rt,`RPC '${e}' stream ${i} sending:`,C),m.send(C))},To:()=>m.close()}),x=(C,w,g)=>{C.listen(w,T=>{try{g(T)}catch(D){setTimeout(()=>{throw D},0)}})};return x(m,zs.EventType.OPEN,()=>{R||(G(rt,`RPC '${e}' stream ${i} transport opened.`),k.yo())}),x(m,zs.EventType.CLOSE,()=>{R||(R=!0,G(rt,`RPC '${e}' stream ${i} transport closed`),k.So())}),x(m,zs.EventType.ERROR,C=>{R||(R=!0,Qi(rt,`RPC '${e}' stream ${i} transport errored:`,C),k.So(new K(M.UNAVAILABLE,"The operation could not be completed")))}),x(m,zs.EventType.MESSAGE,C=>{var w;if(!R){const g=C.data[0];he(!!g);const T=g,D=T.error||((w=T[0])===null||w===void 0?void 0:w.error);if(D){G(rt,`RPC '${e}' stream ${i} received error:`,D);const j=D.status;let U=function(E){const S=Oe[E];if(S!==void 0)return VE(S)}(j),I=D.message;U===void 0&&(U=M.INTERNAL,I="Unknown error status: "+j+" with message "+D.message),R=!0,k.So(new K(U,I)),m.close()}else G(rt,`RPC '${e}' stream ${i} received:`,g),k.bo(g)}}),x(l,lE.STAT_EVENT,C=>{C.stat===Kh.PROXY?G(rt,`RPC '${e}' stream ${i} detected buffering proxy`):C.stat===Kh.NOPROXY&&G(rt,`RPC '${e}' stream ${i} detected no buffering proxy`)}),setTimeout(()=>{k.wo()},0),k}}function jc(){return typeof document<"u"?document:null}/**
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
 */function Cu(t){return new M1(t,!0)}/**
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
 */class KE{constructor(e,n,r=1e3,i=1.5,s=6e4){this.ui=e,this.timerId=n,this.ko=r,this.qo=i,this.Qo=s,this.Ko=0,this.$o=null,this.Uo=Date.now(),this.reset()}reset(){this.Ko=0}Wo(){this.Ko=this.Qo}Go(e){this.cancel();const n=Math.floor(this.Ko+this.zo()),r=Math.max(0,Date.now()-this.Uo),i=Math.max(0,n-r);i>0&&G("ExponentialBackoff",`Backing off for ${i} ms (base delay: ${this.Ko} ms, delay with jitter: ${n} ms, last attempt: ${r} ms ago)`),this.$o=this.ui.enqueueAfterDelay(this.timerId,i,()=>(this.Uo=Date.now(),e())),this.Ko*=this.qo,this.Ko<this.ko&&(this.Ko=this.ko),this.Ko>this.Qo&&(this.Ko=this.Qo)}jo(){this.$o!==null&&(this.$o.skipDelay(),this.$o=null)}cancel(){this.$o!==null&&(this.$o.cancel(),this.$o=null)}zo(){return(Math.random()-.5)*this.Ko}}/**
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
 */class GE{constructor(e,n,r,i,s,o,l,u){this.ui=e,this.Ho=r,this.Jo=i,this.connection=s,this.authCredentialsProvider=o,this.appCheckCredentialsProvider=l,this.listener=u,this.state=0,this.Yo=0,this.Zo=null,this.Xo=null,this.stream=null,this.e_=0,this.t_=new KE(e,n)}n_(){return this.state===1||this.state===5||this.r_()}r_(){return this.state===2||this.state===3}start(){this.e_=0,this.state!==4?this.auth():this.i_()}async stop(){this.n_()&&await this.close(0)}s_(){this.state=0,this.t_.reset()}o_(){this.r_()&&this.Zo===null&&(this.Zo=this.ui.enqueueAfterDelay(this.Ho,6e4,()=>this.__()))}a_(e){this.u_(),this.stream.send(e)}async __(){if(this.r_())return this.close(0)}u_(){this.Zo&&(this.Zo.cancel(),this.Zo=null)}c_(){this.Xo&&(this.Xo.cancel(),this.Xo=null)}async close(e,n){this.u_(),this.c_(),this.t_.cancel(),this.Yo++,e!==4?this.t_.reset():n&&n.code===M.RESOURCE_EXHAUSTED?(jn(n.toString()),jn("Using maximum backoff delay to prevent overloading the backend."),this.t_.Wo()):n&&n.code===M.UNAUTHENTICATED&&this.state!==3&&(this.authCredentialsProvider.invalidateToken(),this.appCheckCredentialsProvider.invalidateToken()),this.stream!==null&&(this.l_(),this.stream.close(),this.stream=null),this.state=e,await this.listener.mo(n)}l_(){}auth(){this.state=1;const e=this.h_(this.Yo),n=this.Yo;Promise.all([this.authCredentialsProvider.getToken(),this.appCheckCredentialsProvider.getToken()]).then(([r,i])=>{this.Yo===n&&this.P_(r,i)},r=>{e(()=>{const i=new K(M.UNKNOWN,"Fetching auth token failed: "+r.message);return this.I_(i)})})}P_(e,n){const r=this.h_(this.Yo);this.stream=this.T_(e,n),this.stream.Eo(()=>{r(()=>this.listener.Eo())}),this.stream.Ro(()=>{r(()=>(this.state=2,this.Xo=this.ui.enqueueAfterDelay(this.Jo,1e4,()=>(this.r_()&&(this.state=3),Promise.resolve())),this.listener.Ro()))}),this.stream.mo(i=>{r(()=>this.I_(i))}),this.stream.onMessage(i=>{r(()=>++this.e_==1?this.E_(i):this.onNext(i))})}i_(){this.state=5,this.t_.Go(async()=>{this.state=0,this.start()})}I_(e){return G("PersistentStream",`close with error: ${e}`),this.stream=null,this.close(4,e)}h_(e){return n=>{this.ui.enqueueAndForget(()=>this.Yo===e?n():(G("PersistentStream","stream callback skipped by getCloseGuardedDispatcher."),Promise.resolve()))}}}class Cx extends GE{constructor(e,n,r,i,s,o){super(e,"listen_stream_connection_backoff","listen_stream_idle","health_check_timeout",n,r,i,o),this.serializer=s}T_(e,n){return this.connection.Bo("Listen",e,n)}E_(e){return this.onNext(e)}onNext(e){this.t_.reset();const n=F1(this.serializer,e),r=function(s){if(!("targetChange"in s))return Z.min();const o=s.targetChange;return o.targetIds&&o.targetIds.length?Z.min():o.readTime?hn(o.readTime):Z.min()}(e);return this.listener.d_(n,r)}A_(e){const n={};n.database=rd(this.serializer),n.addTarget=function(s,o){let l;const u=o.target;if(l=Yh(u)?{documents:$1(s,u)}:{query:W1(s,u)._t},l.targetId=o.targetId,o.resumeToken.approximateByteSize()>0){l.resumeToken=jE(s,o.resumeToken);const h=ed(s,o.expectedCount);h!==null&&(l.expectedCount=h)}else if(o.snapshotVersion.compareTo(Z.min())>0){l.readTime=Gl(s,o.snapshotVersion.toTimestamp());const h=ed(s,o.expectedCount);h!==null&&(l.expectedCount=h)}return l}(this.serializer,e);const r=H1(this.serializer,e);r&&(n.labels=r),this.a_(n)}R_(e){const n={};n.database=rd(this.serializer),n.removeTarget=e,this.a_(n)}}class Px extends GE{constructor(e,n,r,i,s,o){super(e,"write_stream_connection_backoff","write_stream_idle","health_check_timeout",n,r,i,o),this.serializer=s}get V_(){return this.e_>0}start(){this.lastStreamToken=void 0,super.start()}l_(){this.V_&&this.m_([])}T_(e,n){return this.connection.Bo("Write",e,n)}E_(e){return he(!!e.streamToken),this.lastStreamToken=e.streamToken,he(!e.writeResults||e.writeResults.length===0),this.listener.f_()}onNext(e){he(!!e.streamToken),this.lastStreamToken=e.streamToken,this.t_.reset();const n=z1(e.writeResults,e.commitTime),r=hn(e.commitTime);return this.listener.g_(r,n)}p_(){const e={};e.database=rd(this.serializer),this.a_(e)}m_(e){const n={streamToken:this.lastStreamToken,writes:e.map(r=>B1(this.serializer,r))};this.a_(n)}}/**
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
 */class xx extends class{}{constructor(e,n,r,i){super(),this.authCredentials=e,this.appCheckCredentials=n,this.connection=r,this.serializer=i,this.y_=!1}w_(){if(this.y_)throw new K(M.FAILED_PRECONDITION,"The client has already been terminated.")}Mo(e,n,r,i){return this.w_(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([s,o])=>this.connection.Mo(e,td(n,r),i,s,o)).catch(s=>{throw s.name==="FirebaseError"?(s.code===M.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),s):new K(M.UNKNOWN,s.toString())})}Lo(e,n,r,i,s){return this.w_(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([o,l])=>this.connection.Lo(e,td(n,r),i,o,l,s)).catch(o=>{throw o.name==="FirebaseError"?(o.code===M.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),o):new K(M.UNKNOWN,o.toString())})}terminate(){this.y_=!0,this.connection.terminate()}}class Nx{constructor(e,n){this.asyncQueue=e,this.onlineStateHandler=n,this.state="Unknown",this.S_=0,this.b_=null,this.D_=!0}v_(){this.S_===0&&(this.C_("Unknown"),this.b_=this.asyncQueue.enqueueAfterDelay("online_state_timeout",1e4,()=>(this.b_=null,this.F_("Backend didn't respond within 10 seconds."),this.C_("Offline"),Promise.resolve())))}M_(e){this.state==="Online"?this.C_("Unknown"):(this.S_++,this.S_>=1&&(this.x_(),this.F_(`Connection failed 1 times. Most recent error: ${e.toString()}`),this.C_("Offline")))}set(e){this.x_(),this.S_=0,e==="Online"&&(this.D_=!1),this.C_(e)}C_(e){e!==this.state&&(this.state=e,this.onlineStateHandler(e))}F_(e){const n=`Could not reach Cloud Firestore backend. ${e}
This typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.`;this.D_?(jn(n),this.D_=!1):G("OnlineStateTracker",n)}x_(){this.b_!==null&&(this.b_.cancel(),this.b_=null)}}/**
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
 */class Dx{constructor(e,n,r,i,s){this.localStore=e,this.datastore=n,this.asyncQueue=r,this.remoteSyncer={},this.O_=[],this.N_=new Map,this.L_=new Set,this.B_=[],this.k_=s,this.k_._o(o=>{r.enqueueAndForget(async()=>{li(this)&&(G("RemoteStore","Restarting streams for network reachability change."),await async function(u){const h=ee(u);h.L_.add(4),await Yo(h),h.q_.set("Unknown"),h.L_.delete(4),await Pu(h)}(this))})}),this.q_=new Nx(r,i)}}async function Pu(t){if(li(t))for(const e of t.B_)await e(!0)}async function Yo(t){for(const e of t.B_)await e(!1)}function QE(t,e){const n=ee(t);n.N_.has(e.targetId)||(n.N_.set(e.targetId,e),Bf(n)?Ff(n):fs(n).r_()&&Uf(n,e))}function jf(t,e){const n=ee(t),r=fs(n);n.N_.delete(e),r.r_()&&XE(n,e),n.N_.size===0&&(r.r_()?r.o_():li(n)&&n.q_.set("Unknown"))}function Uf(t,e){if(t.Q_.xe(e.targetId),e.resumeToken.approximateByteSize()>0||e.snapshotVersion.compareTo(Z.min())>0){const n=t.remoteSyncer.getRemoteKeysForTarget(e.targetId).size;e=e.withExpectedCount(n)}fs(t).A_(e)}function XE(t,e){t.Q_.xe(e),fs(t).R_(e)}function Ff(t){t.Q_=new O1({getRemoteKeysForTarget:e=>t.remoteSyncer.getRemoteKeysForTarget(e),ot:e=>t.N_.get(e)||null,tt:()=>t.datastore.serializer.databaseId}),fs(t).start(),t.q_.v_()}function Bf(t){return li(t)&&!fs(t).n_()&&t.N_.size>0}function li(t){return ee(t).L_.size===0}function YE(t){t.Q_=void 0}async function Ox(t){t.q_.set("Online")}async function bx(t){t.N_.forEach((e,n)=>{Uf(t,e)})}async function Vx(t,e){YE(t),Bf(t)?(t.q_.M_(e),Ff(t)):t.q_.set("Unknown")}async function Lx(t,e,n){if(t.q_.set("Online"),e instanceof ME&&e.state===2&&e.cause)try{await async function(i,s){const o=s.cause;for(const l of s.targetIds)i.N_.has(l)&&(await i.remoteSyncer.rejectListen(l,o),i.N_.delete(l),i.Q_.removeTarget(l))}(t,e)}catch(r){G("RemoteStore","Failed to remove targets %s: %s ",e.targetIds.join(","),r),await Ql(t,r)}else if(e instanceof ll?t.Q_.Ke(e):e instanceof LE?t.Q_.He(e):t.Q_.We(e),!n.isEqual(Z.min()))try{const r=await HE(t.localStore);n.compareTo(r)>=0&&await function(s,o){const l=s.Q_.rt(o);return l.targetChanges.forEach((u,h)=>{if(u.resumeToken.approximateByteSize()>0){const f=s.N_.get(h);f&&s.N_.set(h,f.withResumeToken(u.resumeToken,o))}}),l.targetMismatches.forEach((u,h)=>{const f=s.N_.get(u);if(!f)return;s.N_.set(u,f.withResumeToken(Ye.EMPTY_BYTE_STRING,f.snapshotVersion)),XE(s,u);const m=new sr(f.target,u,h,f.sequenceNumber);Uf(s,m)}),s.remoteSyncer.applyRemoteEvent(l)}(t,n)}catch(r){G("RemoteStore","Failed to raise snapshot:",r),await Ql(t,r)}}async function Ql(t,e,n){if(!Go(e))throw e;t.L_.add(1),await Yo(t),t.q_.set("Offline"),n||(n=()=>HE(t.localStore)),t.asyncQueue.enqueueRetryable(async()=>{G("RemoteStore","Retrying IndexedDB access"),await n(),t.L_.delete(1),await Pu(t)})}function JE(t,e){return e().catch(n=>Ql(t,n,e))}async function xu(t){const e=ee(t),n=Ir(e);let r=e.O_.length>0?e.O_[e.O_.length-1].batchId:-1;for(;Mx(e);)try{const i=await wx(e.localStore,r);if(i===null){e.O_.length===0&&n.o_();break}r=i.batchId,jx(e,i)}catch(i){await Ql(e,i)}ZE(e)&&e0(e)}function Mx(t){return li(t)&&t.O_.length<10}function jx(t,e){t.O_.push(e);const n=Ir(t);n.r_()&&n.V_&&n.m_(e.mutations)}function ZE(t){return li(t)&&!Ir(t).n_()&&t.O_.length>0}function e0(t){Ir(t).start()}async function Ux(t){Ir(t).p_()}async function Fx(t){const e=Ir(t);for(const n of t.O_)e.m_(n.mutations)}async function Bx(t,e,n){const r=t.O_.shift(),i=Df.from(r,e,n);await JE(t,()=>t.remoteSyncer.applySuccessfulWrite(i)),await xu(t)}async function zx(t,e){e&&Ir(t).V_&&await async function(r,i){if(function(o){return x1(o)&&o!==M.ABORTED}(i.code)){const s=r.O_.shift();Ir(r).s_(),await JE(r,()=>r.remoteSyncer.rejectFailedWrite(s.batchId,i)),await xu(r)}}(t,e),ZE(t)&&e0(t)}async function Sy(t,e){const n=ee(t);n.asyncQueue.verifyOperationInProgress(),G("RemoteStore","RemoteStore received new credentials");const r=li(n);n.L_.add(3),await Yo(n),r&&n.q_.set("Unknown"),await n.remoteSyncer.handleCredentialChange(e),n.L_.delete(3),await Pu(n)}async function $x(t,e){const n=ee(t);e?(n.L_.delete(2),await Pu(n)):e||(n.L_.add(2),await Yo(n),n.q_.set("Unknown"))}function fs(t){return t.K_||(t.K_=function(n,r,i){const s=ee(n);return s.w_(),new Cx(r,s.connection,s.authCredentials,s.appCheckCredentials,s.serializer,i)}(t.datastore,t.asyncQueue,{Eo:Ox.bind(null,t),Ro:bx.bind(null,t),mo:Vx.bind(null,t),d_:Lx.bind(null,t)}),t.B_.push(async e=>{e?(t.K_.s_(),Bf(t)?Ff(t):t.q_.set("Unknown")):(await t.K_.stop(),YE(t))})),t.K_}function Ir(t){return t.U_||(t.U_=function(n,r,i){const s=ee(n);return s.w_(),new Px(r,s.connection,s.authCredentials,s.appCheckCredentials,s.serializer,i)}(t.datastore,t.asyncQueue,{Eo:()=>Promise.resolve(),Ro:Ux.bind(null,t),mo:zx.bind(null,t),f_:Fx.bind(null,t),g_:Bx.bind(null,t)}),t.B_.push(async e=>{e?(t.U_.s_(),await xu(t)):(await t.U_.stop(),t.O_.length>0&&(G("RemoteStore",`Stopping write stream with ${t.O_.length} pending writes`),t.O_=[]))})),t.U_}/**
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
 */class zf{constructor(e,n,r,i,s){this.asyncQueue=e,this.timerId=n,this.targetTimeMs=r,this.op=i,this.removalCallback=s,this.deferred=new Wr,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch(o=>{})}get promise(){return this.deferred.promise}static createAndSchedule(e,n,r,i,s){const o=Date.now()+r,l=new zf(e,n,o,i,s);return l.start(r),l}start(e){this.timerHandle=setTimeout(()=>this.handleDelayElapsed(),e)}skipDelay(){return this.handleDelayElapsed()}cancel(e){this.timerHandle!==null&&(this.clearTimeout(),this.deferred.reject(new K(M.CANCELLED,"Operation cancelled"+(e?": "+e:""))))}handleDelayElapsed(){this.asyncQueue.enqueueAndForget(()=>this.timerHandle!==null?(this.clearTimeout(),this.op().then(e=>this.deferred.resolve(e))):Promise.resolve())}clearTimeout(){this.timerHandle!==null&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null)}}function $f(t,e){if(jn("AsyncQueue",`${e}: ${t}`),Go(t))return new K(M.UNAVAILABLE,`${e}: ${t}`);throw t}/**
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
 */class Ui{constructor(e){this.comparator=e?(n,r)=>e(n,r)||Q.comparator(n.key,r.key):(n,r)=>Q.comparator(n.key,r.key),this.keyedMap=$s(),this.sortedSet=new Se(this.comparator)}static emptySet(e){return new Ui(e.comparator)}has(e){return this.keyedMap.get(e)!=null}get(e){return this.keyedMap.get(e)}first(){return this.sortedSet.minKey()}last(){return this.sortedSet.maxKey()}isEmpty(){return this.sortedSet.isEmpty()}indexOf(e){const n=this.keyedMap.get(e);return n?this.sortedSet.indexOf(n):-1}get size(){return this.sortedSet.size}forEach(e){this.sortedSet.inorderTraversal((n,r)=>(e(n),!1))}add(e){const n=this.delete(e.key);return n.copy(n.keyedMap.insert(e.key,e),n.sortedSet.insert(e,null))}delete(e){const n=this.get(e);return n?this.copy(this.keyedMap.remove(e),this.sortedSet.remove(n)):this}isEqual(e){if(!(e instanceof Ui)||this.size!==e.size)return!1;const n=this.sortedSet.getIterator(),r=e.sortedSet.getIterator();for(;n.hasNext();){const i=n.getNext().key,s=r.getNext().key;if(!i.isEqual(s))return!1}return!0}toString(){const e=[];return this.forEach(n=>{e.push(n.toString())}),e.length===0?"DocumentSet ()":`DocumentSet (
  `+e.join(`  
`)+`
)`}copy(e,n){const r=new Ui;return r.comparator=this.comparator,r.keyedMap=e,r.sortedSet=n,r}}/**
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
 */class Ry{constructor(){this.W_=new Se(Q.comparator)}track(e){const n=e.doc.key,r=this.W_.get(n);r?e.type!==0&&r.type===3?this.W_=this.W_.insert(n,e):e.type===3&&r.type!==1?this.W_=this.W_.insert(n,{type:r.type,doc:e.doc}):e.type===2&&r.type===2?this.W_=this.W_.insert(n,{type:2,doc:e.doc}):e.type===2&&r.type===0?this.W_=this.W_.insert(n,{type:0,doc:e.doc}):e.type===1&&r.type===0?this.W_=this.W_.remove(n):e.type===1&&r.type===2?this.W_=this.W_.insert(n,{type:1,doc:r.doc}):e.type===0&&r.type===1?this.W_=this.W_.insert(n,{type:2,doc:e.doc}):J():this.W_=this.W_.insert(n,e)}G_(){const e=[];return this.W_.inorderTraversal((n,r)=>{e.push(r)}),e}}class es{constructor(e,n,r,i,s,o,l,u,h){this.query=e,this.docs=n,this.oldDocs=r,this.docChanges=i,this.mutatedKeys=s,this.fromCache=o,this.syncStateChanged=l,this.excludesMetadataChanges=u,this.hasCachedResults=h}static fromInitialDocuments(e,n,r,i,s){const o=[];return n.forEach(l=>{o.push({type:0,doc:l})}),new es(e,n,Ui.emptySet(n),o,r,i,!0,!1,s)}get hasPendingWrites(){return!this.mutatedKeys.isEmpty()}isEqual(e){if(!(this.fromCache===e.fromCache&&this.hasCachedResults===e.hasCachedResults&&this.syncStateChanged===e.syncStateChanged&&this.mutatedKeys.isEqual(e.mutatedKeys)&&Iu(this.query,e.query)&&this.docs.isEqual(e.docs)&&this.oldDocs.isEqual(e.oldDocs)))return!1;const n=this.docChanges,r=e.docChanges;if(n.length!==r.length)return!1;for(let i=0;i<n.length;i++)if(n[i].type!==r[i].type||!n[i].doc.isEqual(r[i].doc))return!1;return!0}}/**
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
 */class Wx{constructor(){this.z_=void 0,this.j_=[]}H_(){return this.j_.some(e=>e.J_())}}class qx{constructor(){this.queries=Ay(),this.onlineState="Unknown",this.Y_=new Set}terminate(){(function(n,r){const i=ee(n),s=i.queries;i.queries=Ay(),s.forEach((o,l)=>{for(const u of l.j_)u.onError(r)})})(this,new K(M.ABORTED,"Firestore shutting down"))}}function Ay(){return new ds(t=>IE(t),Iu)}async function Hx(t,e){const n=ee(t);let r=3;const i=e.query;let s=n.queries.get(i);s?!s.H_()&&e.J_()&&(r=2):(s=new Wx,r=e.J_()?0:1);try{switch(r){case 0:s.z_=await n.onListen(i,!0);break;case 1:s.z_=await n.onListen(i,!1);break;case 2:await n.onFirstRemoteStoreListen(i)}}catch(o){const l=$f(o,`Initialization of query '${mi(e.query)}' failed`);return void e.onError(l)}n.queries.set(i,s),s.j_.push(e),e.Z_(n.onlineState),s.z_&&e.X_(s.z_)&&Wf(n)}async function Kx(t,e){const n=ee(t),r=e.query;let i=3;const s=n.queries.get(r);if(s){const o=s.j_.indexOf(e);o>=0&&(s.j_.splice(o,1),s.j_.length===0?i=e.J_()?0:1:!s.H_()&&e.J_()&&(i=2))}switch(i){case 0:return n.queries.delete(r),n.onUnlisten(r,!0);case 1:return n.queries.delete(r),n.onUnlisten(r,!1);case 2:return n.onLastRemoteStoreUnlisten(r);default:return}}function Gx(t,e){const n=ee(t);let r=!1;for(const i of e){const s=i.query,o=n.queries.get(s);if(o){for(const l of o.j_)l.X_(i)&&(r=!0);o.z_=i}}r&&Wf(n)}function Qx(t,e,n){const r=ee(t),i=r.queries.get(e);if(i)for(const s of i.j_)s.onError(n);r.queries.delete(e)}function Wf(t){t.Y_.forEach(e=>{e.next()})}var sd,ky;(ky=sd||(sd={})).ea="default",ky.Cache="cache";class Xx{constructor(e,n,r){this.query=e,this.ta=n,this.na=!1,this.ra=null,this.onlineState="Unknown",this.options=r||{}}X_(e){if(!this.options.includeMetadataChanges){const r=[];for(const i of e.docChanges)i.type!==3&&r.push(i);e=new es(e.query,e.docs,e.oldDocs,r,e.mutatedKeys,e.fromCache,e.syncStateChanged,!0,e.hasCachedResults)}let n=!1;return this.na?this.ia(e)&&(this.ta.next(e),n=!0):this.sa(e,this.onlineState)&&(this.oa(e),n=!0),this.ra=e,n}onError(e){this.ta.error(e)}Z_(e){this.onlineState=e;let n=!1;return this.ra&&!this.na&&this.sa(this.ra,e)&&(this.oa(this.ra),n=!0),n}sa(e,n){if(!e.fromCache||!this.J_())return!0;const r=n!=="Offline";return(!this.options._a||!r)&&(!e.docs.isEmpty()||e.hasCachedResults||n==="Offline")}ia(e){if(e.docChanges.length>0)return!0;const n=this.ra&&this.ra.hasPendingWrites!==e.hasPendingWrites;return!(!e.syncStateChanged&&!n)&&this.options.includeMetadataChanges===!0}oa(e){e=es.fromInitialDocuments(e.query,e.docs,e.mutatedKeys,e.fromCache,e.hasCachedResults),this.na=!0,this.ta.next(e)}J_(){return this.options.source!==sd.Cache}}/**
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
 */class t0{constructor(e){this.key=e}}class n0{constructor(e){this.key=e}}class Yx{constructor(e,n){this.query=e,this.Ta=n,this.Ea=null,this.hasCachedResults=!1,this.current=!1,this.da=re(),this.mutatedKeys=re(),this.Aa=SE(e),this.Ra=new Ui(this.Aa)}get Va(){return this.Ta}ma(e,n){const r=n?n.fa:new Ry,i=n?n.Ra:this.Ra;let s=n?n.mutatedKeys:this.mutatedKeys,o=i,l=!1;const u=this.query.limitType==="F"&&i.size===this.query.limit?i.last():null,h=this.query.limitType==="L"&&i.size===this.query.limit?i.first():null;if(e.inorderTraversal((f,m)=>{const _=i.get(f),R=Su(this.query,m)?m:null,k=!!_&&this.mutatedKeys.has(_.key),x=!!R&&(R.hasLocalMutations||this.mutatedKeys.has(R.key)&&R.hasCommittedMutations);let C=!1;_&&R?_.data.isEqual(R.data)?k!==x&&(r.track({type:3,doc:R}),C=!0):this.ga(_,R)||(r.track({type:2,doc:R}),C=!0,(u&&this.Aa(R,u)>0||h&&this.Aa(R,h)<0)&&(l=!0)):!_&&R?(r.track({type:0,doc:R}),C=!0):_&&!R&&(r.track({type:1,doc:_}),C=!0,(u||h)&&(l=!0)),C&&(R?(o=o.add(R),s=x?s.add(f):s.delete(f)):(o=o.delete(f),s=s.delete(f)))}),this.query.limit!==null)for(;o.size>this.query.limit;){const f=this.query.limitType==="F"?o.last():o.first();o=o.delete(f.key),s=s.delete(f.key),r.track({type:1,doc:f})}return{Ra:o,fa:r,ns:l,mutatedKeys:s}}ga(e,n){return e.hasLocalMutations&&n.hasCommittedMutations&&!n.hasLocalMutations}applyChanges(e,n,r,i){const s=this.Ra;this.Ra=e.Ra,this.mutatedKeys=e.mutatedKeys;const o=e.fa.G_();o.sort((f,m)=>function(R,k){const x=C=>{switch(C){case 0:return 1;case 2:case 3:return 2;case 1:return 0;default:return J()}};return x(R)-x(k)}(f.type,m.type)||this.Aa(f.doc,m.doc)),this.pa(r),i=i!=null&&i;const l=n&&!i?this.ya():[],u=this.da.size===0&&this.current&&!i?1:0,h=u!==this.Ea;return this.Ea=u,o.length!==0||h?{snapshot:new es(this.query,e.Ra,s,o,e.mutatedKeys,u===0,h,!1,!!r&&r.resumeToken.approximateByteSize()>0),wa:l}:{wa:l}}Z_(e){return this.current&&e==="Offline"?(this.current=!1,this.applyChanges({Ra:this.Ra,fa:new Ry,mutatedKeys:this.mutatedKeys,ns:!1},!1)):{wa:[]}}Sa(e){return!this.Ta.has(e)&&!!this.Ra.has(e)&&!this.Ra.get(e).hasLocalMutations}pa(e){e&&(e.addedDocuments.forEach(n=>this.Ta=this.Ta.add(n)),e.modifiedDocuments.forEach(n=>{}),e.removedDocuments.forEach(n=>this.Ta=this.Ta.delete(n)),this.current=e.current)}ya(){if(!this.current)return[];const e=this.da;this.da=re(),this.Ra.forEach(r=>{this.Sa(r.key)&&(this.da=this.da.add(r.key))});const n=[];return e.forEach(r=>{this.da.has(r)||n.push(new n0(r))}),this.da.forEach(r=>{e.has(r)||n.push(new t0(r))}),n}ba(e){this.Ta=e.Ts,this.da=re();const n=this.ma(e.documents);return this.applyChanges(n,!0)}Da(){return es.fromInitialDocuments(this.query,this.Ra,this.mutatedKeys,this.Ea===0,this.hasCachedResults)}}class Jx{constructor(e,n,r){this.query=e,this.targetId=n,this.view=r}}class Zx{constructor(e){this.key=e,this.va=!1}}class eN{constructor(e,n,r,i,s,o){this.localStore=e,this.remoteStore=n,this.eventManager=r,this.sharedClientState=i,this.currentUser=s,this.maxConcurrentLimboResolutions=o,this.Ca={},this.Fa=new ds(l=>IE(l),Iu),this.Ma=new Map,this.xa=new Set,this.Oa=new Se(Q.comparator),this.Na=new Map,this.La=new Vf,this.Ba={},this.ka=new Map,this.qa=Zi.kn(),this.onlineState="Unknown",this.Qa=void 0}get isPrimaryClient(){return this.Qa===!0}}async function tN(t,e,n=!0){const r=l0(t);let i;const s=r.Fa.get(e);return s?(r.sharedClientState.addLocalQueryTarget(s.targetId),i=s.view.Da()):i=await r0(r,e,n,!0),i}async function nN(t,e){const n=l0(t);await r0(n,e,!0,!1)}async function r0(t,e,n,r){const i=await Ex(t.localStore,un(e)),s=i.targetId,o=t.sharedClientState.addLocalQueryTarget(s,n);let l;return r&&(l=await rN(t,e,s,o==="current",i.resumeToken)),t.isPrimaryClient&&n&&QE(t.remoteStore,i),l}async function rN(t,e,n,r,i){t.Ka=(m,_,R)=>async function(x,C,w,g){let T=C.view.ma(w);T.ns&&(T=await Ey(x.localStore,C.query,!1).then(({documents:I})=>C.view.ma(I,T)));const D=g&&g.targetChanges.get(C.targetId),j=g&&g.targetMismatches.get(C.targetId)!=null,U=C.view.applyChanges(T,x.isPrimaryClient,D,j);return Py(x,C.targetId,U.wa),U.snapshot}(t,m,_,R);const s=await Ey(t.localStore,e,!0),o=new Yx(e,s.Ts),l=o.ma(s.documents),u=Xo.createSynthesizedTargetChangeForCurrentChange(n,r&&t.onlineState!=="Offline",i),h=o.applyChanges(l,t.isPrimaryClient,u);Py(t,n,h.wa);const f=new Jx(e,n,o);return t.Fa.set(e,f),t.Ma.has(n)?t.Ma.get(n).push(e):t.Ma.set(n,[e]),h.snapshot}async function iN(t,e,n){const r=ee(t),i=r.Fa.get(e),s=r.Ma.get(i.targetId);if(s.length>1)return r.Ma.set(i.targetId,s.filter(o=>!Iu(o,e))),void r.Fa.delete(e);r.isPrimaryClient?(r.sharedClientState.removeLocalQueryTarget(i.targetId),r.sharedClientState.isActiveQueryTarget(i.targetId)||await id(r.localStore,i.targetId,!1).then(()=>{r.sharedClientState.clearQueryState(i.targetId),n&&jf(r.remoteStore,i.targetId),od(r,i.targetId)}).catch(Ko)):(od(r,i.targetId),await id(r.localStore,i.targetId,!0))}async function sN(t,e){const n=ee(t),r=n.Fa.get(e),i=n.Ma.get(r.targetId);n.isPrimaryClient&&i.length===1&&(n.sharedClientState.removeLocalQueryTarget(r.targetId),jf(n.remoteStore,r.targetId))}async function oN(t,e,n){const r=fN(t);try{const i=await function(o,l){const u=ee(o),h=Ue.now(),f=l.reduce((R,k)=>R.add(k.key),re());let m,_;return u.persistence.runTransaction("Locally write mutations","readwrite",R=>{let k=Un(),x=re();return u.cs.getEntries(R,f).next(C=>{k=C,k.forEach((w,g)=>{g.isValidDocument()||(x=x.add(w))})}).next(()=>u.localDocuments.getOverlayedDocuments(R,k)).next(C=>{m=C;const w=[];for(const g of l){const T=R1(g,m.get(g.key).overlayedDocument);T!=null&&w.push(new ai(g.key,T,mE(T.value.mapValue),cn.exists(!0)))}return u.mutationQueue.addMutationBatch(R,h,w,l)}).next(C=>{_=C;const w=C.applyToLocalDocumentSet(m,x);return u.documentOverlayCache.saveOverlays(R,C.batchId,w)})}).then(()=>({batchId:_.batchId,changes:AE(m)}))}(r.localStore,e);r.sharedClientState.addPendingMutation(i.batchId),function(o,l,u){let h=o.Ba[o.currentUser.toKey()];h||(h=new Se(le)),h=h.insert(l,u),o.Ba[o.currentUser.toKey()]=h}(r,i.batchId,n),await Jo(r,i.changes),await xu(r.remoteStore)}catch(i){const s=$f(i,"Failed to persist write");n.reject(s)}}async function i0(t,e){const n=ee(t);try{const r=await _x(n.localStore,e);e.targetChanges.forEach((i,s)=>{const o=n.Na.get(s);o&&(he(i.addedDocuments.size+i.modifiedDocuments.size+i.removedDocuments.size<=1),i.addedDocuments.size>0?o.va=!0:i.modifiedDocuments.size>0?he(o.va):i.removedDocuments.size>0&&(he(o.va),o.va=!1))}),await Jo(n,r,e)}catch(r){await Ko(r)}}function Cy(t,e,n){const r=ee(t);if(r.isPrimaryClient&&n===0||!r.isPrimaryClient&&n===1){const i=[];r.Fa.forEach((s,o)=>{const l=o.view.Z_(e);l.snapshot&&i.push(l.snapshot)}),function(o,l){const u=ee(o);u.onlineState=l;let h=!1;u.queries.forEach((f,m)=>{for(const _ of m.j_)_.Z_(l)&&(h=!0)}),h&&Wf(u)}(r.eventManager,e),i.length&&r.Ca.d_(i),r.onlineState=e,r.isPrimaryClient&&r.sharedClientState.setOnlineState(e)}}async function aN(t,e,n){const r=ee(t);r.sharedClientState.updateQueryState(e,"rejected",n);const i=r.Na.get(e),s=i&&i.key;if(s){let o=new Se(Q.comparator);o=o.insert(s,ot.newNoDocument(s,Z.min()));const l=re().add(s),u=new ku(Z.min(),new Map,new Se(le),o,l);await i0(r,u),r.Oa=r.Oa.remove(s),r.Na.delete(e),qf(r)}else await id(r.localStore,e,!1).then(()=>od(r,e,n)).catch(Ko)}async function lN(t,e){const n=ee(t),r=e.batch.batchId;try{const i=await yx(n.localStore,e);o0(n,r,null),s0(n,r),n.sharedClientState.updateMutationState(r,"acknowledged"),await Jo(n,i)}catch(i){await Ko(i)}}async function uN(t,e,n){const r=ee(t);try{const i=await function(o,l){const u=ee(o);return u.persistence.runTransaction("Reject batch","readwrite-primary",h=>{let f;return u.mutationQueue.lookupMutationBatch(h,l).next(m=>(he(m!==null),f=m.keys(),u.mutationQueue.removeMutationBatch(h,m))).next(()=>u.mutationQueue.performConsistencyCheck(h)).next(()=>u.documentOverlayCache.removeOverlaysForBatchId(h,f,l)).next(()=>u.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(h,f)).next(()=>u.localDocuments.getDocuments(h,f))})}(r.localStore,e);o0(r,e,n),s0(r,e),r.sharedClientState.updateMutationState(e,"rejected",n),await Jo(r,i)}catch(i){await Ko(i)}}function s0(t,e){(t.ka.get(e)||[]).forEach(n=>{n.resolve()}),t.ka.delete(e)}function o0(t,e,n){const r=ee(t);let i=r.Ba[r.currentUser.toKey()];if(i){const s=i.get(e);s&&(n?s.reject(n):s.resolve(),i=i.remove(e)),r.Ba[r.currentUser.toKey()]=i}}function od(t,e,n=null){t.sharedClientState.removeLocalQueryTarget(e);for(const r of t.Ma.get(e))t.Fa.delete(r),n&&t.Ca.$a(r,n);t.Ma.delete(e),t.isPrimaryClient&&t.La.gr(e).forEach(r=>{t.La.containsKey(r)||a0(t,r)})}function a0(t,e){t.xa.delete(e.path.canonicalString());const n=t.Oa.get(e);n!==null&&(jf(t.remoteStore,n),t.Oa=t.Oa.remove(e),t.Na.delete(n),qf(t))}function Py(t,e,n){for(const r of n)r instanceof t0?(t.La.addReference(r.key,e),cN(t,r)):r instanceof n0?(G("SyncEngine","Document no longer in limbo: "+r.key),t.La.removeReference(r.key,e),t.La.containsKey(r.key)||a0(t,r.key)):J()}function cN(t,e){const n=e.key,r=n.path.canonicalString();t.Oa.get(n)||t.xa.has(r)||(G("SyncEngine","New document in limbo: "+n),t.xa.add(r),qf(t))}function qf(t){for(;t.xa.size>0&&t.Oa.size<t.maxConcurrentLimboResolutions;){const e=t.xa.values().next().value;t.xa.delete(e);const n=new Q(ge.fromString(e)),r=t.qa.next();t.Na.set(r,new Zx(n)),t.Oa=t.Oa.insert(n,r),QE(t.remoteStore,new sr(un(Pf(n.path)),r,"TargetPurposeLimboResolution",If.oe))}}async function Jo(t,e,n){const r=ee(t),i=[],s=[],o=[];r.Fa.isEmpty()||(r.Fa.forEach((l,u)=>{o.push(r.Ka(u,e,n).then(h=>{var f;if((h||n)&&r.isPrimaryClient){const m=h?!h.fromCache:(f=n==null?void 0:n.targetChanges.get(u.targetId))===null||f===void 0?void 0:f.current;r.sharedClientState.updateQueryState(u.targetId,m?"current":"not-current")}if(h){i.push(h);const m=Mf.Wi(u.targetId,h);s.push(m)}}))}),await Promise.all(o),r.Ca.d_(i),await async function(u,h){const f=ee(u);try{await f.persistence.runTransaction("notifyLocalViewChanges","readwrite",m=>F.forEach(h,_=>F.forEach(_.$i,R=>f.persistence.referenceDelegate.addReference(m,_.targetId,R)).next(()=>F.forEach(_.Ui,R=>f.persistence.referenceDelegate.removeReference(m,_.targetId,R)))))}catch(m){if(!Go(m))throw m;G("LocalStore","Failed to update sequence numbers: "+m)}for(const m of h){const _=m.targetId;if(!m.fromCache){const R=f.os.get(_),k=R.snapshotVersion,x=R.withLastLimboFreeSnapshotVersion(k);f.os=f.os.insert(_,x)}}}(r.localStore,s))}async function hN(t,e){const n=ee(t);if(!n.currentUser.isEqual(e)){G("SyncEngine","User change. New user:",e.toKey());const r=await qE(n.localStore,e);n.currentUser=e,function(s,o){s.ka.forEach(l=>{l.forEach(u=>{u.reject(new K(M.CANCELLED,o))})}),s.ka.clear()}(n,"'waitForPendingWrites' promise is rejected due to a user change."),n.sharedClientState.handleUserChange(e,r.removedBatchIds,r.addedBatchIds),await Jo(n,r.hs)}}function dN(t,e){const n=ee(t),r=n.Na.get(e);if(r&&r.va)return re().add(r.key);{let i=re();const s=n.Ma.get(e);if(!s)return i;for(const o of s){const l=n.Fa.get(o);i=i.unionWith(l.view.Va)}return i}}function l0(t){const e=ee(t);return e.remoteStore.remoteSyncer.applyRemoteEvent=i0.bind(null,e),e.remoteStore.remoteSyncer.getRemoteKeysForTarget=dN.bind(null,e),e.remoteStore.remoteSyncer.rejectListen=aN.bind(null,e),e.Ca.d_=Gx.bind(null,e.eventManager),e.Ca.$a=Qx.bind(null,e.eventManager),e}function fN(t){const e=ee(t);return e.remoteStore.remoteSyncer.applySuccessfulWrite=lN.bind(null,e),e.remoteStore.remoteSyncer.rejectFailedWrite=uN.bind(null,e),e}class Xl{constructor(){this.kind="memory",this.synchronizeTabs=!1}async initialize(e){this.serializer=Cu(e.databaseInfo.databaseId),this.sharedClientState=this.Wa(e),this.persistence=this.Ga(e),await this.persistence.start(),this.localStore=this.za(e),this.gcScheduler=this.ja(e,this.localStore),this.indexBackfillerScheduler=this.Ha(e,this.localStore)}ja(e,n){return null}Ha(e,n){return null}za(e){return gx(this.persistence,new px,e.initialUser,this.serializer)}Ga(e){return new hx(Lf.Zr,this.serializer)}Wa(e){return new Ix}async terminate(){var e,n;(e=this.gcScheduler)===null||e===void 0||e.stop(),(n=this.indexBackfillerScheduler)===null||n===void 0||n.stop(),this.sharedClientState.shutdown(),await this.persistence.shutdown()}}Xl.provider={build:()=>new Xl};class ad{async initialize(e,n){this.localStore||(this.localStore=e.localStore,this.sharedClientState=e.sharedClientState,this.datastore=this.createDatastore(n),this.remoteStore=this.createRemoteStore(n),this.eventManager=this.createEventManager(n),this.syncEngine=this.createSyncEngine(n,!e.synchronizeTabs),this.sharedClientState.onlineStateHandler=r=>Cy(this.syncEngine,r,1),this.remoteStore.remoteSyncer.handleCredentialChange=hN.bind(null,this.syncEngine),await $x(this.remoteStore,this.syncEngine.isPrimaryClient))}createEventManager(e){return function(){return new qx}()}createDatastore(e){const n=Cu(e.databaseInfo.databaseId),r=function(s){return new kx(s)}(e.databaseInfo);return function(s,o,l,u){return new xx(s,o,l,u)}(e.authCredentials,e.appCheckCredentials,r,n)}createRemoteStore(e){return function(r,i,s,o,l){return new Dx(r,i,s,o,l)}(this.localStore,this.datastore,e.asyncQueue,n=>Cy(this.syncEngine,n,0),function(){return Iy.D()?new Iy:new Sx}())}createSyncEngine(e,n){return function(i,s,o,l,u,h,f){const m=new eN(i,s,o,l,u,h);return f&&(m.Qa=!0),m}(this.localStore,this.remoteStore,this.eventManager,this.sharedClientState,e.initialUser,e.maxConcurrentLimboResolutions,n)}async terminate(){var e,n;await async function(i){const s=ee(i);G("RemoteStore","RemoteStore shutting down."),s.L_.add(5),await Yo(s),s.k_.shutdown(),s.q_.set("Unknown")}(this.remoteStore),(e=this.datastore)===null||e===void 0||e.terminate(),(n=this.eventManager)===null||n===void 0||n.terminate()}}ad.provider={build:()=>new ad};/**
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
 */class pN{constructor(e){this.observer=e,this.muted=!1}next(e){this.muted||this.observer.next&&this.Ya(this.observer.next,e)}error(e){this.muted||(this.observer.error?this.Ya(this.observer.error,e):jn("Uncaught Error in snapshot listener:",e.toString()))}Za(){this.muted=!0}Ya(e,n){setTimeout(()=>{this.muted||e(n)},0)}}/**
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
 */class mN{constructor(e,n,r,i,s){this.authCredentials=e,this.appCheckCredentials=n,this.asyncQueue=r,this.databaseInfo=i,this.user=it.UNAUTHENTICATED,this.clientId=dE.newId(),this.authCredentialListener=()=>Promise.resolve(),this.appCheckCredentialListener=()=>Promise.resolve(),this._uninitializedComponentsProvider=s,this.authCredentials.start(r,async o=>{G("FirestoreClient","Received user=",o.uid),await this.authCredentialListener(o),this.user=o}),this.appCheckCredentials.start(r,o=>(G("FirestoreClient","Received new app check token=",o),this.appCheckCredentialListener(o,this.user)))}get configuration(){return{asyncQueue:this.asyncQueue,databaseInfo:this.databaseInfo,clientId:this.clientId,authCredentials:this.authCredentials,appCheckCredentials:this.appCheckCredentials,initialUser:this.user,maxConcurrentLimboResolutions:100}}setCredentialChangeListener(e){this.authCredentialListener=e}setAppCheckTokenChangeListener(e){this.appCheckCredentialListener=e}terminate(){this.asyncQueue.enterRestrictedMode();const e=new Wr;return this.asyncQueue.enqueueAndForgetEvenWhileRestricted(async()=>{try{this._onlineComponents&&await this._onlineComponents.terminate(),this._offlineComponents&&await this._offlineComponents.terminate(),this.authCredentials.shutdown(),this.appCheckCredentials.shutdown(),e.resolve()}catch(n){const r=$f(n,"Failed to shutdown persistence");e.reject(r)}}),e.promise}}async function Uc(t,e){t.asyncQueue.verifyOperationInProgress(),G("FirestoreClient","Initializing OfflineComponentProvider");const n=t.configuration;await e.initialize(n);let r=n.initialUser;t.setCredentialChangeListener(async i=>{r.isEqual(i)||(await qE(e.localStore,i),r=i)}),e.persistence.setDatabaseDeletedListener(()=>t.terminate()),t._offlineComponents=e}async function xy(t,e){t.asyncQueue.verifyOperationInProgress();const n=await gN(t);G("FirestoreClient","Initializing OnlineComponentProvider"),await e.initialize(n,t.configuration),t.setCredentialChangeListener(r=>Sy(e.remoteStore,r)),t.setAppCheckTokenChangeListener((r,i)=>Sy(e.remoteStore,i)),t._onlineComponents=e}async function gN(t){if(!t._offlineComponents)if(t._uninitializedComponentsProvider){G("FirestoreClient","Using user provided OfflineComponentProvider");try{await Uc(t,t._uninitializedComponentsProvider._offline)}catch(e){const n=e;if(!function(i){return i.name==="FirebaseError"?i.code===M.FAILED_PRECONDITION||i.code===M.UNIMPLEMENTED:!(typeof DOMException<"u"&&i instanceof DOMException)||i.code===22||i.code===20||i.code===11}(n))throw n;Qi("Error using user provided cache. Falling back to memory cache: "+n),await Uc(t,new Xl)}}else G("FirestoreClient","Using default OfflineComponentProvider"),await Uc(t,new Xl);return t._offlineComponents}async function u0(t){return t._onlineComponents||(t._uninitializedComponentsProvider?(G("FirestoreClient","Using user provided OnlineComponentProvider"),await xy(t,t._uninitializedComponentsProvider._online)):(G("FirestoreClient","Using default OnlineComponentProvider"),await xy(t,new ad))),t._onlineComponents}function yN(t){return u0(t).then(e=>e.syncEngine)}async function Ny(t){const e=await u0(t),n=e.eventManager;return n.onListen=tN.bind(null,e.syncEngine),n.onUnlisten=iN.bind(null,e.syncEngine),n.onFirstRemoteStoreListen=nN.bind(null,e.syncEngine),n.onLastRemoteStoreUnlisten=sN.bind(null,e.syncEngine),n}/**
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
 */function c0(t){const e={};return t.timeoutSeconds!==void 0&&(e.timeoutSeconds=t.timeoutSeconds),e}/**
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
 */const Dy=new Map;/**
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
 */function h0(t,e,n){if(!n)throw new K(M.INVALID_ARGUMENT,`Function ${t}() cannot be called with an empty ${e}.`)}function _N(t,e,n,r){if(e===!0&&r===!0)throw new K(M.INVALID_ARGUMENT,`${t} and ${n} cannot be used together.`)}function Oy(t){if(!Q.isDocumentKey(t))throw new K(M.INVALID_ARGUMENT,`Invalid document reference. Document references must have an even number of segments, but ${t} has ${t.length}.`)}function by(t){if(Q.isDocumentKey(t))throw new K(M.INVALID_ARGUMENT,`Invalid collection reference. Collection references must have an odd number of segments, but ${t} has ${t.length}.`)}function Nu(t){if(t===void 0)return"undefined";if(t===null)return"null";if(typeof t=="string")return t.length>20&&(t=`${t.substring(0,20)}...`),JSON.stringify(t);if(typeof t=="number"||typeof t=="boolean")return""+t;if(typeof t=="object"){if(t instanceof Array)return"an array";{const e=function(r){return r.constructor?r.constructor.name:null}(t);return e?`a custom ${e} object`:"an object"}}return typeof t=="function"?"a function":J()}function qr(t,e){if("_delegate"in t&&(t=t._delegate),!(t instanceof e)){if(e.name===t.constructor.name)throw new K(M.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{const n=Nu(t);throw new K(M.INVALID_ARGUMENT,`Expected type '${e.name}', but it was: ${n}`)}}return t}/**
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
 */class Vy{constructor(e){var n,r;if(e.host===void 0){if(e.ssl!==void 0)throw new K(M.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host="firestore.googleapis.com",this.ssl=!0}else this.host=e.host,this.ssl=(n=e.ssl)===null||n===void 0||n;if(this.credentials=e.credentials,this.ignoreUndefinedProperties=!!e.ignoreUndefinedProperties,this.localCache=e.localCache,e.cacheSizeBytes===void 0)this.cacheSizeBytes=41943040;else{if(e.cacheSizeBytes!==-1&&e.cacheSizeBytes<1048576)throw new K(M.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=e.cacheSizeBytes}_N("experimentalForceLongPolling",e.experimentalForceLongPolling,"experimentalAutoDetectLongPolling",e.experimentalAutoDetectLongPolling),this.experimentalForceLongPolling=!!e.experimentalForceLongPolling,this.experimentalForceLongPolling?this.experimentalAutoDetectLongPolling=!1:e.experimentalAutoDetectLongPolling===void 0?this.experimentalAutoDetectLongPolling=!0:this.experimentalAutoDetectLongPolling=!!e.experimentalAutoDetectLongPolling,this.experimentalLongPollingOptions=c0((r=e.experimentalLongPollingOptions)!==null&&r!==void 0?r:{}),function(s){if(s.timeoutSeconds!==void 0){if(isNaN(s.timeoutSeconds))throw new K(M.INVALID_ARGUMENT,`invalid long polling timeout: ${s.timeoutSeconds} (must not be NaN)`);if(s.timeoutSeconds<5)throw new K(M.INVALID_ARGUMENT,`invalid long polling timeout: ${s.timeoutSeconds} (minimum allowed value is 5)`);if(s.timeoutSeconds>30)throw new K(M.INVALID_ARGUMENT,`invalid long polling timeout: ${s.timeoutSeconds} (maximum allowed value is 30)`)}}(this.experimentalLongPollingOptions),this.useFetchStreams=!!e.useFetchStreams}isEqual(e){return this.host===e.host&&this.ssl===e.ssl&&this.credentials===e.credentials&&this.cacheSizeBytes===e.cacheSizeBytes&&this.experimentalForceLongPolling===e.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===e.experimentalAutoDetectLongPolling&&function(r,i){return r.timeoutSeconds===i.timeoutSeconds}(this.experimentalLongPollingOptions,e.experimentalLongPollingOptions)&&this.ignoreUndefinedProperties===e.ignoreUndefinedProperties&&this.useFetchStreams===e.useFetchStreams}}class Du{constructor(e,n,r,i){this._authCredentials=e,this._appCheckCredentials=n,this._databaseId=r,this._app=i,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new Vy({}),this._settingsFrozen=!1,this._terminateTask="notTerminated"}get app(){if(!this._app)throw new K(M.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app}get _initialized(){return this._settingsFrozen}get _terminated(){return this._terminateTask!=="notTerminated"}_setSettings(e){if(this._settingsFrozen)throw new K(M.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new Vy(e),e.credentials!==void 0&&(this._authCredentials=function(r){if(!r)return new bP;switch(r.type){case"firstParty":return new jP(r.sessionIndex||"0",r.iamToken||null,r.authTokenFactory||null);case"provider":return r.client;default:throw new K(M.INVALID_ARGUMENT,"makeAuthCredentialsProvider failed due to invalid credential type")}}(e.credentials))}_getSettings(){return this._settings}_freezeSettings(){return this._settingsFrozen=!0,this._settings}_delete(){return this._terminateTask==="notTerminated"&&(this._terminateTask=this._terminate()),this._terminateTask}async _restart(){this._terminateTask==="notTerminated"?await this._terminate():this._terminateTask="notTerminated"}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings}}_terminate(){return function(n){const r=Dy.get(n);r&&(G("ComponentProvider","Removing Datastore"),Dy.delete(n),r.terminate())}(this),Promise.resolve()}}function vN(t,e,n,r={}){var i;const s=(t=qr(t,Du))._getSettings(),o=`${e}:${n}`;if(s.host!=="firestore.googleapis.com"&&s.host!==o&&Qi("Host has been set in both settings() and connectFirestoreEmulator(), emulator host will be used."),t._setSettings(Object.assign(Object.assign({},s),{host:o,ssl:!1})),r.mockUserToken){let l,u;if(typeof r.mockUserToken=="string")l=r.mockUserToken,u=it.MOCK_USER;else{l=Tw(r.mockUserToken,(i=t._app)===null||i===void 0?void 0:i.options.projectId);const h=r.mockUserToken.sub||r.mockUserToken.user_id;if(!h)throw new K(M.INVALID_ARGUMENT,"mockUserToken must contain 'sub' or 'user_id' field!");u=new it(h)}t._authCredentials=new VP(new hE(l,u))}}/**
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
 */class ui{constructor(e,n,r){this.converter=n,this._query=r,this.type="query",this.firestore=e}withConverter(e){return new ui(this.firestore,e,this._query)}}class Et{constructor(e,n,r){this.converter=n,this._key=r,this.type="document",this.firestore=e}get _path(){return this._key.path}get id(){return this._key.path.lastSegment()}get path(){return this._key.path.canonicalString()}get parent(){return new yr(this.firestore,this.converter,this._key.path.popLast())}withConverter(e){return new Et(this.firestore,e,this._key)}}class yr extends ui{constructor(e,n,r){super(e,n,Pf(r)),this._path=r,this.type="collection"}get id(){return this._query.path.lastSegment()}get path(){return this._query.path.canonicalString()}get parent(){const e=this._path.popLast();return e.isEmpty()?null:new Et(this.firestore,null,new Q(e))}withConverter(e){return new yr(this.firestore,e,this._path)}}function Kt(t,e,...n){if(t=Fe(t),h0("collection","path",e),t instanceof Du){const r=ge.fromString(e,...n);return by(r),new yr(t,null,r)}{if(!(t instanceof Et||t instanceof yr))throw new K(M.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const r=t._path.child(ge.fromString(e,...n));return by(r),new yr(t.firestore,null,r)}}function pn(t,e,...n){if(t=Fe(t),arguments.length===1&&(e=dE.newId()),h0("doc","path",e),t instanceof Du){const r=ge.fromString(e,...n);return Oy(r),new Et(t,null,new Q(r))}{if(!(t instanceof Et||t instanceof yr))throw new K(M.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const r=t._path.child(ge.fromString(e,...n));return Oy(r),new Et(t.firestore,t instanceof yr?t.converter:null,new Q(r))}}/**
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
 */class Ly{constructor(e=Promise.resolve()){this.Pu=[],this.Iu=!1,this.Tu=[],this.Eu=null,this.du=!1,this.Au=!1,this.Ru=[],this.t_=new KE(this,"async_queue_retry"),this.Vu=()=>{const r=jc();r&&G("AsyncQueue","Visibility state changed to "+r.visibilityState),this.t_.jo()},this.mu=e;const n=jc();n&&typeof n.addEventListener=="function"&&n.addEventListener("visibilitychange",this.Vu)}get isShuttingDown(){return this.Iu}enqueueAndForget(e){this.enqueue(e)}enqueueAndForgetEvenWhileRestricted(e){this.fu(),this.gu(e)}enterRestrictedMode(e){if(!this.Iu){this.Iu=!0,this.Au=e||!1;const n=jc();n&&typeof n.removeEventListener=="function"&&n.removeEventListener("visibilitychange",this.Vu)}}enqueue(e){if(this.fu(),this.Iu)return new Promise(()=>{});const n=new Wr;return this.gu(()=>this.Iu&&this.Au?Promise.resolve():(e().then(n.resolve,n.reject),n.promise)).then(()=>n.promise)}enqueueRetryable(e){this.enqueueAndForget(()=>(this.Pu.push(e),this.pu()))}async pu(){if(this.Pu.length!==0){try{await this.Pu[0](),this.Pu.shift(),this.t_.reset()}catch(e){if(!Go(e))throw e;G("AsyncQueue","Operation failed with retryable error: "+e)}this.Pu.length>0&&this.t_.Go(()=>this.pu())}}gu(e){const n=this.mu.then(()=>(this.du=!0,e().catch(r=>{this.Eu=r,this.du=!1;const i=function(o){let l=o.message||"";return o.stack&&(l=o.stack.includes(o.message)?o.stack:o.message+`
`+o.stack),l}(r);throw jn("INTERNAL UNHANDLED ERROR: ",i),r}).then(r=>(this.du=!1,r))));return this.mu=n,n}enqueueAfterDelay(e,n,r){this.fu(),this.Ru.indexOf(e)>-1&&(n=0);const i=zf.createAndSchedule(this,e,n,r,s=>this.yu(s));return this.Tu.push(i),i}fu(){this.Eu&&J()}verifyOperationInProgress(){}async wu(){let e;do e=this.mu,await e;while(e!==this.mu)}Su(e){for(const n of this.Tu)if(n.timerId===e)return!0;return!1}bu(e){return this.wu().then(()=>{this.Tu.sort((n,r)=>n.targetTimeMs-r.targetTimeMs);for(const n of this.Tu)if(n.skipDelay(),e!=="all"&&n.timerId===e)break;return this.wu()})}Du(e){this.Ru.push(e)}yu(e){const n=this.Tu.indexOf(e);this.Tu.splice(n,1)}}function My(t){return function(n,r){if(typeof n!="object"||n===null)return!1;const i=n;for(const s of r)if(s in i&&typeof i[s]=="function")return!0;return!1}(t,["next","error","complete"])}class Lo extends Du{constructor(e,n,r,i){super(e,n,r,i),this.type="firestore",this._queue=new Ly,this._persistenceKey=(i==null?void 0:i.name)||"[DEFAULT]"}async _terminate(){if(this._firestoreClient){const e=this._firestoreClient.terminate();this._queue=new Ly(e),this._firestoreClient=void 0,await e}}}function wN(t,e){const n=typeof t=="object"?t:cf(),r=typeof t=="string"?t:"(default)",i=_u(n,"firestore").getImmediate({identifier:r});if(!i._initialized){const s=vw("firestore");s&&vN(i,...s)}return i}function d0(t){if(t._terminated)throw new K(M.FAILED_PRECONDITION,"The client has already been terminated.");return t._firestoreClient||EN(t),t._firestoreClient}function EN(t){var e,n,r;const i=t._freezeSettings(),s=function(l,u,h,f){return new YP(l,u,h,f.host,f.ssl,f.experimentalForceLongPolling,f.experimentalAutoDetectLongPolling,c0(f.experimentalLongPollingOptions),f.useFetchStreams)}(t._databaseId,((e=t._app)===null||e===void 0?void 0:e.options.appId)||"",t._persistenceKey,i);t._componentsProvider||!((n=i.localCache)===null||n===void 0)&&n._offlineComponentProvider&&(!((r=i.localCache)===null||r===void 0)&&r._onlineComponentProvider)&&(t._componentsProvider={_offline:i.localCache._offlineComponentProvider,_online:i.localCache._onlineComponentProvider}),t._firestoreClient=new mN(t._authCredentials,t._appCheckCredentials,t._queue,s,t._componentsProvider&&function(l){const u=l==null?void 0:l._online.build();return{_offline:l==null?void 0:l._offline.build(u),_online:u}}(t._componentsProvider))}/**
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
 */class ts{constructor(e){this._byteString=e}static fromBase64String(e){try{return new ts(Ye.fromBase64String(e))}catch(n){throw new K(M.INVALID_ARGUMENT,"Failed to construct data from Base64 string: "+n)}}static fromUint8Array(e){return new ts(Ye.fromUint8Array(e))}toBase64(){return this._byteString.toBase64()}toUint8Array(){return this._byteString.toUint8Array()}toString(){return"Bytes(base64: "+this.toBase64()+")"}isEqual(e){return this._byteString.isEqual(e._byteString)}}/**
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
 */class Hf{constructor(...e){for(let n=0;n<e.length;++n)if(e[n].length===0)throw new K(M.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new Ke(e)}isEqual(e){return this._internalPath.isEqual(e._internalPath)}}/**
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
 */class f0{constructor(e){this._methodName=e}}/**
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
 */class Kf{constructor(e,n){if(!isFinite(e)||e<-90||e>90)throw new K(M.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+e);if(!isFinite(n)||n<-180||n>180)throw new K(M.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+n);this._lat=e,this._long=n}get latitude(){return this._lat}get longitude(){return this._long}isEqual(e){return this._lat===e._lat&&this._long===e._long}toJSON(){return{latitude:this._lat,longitude:this._long}}_compareTo(e){return le(this._lat,e._lat)||le(this._long,e._long)}}/**
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
 */class Gf{constructor(e){this._values=(e||[]).map(n=>n)}toArray(){return this._values.map(e=>e)}isEqual(e){return function(r,i){if(r.length!==i.length)return!1;for(let s=0;s<r.length;++s)if(r[s]!==i[s])return!1;return!0}(this._values,e._values)}}/**
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
 */const TN=/^__.*__$/;class IN{constructor(e,n,r){this.data=e,this.fieldMask=n,this.fieldTransforms=r}toMutation(e,n){return this.fieldMask!==null?new ai(e,this.data,this.fieldMask,n,this.fieldTransforms):new Qo(e,this.data,n,this.fieldTransforms)}}function p0(t){switch(t){case 0:case 2:case 1:return!0;case 3:case 4:return!1;default:throw J()}}class Qf{constructor(e,n,r,i,s,o){this.settings=e,this.databaseId=n,this.serializer=r,this.ignoreUndefinedProperties=i,s===void 0&&this.vu(),this.fieldTransforms=s||[],this.fieldMask=o||[]}get path(){return this.settings.path}get Cu(){return this.settings.Cu}Fu(e){return new Qf(Object.assign(Object.assign({},this.settings),e),this.databaseId,this.serializer,this.ignoreUndefinedProperties,this.fieldTransforms,this.fieldMask)}Mu(e){var n;const r=(n=this.path)===null||n===void 0?void 0:n.child(e),i=this.Fu({path:r,xu:!1});return i.Ou(e),i}Nu(e){var n;const r=(n=this.path)===null||n===void 0?void 0:n.child(e),i=this.Fu({path:r,xu:!1});return i.vu(),i}Lu(e){return this.Fu({path:void 0,xu:!0})}Bu(e){return Yl(e,this.settings.methodName,this.settings.ku||!1,this.path,this.settings.qu)}contains(e){return this.fieldMask.find(n=>e.isPrefixOf(n))!==void 0||this.fieldTransforms.find(n=>e.isPrefixOf(n.field))!==void 0}vu(){if(this.path)for(let e=0;e<this.path.length;e++)this.Ou(this.path.get(e))}Ou(e){if(e.length===0)throw this.Bu("Document fields must not be empty");if(p0(this.Cu)&&TN.test(e))throw this.Bu('Document fields cannot begin and end with "__"')}}class SN{constructor(e,n,r){this.databaseId=e,this.ignoreUndefinedProperties=n,this.serializer=r||Cu(e)}Qu(e,n,r,i=!1){return new Qf({Cu:e,methodName:n,qu:r,path:Ke.emptyPath(),xu:!1,ku:i},this.databaseId,this.serializer,this.ignoreUndefinedProperties)}}function m0(t){const e=t._freezeSettings(),n=Cu(t._databaseId);return new SN(t._databaseId,!!e.ignoreUndefinedProperties,n)}function RN(t,e,n,r,i,s={}){const o=t.Qu(s.merge||s.mergeFields?2:0,e,n,i);_0("Data must be an object, but it was:",o,r);const l=g0(r,o);let u,h;if(s.merge)u=new $t(o.fieldMask),h=o.fieldTransforms;else if(s.mergeFields){const f=[];for(const m of s.mergeFields){const _=kN(e,m,n);if(!o.contains(_))throw new K(M.INVALID_ARGUMENT,`Field '${_}' is specified in your field mask but missing from your input data.`);PN(f,_)||f.push(_)}u=new $t(f),h=o.fieldTransforms.filter(m=>u.covers(m.field))}else u=null,h=o.fieldTransforms;return new IN(new Dt(l),u,h)}function AN(t,e,n,r=!1){return Xf(n,t.Qu(r?4:3,e))}function Xf(t,e){if(y0(t=Fe(t)))return _0("Unsupported field value:",e,t),g0(t,e);if(t instanceof f0)return function(r,i){if(!p0(i.Cu))throw i.Bu(`${r._methodName}() can only be used with update() and set()`);if(!i.path)throw i.Bu(`${r._methodName}() is not currently supported inside arrays`);const s=r._toFieldTransform(i);s&&i.fieldTransforms.push(s)}(t,e),null;if(t===void 0&&e.ignoreUndefinedProperties)return null;if(e.path&&e.fieldMask.push(e.path),t instanceof Array){if(e.settings.xu&&e.Cu!==4)throw e.Bu("Nested arrays are not supported");return function(r,i){const s=[];let o=0;for(const l of r){let u=Xf(l,i.Lu(o));u==null&&(u={nullValue:"NULL_VALUE"}),s.push(u),o++}return{arrayValue:{values:s}}}(t,e)}return function(r,i){if((r=Fe(r))===null)return{nullValue:"NULL_VALUE"};if(typeof r=="number")return v1(i.serializer,r);if(typeof r=="boolean")return{booleanValue:r};if(typeof r=="string")return{stringValue:r};if(r instanceof Date){const s=Ue.fromDate(r);return{timestampValue:Gl(i.serializer,s)}}if(r instanceof Ue){const s=new Ue(r.seconds,1e3*Math.floor(r.nanoseconds/1e3));return{timestampValue:Gl(i.serializer,s)}}if(r instanceof Kf)return{geoPointValue:{latitude:r.latitude,longitude:r.longitude}};if(r instanceof ts)return{bytesValue:jE(i.serializer,r._byteString)};if(r instanceof Et){const s=i.databaseId,o=r.firestore._databaseId;if(!o.isEqual(s))throw i.Bu(`Document reference is for database ${o.projectId}/${o.database} but should be for database ${s.projectId}/${s.database}`);return{referenceValue:bf(r.firestore._databaseId||i.databaseId,r._key.path)}}if(r instanceof Gf)return function(o,l){return{mapValue:{fields:{__type__:{stringValue:"__vector__"},value:{arrayValue:{values:o.toArray().map(u=>{if(typeof u!="number")throw l.Bu("VectorValues must only contain numeric values.");return xf(l.serializer,u)})}}}}}}(r,i);throw i.Bu(`Unsupported field value: ${Nu(r)}`)}(t,e)}function g0(t,e){const n={};return fE(t)?e.path&&e.path.length>0&&e.fieldMask.push(e.path):cs(t,(r,i)=>{const s=Xf(i,e.Mu(r));s!=null&&(n[r]=s)}),{mapValue:{fields:n}}}function y0(t){return!(typeof t!="object"||t===null||t instanceof Array||t instanceof Date||t instanceof Ue||t instanceof Kf||t instanceof ts||t instanceof Et||t instanceof f0||t instanceof Gf)}function _0(t,e,n){if(!y0(n)||!function(i){return typeof i=="object"&&i!==null&&(Object.getPrototypeOf(i)===Object.prototype||Object.getPrototypeOf(i)===null)}(n)){const r=Nu(n);throw r==="an object"?e.Bu(t+" a custom object"):e.Bu(t+" "+r)}}function kN(t,e,n){if((e=Fe(e))instanceof Hf)return e._internalPath;if(typeof e=="string")return v0(t,e);throw Yl("Field path arguments must be of type string or ",t,!1,void 0,n)}const CN=new RegExp("[~\\*/\\[\\]]");function v0(t,e,n){if(e.search(CN)>=0)throw Yl(`Invalid field path (${e}). Paths must not contain '~', '*', '/', '[', or ']'`,t,!1,void 0,n);try{return new Hf(...e.split("."))._internalPath}catch{throw Yl(`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`,t,!1,void 0,n)}}function Yl(t,e,n,r,i){const s=r&&!r.isEmpty(),o=i!==void 0;let l=`Function ${e}() called with invalid data`;n&&(l+=" (via `toFirestore()`)"),l+=". ";let u="";return(s||o)&&(u+=" (found",s&&(u+=` in field ${r}`),o&&(u+=` in document ${i}`),u+=")"),new K(M.INVALID_ARGUMENT,l+t+u)}function PN(t,e){return t.some(n=>n.isEqual(e))}/**
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
 */class w0{constructor(e,n,r,i,s){this._firestore=e,this._userDataWriter=n,this._key=r,this._document=i,this._converter=s}get id(){return this._key.path.lastSegment()}get ref(){return new Et(this._firestore,this._converter,this._key)}exists(){return this._document!==null}data(){if(this._document){if(this._converter){const e=new xN(this._firestore,this._userDataWriter,this._key,this._document,null);return this._converter.fromFirestore(e)}return this._userDataWriter.convertValue(this._document.data.value)}}get(e){if(this._document){const n=this._document.data.field(Yf("DocumentSnapshot.get",e));if(n!==null)return this._userDataWriter.convertValue(n)}}}class xN extends w0{data(){return super.data()}}function Yf(t,e){return typeof e=="string"?v0(t,e):e instanceof Hf?e._internalPath:e._delegate._internalPath}/**
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
 */function NN(t){if(t.limitType==="L"&&t.explicitOrderBy.length===0)throw new K(M.UNIMPLEMENTED,"limitToLast() queries require specifying at least one orderBy() clause")}class Jf{}class E0 extends Jf{}function Gt(t,e,...n){let r=[];e instanceof Jf&&r.push(e),r=r.concat(n),function(s){const o=s.filter(u=>u instanceof ep).length,l=s.filter(u=>u instanceof Zf).length;if(o>1||o>0&&l>0)throw new K(M.INVALID_ARGUMENT,"InvalidQuery. When using composite filters, you cannot use more than one filter at the top level. Consider nesting the multiple filters within an `and(...)` statement. For example: change `query(query, where(...), or(...))` to `query(query, and(where(...), or(...)))`.")}(r);for(const i of r)t=i._apply(t);return t}class Zf extends E0{constructor(e,n,r){super(),this._field=e,this._op=n,this._value=r,this.type="where"}static _create(e,n,r){return new Zf(e,n,r)}_apply(e){const n=this._parse(e);return T0(e._query,n),new ui(e.firestore,e.converter,Jh(e._query,n))}_parse(e){const n=m0(e.firestore);return function(s,o,l,u,h,f,m){let _;if(h.isKeyField()){if(f==="array-contains"||f==="array-contains-any")throw new K(M.INVALID_ARGUMENT,`Invalid Query. You can't perform '${f}' queries on documentId().`);if(f==="in"||f==="not-in"){Uy(m,f);const R=[];for(const k of m)R.push(jy(u,s,k));_={arrayValue:{values:R}}}else _=jy(u,s,m)}else f!=="in"&&f!=="not-in"&&f!=="array-contains-any"||Uy(m,f),_=AN(l,o,m,f==="in"||f==="not-in");return Ve.create(h,f,_)}(e._query,"where",n,e.firestore._databaseId,this._field,this._op,this._value)}}class ep extends Jf{constructor(e,n){super(),this.type=e,this._queryConstraints=n}static _create(e,n){return new ep(e,n)}_parse(e){const n=this._queryConstraints.map(r=>r._parse(e)).filter(r=>r.getFilters().length>0);return n.length===1?n[0]:Jt.create(n,this._getOperator())}_apply(e){const n=this._parse(e);return n.getFilters().length===0?e:(function(i,s){let o=i;const l=s.getFlattenedFilters();for(const u of l)T0(o,u),o=Jh(o,u)}(e._query,n),new ui(e.firestore,e.converter,Jh(e._query,n)))}_getQueryConstraints(){return this._queryConstraints}_getOperator(){return this.type==="and"?"and":"or"}}class tp extends E0{constructor(e,n){super(),this._field=e,this._direction=n,this.type="orderBy"}static _create(e,n){return new tp(e,n)}_apply(e){const n=function(i,s,o){if(i.startAt!==null)throw new K(M.INVALID_ARGUMENT,"Invalid query. You must not call startAt() or startAfter() before calling orderBy().");if(i.endAt!==null)throw new K(M.INVALID_ARGUMENT,"Invalid query. You must not call endAt() or endBefore() before calling orderBy().");return new Oo(s,o)}(e._query,this._field,this._direction);return new ui(e.firestore,e.converter,function(i,s){const o=i.explicitOrderBy.concat([s]);return new hs(i.path,i.collectionGroup,o,i.filters.slice(),i.limit,i.limitType,i.startAt,i.endAt)}(e._query,n))}}function Qt(t,e="asc"){const n=e,r=Yf("orderBy",t);return tp._create(r,n)}function jy(t,e,n){if(typeof(n=Fe(n))=="string"){if(n==="")throw new K(M.INVALID_ARGUMENT,"Invalid query. When querying with documentId(), you must provide a valid document ID, but it was an empty string.");if(!TE(e)&&n.indexOf("/")!==-1)throw new K(M.INVALID_ARGUMENT,`Invalid query. When querying a collection by documentId(), you must provide a plain document ID, but '${n}' contains a '/' character.`);const r=e.path.child(ge.fromString(n));if(!Q.isDocumentKey(r))throw new K(M.INVALID_ARGUMENT,`Invalid query. When querying a collection group by documentId(), the value provided must result in a valid document path, but '${r}' is not because it has an odd number of segments (${r.length}).`);return iy(t,new Q(r))}if(n instanceof Et)return iy(t,n._key);throw new K(M.INVALID_ARGUMENT,`Invalid query. When querying with documentId(), you must provide a valid string or a DocumentReference, but it was: ${Nu(n)}.`)}function Uy(t,e){if(!Array.isArray(t)||t.length===0)throw new K(M.INVALID_ARGUMENT,`Invalid Query. A non-empty array is required for '${e.toString()}' filters.`)}function T0(t,e){const n=function(i,s){for(const o of i)for(const l of o.getFlattenedFilters())if(s.indexOf(l.op)>=0)return l.op;return null}(t.filters,function(i){switch(i){case"!=":return["!=","not-in"];case"array-contains-any":case"in":return["not-in"];case"not-in":return["array-contains-any","in","not-in","!="];default:return[]}}(e.op));if(n!==null)throw n===e.op?new K(M.INVALID_ARGUMENT,`Invalid query. You cannot use more than one '${e.op.toString()}' filter.`):new K(M.INVALID_ARGUMENT,`Invalid query. You cannot use '${e.op.toString()}' filters with '${n.toString()}' filters.`)}class DN{convertValue(e,n="none"){switch(ni(e)){case 0:return null;case 1:return e.booleanValue;case 2:return Pe(e.integerValue||e.doubleValue);case 3:return this.convertTimestamp(e.timestampValue);case 4:return this.convertServerTimestamp(e,n);case 5:return e.stringValue;case 6:return this.convertBytes(ti(e.bytesValue));case 7:return this.convertReference(e.referenceValue);case 8:return this.convertGeoPoint(e.geoPointValue);case 9:return this.convertArray(e.arrayValue,n);case 11:return this.convertObject(e.mapValue,n);case 10:return this.convertVectorValue(e.mapValue);default:throw J()}}convertObject(e,n){return this.convertObjectMap(e.fields,n)}convertObjectMap(e,n="none"){const r={};return cs(e,(i,s)=>{r[i]=this.convertValue(s,n)}),r}convertVectorValue(e){var n,r,i;const s=(i=(r=(n=e.fields)===null||n===void 0?void 0:n.value.arrayValue)===null||r===void 0?void 0:r.values)===null||i===void 0?void 0:i.map(o=>Pe(o.doubleValue));return new Gf(s)}convertGeoPoint(e){return new Kf(Pe(e.latitude),Pe(e.longitude))}convertArray(e,n){return(e.values||[]).map(r=>this.convertValue(r,n))}convertServerTimestamp(e,n){switch(n){case"previous":const r=Rf(e);return r==null?null:this.convertValue(r,n);case"estimate":return this.convertTimestamp(xo(e));default:return null}}convertTimestamp(e){const n=Tr(e);return new Ue(n.seconds,n.nanos)}convertDocumentKey(e,n){const r=ge.fromString(e);he(WE(r));const i=new No(r.get(1),r.get(3)),s=new Q(r.popFirst(5));return i.isEqual(n)||jn(`Document ${s} contains a document reference within a different database (${i.projectId}/${i.database}) which is not supported. It will be treated as a reference in the current database (${n.projectId}/${n.database}) instead.`),s}}/**
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
 */function ON(t,e,n){let r;return r=t?n&&(n.merge||n.mergeFields)?t.toFirestore(e,n):t.toFirestore(e):e,r}/**
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
 */class qs{constructor(e,n){this.hasPendingWrites=e,this.fromCache=n}isEqual(e){return this.hasPendingWrites===e.hasPendingWrites&&this.fromCache===e.fromCache}}class I0 extends w0{constructor(e,n,r,i,s,o){super(e,n,r,i,o),this._firestore=e,this._firestoreImpl=e,this.metadata=s}exists(){return super.exists()}data(e={}){if(this._document){if(this._converter){const n=new ul(this._firestore,this._userDataWriter,this._key,this._document,this.metadata,null);return this._converter.fromFirestore(n,e)}return this._userDataWriter.convertValue(this._document.data.value,e.serverTimestamps)}}get(e,n={}){if(this._document){const r=this._document.data.field(Yf("DocumentSnapshot.get",e));if(r!==null)return this._userDataWriter.convertValue(r,n.serverTimestamps)}}}class ul extends I0{data(e={}){return super.data(e)}}class bN{constructor(e,n,r,i){this._firestore=e,this._userDataWriter=n,this._snapshot=i,this.metadata=new qs(i.hasPendingWrites,i.fromCache),this.query=r}get docs(){const e=[];return this.forEach(n=>e.push(n)),e}get size(){return this._snapshot.docs.size}get empty(){return this.size===0}forEach(e,n){this._snapshot.docs.forEach(r=>{e.call(n,new ul(this._firestore,this._userDataWriter,r.key,r,new qs(this._snapshot.mutatedKeys.has(r.key),this._snapshot.fromCache),this.query.converter))})}docChanges(e={}){const n=!!e.includeMetadataChanges;if(n&&this._snapshot.excludesMetadataChanges)throw new K(M.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this._cachedChanges&&this._cachedChangesIncludeMetadataChanges===n||(this._cachedChanges=function(i,s){if(i._snapshot.oldDocs.isEmpty()){let o=0;return i._snapshot.docChanges.map(l=>{const u=new ul(i._firestore,i._userDataWriter,l.doc.key,l.doc,new qs(i._snapshot.mutatedKeys.has(l.doc.key),i._snapshot.fromCache),i.query.converter);return l.doc,{type:"added",doc:u,oldIndex:-1,newIndex:o++}})}{let o=i._snapshot.oldDocs;return i._snapshot.docChanges.filter(l=>s||l.type!==3).map(l=>{const u=new ul(i._firestore,i._userDataWriter,l.doc.key,l.doc,new qs(i._snapshot.mutatedKeys.has(l.doc.key),i._snapshot.fromCache),i.query.converter);let h=-1,f=-1;return l.type!==0&&(h=o.indexOf(l.doc.key),o=o.delete(l.doc.key)),l.type!==1&&(o=o.add(l.doc),f=o.indexOf(l.doc.key)),{type:VN(l.type),doc:u,oldIndex:h,newIndex:f}})}}(this,n),this._cachedChangesIncludeMetadataChanges=n),this._cachedChanges}}function VN(t){switch(t){case 0:return"added";case 2:case 3:return"modified";case 1:return"removed";default:return J()}}class S0 extends DN{constructor(e){super(),this.firestore=e}convertBytes(e){return new ts(e)}convertReference(e){const n=this.convertDocumentKey(e,this.firestore._databaseId);return new Et(this.firestore,null,n)}}function Zo(t,e,n){t=qr(t,Et);const r=qr(t.firestore,Lo),i=ON(t.converter,e,n);return R0(r,[RN(m0(r),"setDoc",t._key,i,t.converter!==null,n).toMutation(t._key,cn.none())])}function ea(t){return R0(qr(t.firestore,Lo),[new Nf(t._key,cn.none())])}function Xt(t,...e){var n,r,i;t=Fe(t);let s={includeMetadataChanges:!1,source:"default"},o=0;typeof e[o]!="object"||My(e[o])||(s=e[o],o++);const l={includeMetadataChanges:s.includeMetadataChanges,source:s.source};if(My(e[o])){const m=e[o];e[o]=(n=m.next)===null||n===void 0?void 0:n.bind(m),e[o+1]=(r=m.error)===null||r===void 0?void 0:r.bind(m),e[o+2]=(i=m.complete)===null||i===void 0?void 0:i.bind(m)}let u,h,f;if(t instanceof Et)h=qr(t.firestore,Lo),f=Pf(t._key.path),u={next:m=>{e[o]&&e[o](LN(h,t,m))},error:e[o+1],complete:e[o+2]};else{const m=qr(t,ui);h=qr(m.firestore,Lo),f=m._query;const _=new S0(h);u={next:R=>{e[o]&&e[o](new bN(h,_,m,R))},error:e[o+1],complete:e[o+2]},NN(t._query)}return function(_,R,k,x){const C=new pN(x),w=new Xx(R,C,k);return _.asyncQueue.enqueueAndForget(async()=>Hx(await Ny(_),w)),()=>{C.Za(),_.asyncQueue.enqueueAndForget(async()=>Kx(await Ny(_),w))}}(d0(h),f,l,u)}function R0(t,e){return function(r,i){const s=new Wr;return r.asyncQueue.enqueueAndForget(async()=>oN(await yN(r),i,s)),s.promise}(d0(t),e)}function LN(t,e,n){const r=n.docs.get(e._key),i=new S0(t);return new I0(t,i,e._key,r,new qs(n.hasPendingWrites,n.fromCache),e.converter)}(function(e,n=!0){(function(i){us=i})(oi),Jr(new wr("firestore",(r,{instanceIdentifier:i,options:s})=>{const o=r.getProvider("app").getImmediate(),l=new Lo(new LP(r.getProvider("auth-internal")),new FP(r.getProvider("app-check-internal")),function(h,f){if(!Object.prototype.hasOwnProperty.apply(h.options,["projectId"]))throw new K(M.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new No(h.options.projectId,f)}(o,i),o);return s=Object.assign({useFetchStreams:n},s),l._setSettings(s),l},"PUBLIC").setMultipleInstances(!0)),an(Zg,"4.7.3",e),an(Zg,"4.7.3","esm2017")})();/**
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
 */const A0="firebasestorage.googleapis.com",k0="storageBucket",MN=2*60*1e3,jN=10*60*1e3;/**
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
 */class Ce extends gn{constructor(e,n,r=0){super(Fc(e),`Firebase Storage: ${n} (${Fc(e)})`),this.status_=r,this.customData={serverResponse:null},this._baseMessage=this.message,Object.setPrototypeOf(this,Ce.prototype)}get status(){return this.status_}set status(e){this.status_=e}_codeEquals(e){return Fc(e)===this.code}get serverResponse(){return this.customData.serverResponse}set serverResponse(e){this.customData.serverResponse=e,this.customData.serverResponse?this.message=`${this._baseMessage}
${this.customData.serverResponse}`:this.message=this._baseMessage}}var ke;(function(t){t.UNKNOWN="unknown",t.OBJECT_NOT_FOUND="object-not-found",t.BUCKET_NOT_FOUND="bucket-not-found",t.PROJECT_NOT_FOUND="project-not-found",t.QUOTA_EXCEEDED="quota-exceeded",t.UNAUTHENTICATED="unauthenticated",t.UNAUTHORIZED="unauthorized",t.UNAUTHORIZED_APP="unauthorized-app",t.RETRY_LIMIT_EXCEEDED="retry-limit-exceeded",t.INVALID_CHECKSUM="invalid-checksum",t.CANCELED="canceled",t.INVALID_EVENT_NAME="invalid-event-name",t.INVALID_URL="invalid-url",t.INVALID_DEFAULT_BUCKET="invalid-default-bucket",t.NO_DEFAULT_BUCKET="no-default-bucket",t.CANNOT_SLICE_BLOB="cannot-slice-blob",t.SERVER_FILE_WRONG_SIZE="server-file-wrong-size",t.NO_DOWNLOAD_URL="no-download-url",t.INVALID_ARGUMENT="invalid-argument",t.INVALID_ARGUMENT_COUNT="invalid-argument-count",t.APP_DELETED="app-deleted",t.INVALID_ROOT_OPERATION="invalid-root-operation",t.INVALID_FORMAT="invalid-format",t.INTERNAL_ERROR="internal-error",t.UNSUPPORTED_ENVIRONMENT="unsupported-environment"})(ke||(ke={}));function Fc(t){return"storage/"+t}function np(){const t="An unknown error occurred, please check the error payload for server response.";return new Ce(ke.UNKNOWN,t)}function UN(t){return new Ce(ke.OBJECT_NOT_FOUND,"Object '"+t+"' does not exist.")}function FN(t){return new Ce(ke.QUOTA_EXCEEDED,"Quota for bucket '"+t+"' exceeded, please view quota on https://firebase.google.com/pricing/.")}function BN(){const t="User is not authenticated, please authenticate using Firebase Authentication and try again.";return new Ce(ke.UNAUTHENTICATED,t)}function zN(){return new Ce(ke.UNAUTHORIZED_APP,"This app does not have permission to access Firebase Storage on this project.")}function $N(t){return new Ce(ke.UNAUTHORIZED,"User does not have permission to access '"+t+"'.")}function WN(){return new Ce(ke.RETRY_LIMIT_EXCEEDED,"Max retry time for operation exceeded, please try again.")}function qN(){return new Ce(ke.CANCELED,"User canceled the upload/download.")}function HN(t){return new Ce(ke.INVALID_URL,"Invalid URL '"+t+"'.")}function KN(t){return new Ce(ke.INVALID_DEFAULT_BUCKET,"Invalid default bucket '"+t+"'.")}function GN(){return new Ce(ke.NO_DEFAULT_BUCKET,"No default bucket found. Did you set the '"+k0+"' property when initializing the app?")}function QN(){return new Ce(ke.CANNOT_SLICE_BLOB,"Cannot slice blob for upload. Please retry the upload.")}function XN(){return new Ce(ke.NO_DOWNLOAD_URL,"The given file does not have any download URLs.")}function YN(t){return new Ce(ke.UNSUPPORTED_ENVIRONMENT,`${t} is missing. Make sure to install the required polyfills. See https://firebase.google.com/docs/web/environments-js-sdk#polyfills for more information.`)}function ld(t){return new Ce(ke.INVALID_ARGUMENT,t)}function C0(){return new Ce(ke.APP_DELETED,"The Firebase app was deleted.")}function JN(t){return new Ce(ke.INVALID_ROOT_OPERATION,"The operation '"+t+"' cannot be performed on a root reference, create a non-root reference using child, such as .child('file.png').")}function oo(t,e){return new Ce(ke.INVALID_FORMAT,"String does not match format '"+t+"': "+e)}function Ms(t){throw new Ce(ke.INTERNAL_ERROR,"Internal error: "+t)}/**
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
 */class Rt{constructor(e,n){this.bucket=e,this.path_=n}get path(){return this.path_}get isRoot(){return this.path.length===0}fullServerUrl(){const e=encodeURIComponent;return"/b/"+e(this.bucket)+"/o/"+e(this.path)}bucketOnlyServerUrl(){return"/b/"+encodeURIComponent(this.bucket)+"/o"}static makeFromBucketSpec(e,n){let r;try{r=Rt.makeFromUrl(e,n)}catch{return new Rt(e,"")}if(r.path==="")return r;throw KN(e)}static makeFromUrl(e,n){let r=null;const i="([A-Za-z0-9.\\-_]+)";function s(D){D.path.charAt(D.path.length-1)==="/"&&(D.path_=D.path_.slice(0,-1))}const o="(/(.*))?$",l=new RegExp("^gs://"+i+o,"i"),u={bucket:1,path:3};function h(D){D.path_=decodeURIComponent(D.path)}const f="v[A-Za-z0-9_]+",m=n.replace(/[.]/g,"\\."),_="(/([^?#]*).*)?$",R=new RegExp(`^https?://${m}/${f}/b/${i}/o${_}`,"i"),k={bucket:1,path:3},x=n===A0?"(?:storage.googleapis.com|storage.cloud.google.com)":n,C="([^?#]*)",w=new RegExp(`^https?://${x}/${i}/${C}`,"i"),T=[{regex:l,indices:u,postModify:s},{regex:R,indices:k,postModify:h},{regex:w,indices:{bucket:1,path:2},postModify:h}];for(let D=0;D<T.length;D++){const j=T[D],U=j.regex.exec(e);if(U){const I=U[j.indices.bucket];let v=U[j.indices.path];v||(v=""),r=new Rt(I,v),j.postModify(r);break}}if(r==null)throw HN(e);return r}}class ZN{constructor(e){this.promise_=Promise.reject(e)}getPromise(){return this.promise_}cancel(e=!1){}}/**
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
 */function eD(t,e,n){let r=1,i=null,s=null,o=!1,l=0;function u(){return l===2}let h=!1;function f(...C){h||(h=!0,e.apply(null,C))}function m(C){i=setTimeout(()=>{i=null,t(R,u())},C)}function _(){s&&clearTimeout(s)}function R(C,...w){if(h){_();return}if(C){_(),f.call(null,C,...w);return}if(u()||o){_(),f.call(null,C,...w);return}r<64&&(r*=2);let T;l===1?(l=2,T=0):T=(r+Math.random())*1e3,m(T)}let k=!1;function x(C){k||(k=!0,_(),!h&&(i!==null?(C||(l=2),clearTimeout(i),m(0)):C||(l=1)))}return m(0),s=setTimeout(()=>{o=!0,x(!0)},n),x}function tD(t){t(!1)}/**
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
 */function nD(t){return t!==void 0}function rD(t){return typeof t=="object"&&!Array.isArray(t)}function rp(t){return typeof t=="string"||t instanceof String}function Fy(t){return ip()&&t instanceof Blob}function ip(){return typeof Blob<"u"}function By(t,e,n,r){if(r<e)throw ld(`Invalid value for '${t}'. Expected ${e} or greater.`);if(r>n)throw ld(`Invalid value for '${t}'. Expected ${n} or less.`)}/**
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
 */function sp(t,e,n){let r=e;return n==null&&(r=`https://${e}`),`${n}://${r}/v0${t}`}function P0(t){const e=encodeURIComponent;let n="?";for(const r in t)if(t.hasOwnProperty(r)){const i=e(r)+"="+e(t[r]);n=n+i+"&"}return n=n.slice(0,-1),n}var Hr;(function(t){t[t.NO_ERROR=0]="NO_ERROR",t[t.NETWORK_ERROR=1]="NETWORK_ERROR",t[t.ABORT=2]="ABORT"})(Hr||(Hr={}));/**
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
 */function iD(t,e){const n=t>=500&&t<600,i=[408,429].indexOf(t)!==-1,s=e.indexOf(t)!==-1;return n||i||s}/**
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
 */class sD{constructor(e,n,r,i,s,o,l,u,h,f,m,_=!0){this.url_=e,this.method_=n,this.headers_=r,this.body_=i,this.successCodes_=s,this.additionalRetryCodes_=o,this.callback_=l,this.errorCallback_=u,this.timeout_=h,this.progressCallback_=f,this.connectionFactory_=m,this.retry=_,this.pendingConnection_=null,this.backoffId_=null,this.canceled_=!1,this.appDelete_=!1,this.promise_=new Promise((R,k)=>{this.resolve_=R,this.reject_=k,this.start_()})}start_(){const e=(r,i)=>{if(i){r(!1,new Ba(!1,null,!0));return}const s=this.connectionFactory_();this.pendingConnection_=s;const o=l=>{const u=l.loaded,h=l.lengthComputable?l.total:-1;this.progressCallback_!==null&&this.progressCallback_(u,h)};this.progressCallback_!==null&&s.addUploadProgressListener(o),s.send(this.url_,this.method_,this.body_,this.headers_).then(()=>{this.progressCallback_!==null&&s.removeUploadProgressListener(o),this.pendingConnection_=null;const l=s.getErrorCode()===Hr.NO_ERROR,u=s.getStatus();if(!l||iD(u,this.additionalRetryCodes_)&&this.retry){const f=s.getErrorCode()===Hr.ABORT;r(!1,new Ba(!1,null,f));return}const h=this.successCodes_.indexOf(u)!==-1;r(!0,new Ba(h,s))})},n=(r,i)=>{const s=this.resolve_,o=this.reject_,l=i.connection;if(i.wasSuccessCode)try{const u=this.callback_(l,l.getResponse());nD(u)?s(u):s()}catch(u){o(u)}else if(l!==null){const u=np();u.serverResponse=l.getErrorText(),this.errorCallback_?o(this.errorCallback_(l,u)):o(u)}else if(i.canceled){const u=this.appDelete_?C0():qN();o(u)}else{const u=WN();o(u)}};this.canceled_?n(!1,new Ba(!1,null,!0)):this.backoffId_=eD(e,n,this.timeout_)}getPromise(){return this.promise_}cancel(e){this.canceled_=!0,this.appDelete_=e||!1,this.backoffId_!==null&&tD(this.backoffId_),this.pendingConnection_!==null&&this.pendingConnection_.abort()}}class Ba{constructor(e,n,r){this.wasSuccessCode=e,this.connection=n,this.canceled=!!r}}function oD(t,e){e!==null&&e.length>0&&(t.Authorization="Firebase "+e)}function aD(t,e){t["X-Firebase-Storage-Version"]="webjs/"+(e??"AppManager")}function lD(t,e){e&&(t["X-Firebase-GMPID"]=e)}function uD(t,e){e!==null&&(t["X-Firebase-AppCheck"]=e)}function cD(t,e,n,r,i,s,o=!0){const l=P0(t.urlParams),u=t.url+l,h=Object.assign({},t.headers);return lD(h,e),oD(h,n),aD(h,s),uD(h,r),new sD(u,t.method,h,t.body,t.successCodes,t.additionalRetryCodes,t.handler,t.errorHandler,t.timeout,t.progressCallback,i,o)}/**
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
 */function hD(){return typeof BlobBuilder<"u"?BlobBuilder:typeof WebKitBlobBuilder<"u"?WebKitBlobBuilder:void 0}function dD(...t){const e=hD();if(e!==void 0){const n=new e;for(let r=0;r<t.length;r++)n.append(t[r]);return n.getBlob()}else{if(ip())return new Blob(t);throw new Ce(ke.UNSUPPORTED_ENVIRONMENT,"This browser doesn't seem to support creating Blobs")}}function fD(t,e,n){return t.webkitSlice?t.webkitSlice(e,n):t.mozSlice?t.mozSlice(e,n):t.slice?t.slice(e,n):null}/**
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
 */function pD(t){if(typeof atob>"u")throw YN("base-64");return atob(t)}/**
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
 */const rn={RAW:"raw",BASE64:"base64",BASE64URL:"base64url",DATA_URL:"data_url"};class Bc{constructor(e,n){this.data=e,this.contentType=n||null}}function mD(t,e){switch(t){case rn.RAW:return new Bc(x0(e));case rn.BASE64:case rn.BASE64URL:return new Bc(N0(t,e));case rn.DATA_URL:return new Bc(yD(e),_D(e))}throw np()}function x0(t){const e=[];for(let n=0;n<t.length;n++){let r=t.charCodeAt(n);if(r<=127)e.push(r);else if(r<=2047)e.push(192|r>>6,128|r&63);else if((r&64512)===55296)if(!(n<t.length-1&&(t.charCodeAt(n+1)&64512)===56320))e.push(239,191,189);else{const s=r,o=t.charCodeAt(++n);r=65536|(s&1023)<<10|o&1023,e.push(240|r>>18,128|r>>12&63,128|r>>6&63,128|r&63)}else(r&64512)===56320?e.push(239,191,189):e.push(224|r>>12,128|r>>6&63,128|r&63)}return new Uint8Array(e)}function gD(t){let e;try{e=decodeURIComponent(t)}catch{throw oo(rn.DATA_URL,"Malformed data URL.")}return x0(e)}function N0(t,e){switch(t){case rn.BASE64:{const i=e.indexOf("-")!==-1,s=e.indexOf("_")!==-1;if(i||s)throw oo(t,"Invalid character '"+(i?"-":"_")+"' found: is it base64url encoded?");break}case rn.BASE64URL:{const i=e.indexOf("+")!==-1,s=e.indexOf("/")!==-1;if(i||s)throw oo(t,"Invalid character '"+(i?"+":"/")+"' found: is it base64 encoded?");e=e.replace(/-/g,"+").replace(/_/g,"/");break}}let n;try{n=pD(e)}catch(i){throw i.message.includes("polyfill")?i:oo(t,"Invalid character found")}const r=new Uint8Array(n.length);for(let i=0;i<n.length;i++)r[i]=n.charCodeAt(i);return r}class D0{constructor(e){this.base64=!1,this.contentType=null;const n=e.match(/^data:([^,]+)?,/);if(n===null)throw oo(rn.DATA_URL,"Must be formatted 'data:[<mediatype>][;base64],<data>");const r=n[1]||null;r!=null&&(this.base64=vD(r,";base64"),this.contentType=this.base64?r.substring(0,r.length-7):r),this.rest=e.substring(e.indexOf(",")+1)}}function yD(t){const e=new D0(t);return e.base64?N0(rn.BASE64,e.rest):gD(e.rest)}function _D(t){return new D0(t).contentType}function vD(t,e){return t.length>=e.length?t.substring(t.length-e.length)===e:!1}/**
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
 */class tr{constructor(e,n){let r=0,i="";Fy(e)?(this.data_=e,r=e.size,i=e.type):e instanceof ArrayBuffer?(n?this.data_=new Uint8Array(e):(this.data_=new Uint8Array(e.byteLength),this.data_.set(new Uint8Array(e))),r=this.data_.length):e instanceof Uint8Array&&(n?this.data_=e:(this.data_=new Uint8Array(e.length),this.data_.set(e)),r=e.length),this.size_=r,this.type_=i}size(){return this.size_}type(){return this.type_}slice(e,n){if(Fy(this.data_)){const r=this.data_,i=fD(r,e,n);return i===null?null:new tr(i)}else{const r=new Uint8Array(this.data_.buffer,e,n-e);return new tr(r,!0)}}static getBlob(...e){if(ip()){const n=e.map(r=>r instanceof tr?r.data_:r);return new tr(dD.apply(null,n))}else{const n=e.map(o=>rp(o)?mD(rn.RAW,o).data:o.data_);let r=0;n.forEach(o=>{r+=o.byteLength});const i=new Uint8Array(r);let s=0;return n.forEach(o=>{for(let l=0;l<o.length;l++)i[s++]=o[l]}),new tr(i,!0)}}uploadData(){return this.data_}}/**
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
 */function O0(t){let e;try{e=JSON.parse(t)}catch{return null}return rD(e)?e:null}/**
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
 */function wD(t){if(t.length===0)return null;const e=t.lastIndexOf("/");return e===-1?"":t.slice(0,e)}function ED(t,e){const n=e.split("/").filter(r=>r.length>0).join("/");return t.length===0?n:t+"/"+n}function b0(t){const e=t.lastIndexOf("/",t.length-2);return e===-1?t:t.slice(e+1)}/**
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
 */function TD(t,e){return e}class ht{constructor(e,n,r,i){this.server=e,this.local=n||e,this.writable=!!r,this.xform=i||TD}}let za=null;function ID(t){return!rp(t)||t.length<2?t:b0(t)}function V0(){if(za)return za;const t=[];t.push(new ht("bucket")),t.push(new ht("generation")),t.push(new ht("metageneration")),t.push(new ht("name","fullPath",!0));function e(s,o){return ID(o)}const n=new ht("name");n.xform=e,t.push(n);function r(s,o){return o!==void 0?Number(o):o}const i=new ht("size");return i.xform=r,t.push(i),t.push(new ht("timeCreated")),t.push(new ht("updated")),t.push(new ht("md5Hash",null,!0)),t.push(new ht("cacheControl",null,!0)),t.push(new ht("contentDisposition",null,!0)),t.push(new ht("contentEncoding",null,!0)),t.push(new ht("contentLanguage",null,!0)),t.push(new ht("contentType",null,!0)),t.push(new ht("metadata","customMetadata",!0)),za=t,za}function SD(t,e){function n(){const r=t.bucket,i=t.fullPath,s=new Rt(r,i);return e._makeStorageReference(s)}Object.defineProperty(t,"ref",{get:n})}function RD(t,e,n){const r={};r.type="file";const i=n.length;for(let s=0;s<i;s++){const o=n[s];r[o.local]=o.xform(r,e[o.server])}return SD(r,t),r}function L0(t,e,n){const r=O0(e);return r===null?null:RD(t,r,n)}function AD(t,e,n,r){const i=O0(e);if(i===null||!rp(i.downloadTokens))return null;const s=i.downloadTokens;if(s.length===0)return null;const o=encodeURIComponent;return s.split(",").map(h=>{const f=t.bucket,m=t.fullPath,_="/b/"+o(f)+"/o/"+o(m),R=sp(_,n,r),k=P0({alt:"media",token:h});return R+k})[0]}function kD(t,e){const n={},r=e.length;for(let i=0;i<r;i++){const s=e[i];s.writable&&(n[s.server]=t[s.local])}return JSON.stringify(n)}class M0{constructor(e,n,r,i){this.url=e,this.method=n,this.handler=r,this.timeout=i,this.urlParams={},this.headers={},this.body=null,this.errorHandler=null,this.progressCallback=null,this.successCodes=[200],this.additionalRetryCodes=[]}}/**
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
 */function j0(t){if(!t)throw np()}function CD(t,e){function n(r,i){const s=L0(t,i,e);return j0(s!==null),s}return n}function PD(t,e){function n(r,i){const s=L0(t,i,e);return j0(s!==null),AD(s,i,t.host,t._protocol)}return n}function U0(t){function e(n,r){let i;return n.getStatus()===401?n.getErrorText().includes("Firebase App Check token is invalid")?i=zN():i=BN():n.getStatus()===402?i=FN(t.bucket):n.getStatus()===403?i=$N(t.path):i=r,i.status=n.getStatus(),i.serverResponse=r.serverResponse,i}return e}function xD(t){const e=U0(t);function n(r,i){let s=e(r,i);return r.getStatus()===404&&(s=UN(t.path)),s.serverResponse=i.serverResponse,s}return n}function ND(t,e,n){const r=e.fullServerUrl(),i=sp(r,t.host,t._protocol),s="GET",o=t.maxOperationRetryTime,l=new M0(i,s,PD(t,n),o);return l.errorHandler=xD(e),l}function DD(t,e){return t&&t.contentType||e&&e.type()||"application/octet-stream"}function OD(t,e,n){const r=Object.assign({},n);return r.fullPath=t.path,r.size=e.size(),r.contentType||(r.contentType=DD(null,e)),r}function bD(t,e,n,r,i){const s=e.bucketOnlyServerUrl(),o={"X-Goog-Upload-Protocol":"multipart"};function l(){let T="";for(let D=0;D<2;D++)T=T+Math.random().toString().slice(2);return T}const u=l();o["Content-Type"]="multipart/related; boundary="+u;const h=OD(e,r,i),f=kD(h,n),m="--"+u+`\r
Content-Type: application/json; charset=utf-8\r
\r
`+f+`\r
--`+u+`\r
Content-Type: `+h.contentType+`\r
\r
`,_=`\r
--`+u+"--",R=tr.getBlob(m,r,_);if(R===null)throw QN();const k={name:h.fullPath},x=sp(s,t.host,t._protocol),C="POST",w=t.maxUploadRetryTime,g=new M0(x,C,CD(t,n),w);return g.urlParams=k,g.headers=o,g.body=R.uploadData(),g.errorHandler=U0(e),g}class VD{constructor(){this.sent_=!1,this.xhr_=new XMLHttpRequest,this.initXhr(),this.errorCode_=Hr.NO_ERROR,this.sendPromise_=new Promise(e=>{this.xhr_.addEventListener("abort",()=>{this.errorCode_=Hr.ABORT,e()}),this.xhr_.addEventListener("error",()=>{this.errorCode_=Hr.NETWORK_ERROR,e()}),this.xhr_.addEventListener("load",()=>{e()})})}send(e,n,r,i){if(this.sent_)throw Ms("cannot .send() more than once");if(this.sent_=!0,this.xhr_.open(n,e,!0),i!==void 0)for(const s in i)i.hasOwnProperty(s)&&this.xhr_.setRequestHeader(s,i[s].toString());return r!==void 0?this.xhr_.send(r):this.xhr_.send(),this.sendPromise_}getErrorCode(){if(!this.sent_)throw Ms("cannot .getErrorCode() before sending");return this.errorCode_}getStatus(){if(!this.sent_)throw Ms("cannot .getStatus() before sending");try{return this.xhr_.status}catch{return-1}}getResponse(){if(!this.sent_)throw Ms("cannot .getResponse() before sending");return this.xhr_.response}getErrorText(){if(!this.sent_)throw Ms("cannot .getErrorText() before sending");return this.xhr_.statusText}abort(){this.xhr_.abort()}getResponseHeader(e){return this.xhr_.getResponseHeader(e)}addUploadProgressListener(e){this.xhr_.upload!=null&&this.xhr_.upload.addEventListener("progress",e)}removeUploadProgressListener(e){this.xhr_.upload!=null&&this.xhr_.upload.removeEventListener("progress",e)}}class LD extends VD{initXhr(){this.xhr_.responseType="text"}}function F0(){return new LD}/**
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
 */class ri{constructor(e,n){this._service=e,n instanceof Rt?this._location=n:this._location=Rt.makeFromUrl(n,e.host)}toString(){return"gs://"+this._location.bucket+"/"+this._location.path}_newRef(e,n){return new ri(e,n)}get root(){const e=new Rt(this._location.bucket,"");return this._newRef(this._service,e)}get bucket(){return this._location.bucket}get fullPath(){return this._location.path}get name(){return b0(this._location.path)}get storage(){return this._service}get parent(){const e=wD(this._location.path);if(e===null)return null;const n=new Rt(this._location.bucket,e);return new ri(this._service,n)}_throwIfRoot(e){if(this._location.path==="")throw JN(e)}}function MD(t,e,n){t._throwIfRoot("uploadBytes");const r=bD(t.storage,t._location,V0(),new tr(e,!0),n);return t.storage.makeRequestWithTokens(r,F0).then(i=>({metadata:i,ref:t}))}function jD(t){t._throwIfRoot("getDownloadURL");const e=ND(t.storage,t._location,V0());return t.storage.makeRequestWithTokens(e,F0).then(n=>{if(n===null)throw XN();return n})}function UD(t,e){const n=ED(t._location.path,e),r=new Rt(t._location.bucket,n);return new ri(t.storage,r)}/**
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
 */function FD(t){return/^[A-Za-z]+:\/\//.test(t)}function BD(t,e){return new ri(t,e)}function B0(t,e){if(t instanceof op){const n=t;if(n._bucket==null)throw GN();const r=new ri(n,n._bucket);return e!=null?B0(r,e):r}else return e!==void 0?UD(t,e):t}function zD(t,e){if(e&&FD(e)){if(t instanceof op)return BD(t,e);throw ld("To use ref(service, url), the first argument must be a Storage instance.")}else return B0(t,e)}function zy(t,e){const n=e==null?void 0:e[k0];return n==null?null:Rt.makeFromBucketSpec(n,t)}function $D(t,e,n,r={}){t.host=`${e}:${n}`,t._protocol="http";const{mockUserToken:i}=r;i&&(t._overrideAuthToken=typeof i=="string"?i:Tw(i,t.app.options.projectId))}class op{constructor(e,n,r,i,s){this.app=e,this._authProvider=n,this._appCheckProvider=r,this._url=i,this._firebaseVersion=s,this._bucket=null,this._host=A0,this._protocol="https",this._appId=null,this._deleted=!1,this._maxOperationRetryTime=MN,this._maxUploadRetryTime=jN,this._requests=new Set,i!=null?this._bucket=Rt.makeFromBucketSpec(i,this._host):this._bucket=zy(this._host,this.app.options)}get host(){return this._host}set host(e){this._host=e,this._url!=null?this._bucket=Rt.makeFromBucketSpec(this._url,e):this._bucket=zy(e,this.app.options)}get maxUploadRetryTime(){return this._maxUploadRetryTime}set maxUploadRetryTime(e){By("time",0,Number.POSITIVE_INFINITY,e),this._maxUploadRetryTime=e}get maxOperationRetryTime(){return this._maxOperationRetryTime}set maxOperationRetryTime(e){By("time",0,Number.POSITIVE_INFINITY,e),this._maxOperationRetryTime=e}async _getAuthToken(){if(this._overrideAuthToken)return this._overrideAuthToken;const e=this._authProvider.getImmediate({optional:!0});if(e){const n=await e.getToken();if(n!==null)return n.accessToken}return null}async _getAppCheckToken(){const e=this._appCheckProvider.getImmediate({optional:!0});return e?(await e.getToken()).token:null}_delete(){return this._deleted||(this._deleted=!0,this._requests.forEach(e=>e.cancel()),this._requests.clear()),Promise.resolve()}_makeStorageReference(e){return new ri(this,e)}_makeRequest(e,n,r,i,s=!0){if(this._deleted)return new ZN(C0());{const o=cD(e,this._appId,r,i,n,this._firebaseVersion,s);return this._requests.add(o),o.getPromise().then(()=>this._requests.delete(o),()=>this._requests.delete(o)),o}}async makeRequestWithTokens(e,n){const[r,i]=await Promise.all([this._getAuthToken(),this._getAppCheckToken()]);return this._makeRequest(e,n,r,i).getPromise()}}const $y="@firebase/storage",Wy="0.13.2";/**
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
 */const z0="storage";function WD(t,e,n){return t=Fe(t),MD(t,e,n)}function qD(t){return t=Fe(t),jD(t)}function HD(t,e){return t=Fe(t),zD(t,e)}function KD(t=cf(),e){t=Fe(t);const r=_u(t,z0).getImmediate({identifier:e}),i=vw("storage");return i&&GD(r,...i),r}function GD(t,e,n,r={}){$D(t,e,n,r)}function QD(t,{instanceIdentifier:e}){const n=t.getProvider("app").getImmediate(),r=t.getProvider("auth-internal"),i=t.getProvider("app-check-internal");return new op(n,r,i,e,oi)}function XD(){Jr(new wr(z0,QD,"PUBLIC").setMultipleInstances(!0)),an($y,Wy,""),an($y,Wy,"esm2017")}XD();const YD={apiKey:"AIzaSyDXp_QLD0MyA8kGChm4GVYBC9J86FPDNCE",authDomain:"cx-platform-v1.firebaseapp.com",projectId:"cx-platform-v1",appId:"1:579694129561:web:b8198bbeaabb393b382308",storageBucket:"cx-platform-v1.firebasestorage.app"},ap=Rw(YD),ud=xP(ap),Ne=wN(ap),JD=KD(ap),ZD=new Sn;function mn(t){const e=Math.random().toString(36).slice(2,10);return`${t}_${e}_${Date.now()}`}function $0(t){return p.jsxs("div",{style:{width:"100%"},children:[p.jsx("div",{className:"h2",children:t.label}),t.help?p.jsx("div",{className:"small",children:t.help}):null,p.jsx("div",{style:{height:6}}),p.jsx("textarea",{className:"input",value:t.value,onChange:e=>t.onChange(e.target.value),placeholder:t.placeholder})]})}function W0(t){return t.split(/\r?\n/).map(e=>e.trim()).filter(Boolean)}function e2(){const[t,e]=b.useState([]);b.useEffect(()=>{const C=Gt(Kt(Ne,"workspaces"),Qt("__name__"));return Xt(C,w=>{e(w.docs.map(g=>({id:g.id,data:g.data()})))})},[]);const[n,r]=b.useState(()=>mn("ws")),[i,s]=b.useState("https://nurihiro.website"),[o,l]=b.useState(!1),[u,h]=b.useState("suggest"),[f,m]=b.useState("approve"),[_,R]=b.useState(1),k=b.useMemo(()=>W0(i),[i]);async function x(){const C=pn(Ne,"workspaces",n.trim()),w={domains:k,defaults:{ai:{decision:o,discovery:u,copy:f},log_sample_rate:Number(_)}};await Zo(C,w,{merge:!0}),r(mn("ws"))}return p.jsxs("div",{className:"container",children:[p.jsxs("div",{className:"card",children:[p.jsx("h1",{className:"h1",children:"Workspaces"}),p.jsx("div",{className:"small",children:"許可ドメインとデフォルト設定のまとまり（複数サイトを束ねる単位）"}),p.jsx("div",{style:{height:14}}),p.jsxs("div",{className:"row",style:{alignItems:"flex-start"},children:[p.jsxs("div",{style:{flex:1,minWidth:280},children:[p.jsx("div",{className:"h2",children:"workspaceId"}),p.jsx("input",{className:"input",value:n,onChange:C=>r(C.target.value)}),p.jsx("div",{style:{height:12}}),p.jsx($0,{label:"domains",value:i,onChange:s,help:"1行=1ドメイン（必ず https:// を付ける）"})]}),p.jsxs("div",{style:{flex:1,minWidth:280},children:[p.jsx("div",{className:"h2",children:"defaults"}),p.jsxs("div",{className:"row",children:[p.jsxs("label",{className:"badge",children:[p.jsx("input",{type:"checkbox",checked:o,onChange:C=>l(C.target.checked)}),"AI decision"]}),p.jsxs("label",{className:"badge",children:["discovery",p.jsxs("select",{className:"input",style:{width:140,marginLeft:8},value:u,onChange:C=>h(C.target.value),children:[p.jsx("option",{value:"suggest",children:"suggest"}),p.jsx("option",{value:"off",children:"off"})]})]}),p.jsxs("label",{className:"badge",children:["copy",p.jsxs("select",{className:"input",style:{width:140,marginLeft:8},value:f,onChange:C=>m(C.target.value),children:[p.jsx("option",{value:"approve",children:"approve"}),p.jsx("option",{value:"auto",children:"auto"})]})]})]}),p.jsx("div",{style:{height:10}}),p.jsx("div",{className:"h2",children:"log_sample_rate"}),p.jsx("input",{className:"input",type:"number",step:"0.1",value:_,onChange:C=>R(Number(C.target.value))}),p.jsx("div",{style:{height:14}}),p.jsx("button",{className:"btn btn--primary",onClick:x,children:"保存"})]})]})]}),p.jsx("div",{style:{height:14}}),p.jsxs("div",{className:"card",children:[p.jsx("div",{className:"h2",children:"一覧"}),p.jsxs("table",{className:"table",children:[p.jsx("thead",{children:p.jsxs("tr",{children:[p.jsx("th",{children:"ID"}),p.jsx("th",{children:"domains"}),p.jsx("th",{children:"defaults"}),p.jsx("th",{})]})}),p.jsx("tbody",{children:t.map(C=>p.jsxs("tr",{children:[p.jsx("td",{children:p.jsx("code",{children:C.id})}),p.jsx("td",{children:(C.data.domains||[]).join(`
`)}),p.jsx("td",{children:p.jsx("pre",{style:{margin:0,whiteSpace:"pre-wrap"},children:JSON.stringify(C.data.defaults||{},null,2)})}),p.jsxs("td",{children:[p.jsx("button",{className:"btn",onClick:()=>{var w,g,T,D,j,U,I;r(C.id),s((C.data.domains||[]).join(`
`)),l(!!((g=(w=C.data.defaults)==null?void 0:w.ai)!=null&&g.decision)),h(((D=(T=C.data.defaults)==null?void 0:T.ai)==null?void 0:D.discovery)||"suggest"),m(((U=(j=C.data.defaults)==null?void 0:j.ai)==null?void 0:U.copy)||"approve"),R(Number(((I=C.data.defaults)==null?void 0:I.log_sample_rate)??1))},children:"編集"}),p.jsx("span",{style:{width:8,display:"inline-block"}}),p.jsx("button",{className:"btn btn--danger",onClick:()=>ea(pn(Ne,"workspaces",C.id)),children:"削除"})]})]},C.id))})]})]})]})}function t2(){const[t,e]=b.useState([]),[n,r]=b.useState([]);b.useEffect(()=>{const k=Gt(Kt(Ne,"workspaces"),Qt("__name__"));return Xt(k,x=>{e(x.docs.map(C=>({id:C.id,data:C.data()})))})},[]),b.useEffect(()=>{const k=Gt(Kt(Ne,"sites"),Qt("__name__"));return Xt(k,x=>{r(x.docs.map(C=>({id:C.id,data:C.data()})))})},[]);const[i,s]=b.useState(()=>mn("site")),[o,l]=b.useState(""),[u,h]=b.useState("https://nurihiro.website"),[f,m]=b.useState("");b.useEffect(()=>{!o&&t.length&&l(t[0].id)},[t,o]);const _=b.useMemo(()=>W0(u),[u]);async function R(){if(!o)throw new Error("workspaceId required");const k={workspaceId:o,domains:_,publicKey:f.trim()||void 0};await Zo(pn(Ne,"sites",i.trim()),k,{merge:!0}),s(mn("site"))}return p.jsxs("div",{className:"container",children:[p.jsxs("div",{className:"card",children:[p.jsx("h1",{className:"h1",children:"Sites"}),p.jsx("div",{className:"small",children:"サイト単位の設定。SDKはここで作った siteId を data-site-id に入れる"}),p.jsx("div",{style:{height:14}}),p.jsxs("div",{className:"row",style:{alignItems:"flex-start"},children:[p.jsxs("div",{style:{flex:1,minWidth:280},children:[p.jsx("div",{className:"h2",children:"siteId"}),p.jsx("input",{className:"input",value:i,onChange:k=>s(k.target.value)}),p.jsx("div",{style:{height:10}}),p.jsx("div",{className:"h2",children:"workspaceId"}),p.jsx("select",{className:"input",value:o,onChange:k=>l(k.target.value),children:t.map(k=>p.jsx("option",{value:k.id,children:k.id},k.id))}),p.jsx("div",{style:{height:12}}),p.jsx($0,{label:"domains",value:u,onChange:h,help:"site単位でCORS/Origin allowを決める。空なら workspace.domains を使う"})]}),p.jsxs("div",{style:{flex:1,minWidth:280},children:[p.jsx("div",{className:"h2",children:"publicKey（任意）"}),p.jsx("input",{className:"input",value:f,onChange:k=>m(k.target.value),placeholder:"空でOK"}),p.jsx("div",{className:"small",children:"設定すると /v1/serve に X-Site-Key が必須になる（より安全）"}),p.jsx("div",{style:{height:14}}),p.jsx("button",{className:"btn btn--primary",onClick:R,children:"保存"}),p.jsx("div",{style:{height:14}}),p.jsxs("div",{className:"card",style:{background:"rgba(255,255,255,.03)"},children:[p.jsx("div",{className:"h2",children:"埋め込みタグ（例）"}),p.jsx("pre",{style:{margin:0,whiteSpace:"pre-wrap"},children:`<script
  src="https://YOUR_HOSTING_DOMAIN/sdk.js"
  data-site-id="${i}"
  data-api-base="https://asia-northeast1-YOUR_PROJECT.cloudfunctions.net/api/v1/serve"
><\/script>`})]})]})]})]}),p.jsx("div",{style:{height:14}}),p.jsxs("div",{className:"card",children:[p.jsx("div",{className:"h2",children:"一覧"}),p.jsxs("table",{className:"table",children:[p.jsx("thead",{children:p.jsxs("tr",{children:[p.jsx("th",{children:"ID"}),p.jsx("th",{children:"workspaceId"}),p.jsx("th",{children:"domains"}),p.jsx("th",{children:"publicKey"}),p.jsx("th",{})]})}),p.jsx("tbody",{children:n.map(k=>p.jsxs("tr",{children:[p.jsx("td",{children:p.jsx("code",{children:k.id})}),p.jsx("td",{children:p.jsx("code",{children:k.data.workspaceId})}),p.jsx("td",{children:(k.data.domains||[]).join(`
`)}),p.jsx("td",{children:k.data.publicKey?"set":""}),p.jsxs("td",{children:[p.jsx("button",{className:"btn",onClick:()=>{s(k.id),l(k.data.workspaceId),h((k.data.domains||[]).join(`
`)),m(k.data.publicKey||"")},children:"編集"}),p.jsx("span",{style:{width:8,display:"inline-block"}}),p.jsx("button",{className:"btn btn--danger",onClick:()=>ea(pn(Ne,"sites",k.id)),children:"削除"})]})]},k.id))})]})]})]})}async function n2(t){const{workspaceId:e,siteId:n,file:r}=t;if(!e)throw new Error("workspaceId required");const i=(r.name||"image").replace(/[^a-zA-Z0-9._-]/g,"_").slice(0,120),s=Date.now(),o=n?`workspaces/${e}/sites/${n}/images/${s}_${i}`:`workspaces/${e}/images/${s}_${i}`,l=HD(JD,o);await WD(l,r,{contentType:r.type||"image/*"});const u=await qD(l);return{path:o,downloadURL:u}}function r2(){const[t,e]=b.useState([]),[n,r]=b.useState([]),[i,s]=b.useState([]);b.useEffect(()=>{const W=Gt(Kt(Ne,"workspaces"),Qt("__name__"));return Xt(W,ve=>e(ve.docs.map(De=>({id:De.id}))))},[]),b.useEffect(()=>{const W=Gt(Kt(Ne,"actions"),Qt("__name__"));return Xt(W,ve=>r(ve.docs.map(De=>({id:De.id,data:De.data()}))))},[]),b.useEffect(()=>{const W=Gt(Kt(Ne,"templates"),Qt("__name__"));return Xt(W,ve=>s(ve.docs.map(De=>({id:De.id,data:De.data()}))))},[]);const[o,l]=b.useState(()=>mn("act")),[u,h]=b.useState(""),[f,m]=b.useState("modal"),[_,R]=b.useState("body"),[k,x]=b.useState(""),[C,w]=b.useState("テスト表示"),[g,T]=b.useState("これが出れば成功🔥"),[D,j]=b.useState("OK"),[U,I]=b.useState(""),[v,E]=b.useState("詳細を見る"),[S,P]=b.useState("");b.useEffect(()=>{!u&&t.length&&h(t[0].id)},[t,u]);const N=b.useMemo(()=>({workspaceId:u,type:f,selector:_.trim()||"body",templateId:k.trim()||void 0,creative:{title:C,body:g,cta_text:D,cta_url:U,cta_url_text:v,image_url:S}}),[u,f,_,k,C,g,D,U,v,S]);async function A(){if(!u)throw new Error("workspaceId required");await Zo(pn(Ne,"actions",o.trim()),N,{merge:!0}),l(mn("act"))}return p.jsxs("div",{className:"container",children:[p.jsxs("div",{className:"card",children:[p.jsx("h1",{className:"h1",children:"Actions"}),p.jsx("div",{className:"small",children:"UIパーツ（モーダル等）の“部品”を作る。Scenario はここで作った Action を選んで並べる"}),p.jsx("div",{style:{height:14}}),p.jsxs("div",{className:"row",style:{alignItems:"flex-start"},children:[p.jsxs("div",{style:{flex:1,minWidth:280},children:[p.jsx("div",{className:"h2",children:"actionId"}),p.jsx("input",{className:"input",value:o,onChange:W=>l(W.target.value)}),p.jsx("div",{style:{height:10}}),p.jsx("div",{className:"h2",children:"workspaceId"}),p.jsx("select",{className:"input",value:u,onChange:W=>h(W.target.value),children:t.map(W=>p.jsx("option",{value:W.id,children:W.id},W.id))}),p.jsx("div",{style:{height:10}}),p.jsxs("div",{className:"row",children:[p.jsxs("div",{style:{flex:1},children:[p.jsx("div",{className:"h2",children:"type"}),p.jsxs("select",{className:"input",value:f,onChange:W=>{const ve=W.target.value;m(ve),x("")},children:[p.jsx("option",{value:"modal",children:"modal"}),p.jsx("option",{value:"banner",children:"banner"}),p.jsx("option",{value:"toast",children:"toast"})]})]}),p.jsxs("div",{style:{flex:2},children:[p.jsx("div",{className:"h2",children:"selector"}),p.jsx("input",{className:"input",value:_,onChange:W=>R(W.target.value)})]})]}),p.jsx("div",{style:{height:10}}),p.jsx("div",{className:"h2",children:"templateId（任意）"}),p.jsxs("select",{className:"input",value:k,onChange:W=>x(W.target.value),children:[p.jsx("option",{value:"",children:"(default / built-in)"}),i.filter(W=>W.data.workspaceId===u&&W.data.type===f).map(W=>p.jsxs("option",{value:W.id,children:[W.id," — ",W.data.name||""]},W.id))]}),p.jsx("div",{className:"small",children:"Templates で作ったHTML/CSSを使いたいときに選択。"}),p.jsx("div",{style:{height:10}}),p.jsx("div",{className:"h2",children:"title"}),p.jsx("input",{className:"input",value:C,onChange:W=>w(W.target.value)}),p.jsx("div",{style:{height:10}}),p.jsx("div",{className:"h2",children:"body"}),p.jsx("textarea",{className:"input",value:g,onChange:W=>T(W.target.value)}),p.jsx("div",{style:{height:10}}),p.jsxs("div",{className:"row",children:[p.jsxs("div",{style:{flex:1},children:[p.jsx("div",{className:"h2",children:"cta_text"}),p.jsx("input",{className:"input",value:D,onChange:W=>j(W.target.value)})]}),p.jsxs("div",{style:{flex:2},children:[p.jsx("div",{className:"h2",children:"cta_url"}),p.jsx("input",{className:"input",value:U,onChange:W=>I(W.target.value),placeholder:"https://... (任意)"})]})]}),p.jsx("div",{style:{height:10}}),p.jsx("div",{className:"h2",children:"cta_url_text（任意）"}),p.jsx("input",{className:"input",value:v,onChange:W=>E(W.target.value),placeholder:"詳細を見る"}),p.jsx("div",{style:{height:10}}),p.jsx("div",{className:"h2",children:"image_url（任意）"}),p.jsx("input",{className:"input",value:S,onChange:W=>P(W.target.value),placeholder:"https://..."}),p.jsx("div",{className:"small",children:"画像URL直入力 or 下のアップロードで自動入力。"}),p.jsx("div",{style:{height:10}}),p.jsx("div",{className:"h2",children:"画像アップロード"}),p.jsx("input",{className:"input",type:"file",accept:"image/*",onChange:async W=>{var Le;const ve=(Le=W.target.files)==null?void 0:Le[0];if(!ve)return;const De=await n2({workspaceId:u,siteId:void 0,file:ve});P(De.downloadURL)}}),p.jsx("div",{className:"small",children:"いったん workspace 配下に保存（site別に分けたい場合は後で siteId を渡す形にする）。"}),p.jsx("div",{style:{height:14}}),p.jsx("button",{className:"btn btn--primary",onClick:A,children:"保存"})]}),p.jsxs("div",{style:{flex:1,minWidth:280},children:[p.jsx("div",{className:"h2",children:"プレビュー（JSON）"}),p.jsx("pre",{style:{margin:0,whiteSpace:"pre-wrap"},children:JSON.stringify(N,null,2)})]})]})]}),p.jsx("div",{style:{height:14}}),p.jsxs("div",{className:"card",children:[p.jsx("div",{className:"h2",children:"一覧"}),p.jsxs("table",{className:"table",children:[p.jsx("thead",{children:p.jsxs("tr",{children:[p.jsx("th",{children:"ID"}),p.jsx("th",{children:"workspaceId"}),p.jsx("th",{children:"type"}),p.jsx("th",{children:"title"}),p.jsx("th",{})]})}),p.jsx("tbody",{children:n.map(W=>{var ve;return p.jsxs("tr",{children:[p.jsx("td",{children:p.jsx("code",{children:W.id})}),p.jsx("td",{children:p.jsx("code",{children:W.data.workspaceId})}),p.jsx("td",{children:W.data.type}),p.jsx("td",{children:(ve=W.data.creative)==null?void 0:ve.title}),p.jsxs("td",{children:[p.jsx("button",{className:"btn",onClick:()=>{var De,Le,q,L,z,X;l(W.id),h(W.data.workspaceId),m(W.data.type),R(W.data.selector||"body"),x(W.data.templateId||""),w(((De=W.data.creative)==null?void 0:De.title)||""),T(((Le=W.data.creative)==null?void 0:Le.body)||""),j(((q=W.data.creative)==null?void 0:q.cta_text)||"OK"),I(((L=W.data.creative)==null?void 0:L.cta_url)||""),E(((z=W.data.creative)==null?void 0:z.cta_url_text)||"詳細を見る"),P(((X=W.data.creative)==null?void 0:X.image_url)||"")},children:"編集"}),p.jsx("span",{style:{width:8,display:"inline-block"}}),p.jsx("button",{className:"btn btn--danger",onClick:()=>ea(pn(Ne,"actions",W.id)),children:"削除"})]})]},W.id)})})]})]})]})}const i2=["product","blog_post","other"];function s2(){const[t,e]=b.useState([]),[n,r]=b.useState([]),[i,s]=b.useState([]);b.useEffect(()=>{const L=Gt(Kt(Ne,"sites"),Qt("__name__"));return Xt(L,z=>e(z.docs.map(X=>({id:X.id,data:X.data()}))))},[]),b.useEffect(()=>{const L=Gt(Kt(Ne,"actions"),Qt("__name__"));return Xt(L,z=>r(z.docs.map(X=>({id:X.id,data:X.data()}))))},[]),b.useEffect(()=>{const L=Gt(Kt(Ne,"scenarios"),Qt("__name__"));return Xt(L,z=>s(z.docs.map(X=>({id:X.id,data:X.data()}))))},[]);const[o,l]=b.useState(()=>mn("scn")),[u,h]=b.useState(""),[f,m]=b.useState(""),[_,R]=b.useState("New scenario"),[k,x]=b.useState("active"),[C,w]=b.useState(0),[g,T]=b.useState(["other"]),[D,j]=b.useState(3),[U,I]=b.useState(""),[v,E]=b.useState([]),[S,P]=b.useState(null);b.useEffect(()=>{!u&&t.length&&h(t[0].id)},[t,u]),b.useEffect(()=>{var z;const L=t.find(X=>X.id===u);(z=L==null?void 0:L.data)!=null&&z.workspaceId&&m(L.data.workspaceId)},[t,u]);const N=b.useMemo(()=>n.filter(L=>{var z;return((z=L.data)==null?void 0:z.workspaceId)===f}),[n,f]);b.useEffect(()=>{!U&&N.length&&I(N[0].id)},[N,U]);const A=b.useMemo(()=>({page:{page_type_in:g},behavior:{stay_gte_sec:Number(D)},trigger:{type:"stay",ms:Number(D)*1e3}}),[g,D]),W=b.useMemo(()=>({workspaceId:f,siteId:u,name:_,status:k,priority:Number(C),entry_rules:A,actionRefs:(v||[]).map((L,z)=>({actionId:L.actionId,enabled:L.enabled??!0,order:L.order??z}))}),[f,u,_,k,C,A,v]);function ve(L){T(z=>z.includes(L)?z.filter(X=>X!==L):[...z,L])}function De(){U&&E(L=>{const z=[...L||[]];return z.push({actionId:U,enabled:!0,order:z.length}),z})}function Le(L,z){E(X=>{const te=[...X||[]];if(L<0||L>=te.length||z<0||z>=te.length)return te;const[ue]=te.splice(L,1);return te.splice(z,0,ue),te})}async function q(){if(!u)throw new Error("siteId required");if(!f)throw new Error("workspaceId required");await Zo(pn(Ne,"scenarios",o.trim()),W,{merge:!0}),l(mn("scn")),R("New scenario"),x("active"),w(0),T(["other"]),j(3),E([])}return p.jsxs("div",{className:"container",children:[p.jsxs("div",{className:"card",children:[p.jsx("h1",{className:"h1",children:"Scenarios"}),p.jsx("div",{className:"small",children:"“いつ / どのページで / 何を出すか” の定義。Actions は部品、Scenario は出し分けのルール"}),p.jsx("div",{style:{height:14}}),p.jsxs("div",{className:"row",style:{alignItems:"flex-start"},children:[p.jsxs("div",{style:{flex:1,minWidth:320},children:[p.jsx("div",{className:"h2",children:"scenarioId"}),p.jsx("input",{className:"input",value:o,onChange:L=>l(L.target.value)}),p.jsx("div",{style:{height:10}}),p.jsx("div",{className:"h2",children:"siteId"}),p.jsx("select",{className:"input",value:u,onChange:L=>h(L.target.value),children:t.map(L=>p.jsx("option",{value:L.id,children:L.id},L.id))}),p.jsx("div",{style:{height:10}}),p.jsxs("div",{className:"row",children:[p.jsxs("div",{style:{flex:2},children:[p.jsx("div",{className:"h2",children:"name"}),p.jsx("input",{className:"input",value:_,onChange:L=>R(L.target.value)})]}),p.jsxs("div",{style:{flex:1},children:[p.jsx("div",{className:"h2",children:"status"}),p.jsxs("select",{className:"input",value:k,onChange:L=>x(L.target.value),children:[p.jsx("option",{value:"active",children:"active"}),p.jsx("option",{value:"paused",children:"paused"})]})]}),p.jsxs("div",{style:{flex:1},children:[p.jsx("div",{className:"h2",children:"priority"}),p.jsx("input",{className:"input",type:"number",value:C,onChange:L=>w(Number(L.target.value))})]})]}),p.jsx("div",{style:{height:12}}),p.jsx("div",{className:"h2",children:"entry_rules（今は最小セット）"}),p.jsxs("div",{className:"row",children:[i2.map(L=>p.jsxs("label",{className:"badge",style:{cursor:"pointer"},children:[p.jsx("input",{type:"checkbox",checked:g.includes(L),onChange:()=>ve(L)}),L]},L)),p.jsxs("label",{className:"badge",children:["stay_gte_sec",p.jsx("input",{className:"input",style:{width:110,marginLeft:8},type:"number",min:0,value:D,onChange:L=>j(Number(L.target.value))})]})]}),p.jsx("div",{style:{height:12}}),p.jsx("div",{className:"h2",children:"actionRefs（ここが “シナリオのアクション”）"}),p.jsxs("div",{className:"row",children:[p.jsx("select",{className:"input",style:{width:360,maxWidth:"100%"},value:U,onChange:L=>I(L.target.value),children:N.map(L=>{var z,X;return p.jsxs("option",{value:L.id,children:[L.id," — ",((X=(z=L.data)==null?void 0:z.creative)==null?void 0:X.title)||""]},L.id)})}),p.jsx("button",{className:"btn",onClick:De,children:"追加"})]}),p.jsx("div",{style:{height:10}}),(v||[]).length?p.jsxs("table",{className:"table",children:[p.jsx("thead",{children:p.jsxs("tr",{children:[p.jsx("th",{children:"#"}),p.jsx("th",{children:"actionId"}),p.jsx("th",{children:"enabled"}),p.jsx("th",{children:"order"}),p.jsx("th",{})]})}),p.jsx("tbody",{children:(v||[]).map((L,z)=>p.jsxs("tr",{draggable:!0,onDragStart:()=>P(z),onDragOver:X=>X.preventDefault(),onDrop:()=>{S!=null&&(Le(S,z),P(null))},style:{opacity:S===z?.6:1},children:[p.jsx("td",{children:z}),p.jsx("td",{children:p.jsx("code",{children:L.actionId})}),p.jsx("td",{children:p.jsx("input",{type:"checkbox",checked:L.enabled??!0,onChange:X=>E(te=>(te||[]).map((ue,Mt)=>Mt===z?{...ue,enabled:X.target.checked}:ue))})}),p.jsxs("td",{children:[p.jsx("button",{className:"btn",disabled:z===0,onClick:()=>Le(z,z-1),children:"↑"}),p.jsx("span",{style:{width:6,display:"inline-block"}}),p.jsx("button",{className:"btn",disabled:z===(v||[]).length-1,onClick:()=>Le(z,z+1),children:"↓"})]}),p.jsx("td",{children:p.jsx("button",{className:"btn",onClick:()=>E(X=>(X||[]).filter((te,ue)=>ue!==z)),children:"削除"})})]},`${L.actionId}-${z}`))})]}):p.jsx("div",{className:"small",children:"まだ何も追加されてない（これだとSDKに出す actions が空になる）"}),p.jsx("div",{style:{height:14}}),p.jsx("button",{className:"btn btn--primary",onClick:q,children:"保存"})]}),p.jsxs("div",{style:{flex:1,minWidth:320},children:[p.jsx("div",{className:"h2",children:"確認用JSON"}),p.jsx("pre",{style:{margin:0,whiteSpace:"pre-wrap"},children:JSON.stringify(W,null,2)}),p.jsx("div",{style:{height:12}}),p.jsxs("div",{className:"card",style:{background:"rgba(255,255,255,.03)"},children:[p.jsx("div",{className:"h2",children:"このページで“迷子”になりやすい点"}),p.jsxs("ul",{className:"small",children:[p.jsxs("li",{children:[p.jsx("b",{children:"Actions"})," は部品（単体）"]}),p.jsxs("li",{children:[p.jsx("b",{children:"Scenario の actionRefs"})," は「どの部品をどの順番で出すか」"]}),p.jsxs("li",{children:["SDKに返すのはサーバーが actionRefs を join して作る ",p.jsx("code",{children:"scenario.actions"})]})]})]})]})]})]}),p.jsx("div",{style:{height:14}}),p.jsxs("div",{className:"card",children:[p.jsx("div",{className:"h2",children:"一覧"}),p.jsxs("table",{className:"table",children:[p.jsx("thead",{children:p.jsxs("tr",{children:[p.jsx("th",{children:"ID"}),p.jsx("th",{children:"siteId"}),p.jsx("th",{children:"name"}),p.jsx("th",{children:"status"}),p.jsx("th",{children:"priority"}),p.jsx("th",{children:"actions"}),p.jsx("th",{})]})}),p.jsx("tbody",{children:i.map(L=>p.jsxs("tr",{children:[p.jsx("td",{children:p.jsx("code",{children:L.id})}),p.jsx("td",{children:p.jsx("code",{children:L.data.siteId})}),p.jsx("td",{children:L.data.name}),p.jsx("td",{children:L.data.status}),p.jsx("td",{children:L.data.priority??0}),p.jsx("td",{children:(L.data.actionRefs||[]).length}),p.jsxs("td",{children:[p.jsx("button",{className:"btn",onClick:()=>{var z,X,te,ue;l(L.id),h(L.data.siteId),m(L.data.workspaceId),R(L.data.name),x(L.data.status),w(Number(L.data.priority??0)),T(((X=(z=L.data.entry_rules)==null?void 0:z.page)==null?void 0:X.page_type_in)||["other"]),j(Number(((ue=(te=L.data.entry_rules)==null?void 0:te.behavior)==null?void 0:ue.stay_gte_sec)??3)),E(L.data.actionRefs||[])},children:"編集"}),p.jsx("span",{style:{width:8,display:"inline-block"}}),p.jsx("button",{className:"btn btn--danger",onClick:()=>ea(pn(Ne,"scenarios",L.id)),children:"削除"})]})]},L.id))})]})]})]})}const en={modal:{html:`
<div class="cx-overlay" data-cx-close>
  <div class="cx-modal" role="dialog" aria-modal="true">
    {{#if image_url}}<img class="cx-image" src="{{image_url}}" alt="{{title}}" />{{/if}}
    {{#if title}}<div class="cx-header">{{title}}</div>{{/if}}
    {{#if body}}<div class="cx-body">{{body}}</div>{{/if}}
    <div class="cx-footer">
      {{#if cta_url}}<a class="cx-btn cx-btn--ghost" href="{{cta_url}}" target="_blank" rel="noopener">{{cta_url_text}}</a>{{/if}}
      <button class="cx-btn cx-btn--primary" data-cx-close>{{cta_text}}</button>
    </div>
  </div>
</div>
`.trim(),css:`
.cx-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2147483646;display:flex;align-items:center;justify-content:center;}
.cx-modal{background:#fff;width:min(520px,92vw);border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.25);font-family:system-ui,-apple-system,Segoe UI,Roboto;}
.cx-image{width:100%;max-height:260px;object-fit:cover;display:block;}
.cx-header{padding:18px 20px 8px;font-weight:700;font-size:18px;}
.cx-body{padding:0 20px 16px;font-size:14px;white-space:pre-wrap;}
.cx-footer{padding:0 20px 20px;display:flex;justify-content:flex-end;gap:10px;}
.cx-btn{border:0;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;}
.cx-btn--primary{background:#111;color:#fff;}
.cx-btn--ghost{background:#eee;color:#111;}
`.trim()},banner:{html:`
<div class="cx-banner" data-cx-close>
  <div class="cx-banner__inner">
    <div class="cx-banner__text">
      {{title}}
    </div>
    {{#if cta_url}}<a class="cx-btn cx-btn--ghost" href="{{cta_url}}" target="_blank" rel="noopener">{{cta_url_text}}</a>{{/if}}
    <button class="cx-btn cx-btn--primary" data-cx-close>{{cta_text}}</button>
  </div>
</div>
`.trim(),css:`
.cx-banner{position:fixed;left:12px;right:12px;bottom:12px;background:#111;color:#fff;border-radius:14px;z-index:2147483646;box-shadow:0 18px 40px rgba(0,0,0,.25);}
.cx-banner__inner{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:14px;}
.cx-banner__text{font-weight:700;}
.cx-btn{border:0;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;}
.cx-btn--primary{background:#fff;color:#111;}
.cx-btn--ghost{background:rgba(255,255,255,.15);color:#fff;}
`.trim()},toast:{html:`
<div class="cx-toast" data-cx-close>
  <div class="cx-toast__title">{{title}}</div>
  {{#if body}}<div class="cx-toast__body">{{body}}</div>{{/if}}
  <div class="cx-toast__footer">
    {{#if cta_url}}<a class="cx-btn cx-btn--ghost" href="{{cta_url}}" target="_blank" rel="noopener">{{cta_url_text}}</a>{{/if}}
    <button class="cx-btn cx-btn--primary" data-cx-close>{{cta_text}}</button>
  </div>
</div>
`.trim(),css:`
.cx-toast{position:fixed;right:12px;bottom:12px;max-width:min(420px,92vw);background:#111;color:#fff;border-radius:14px;z-index:2147483646;box-shadow:0 18px 40px rgba(0,0,0,.25);padding:14px;font-family:system-ui,-apple-system,Segoe UI,Roboto;}
.cx-toast__title{font-weight:800;margin-bottom:6px;}
.cx-toast__body{opacity:.9;white-space:pre-wrap;margin-bottom:10px;}
.cx-toast__footer{display:flex;gap:10px;justify-content:flex-end;}
.cx-btn{border:0;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;}
.cx-btn--primary{background:#fff;color:#111;}
.cx-btn--ghost{background:rgba(255,255,255,.15);color:#fff;}
`.trim()}};function o2(){const[t,e]=b.useState([]),[n,r]=b.useState([]);b.useEffect(()=>{const g=Gt(Kt(Ne,"workspaces"),Qt("__name__"));return Xt(g,T=>e(T.docs.map(D=>({id:D.id}))))},[]),b.useEffect(()=>{const g=Gt(Kt(Ne,"templates"),Qt("__name__"));return Xt(g,T=>r(T.docs.map(D=>({id:D.id,data:D.data()}))))},[]);const[i,s]=b.useState(()=>mn("tpl")),[o,l]=b.useState(""),[u,h]=b.useState("modal"),[f,m]=b.useState("Default"),[_,R]=b.useState(en.modal.html),[k,x]=b.useState(en.modal.css);b.useEffect(()=>{!o&&t.length&&l(t[0].id)},[t,o]),b.useEffect(()=>{R(g=>g||en[u].html),x(g=>g||en[u].css)},[u]);const C=b.useMemo(()=>({workspaceId:o,type:u,name:f.trim()||"Template",html:_,css:k}),[o,u,f,_,k]);async function w(){if(!o)throw new Error("workspaceId required");await Zo(pn(Ne,"templates",i.trim()),C,{merge:!0}),s(mn("tpl")),m("Default"),R(en.modal.html),x(en.modal.css),h("modal")}return p.jsxs("div",{className:"container",children:[p.jsxs("div",{className:"card",children:[p.jsx("h1",{className:"h1",children:"Templates"}),p.jsx("div",{className:"small",children:"モーダル/バナー/トーストの HTML/CSS を管理。Action から templateId を選ぶと SDK 側でこのテンプレが使われる。"}),p.jsx("div",{style:{height:14}}),p.jsxs("div",{className:"row",style:{alignItems:"flex-start"},children:[p.jsxs("div",{style:{flex:1,minWidth:280},children:[p.jsx("div",{className:"h2",children:"templateId"}),p.jsx("input",{className:"input",value:i,onChange:g=>s(g.target.value)}),p.jsx("div",{style:{height:10}}),p.jsx("div",{className:"h2",children:"workspaceId"}),p.jsx("select",{className:"input",value:o,onChange:g=>l(g.target.value),children:t.map(g=>p.jsx("option",{value:g.id,children:g.id},g.id))}),p.jsx("div",{style:{height:10}}),p.jsxs("div",{className:"row",children:[p.jsxs("div",{style:{flex:1},children:[p.jsx("div",{className:"h2",children:"type"}),p.jsxs("select",{className:"input",value:u,onChange:g=>{const T=g.target.value;h(T),R(en[T].html),x(en[T].css)},children:[p.jsx("option",{value:"modal",children:"modal"}),p.jsx("option",{value:"banner",children:"banner"}),p.jsx("option",{value:"toast",children:"toast"})]})]}),p.jsxs("div",{style:{flex:2},children:[p.jsx("div",{className:"h2",children:"name"}),p.jsx("input",{className:"input",value:f,onChange:g=>m(g.target.value)})]})]}),p.jsx("div",{style:{height:10}}),p.jsx("div",{className:"h2",children:"HTML"}),p.jsx("textarea",{className:"input",style:{minHeight:240,fontFamily:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"},value:_,onChange:g=>R(g.target.value)}),p.jsxs("div",{className:"small",children:["対応変数：title / body / image_url / cta_text / cta_url / cta_url_text。 ",p.jsx("code",{children:"{{#if key}}...{{/if}}"})," も使える。"]}),p.jsx("div",{style:{height:10}}),p.jsx("div",{className:"h2",children:"CSS"}),p.jsx("textarea",{className:"input",style:{minHeight:180,fontFamily:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"},value:k,onChange:g=>x(g.target.value)}),p.jsx("div",{style:{height:14}}),p.jsx("button",{className:"btn btn--primary",onClick:w,children:"保存"})]}),p.jsxs("div",{style:{flex:1,minWidth:280},children:[p.jsx("div",{className:"h2",children:"プレビュー（JSON）"}),p.jsx("pre",{style:{margin:0,whiteSpace:"pre-wrap"},children:JSON.stringify(C,null,2)})]})]})]}),p.jsx("div",{style:{height:14}}),p.jsxs("div",{className:"card",children:[p.jsx("div",{className:"h2",children:"一覧"}),p.jsxs("table",{className:"table",children:[p.jsx("thead",{children:p.jsxs("tr",{children:[p.jsx("th",{children:"ID"}),p.jsx("th",{children:"workspaceId"}),p.jsx("th",{children:"type"}),p.jsx("th",{children:"name"}),p.jsx("th",{})]})}),p.jsx("tbody",{children:n.map(g=>p.jsxs("tr",{children:[p.jsx("td",{children:p.jsx("code",{children:g.id})}),p.jsx("td",{children:p.jsx("code",{children:g.data.workspaceId})}),p.jsx("td",{children:g.data.type}),p.jsx("td",{children:g.data.name}),p.jsxs("td",{children:[p.jsx("button",{className:"btn",onClick:()=>{s(g.id),l(g.data.workspaceId),h(g.data.type),m(g.data.name||"Template"),R(g.data.html||en[g.data.type].html),x(g.data.css||en[g.data.type].css)},children:"編集"}),p.jsx("span",{style:{width:8,display:"inline-block"}}),p.jsx("button",{className:"btn btn--danger",onClick:()=>ea(pn(Ne,"templates",g.id)),children:"削除"})]})]},g.id))})]})]})]})}function a2(){return p.jsx("div",{className:"container",children:p.jsxs("div",{className:"card",style:{maxWidth:520,margin:"60px auto"},children:[p.jsx("h1",{className:"h1",children:"cx-platform admin"}),p.jsx("p",{className:"small",children:"Google アカウントでログイン（Firestore rules はログイン必須になっています）"}),p.jsx("div",{style:{height:12}}),p.jsx("button",{className:"btn btn--primary",onClick:()=>UC(ud,ZD),children:"Googleでログイン"})]})})}function l2(){const[t,e]=b.useState(!1),[n,r]=b.useState(null);b.useEffect(()=>_C(ud,s=>{r(s?{email:s.email}:null),e(!0)}),[]);const i=b.useMemo(()=>!!n,[n]);return t?i?p.jsxs(p.Fragment,{children:[p.jsxs("div",{className:"nav",children:[p.jsxs("div",{className:"row",children:[p.jsx(Vs,{to:"/workspaces",children:"Workspaces"}),p.jsx(Vs,{to:"/sites",children:"Sites"}),p.jsx(Vs,{to:"/actions",children:"Actions"}),p.jsx(Vs,{to:"/templates",children:"Templates"}),p.jsx(Vs,{to:"/scenarios",children:"Scenarios"})]}),p.jsxs("div",{className:"row",children:[p.jsx("span",{className:"badge",children:n==null?void 0:n.email}),p.jsx("button",{className:"btn",onClick:()=>vC(ud),children:"Logout"})]})]}),p.jsxs(FR,{children:[p.jsx(Kn,{path:"/",element:p.jsx(Tg,{to:"/workspaces",replace:!0})}),p.jsx(Kn,{path:"/workspaces",element:p.jsx(e2,{})}),p.jsx(Kn,{path:"/sites",element:p.jsx(t2,{})}),p.jsx(Kn,{path:"/actions",element:p.jsx(r2,{})}),p.jsx(Kn,{path:"/templates",element:p.jsx(o2,{})}),p.jsx(Kn,{path:"/scenarios",element:p.jsx(s2,{})}),p.jsx(Kn,{path:"*",element:p.jsx(Tg,{to:"/workspaces",replace:!0})})]})]}):p.jsx(a2,{}):null}zc.createRoot(document.getElementById("root")).render(p.jsx(t_.StrictMode,{children:p.jsx(GR,{children:p.jsx(l2,{})})}));
