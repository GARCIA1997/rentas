const baseStyles = `
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 11.5px;
    line-height: 1.55;
    color: #0f172a;
  }
  .doc-header {
    display: flex; align-items: center; gap: 14px;
    border-bottom: 2px solid #0d9488; padding-bottom: 14px; margin-bottom: 18px;
  }
  .doc-header img { width: 40px; height: 40px; border-radius: 10px; display: block; }
  .doc-header h1 { font-size: 16px; margin: 0 0 3px; color: #0f172a; letter-spacing: -0.01em; }
  .doc-header .subtitle { color: #64748b; margin: 0; font-size: 10px; }
  h2 {
    font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.07em; font-weight: 700;
    color: #0d9488; margin-top: 16px; margin-bottom: 7px;
    border-left: 3px solid #0d9488; padding-left: 8px;
  }
  .clause { margin-bottom: 8px; text-align: justify; }
  .clause-number { font-weight: 700; color: #0f172a; }
  /* Listas de obligaciones/causales: compactas, sin viñeta, con sangría francesa */
  .list { margin: 5px 0 8px 0; padding: 0; list-style: none; }
  .list li { margin-bottom: 3px; padding-left: 16px; text-indent: -16px; text-align: justify; }
  .parties {
    background: #f8fafc; border-radius: 10px; padding: 11px 14px; margin-bottom: 6px;
  }
  .parties p { margin: 0 0 5px; text-align: justify; }
  .parties p:last-child { margin-bottom: 0; }
  .legal-basis {
    margin-top: 18px; border: 1px solid #cbd5e1; border-left: 3px solid #0d9488;
    border-radius: 8px; padding: 9px 12px; font-size: 9.8px; line-height: 1.5;
    color: #334155; text-align: justify; background: #f8fafc;
  }
  .legal-basis .lb-title {
    display: block; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
    font-size: 8.8px; color: #0d9488; margin-bottom: 3px;
  }
  .signatures { margin-top: 44px; display: flex; justify-content: space-between; }
  .signature-block { width: 45%; text-align: center; }
  .signature-line { border-top: 1px solid #0f172a; margin-top: 44px; padding-top: 5px; font-size: 11px; }
  .footer-note { margin-top: 26px; font-size: 9.5px; color: #94a3b8; text-align: center; }
`;

const header = (title) => `
  <div class="doc-header">
    <img src="{{logo_src}}" alt="KsaRed" />
    <div>
      <h1>${title}</h1>
      <p class="subtitle">{{property_city}} · Expedido el {{signature_date}}</p>
    </div>
  </div>
`;

// Bloque de fundamento legal — se arma dinámicamente según la entidad del inmueble
// (ver src/db/legalFramework.js) y cierra el documento dándole sustento normativo.
const legalBasisBlock = `
  <div class="legal-basis">
    <span class="lb-title">Fundamento legal</span>
    {{legal_basis_text}}
  </div>
`;

const signatureBlock = (landlordVar) => `
  <p class="clause" style="margin-top:14px">
    Leído que fue el presente contrato por ambas partes, y enteradas de su contenido, alcance y fuerza legal,
    lo ratifican y firman por duplicado en {{property_city}}, a {{signature_date}}, quedando un ejemplar en
    poder de cada una de ellas.
  </p>

  <div class="signatures">
    <div class="signature-block">
      <div class="signature-line">${landlordVar}<br>Arrendador</div>
    </div>
    <div class="signature-block">
      <div class="signature-line">{{tenant_name}}<br>Arrendatario</div>
    </div>
  </div>
`;

