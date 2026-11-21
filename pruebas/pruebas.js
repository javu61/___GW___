// pruebas/Pruebas.js — Pestaña «Pruebas» del diseñador
// ================================================================================================
// PROPÓSITO
//   Reúne en una pestaña del navegador (VISIBLE SOLO CON GW_DEBUG, index.html) comprobaciones
//   que hasta ahora solo se lanzaban por consola con Node+Playwright: la parte de CRC/lector
//   GWC de pruebas/pruebasF5I14.js y la parte de DATOS de pruebas/equivalenciaGWC.js. Cada
//   prueba es un botón que corre AQUÍ, sobre los módulos ya cargados, y pinta el resultado
//   en la propia pestaña; nada toca el cartucho en edición, todo es de solo lectura.
//
//   La comparación JUEGO tick a tick sigue en pruebas/equivalenciaGWC.js: necesita sustituir
//   el reloj del motor ANTES de que la página cargue, y eso no puede hacerlo una pestaña que
//   nace con la página ya arriba.
//
// PRUEBAS
//   CRC y lector del GWC            Autónoma: monta un cartucho mínimo propio y comprueba el
//                                   CRC-16/CCITT-FALSE (vector, detección de intercambios) y
//                                   los errores claros del lector ante datos fuera de rango.
//   ColorFondo en el GWC            Autónoma: fondo por defecto, viaje del ColorFondo y huella
//                                   en el Código GWC.
//   Equivalencia GWC↔GWI (datos)    Pide un GWI cargado: genera el GWC del cartucho en
//                                   memoria y compara la configuración y cada campo de cada
//                                   segmento con lo que leerGWC devuelve.
//   Equivalencia (variante)         Lo mismo declarando además rutas, aceleración, pausas y
//                                   regla «combinar» (la VARIANTE=1 de equivalenciaGWC.js).
//
// FUNCIONES
//   _$                         Un elemento del DOM por id.
//   _linea                     Una línea (clase + texto) en la salida de la pestaña; las
//                              clases la pintan verde, roja o de aviso (estilos.css).
//   _ok / _mal                 Las líneas OK y FALLO del resultado.
//   _igual / _nz / _nn         Comparación JSON y normalización de lo indefinido a null.
//   cartuchoLaboratorio        Monta un cartucho mínimo propio (2 sprites, 3 segmentos,
//                              pantalla 100×80 sin escalar), independiente de lo cargado.
//   crc16                      CRC-16/CCITT-FALSE calculado de forma independiente.
//   codigoCRC                  El Código GWC «#HHHH#» que corresponde a un fichero.
//   _pruebaCrcYLector          PRUEBA 1 «CRC y lector del GWC»: se genera y se lee, el
//                              CRC frente al cálculo independiente (vector y módulo),
//                              detección de intercambios y errores claros del lector
//                              ante datos fuera de rango (F5-I14).
//   _pruebaColorFondo          PRUEBA 2 «ColorFondo en el GWC»: fondo por defecto,
//                              viaje del ColorFondo y huella en el Código (F5-I14).
//   _prepararEquivalencia      El GWI en memoria + el GWC que sale de él, releído;
//                              null si no hay GWI cargado (lo avisa el lanzador).
//   _diferenciasEquivalencia   Configuración y campo a campo de cada segmento: GWI ↔ GWC
//                              (solo los que viajan: sin tipo 99 ni fusionados).
//   _pruebaEquivalencia        PRUEBAS 3 y 4 «Equivalencia (datos)» y «(variante
//                              declarada)»: sin diferencias = IGUALES (F5-I13).
//   PRUEBAS                    El catálogo: id, nombre y ejecutor de cada prueba.
//   _lanzar                    Lanza una prueba, pinta línea a línea y cierra con el
//                              resumen (N OK, M fallo(s) y tiempo).
//   inicializar                Con GW_DEBUG activo: descubre la pestaña y crea un botón
//                              por prueba. Público: único punto de arranque del módulo, lo
//                              llama el propio script al cargar.
//
// USO
//   Abrir index.html con GW_DEBUG = true y entrar en la pestaña Pruebas.
// ================================================================================================
'use strict';

