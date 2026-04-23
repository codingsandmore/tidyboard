import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: [{"revision":null,"url":"/_next/static/media/favicon.0x3dzn~oxb6tn.ico"},{"revision":null,"url":"/_next/static/chunks/turbopack-0hh1u0.ji1w51.js"},{"revision":null,"url":"/_next/static/chunks/168s~1h8geg9c.js"},{"revision":null,"url":"/_next/static/chunks/15pjn.n4_q6le.js"},{"revision":null,"url":"/_next/static/chunks/1336.y7fbr33h.js"},{"revision":null,"url":"/_next/static/chunks/12~335iorn_1b.js"},{"revision":null,"url":"/_next/static/chunks/12gi8rv5dauv~.js"},{"revision":null,"url":"/_next/static/chunks/11ysmkvqf9_f9.js"},{"revision":null,"url":"/_next/static/chunks/119-pu3gjlqfo.js"},{"revision":null,"url":"/_next/static/chunks/0xpp3_8ncpdho.js"},{"revision":null,"url":"/_next/static/chunks/0xog07c7bus.5.js"},{"revision":null,"url":"/_next/static/chunks/0ufqinr3-pusy.js"},{"revision":null,"url":"/_next/static/chunks/0ucsvfntgql7w.js"},{"revision":null,"url":"/_next/static/chunks/0t7o8hwx6n9lf.js"},{"revision":null,"url":"/_next/static/chunks/0rapai07bz3j1.js"},{"revision":null,"url":"/_next/static/chunks/0q.jm5uv~jc-n.js"},{"revision":null,"url":"/_next/static/chunks/0pve5jy796bml.js"},{"revision":null,"url":"/_next/static/chunks/0pqt~8bl3ukh4.js"},{"revision":null,"url":"/_next/static/chunks/0pb~4h2ev5-d0.js"},{"revision":null,"url":"/_next/static/chunks/0os-say4i21vd.js"},{"revision":null,"url":"/_next/static/chunks/0ob-8bwof-gtd.js"},{"revision":null,"url":"/_next/static/chunks/0n~dq4kpx9xxx.js"},{"revision":null,"url":"/_next/static/chunks/0mzsyf.a3pes0.js"},{"revision":null,"url":"/_next/static/chunks/0mv3_k~pzh1e~.css"},{"revision":null,"url":"/_next/static/chunks/0l75onnv-4hab.js"},{"revision":null,"url":"/_next/static/chunks/0ka7446-~l5s..js"},{"revision":null,"url":"/_next/static/chunks/0ka051yepewro.js"},{"revision":null,"url":"/_next/static/chunks/0k_uscz.x59e7.js"},{"revision":null,"url":"/_next/static/chunks/0fxgycs4liyc4.js"},{"revision":null,"url":"/_next/static/chunks/0fszso0~t00-h.js"},{"revision":null,"url":"/_next/static/chunks/0eiky-nsho.l9.js"},{"revision":null,"url":"/_next/static/chunks/0e01afqcwpkk3.js"},{"revision":null,"url":"/_next/static/chunks/0d3shmwh5_nmn.js"},{"revision":null,"url":"/_next/static/chunks/0all4h5gdnghh.js"},{"revision":null,"url":"/_next/static/chunks/09q2v~t_d0c4~.js"},{"revision":null,"url":"/_next/static/chunks/0690__gznr1em.js"},{"revision":null,"url":"/_next/static/chunks/03~yq9q893hmn.js"},{"revision":null,"url":"/_next/static/chunks/03n_yfyzxhiig.js"},{"revision":null,"url":"/_next/static/chunks/02tugujpi.g~i.js"},{"revision":null,"url":"/_next/static/chunks/01xlw8hd842-c.js"},{"revision":null,"url":"/_next/static/chunks/01j0buri8iicr.js"},{"revision":null,"url":"/_next/static/chunks/018zu55y7gika.js"},{"revision":null,"url":"/_next/static/S9udy1eXA0qH404iU9-WL/_ssgManifest.js"},{"revision":null,"url":"/_next/static/S9udy1eXA0qH404iU9-WL/_clientMiddlewareManifest.js"},{"revision":null,"url":"/_next/static/S9udy1eXA0qH404iU9-WL/_buildManifest.js"},{"revision":"a2760511c65806022ad20adf74370ff3","url":"/window.svg"},{"revision":"c0af2f507b369b085b35ef4bbe3bcf1e","url":"/vercel.svg"},{"revision":"8e061864f388b47f33a1c3780831193e","url":"/next.svg"},{"revision":"f641519b295349527f41838b1c347909","url":"/manifest.webmanifest"},{"revision":"2aaafa6a49b6563925fe440891e32717","url":"/globe.svg"},{"revision":"d09f95206c3fa0bb9bd9fefabfd0ea71","url":"/file.svg"}],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