export const CASA_TEMPLATE = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>${baseStyles}</style>
</head>
<body>
  ${header('Contrato de Arrendamiento de Casa Habitación')}

  <p class="clause">
    Contrato de arrendamiento que celebran, por una parte <strong>{{representative_name}}</strong>{{representative_position_text}}, a quien en lo sucesivo se le denominará <strong>"EL ARRENDADOR"</strong>,
    y por otra parte <strong>{{tenant_name}}</strong>{{tenant_address_text}}, a quien se le denominará <strong>"EL ARRENDATARIO"</strong>,
    respecto del inmueble ubicado en {{property_address}}, {{property_city}}, C.P. {{property_postal_code}},
    en adelante <strong>"EL INMUEBLE"</strong>, al tenor de las siguientes declaraciones y cláusulas.
  </p>

  <h2>Declaraciones</h2>
  <div class="parties">
    <p><strong>I. Declara EL ARRENDADOR:</strong> ser mayor de edad, con plena capacidad jurídica para
    obligarse, y contar con la legítima posesión y las facultades suficientes para dar EL INMUEBLE en
    arrendamiento, manifestando que sobre el mismo no pesa limitación de dominio ni impedimento legal alguno
    que obste la celebración de este contrato.</p>
    <p><strong>II. Declara EL ARRENDATARIO:</strong> ser mayor de edad, identificarse con {{tenant_id_document}}{{tenant_curp_text}},
    contar con capacidad jurídica y solvencia para obligarse en los términos de este contrato, y haber
    inspeccionado EL INMUEBLE previamente a su firma, recibiéndolo a su entera satisfacción en
    {{property_condition}}.</p>
    <p><strong>III. Declaran ambas partes:</strong> reconocerse mutuamente la personalidad con que comparecen
    y ser su libre voluntad, sin mediar error, dolo, violencia ni lesión, obligarse conforme a las siguientes:</p>
  </div>

  <h2>Cláusulas</h2>

  <p class="clause">
    <span class="clause-number">PRIMERA. Objeto y destino.</span> EL ARRENDADOR concede a EL ARRENDATARIO el uso
    y goce temporal de EL INMUEBLE, denominado {{property_name}}, destinándose exclusivamente para uso de casa
    habitación. Queda prohibido darle un destino distinto al pactado sin consentimiento previo y por escrito
    de EL ARRENDADOR. {{inventory_text}}
  </p>

  <p class="clause">
    <span class="clause-number">SEGUNDA. Vigencia.</span> {{term_binding_text}}, iniciando el {{start_date}} y
    concluyendo el {{end_date}}, fecha en la que EL ARRENDATARIO deberá desocupar y entregar EL INMUEBLE sin
    necesidad de requerimiento judicial o extrajudicial previo. {{auto_renewal_text}}
  </p>

  <p class="clause">
    <span class="clause-number">TERCERA. Renta.</span> EL ARRENDATARIO se obliga a pagar por concepto de renta
    mensual la cantidad de <strong>{{monthly_rent}}</strong>, pagadera por mensualidades adelantadas a más tardar
    el día {{payment_day}} de cada mes, en el domicilio de EL ARRENDADOR o mediante el medio de pago que éste
    designe por escrito. {{receipt_text}} El retraso no libera a EL ARRENDATARIO de las obligaciones
    contraídas.
  </p>

  <p class="clause">
    <span class="clause-number">CUARTA. Depósito en garantía.</span> EL ARRENDATARIO entrega en este acto la
    cantidad de <strong>{{deposit_amount}}</strong> en concepto de depósito en garantía, cantidad que
    <em>no constituye renta anticipada</em> ni podrá aplicarse al pago de mensualidades. Dicho depósito garantiza
    el cumplimiento de las obligaciones de este contrato, los daños que llegare a sufrir EL INMUEBLE y los
    adeudos por servicios. {{deposit_return_text}}
  </p>

  <p class="clause">
    <span class="clause-number">QUINTA. Servicios y consumos.</span> {{water_included_text}} Los servicios de
    energía eléctrica, gas, telefonía e internet corren en todo momento por cuenta de EL ARRENDATARIO, quien
    deberá acreditar su pago al término del contrato como condición para la devolución del depósito.
  </p>

  <p class="clause">
    <span class="clause-number">QUINTA BIS. Estacionamiento.</span> {{parking_text}}
  </p>

  <p class="clause">
    <span class="clause-number">SEXTA. Obligaciones de EL ARRENDADOR.</span> Conforme a la naturaleza del
    arrendamiento, EL ARRENDADOR se obliga a:
  </p>
  <ul class="list">
    <li>a) Entregar EL INMUEBLE en estado de servir para el uso convenido, con sus instalaciones en
    funcionamiento;</li>
    <li>b) Conservar EL INMUEBLE en dicho estado, realizando las reparaciones necesarias derivadas de vicios
    ocultos, deterioro estructural o caso fortuito no imputable a EL ARRENDATARIO;</li>
    <li>c) No estorbar ni embarazar el uso de EL INMUEBLE, garantizando a EL ARRENDATARIO el uso y goce
    pacífico del mismo durante la vigencia del contrato.</li>
  </ul>

  <p class="clause">
    <span class="clause-number">SÉPTIMA. Obligaciones de EL ARRENDATARIO.</span> EL ARRENDATARIO se obliga a:
  </p>
  <ul class="list">
    <li>a) Pagar la renta en la forma, lugar y tiempo convenidos;</li>
    <li>b) Servirse de EL INMUEBLE únicamente para el uso pactado, conforme a su naturaleza y destino;</li>
    <li>c) Responder de los daños y perjuicios que EL INMUEBLE sufra por su culpa, negligencia o la de las
    personas que en él habiten o admita, realizando por su cuenta las reparaciones menores y de uso;</li>
    <li>d) Dar aviso a EL ARRENDADOR, dentro de las 48 horas siguientes, de cualquier desperfecto, filtración,
    falla estructural o necesidad de reparación mayor, siendo responsable de los daños que se agraven por su
    omisión;</li>
    <li>e) Permitir a EL ARRENDADOR la inspección de EL INMUEBLE previa notificación con 24 horas de
    anticipación, en día y hora hábiles;</li>
    <li>f) Devolver EL INMUEBLE al término del contrato en las mismas condiciones en que lo recibió, salvo el
    deterioro natural derivado del uso normal y del transcurso del tiempo.</li>
  </ul>

  {{noise_clause}}

  <p class="clause">
    <span class="clause-number">OCTAVA. Prohibición de subarrendar y ceder.</span> EL ARRENDATARIO no podrá
    subarrendar EL INMUEBLE en todo ni en parte, ni ceder o traspasar los derechos derivados de este contrato,
    sin el consentimiento previo, expreso y por escrito de EL ARRENDADOR. De contravenir esta cláusula
    responderá solidariamente con el tercero por los daños y perjuicios causados, y operará la rescisión en
    términos de la cláusula Décima Primera.
  </p>

  <p class="clause">
    <span class="clause-number">NOVENA. Mejoras y modificaciones.</span> EL ARRENDATARIO no podrá variar la
    forma de EL INMUEBLE ni realizar obras, adaptaciones o modificaciones sin autorización previa y por escrito
    de EL ARRENDADOR. Las mejoras que se autoricen y queden adheridas de manera permanente quedarán en
    beneficio de EL INMUEBLE, sin derecho a indemnización, retribución ni compensación alguna en favor de
    EL ARRENDATARIO.
  </p>

  <p class="clause">
    <span class="clause-number">DÉCIMA. Mora y penalización.</span> {{penalty_text}} La mora se producirá por el
    solo transcurso del plazo pactado, sin necesidad de requerimiento previo.
  </p>

  <p class="clause">
    <span class="clause-number">DÉCIMA PRIMERA. Causales de rescisión.</span> Serán causas de rescisión del
    presente contrato, sin responsabilidad para EL ARRENDADOR y con pérdida del depósito en garantía como pena
    convencional:
  </p>
  <ul class="list">
    <li>a) La falta de pago oportuno de una o más mensualidades de renta;</li>
    <li>b) El uso de EL INMUEBLE para un fin distinto al convenido;</li>
    <li>c) Los daños causados a EL INMUEBLE por culpa o negligencia de EL ARRENDATARIO;</li>
    <li>d) La variación de la forma de EL INMUEBLE sin consentimiento expreso de EL ARRENDADOR;</li>
    <li>e) El subarrendamiento o cesión no autorizados;</li>
    <li>f) La introducción o resguardo en EL INMUEBLE de armas de fuego, narcóticos o sustancias ilícitas, así
    como su uso para actividades contrarias a la ley o al orden público;</li>
    <li>g) El incumplimiento de cualquiera otra obligación pactada en este contrato.</li>
  </ul>

  {{early_termination_clause}}

  <p class="clause">
    <span class="clause-number">DÉCIMA SEGUNDA. Terminación y entrega.</span> Al concluir la vigencia o al
    rescindirse el contrato, EL ARRENDATARIO entregará EL INMUEBLE desocupado, limpio, con sus llaves y
    accesorios, y al corriente en el pago de servicios. De no hacerlo en la fecha señalada, cubrirá a
    EL ARRENDADOR, por cada día de retraso en la entrega, el equivalente a un treintavo de la renta mensual
    vigente, por concepto de pena convencional, sin perjuicio de las acciones legales que correspondan.
  </p>

  <p class="clause">
    <span class="clause-number">DÉCIMA TERCERA. Preferencia para renovar.</span> Si EL ARRENDATARIO se encuentra
    al corriente en el pago de la renta y ha cumplido las obligaciones de este contrato, gozará de preferencia
    para celebrar un nuevo contrato sobre EL INMUEBLE en igualdad de condiciones frente a terceros, siempre que
    manifieste su voluntad de hacerlo con al menos 30 días naturales de anticipación al vencimiento y que ambas
    partes convengan los nuevos términos.
  </p>

  <p class="clause">
    <span class="clause-number">DÉCIMA CUARTA. Domicilios y notificaciones.</span> Las partes señalan como
    domicilio para oír y recibir toda clase de notificaciones: EL ARRENDADOR, el que consta en sus datos de
    contacto de este contrato; EL ARRENDATARIO, el propio EL INMUEBLE materia del arrendamiento. Todo cambio de
    domicilio deberá notificarse por escrito con 15 días naturales de anticipación; de no hacerlo, las
    notificaciones practicadas en los domicilios señalados surtirán plenos efectos legales.
  </p>

  <p class="clause">
    <span class="clause-number">DÉCIMA QUINTA. Nulidad parcial.</span> La declaración de nulidad o invalidez de
    alguna cláusula de este contrato no afectará la validez y exigibilidad de las restantes, las que
    continuarán surtiendo plenos efectos entre las partes.
  </p>

  {{tenancy_law_text}}

  <p class="clause">
    <span class="clause-number">DÉCIMA SEXTA. Legislación aplicable y jurisdicción.</span> {{jurisdiction_text}}
  </p>

  ${signatureBlock('{{representative_name}}')}

  ${legalBasisBlock}

  <p class="footer-note">Documento generado por KsaRed · Conserve una copia impresa firmada por ambas partes.</p>