var Pruebas = (function () {

  const ID_PESTANA = 'pesPruebas';
  const ID_BARRA = 'barraPruebas';
  const ID_SALIDA = 'salidaPruebas';

  /* ---------------- Utilidades del DOM y del resultado ---------------- */

  function _$(id) { return document.getElementById(id); }

  function _linea(clase, texto) {
    const d = document.createElement('div');
    d.className = 'pruebaLinea ' + clase;
    d.textContent = texto;
    _$(ID_SALIDA).appendChild(d);
    return d;
  }

  const _ok = (nombre, detalle) => _linea('pruebaOk', 'OK    ' + nombre +
    (detalle ? ' \u2014 ' + detalle : ''));
  const _mal = (nombre, detalle) => _linea('pruebaMal', 'FALLO ' + nombre +
    (detalle ? ' \u2014 ' + detalle : ''));

  const _igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const _nz = (o) => (o === undefined ? null : o);
  const _nn = (v) => (v === undefined || v === null) ? null : Number(v);

  /* ---------------- Montaje de un cartucho mínimo de laboratorio ---------------- */

  /**
   * Cartucho de laboratorio (montaje de pruebas/pruebasF5I14.js): 2 sprites y
   * 3 segmentos, pantalla 100×80 sin escalar. Lo usan las pruebas que no
   * dependen del cartucho cargado, sin tocar nada del diseñador.
   * @returns {{json:Object, sprites:Array, pantalla:Object}} Los tres argumentos
   *          de BaseCartucho.generarGWC.
   */
  function cartuchoLaboratorio() {
    const mk = (w, h) => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d');
      g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
      return c;
    };
    const sprites = [
      { id: 'img_000', ancho: 8, alto: 8, imagen: mk(8, 8) },
      { id: 'img_001', ancho: 8, alto: 8, imagen: mk(8, 8) }
    ];
    const json = {
      tipo: 'GWI', version: 1, nombre: 'p', estilo: '4',
      resolucion: { ancho: 100, alto: 80 },
      sprites: sprites.map(s => ({ id: s.id, ancho: 8, alto: 8, fichero: 'segmentos/' + s.id + '.png' })),
      segmentos: [
        { id: 'seg_000', tipo: 1, x: 0, y: 0, sprite: 'img_000', siguiente: 'seg_001' },
        { id: 'seg_001', tipo: 1, x: 10, y: 0, sprite: 'img_001' },
        { id: 'seg_002', tipo: 1, x: 20, y: 0, sprite: 'img_001' }
      ],
      secuencia: { ticks: 2, segmentos: ['seg_000', 'seg_001'] },
      fin: { mecanismo: 'vida' }
    };
    const pantalla = { ancho: 100, alto: 80, fuente: { ancho: 100, alto: 80 } };
    return { json: json, sprites: sprites, pantalla: pantalla };
  }

  /** CRC-16/CCITT-FALSE calculado de forma independiente (para contrastar). */
  function crc16(bytes) {
    let c = 0xFFFF;
    for (const x of bytes) {
      c ^= x << 8;
      for (let k = 0; k < 8; k++) c = (c & 0x8000) ? ((c << 1) ^ 0x1021) & 0xFFFF : (c << 1) & 0xFFFF;
    }
    return c;
  }

  /** Código GWC «#HHHH#» que corresponde a un fichero ya generado. */
  function codigoCRC(bytes) {
    return '#' + crc16(bytes.subarray(14)).toString(16).toUpperCase().padStart(4, '0') + '#';
  }

  /* ---------------- PRUEBA 1: CRC y lector del GWC (F5-I14) ---------------- */
  /* Portada de pruebas/pruebasF5I14.js: (1) se genera y se lee; (2) el CRC detecta
     el intercambio de dos bytes del cuerpo con la misma suma aditiva; (3) el CRC del
     módulo coincide con el cálculo independiente y con el vector «123456789»;
     (4) corrompiendo campo a campo (con el CRC reparado, para que lo único que
     falle sea la validación nueva) el lector da errores claros.                    */

  function _pruebaCrcYLector() {
    const out = [];
    const ok = (n, c, x) => out.push([n, !!c, x === undefined ? '' : String(x)]);
    const { json: j, sprites, pantalla: pant } = cartuchoLaboratorio();

    const g0 = BaseCartucho.generarGWC(j, sprites, pant);
    ok('GWC genera y se lee', BaseCartucho.leerGWC(g0.bytes).segmentos.length === 3);

    const b = g0.bytes.slice();
    let i1 = -1, i2 = -1;
    for (let i = 14; i < b.length && i2 < 0; i++)
      for (let k = i + 1; k < b.length; k++) if (b[i] !== b[k]) { i1 = i; i2 = k; break; }
    const t = b[i1]; b[i1] = b[i2]; b[i2] = t;
    let msg = ''; try { BaseCartucho.leerGWC(b); } catch (e) { msg = e.message; }
    ok('CRC detecta bytes intercambiados (la suma aditiva no)', /CRC/.test(msg), msg);

    ok('fondo por defecto blanco', BaseCartucho.leerGWC(g0.bytes).fondo === '#FFFFFF');
    ok('CRC del test = CRC del módulo', g0.codigo === codigoCRC(g0.bytes), g0.codigo);
    ok('vector 123456789 = 0x29B1',
      crc16(new TextEncoder().encode('123456789')) === 0x29B1);

    const reparar = (bytes) => {
      const txt = codigoCRC(bytes);
      for (let k = 0; k < 6; k++) bytes[4 + k] = txt.charCodeAt(k);
      return bytes;
    };
    const falla = (nombre, mut, re) => {
      const c = g0.bytes.slice(); mut(c); reparar(c);
      let m = ''; try { BaseCartucho.leerGWC(c); } catch (e) { m = e.message; }
      ok(nombre, re.test(m), m || '(no falló)');
    };
    const dv = new DataView(g0.bytes.buffer);
    const dir = (n) => dv.getUint32(14 + 5 + 11 + n * 4, true);
    const regSeg0 = dir(3) + 5;
    falla('sprite fuera de rango', c => { c[regSeg0 + 5] = 9; }, /sprite 9/);
    falla('enlace fuera de rango', c => { c[regSeg0 + 6] = 50; }, /segmento 50/);
    const secIni = dir(4) + 5;
    falla('Secuencia con segmento fuera de rango', c => { c[secIni + 1] = 77; },
      /Secuencia usa el segmento 77/);
    const cfgIni = dir(1) + 5;
    falla('mecanismo de fin desconocido', c => { c[cfgIni + 12] = 9; c[cfgIni + 13] = 0; },
      /fin desconocido/);
    falla('tabla de sprites que no cabe', c => { c[14 + 5 + 5] = 250; }, /sprite|segmento/);
    return out;
  }

  /* ---------------- PRUEBA 2: ColorFondo en el GWC (F5-I14) ---------------- */
  /* Portada de pruebas/pruebasF5I14.js: el fondo por defecto es blanco, el
     ColorFondo viaja al GWC y cambia el Código GWC. Solo la parte del GWC:
     lo que toca la ficha o el canvas pertenece al diseñador y aquí no se toca. */

  function _pruebaColorFondo() {
    const out = [];
    const ok = (n, c, x) => out.push([n, !!c, x === undefined ? '' : String(x)]);
    const { json: j, sprites, pantalla: pant } = cartuchoLaboratorio();

    const g0 = BaseCartucho.generarGWC(j, sprites, pant);
    const g1 = BaseCartucho.generarGWC(Object.assign({}, j, { ColorFondo: '#336699' }),
      sprites, pant);
    const l1 = BaseCartucho.leerGWC(g1.bytes);
    ok('ColorFondo viaja al GWC', l1.fondo === '#336699', l1.fondo);
    ok('ColorFondo cambia el código del GWC', g0.codigo !== g1.codigo,
      g0.codigo + ' / ' + g1.codigo);
    return out;
  }

  /* ---------------- PRUEBAS 3 y 4: equivalencia GWI↔GWC (datos, F5-I13) ---------------- */
  /* Portada de la parte DATOS de pruebas/equivalenciaGWC.js: genera el GWC del
     cartucho en memoria (sin escalar, pantalla = fuente), lo relee y compara la
     configuración y cada campo de cada segmento. La VARIANTE añade lo que el
     cartucho de ejemplo no usa (rutas, aceleración, pausas, combinar) para
     comprobar que también viajan los valores declarados.                      */

  function _prepararEquivalencia(variante) {
    const j0 = BaseDirector.datosCartucho();
    if (!j0 || j0.tipo !== 'GWI') return null;
    const j = JSON.parse(JSON.stringify(j0));
    if (variante) {
      j.rutas = { aumentarCada: 3 };
      j.aceleracion = { cada: 5, resta: 20, minimo: 100 };
      j.pausas = { simulador: 300, externo: 250 };
      j.combinar = true;
    }
    const pantalla = {
      ancho: j.resolucion.ancho, alto: j.resolucion.alto,
      fuente: { ancho: j.resolucion.ancho, alto: j.resolucion.alto }
    };
    const gwc = BaseCartucho.generarGWC(j, BaseDescomponer.sprites(), pantalla);
    return { json: j, leido: BaseCartucho.leerGWC(gwc.bytes), gwc: gwc };
  }

  function _diferenciasEquivalencia(j, l) {
    const d = [];
    const cmpVal = (etiqueta, a, b) => {
      if (!_igual(_nz(a), _nz(b)))
        d.push(etiqueta + ': GWI=' + JSON.stringify(a) + ' GWC=' + JSON.stringify(b));
    };
    cmpVal('pausas.simulador', j.pausas && j.pausas.simulador, l.pausas && l.pausas.simulador);
    cmpVal('pausas.externo', j.pausas && j.pausas.externo, l.pausas && l.pausas.externo);
    cmpVal('aceleracion', j.aceleracion, l.aceleracion);
    cmpVal('rutas.aumentarCada', j.rutas && j.rutas.aumentarCada, l.rutas && l.rutas.aumentarCada);
    cmpVal('fin.mecanismo', j.fin && j.fin.mecanismo, l.fin && l.fin.mecanismo);
    cmpVal('fin.contador', j.fin && j.fin.contador, l.fin && l.fin.contador);
    if (!!j.combinar !== !!l.combinar)
      d.push('combinar: GWI=' + !!j.combinar + ' GWC=' + !!l.combinar);

    const viaja = j.segmentos.filter(s => s.tipo !== 99 && !s.fusionadoPor);
    if (viaja.length !== l.segmentos.length)
      d.push('nº de segmentos: GWI=' + viaja.length + ' GWC=' + l.segmentos.length);
    const idx = new Map(viaja.map((s, i) => [s.id, i]));
    const enlace = (id) => (id === undefined || id === null) ? null :
      (idx.has(id) ? idx.get(id) : 'x:' + id);
    const ENL = ['siguiente', 'salvado', 'muerte', 'mostrarJunto', 'izquierda', 'derecha',
      'arriba', 'abajo', 'colision', 'barra_a', 'barra_b', 'barra_c', 'barra_d', 'barra_e',
      'barra_f', 'barra_g', 'digito_1', 'digito_2', 'digito_3', 'digito_4'];
    viaja.forEach((s, i) => {
      const g = l.segmentos[i];
      if (!g) return;
      const cmp = (campo, a, b) => cmpVal(s.id + '.' + campo, a, b);
      cmp('tipo', s.tipo, g.tipo); cmp('x', s.x, g.x); cmp('y', s.y, g.y);
      for (const c of ENL)
        cmp(c, enlace(s[c]), enlace(g[c]) === null ? null :
          g[c] === undefined ? null : parseInt(String(g[c]).replace(/\D/g, ''), 10));
      cmp('salvadoContador', _nn(s.salvadoContador), g.salvadoContador);
      cmp('muerteContador', _nn(s.muerteContador), g.muerteContador);
      cmp('contadorInterno', s.contadorInterno, g.contadorInterno);
      cmp('ruta', s.ruta, g.ruta);
      cmp('primero', !!s.primero, !!g.primero);
      if (s.tipo === 3 || s.tipo === 4) cmp('contador (orden de la familia)', s.contador, g.contador);
      if (s.tipo === 6) {
        cmp('valorInicial', s.valorInicial || 0, g.valorInicial || 0);
        cmp('direccion', s.direccion === 'descendente', g.direccion === 'descendente');
        cmp('presentarCero', s.presentarCero !== false, g.presentarCero !== false);
      }
    });
    return d;
  }

  function _pruebaEquivalencia(variante) {
    const out = [];
    const preparado = _prepararEquivalencia(variante);
    if (!preparado) return null;           // lo avisa el lanzador, sin fallo
    const difs = _diferenciasEquivalencia(preparado.json, preparado.leido);
    out.push(['equivalencia de datos' + (variante ? ' (variante)' : ''),
    difs.length === 0,
    difs.slice(0, 40).join(' || ')]);
    if (difs.length > 40) out.push(['(resto de diferencias omitidas)', true,
      (difs.length - 40) + ' más']);
    return out;
  }

  /* ---------------- Catálogo y lanzador ---------------- */

  const PRUEBAS = [
    {
      id: 'crcLector', nombre: 'CRC y lector del GWC', necesita: null,
      ejecutar: () => _pruebaCrcYLector()
    },
    {
      id: 'colorFondo', nombre: 'ColorFondo en el GWC', necesita: null,
      ejecutar: () => _pruebaColorFondo()
    },
    {
      id: 'equivalencia', nombre: 'Equivalencia GWC↔GWI (datos)', necesita: null,
      ejecutar: () => _pruebaEquivalencia(false)
    },
    {
      id: 'equivalenciaVariante', nombre: 'Equivalencia (variante declarada)', necesita: null,
      ejecutar: () => _pruebaEquivalencia(true)
    }
  ];

  /**
   * Lanza una prueba del catálogo: deshabilita los botones mientras corre,
   * limpia la salida, la ejecuta y determina el resultado final.
   * Una prueba devuelve null cuando NO TIENE LOS DATOS que necesita
   * (aviso, no fallo); sinónimo de array de [nombre, ok, detalle].
   * @param {number} indice - Posición en el catálogo PRUEBAS.
   * @returns {Promise<void>}
   */
  async function _lanzar(indice) {
    const prueba = PRUEBAS[indice];
    for (const b of _$(ID_BARRA).querySelectorAll('button')) b.disabled = true;
    _$(ID_SALIDA).innerHTML = '';
    _linea('pruebaTitulo', prueba.nombre);
    const t0 = performance.now();
    try {
      const res = await Promise.resolve().then(prueba.ejecutar);
      if (res === null) {
        _linea('pruebaAviso',
          'Esta prueba necesita un GWI cargado (pestaña Cartucho o Editor).');
      } else {
        let fallos = 0;
        for (const [n, c, x] of res) { (c ? _ok : _mal)(n, x); if (!c) fallos++; }
        _linea(fallos === 0 ? 'pruebaFinOk' : 'pruebaFinMal',
          (res.length - fallos) + ' OK, ' + fallos + ' fallo(s) \u2014 ' +
          Math.round(performance.now() - t0) + ' ms');
      }
    } catch (e) {
      _mal('la prueba lanzó una excepción', e && e.message);
      console.error('[Pruebas] ' + prueba.id + ':', e);
    } finally {
      for (const b of _$(ID_BARRA).querySelectorAll('button')) b.disabled = false;
    }
  }

  /**
   * Construye los botones de la pestaña y quita el oculto a la pestaña si
   * GW_DEBUG está activo (index.html); con debug apagado no hace nada: la
   * pestaña queda oculta y no se carga ninguna comprobación. Lo llama la
   * propia página al cargar el script (va al final del body).
   * @returns {void}
   */
  function inicializar() {
    if (!(typeof GW_DEBUG !== 'undefined' && GW_DEBUG)) return;
    if (!(_$(ID_PESTANA) && _$(ID_BARRA) && _$(ID_SALIDA))) {
      console.error('[Pruebas] index.html desactualizado: faltan ' + ID_PESTANA +
        ', ' + ID_BARRA + ' o ' + ID_SALIDA + '.');
      return;
    }
    _$(ID_PESTANA).classList.remove('oculto');
    for (let i = 0; i < PRUEBAS.length; i++) {
      const btn = document.createElement('button');
      btn.textContent = PRUEBAS[i].nombre;
      if (PRUEBAS[i].necesita) btn.title = 'Necesita ' + PRUEBAS[i].necesita;
      btn.addEventListener('click', () => _lanzar(i));
      _$(ID_BARRA).appendChild(btn);
    }
  }

  return { inicializar: inicializar };

})();

Pruebas.inicializar();