</body>
</html>`;

export const LOCAL_TEMPLATE = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>${baseStyles}</style>
</head>
<body>
  ${header('Contrato de Arrendamiento de Local Comercial')}

  <p class="clause">
    Contrato de arrendamiento que celebran, por una parte <strong>{{representative_name}}</strong>{{representative_position_text}}, a quien en lo sucesivo se le denominará <strong>"EL ARRENDADOR"</strong>,
    y por otra parte <strong>{{tenant_name}}</strong>{{tenant_address_text}}, a quien se le denominará <strong>"EL ARRENDATARIO"</strong>,
    respecto del local comercial ubicado en {{property_address}}, {{property_city}}, C.P.
    {{property_postal_code}}, en adelante <strong>"EL LOCAL"</strong>, al tenor de las siguientes declaraciones
    y cláusulas.
  </p>

  <h2>Declaraciones</h2>
  <div class="parties">
    <p><strong>I. Declara EL ARRENDADOR:</strong> ser mayor de edad, con plena capacidad jurídica para
    obligarse, y contar con la legítima posesión y las facultades suficientes para dar EL LOCAL en
    arrendamiento, manifestando que sobre el mismo no pesa limitación de dominio ni impedimento legal alguno
    que obste la celebración de este contrato.</p>
    <p><strong>II. Declara EL ARRENDATARIO:</strong> ser mayor de edad, identificarse con {{tenant_id_document}}{{tenant_curp_text}},
    contar con capacidad jurídica y solvencia para obligarse, y haber inspeccionado EL LOCAL previamente a su
    firma, recibiéndolo a su entera satisfacción en {{property_condition}}, reconociendo que es apto para el
    giro que pretende desarrollar.</p>
    <p><strong>III. Declaran ambas partes:</strong> reconocerse mutuamente la personalidad con que comparecen
    y ser su libre voluntad, sin mediar error, dolo, violencia ni lesión, obligarse conforme a las siguientes:</p>
  </div>

  <h2>Cláusulas</h2>

  <p class="clause">
    <span class="clause-number">PRIMERA. Objeto y destino.</span> EL ARRENDADOR concede a EL ARRENDATARIO el uso
    y goce temporal de EL LOCAL, denominado {{property_name}}, destinándose exclusivamente a la actividad
    comercial o de servicios que EL ARRENDATARIO desarrolle lícitamente. Queda expresamente prohibido
    destinarlo a casa habitación, a giro distinto del declarado, o a actividad que requiera autorización
    especial no obtenida. {{inventory_text}}
  </p>

  <p class="clause">
    <span class="clause-number">SEGUNDA. Vigencia.</span> {{term_binding_text}}, iniciando el {{start_date}} y
    concluyendo el {{end_date}}, fecha en la que EL ARRENDATARIO deberá desocupar y entregar EL LOCAL sin
    necesidad de requerimiento judicial o extrajudicial previo. {{auto_renewal_text}}
  </p>

  <p class="clause">
    <span class="clause-number">TERCERA. Renta.</span> EL ARRENDATARIO se obliga a pagar por concepto de renta
    mensual la cantidad de <strong>{{monthly_rent}}</strong>, pagadera por mensualidades adelantadas a más tardar
    el día {{payment_day}} de cada mes, en el domicilio de EL ARRENDADOR o mediante el medio de pago que éste
    designe por escrito. {{receipt_text}}
  </p>

  <p class="clause">
    <span class="clause-number">CUARTA. Depósito en garantía.</span> EL ARRENDATARIO entrega en este acto la
    cantidad de <strong>{{deposit_amount}}</strong> en concepto de depósito en garantía, cantidad que
    <em>no constituye renta anticipada</em> ni podrá aplicarse al pago de mensualidades. {{deposit_return_text}}
  </p>

  <p class="clause">
    <span class="clause-number">QUINTA. Servicios, licencias y permisos.</span> {{water_included_text}} Los
    servicios de energía eléctrica, gas, telefonía e internet corren por cuenta de EL ARRENDATARIO. Serán de su
    exclusiva cuenta y responsabilidad la obtención y conservación vigente de la licencia de funcionamiento,
    uso de suelo, avisos y permisos municipales, sanitarios, de protección civil y cualesquiera otros que
    requiera su giro, así como el cumplimiento de sus obligaciones fiscales y laborales, liberando a
    EL ARRENDADOR de toda responsabilidad al respecto.
  </p>

  <p class="clause">
    <span class="clause-number">SEXTA. Obligaciones de EL ARRENDADOR.</span> EL ARRENDADOR se obliga a:
  </p>
  <ul class="list">
    <li>a) Entregar EL LOCAL en estado de servir para el uso convenido, con sus instalaciones en
    funcionamiento;</li>
    <li>b) Conservar EL LOCAL en dicho estado, realizando las reparaciones derivadas de vicios ocultos,
    deterioro estructural o caso fortuito no imputable a EL ARRENDATARIO;</li>
    <li>c) Garantizar a EL ARRENDATARIO el uso y goce pacífico de EL LOCAL durante la vigencia del contrato.</li>
  </ul>

  <p class="clause">
    <span class="clause-number">SÉPTIMA. Obligaciones de EL ARRENDATARIO.</span> EL ARRENDATARIO se obliga a:
  </p>
  <ul class="list">
    <li>a) Pagar la renta en la forma, lugar y tiempo convenidos;</li>
    <li>b) Servirse de EL LOCAL únicamente para el giro pactado;</li>
    <li>c) Responder de los daños y perjuicios que EL LOCAL sufra por su culpa o negligencia, o la de sus
    empleados, proveedores y clientes, realizando por su cuenta las reparaciones menores y de uso;</li>
    <li>d) Dar aviso a EL ARRENDADOR, dentro de las 48 horas siguientes, de cualquier desperfecto o necesidad
    de reparación mayor, siendo responsable de los daños que se agraven por su omisión;</li>
    <li>e) Permitir la inspección de EL LOCAL previa notificación con 24 horas de anticipación, en día y hora
    hábiles;</li>
    <li>f) Retirar a su costa, al término del contrato, los letreros, anuncios, mobiliario e instalaciones
    propias de su negocio, reparando cualquier afectación que dicho retiro ocasione;</li>
    <li>g) Devolver EL LOCAL en las mismas condiciones en que lo recibió, salvo el deterioro natural derivado
    del uso normal y del transcurso del tiempo.</li>
  </ul>

  <p class="clause">
    <span class="clause-number">OCTAVA. Prohibición de subarrendar, ceder y traspasar.</span> EL ARRENDATARIO no
    podrá subarrendar EL LOCAL en todo ni en parte, ni ceder o traspasar los derechos derivados de este
    contrato ni el negocio establecido en él, sin el consentimiento previo, expreso y por escrito de
    EL ARRENDADOR. De contravenir esta cláusula responderá solidariamente con el tercero por los daños y
    perjuicios causados, y operará la rescisión conforme a la cláusula Décima Primera.
  </p>

  <p class="clause">
    <span class="clause-number">NOVENA. Mejoras y adaptaciones.</span> EL ARRENDATARIO no podrá variar la forma
    de EL LOCAL ni realizar obras o adaptaciones sin autorización previa y por escrito de EL ARRENDADOR. Las
    mejoras autorizadas que queden adheridas de manera permanente quedarán en beneficio de EL LOCAL, sin
    derecho a indemnización ni compensación alguna en favor de EL ARRENDATARIO.
  </p>

  <p class="clause">
    <span class="clause-number">DÉCIMA. Mora y penalización.</span> {{penalty_text}} La mora se producirá por el
    solo transcurso del plazo pactado, sin necesidad de requerimiento previo.
  </p>

  <p class="clause">
    <span class="clause-number">DÉCIMA PRIMERA. Causales de rescisión.</span> Serán causas de rescisión del
    presente contrato, sin responsabilidad para EL ARRENDADOR y con pérdida del depósito en garantía como pena
    convencional:
  </p>
  <ul class="list">
    <li>a) La falta de pago oportuno de una o más mensualidades de renta;</li>
    <li>b) El uso de EL LOCAL para un giro o fin distinto al convenido, o como casa habitación;</li>
    <li>c) Los daños causados a EL LOCAL por culpa o negligencia de EL ARRENDATARIO;</li>
    <li>d) La variación de la forma de EL LOCAL sin consentimiento expreso de EL ARRENDADOR;</li>
    <li>e) El subarrendamiento, cesión o traspaso no autorizados;</li>
    <li>f) La operación sin las licencias y permisos exigibles, o la clausura de EL LOCAL imputable a
    EL ARRENDATARIO;</li>
    <li>g) El almacenamiento de materiales explosivos, inflamables o sustancias ilícitas sin autorización
    legal, así como el uso de EL LOCAL para actividades contrarias a la ley o al orden público;</li>
    <li>h) El incumplimiento de cualquiera otra obligación pactada en este contrato.</li>
  </ul>

  <p class="clause">
    <span class="clause-number">DÉCIMA SEGUNDA. Terminación y entrega.</span> Al concluir la vigencia o al
    rescindirse el contrato, EL ARRENDATARIO entregará EL LOCAL desocupado, limpio, con sus llaves y accesorios,
    y al corriente en el pago de servicios. De no hacerlo en la fecha señalada, cubrirá a EL ARRENDADOR, por
    cada día de retraso en la entrega, el equivalente a un treintavo de la renta mensual vigente, por concepto
    de pena convencional, sin perjuicio de las acciones legales que correspondan.
  </p>

  <p class="clause">
    <span class="clause-number">DÉCIMA TERCERA. Preferencia para renovar.</span> Si EL ARRENDATARIO se encuentra
    al corriente en el pago de la renta y ha cumplido las obligaciones de este contrato, gozará de preferencia
    para celebrar un nuevo contrato sobre EL LOCAL en igualdad de condiciones frente a terceros, siempre que
    manifieste su voluntad de hacerlo con al menos 30 días naturales de anticipación al vencimiento y que ambas
    partes convengan los nuevos términos.
  </p>

  <p class="clause">
    <span class="clause-number">DÉCIMA CUARTA. Domicilios y notificaciones.</span> Las partes señalan como
    domicilio para oír y recibir toda clase de notificaciones: EL ARRENDADOR, el que consta en sus datos de
    contacto de este contrato; EL ARRENDATARIO, el propio EL LOCAL materia del arrendamiento. Todo cambio de
    domicilio deberá notificarse por escrito con 15 días naturales de anticipación; de no hacerlo, las
    notificaciones practicadas en los domicilios señalados surtirán plenos efectos legales.
  </p>

  <p class="clause">
    <span class="clause-number">DÉCIMA QUINTA. Nulidad parcial.</span> La declaración de nulidad o invalidez de
    alguna cláusula de este contrato no afectará la validez y exigibilidad de las restantes, las que
    continuarán surtiendo plenos efectos entre las partes.
  </p>

  {{tenancy_law_text}}

  <p class="clause">
    <span class="clause-number">DÉCIMA SEXTA. Legislación aplicable y jurisdicción.</span> {{jurisdiction_text}}
  </p>

  ${signatureBlock('{{representative_name}}')}

  ${legalBasisBlock}

  <p class="footer-note">Documento generado por KsaRed · Conserve una copia impresa firmada por ambas partes.</p>
</body>
</html>`;

// Plantilla enriquecida: incluye inventario, servicios detallados, normas de convivencia,
// estacionamiento y testigo. Usada para los inmuebles que requieren ese nivel de detalle.
export const COAHUAYANA_TEMPLATE = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>${baseStyles}
  .witness-block { margin-top: 26px; padding-top: 14px; border-top: 1px solid #cbd5e1; }
  .witness-block h3 { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; color: #0d9488; margin: 0 0 6px; }
</style>
</head>
<body>
  ${header('Contrato de Arrendamiento')}

  <p class="clause">
    Contrato de arrendamiento que celebran, por una parte <strong>{{landlord_name}}</strong>, con número
    telefónico {{landlord_phone}}, a quien en lo sucesivo se le denominará <strong>"EL ARRENDADOR"</strong>, y
    por otra parte <strong>{{tenant_name}}</strong>{{tenant_address_text}}, a quien se le denominará <strong>"EL ARRENDATARIO"</strong>,
    respecto del inmueble ubicado en {{property_address}}, {{property_city}}, C.P. {{property_postal_code}},
    en adelante <strong>"EL INMUEBLE"</strong>, al tenor de las siguientes declaraciones y cláusulas.
  </p>

  <h2>Declaraciones</h2>
  <div class="parties">
    <p><strong>I. Declara EL ARRENDADOR:</strong> ser mayor de edad, con plena capacidad jurídica para
    obligarse, y contar con la legítima posesión y las facultades suficientes para dar EL INMUEBLE en
    arrendamiento, sin que sobre el mismo pese limitación de dominio o impedimento legal alguno.</p>
    <p><strong>II. Declara EL ARRENDATARIO:</strong> ser mayor de edad, identificarse con {{tenant_id_document}}{{tenant_curp_text}},
    contar con capacidad jurídica y solvencia para obligarse, y haber inspeccionado EL INMUEBLE previamente a
    su firma, recibiéndolo a su entera satisfacción en {{property_condition}}.</p>
    <p><strong>III. Declaran ambas partes:</strong> reconocerse mutuamente la personalidad con que comparecen
    y ser su libre voluntad obligarse conforme a las siguientes:</p>
  </div>

  <h2>Cláusulas</h2>

  <p class="clause">
    <span class="clause-number">PRIMERA. Objeto y destino.</span> EL ARRENDADOR concede a EL ARRENDATARIO el uso
    y goce temporal de {{property_type}} denominado {{property_name}}, destinándose exclusivamente al uso
    convenido, quedando prohibido darle destino distinto sin consentimiento previo y por escrito.
    {{inventory_text}}
  </p>

  <p class="clause">
    <span class="clause-number">SEGUNDA. Vigencia.</span> {{term_binding_text}}, iniciando el {{start_date}} y
    concluyendo el {{end_date}}, fecha en la que EL ARRENDATARIO deberá desocupar y entregar EL INMUEBLE sin
    necesidad de requerimiento previo. {{auto_renewal_text}}
  </p>

  <p class="clause">
    <span class="clause-number">TERCERA. Renta y depósito.</span> EL ARRENDATARIO pagará una renta mensual de
    <strong>{{monthly_rent}}</strong>, por mensualidades adelantadas, a más tardar el día {{payment_day}} de
    cada mes. {{receipt_text}} Entrega asimismo la cantidad de <strong>{{deposit_amount}}</strong> en concepto de depósito en
    garantía, la cual <em>no constituye renta anticipada</em> ni podrá aplicarse al pago de mensualidades.
    {{deposit_return_text}}
  </p>

  <p class="clause">
    <span class="clause-number">CUARTA. Servicios y conservación.</span> {{utilities_text}} EL ARRENDATARIO se
    obliga a cuidar y mantener en buen estado los bienes y accesorios de EL INMUEBLE, realizando por su cuenta
    las reparaciones menores y de uso, y reparando los daños causados por mal uso, culpa o negligencia propia o
    de las personas que en él habiten o admita. Corresponde a EL ARRENDADOR conservar EL INMUEBLE en estado de
    servir para el uso convenido y atender las reparaciones por vicios ocultos, deterioro estructural o caso
    fortuito no imputable a EL ARRENDATARIO. {{additional_conditions}}
  </p>

  <h2>Normas de convivencia</h2>
  <p class="clause"><span class="clause-number">QUINTA.</span></p>
  {{convivance_rules}}

  {{noise_clause}}

  <p class="clause">
    <span class="clause-number">SEXTA. Prohibiciones y subarrendamiento.</span> Queda estrictamente prohibido
    introducir o resguardar en EL INMUEBLE armas de fuego, narcóticos o sustancias ilícitas, así como
    destinarlo a actividades contrarias a la ley o al orden público. EL ARRENDATARIO tampoco podrá subarrendar
    EL INMUEBLE en todo ni en parte, ni ceder los derechos de este contrato, sin consentimiento previo, expreso
    y por escrito de EL ARRENDADOR; de hacerlo responderá solidariamente con el tercero por los daños y
    perjuicios causados. Asimismo, no podrá variar la forma de EL INMUEBLE ni realizar obras sin autorización
    escrita; las mejoras adheridas de manera permanente quedarán en su beneficio sin derecho a indemnización.
    {{additional_prohibitions}}
  </p>

  <p class="clause">
    <span class="clause-number">SÉPTIMA. Estacionamiento.</span> {{parking_text}}
  </p>

  <p class="clause">
    <span class="clause-number">OCTAVA. Causales de rescisión.</span> Serán causas de rescisión, sin
    responsabilidad para EL ARRENDADOR y con pérdida del depósito en garantía como pena convencional: a) la
    falta de pago oportuno de una o más mensualidades; b) el uso de EL INMUEBLE para fin distinto al convenido;
    c) los daños causados por culpa o negligencia de EL ARRENDATARIO; d) la variación de la forma de
    EL INMUEBLE sin consentimiento expreso; e) el subarrendamiento o cesión no autorizados; f) la violación de
    las prohibiciones de la cláusula Sexta; y g) el incumplimiento de cualquiera otra obligación pactada.
    {{penalty_text}}
  </p>

  {{early_termination_clause}}

  <p class="clause">
    <span class="clause-number">NOVENA. Terminación y entrega.</span> Al concluir la vigencia o al rescindirse
    el contrato, EL ARRENDATARIO entregará EL INMUEBLE desocupado, limpio, con sus llaves y accesorios, y al
    corriente en el pago de servicios. De no hacerlo en la fecha señalada, cubrirá por cada día de retraso el
    equivalente a un treintavo de la renta mensual vigente, por concepto de pena convencional, sin perjuicio de
    las acciones legales que correspondan.
  </p>

  <p class="clause">
    <span class="clause-number">DÉCIMA. Preferencia para renovar.</span> Al término de la vigencia, si
    EL ARRENDATARIO está al corriente en sus pagos y ha cumplido las cláusulas de este contrato, gozará de
    preferencia para renovarlo en igualdad de condiciones frente a terceros, siempre que lo manifieste con al
    menos 30 días naturales de anticipación y ambas partes convengan los nuevos términos.
  </p>

  <p class="clause">
    <span class="clause-number">DÉCIMA PRIMERA. Domicilios y notificaciones.</span> EL ARRENDADOR señala como
    domicilio para notificaciones el que consta en sus datos de contacto; EL ARRENDATARIO, el propio
    EL INMUEBLE. Todo cambio deberá notificarse por escrito con 15 días naturales de anticipación; de no
    hacerlo, las notificaciones practicadas en los domicilios señalados surtirán plenos efectos legales.
  </p>

  <p class="clause">
    <span class="clause-number">DÉCIMA SEGUNDA. Nulidad parcial.</span> La nulidad o invalidez de alguna
    cláusula no afectará la validez de las restantes, las que continuarán surtiendo plenos efectos.
  </p>

  {{tenancy_law_text}}

  <p class="clause">
    <span class="clause-number">DÉCIMA TERCERA. Legislación aplicable y jurisdicción.</span> {{jurisdiction_text}}
  </p>

  ${signatureBlock('{{landlord_name}}')}

  {{witness_section}}

  ${legalBasisBlock}

  <p class="footer-note">Documento generado por KsaRed · Conserve una copia impresa firmada por ambas partes.</p>
</body>
</html>`;

export const CONTRACT_VARIABLES = [
  'logo_src',
  'landlord_name',
  'landlord_phone',
  'representative_name',
  'representative_position',
  'representative_position_text',
  'representative_id_document',
  'tenant_name',
  'tenant_id_document',
  'property_type',
  'property_name',
  'property_address',
  'property_city',
  'property_postal_code',
  'start_date',
  'end_date',
  'duration_months',
  'payment_day',
  'monthly_rent',
  'deposit_amount',
  'water_included_text',
  'utilities_text',
  'property_condition',
  'additional_conditions',
  'convivance_rules',
  'additional_prohibitions',
  'parking_text',
  'penalty_text',
  'deposit_return_text',
  'auto_renewal_text',
  'signature_date',
  'inventory_text',
  'witness_section',
  'jurisdiction_text',
  'term_binding_text',
  'receipt_text',
  'tenancy_law_text',
  'legal_basis_text',
  'early_termination_clause',
  'noise_clause',
];
