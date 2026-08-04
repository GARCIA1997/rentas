const baseStyles = `
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 12.5px;
    line-height: 1.65;
    color: #0f172a;
  }
  .doc-header {
    display: flex; align-items: center; gap: 14px;
    border-bottom: 2px solid #0d9488; padding-bottom: 16px; margin-bottom: 26px;
  }
  .doc-header img { width: 42px; height: 42px; border-radius: 10px; display: block; }
  .doc-header h1 { font-size: 18px; margin: 0 0 3px; color: #0f172a; }
  .doc-header .subtitle { color: #64748b; margin: 0; font-size: 11px; }
  h2 {
    font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700;
    color: #0d9488; margin-top: 26px; margin-bottom: 10px;
    border-left: 3px solid #0d9488; padding-left: 8px;
  }
  .clause { margin-bottom: 11px; text-align: justify; }
  .clause-number { font-weight: 700; color: #0f172a; }
  .signatures { margin-top: 64px; display: flex; justify-content: space-between; }
  .signature-block { width: 45%; text-align: center; }
  .signature-line { border-top: 1px solid #0f172a; margin-top: 50px; padding-top: 6px; font-size: 12px; }
  .footer-note { margin-top: 40px; font-size: 10px; color: #94a3b8; text-align: center; }
`;

const header = (title) => `
  <div class="doc-header">
    <img src="{{logo_src}}" alt="KsaRed" />
    <div>
      <h1>${title}</h1>
      <p class="subtitle">Estados de Michoacán y Colima, México · KsaRed</p>
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
    Contrato de arrendamiento que celebran, por una parte <strong>{{representative_name}}</strong>
    ({{representative_position}}), en su carácter de Arrendador, y por otra parte
    <strong>{{tenant_name}}</strong>, identificado(a) con documento oficial {{tenant_id_document}},
    en su carácter de Arrendatario, respecto del inmueble ubicado en {{property_address}},
    {{property_city}}, C.P. {{property_postal_code}} ("el Inmueble"), de acuerdo con las siguientes
    declaraciones y cláusulas.
  </p>

  <h2>Objeto del Contrato</h2>
  <p class="clause">
    <span class="clause-number">Primera.</span> El Arrendador da en arrendamiento al Arrendatario el
    Inmueble denominado {{property_name}}, destinado exclusivamente para uso de casa habitación.
  </p>

  <h2>Vigencia</h2>
  <p class="clause">
    <span class="clause-number">Segunda.</span> El presente contrato tendrá una vigencia que inicia el
    {{start_date}} y concluye el {{end_date}}. {{auto_renewal_text}}
  </p>

  <h2>Renta</h2>
  <p class="clause">
    <span class="clause-number">Tercera.</span> El Arrendatario pagará al Arrendador la cantidad de
    {{monthly_rent}} mensuales, dentro de los primeros cinco días naturales de cada mes.
  </p>
  <p class="clause">
    <span class="clause-number">Cuarta.</span> {{water_included_text}} El servicio de energía eléctrica
    e internet corren en todo momento por cuenta del Arrendatario.
  </p>

  <h2>Depósito en Garantía</h2>
  <p class="clause">
    <span class="clause-number">Quinta.</span> El Arrendatario entrega en este acto la cantidad de
    {{deposit_amount}} por concepto de depósito en garantía. {{deposit_return_text}}
  </p>

  <h2>Penalizaciones</h2>
  <p class="clause">
    <span class="clause-number">Sexta.</span> {{penalty_text}}
  </p>

  <h2>Disposiciones Generales</h2>
  <p class="clause">
    <span class="clause-number">Séptima.</span> El Arrendatario se obliga a dar aviso inmediato al
    Arrendador sobre cualquier desperfecto o necesidad de mantenimiento del Inmueble, así como a
    entregarlo en las mismas condiciones en que lo recibió, salvo el desgaste natural por su uso.
  </p>
  <p class="clause">
    <span class="clause-number">Octava.</span> Para la interpretación y cumplimiento del presente
    contrato, las partes se someten a las leyes aplicables en el estado donde se ubica el Inmueble,
    renunciando a cualquier otro fuero que pudiera corresponderles.
  </p>

  <p class="clause">
    Leído que fue el presente contrato y enteradas las partes de su contenido y alcance legal, lo
    firman de conformidad en {{property_city}}, a {{signature_date}}.
  </p>

  <div class="signatures">
    <div class="signature-block">
      <div class="signature-line">{{representative_name}}<br>Arrendador</div>
    </div>
    <div class="signature-block">
      <div class="signature-line">{{tenant_name}}<br>Arrendatario</div>
    </div>
  </div>

  <p class="footer-note">Documento generado por KsaRed · Conserve una copia impresa firmada.</p>
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
    Contrato de arrendamiento que celebran, por una parte <strong>{{representative_name}}</strong>
    ({{representative_position}}), en su carácter de Arrendador, y por otra parte
    <strong>{{tenant_name}}</strong>, identificado(a) con documento oficial {{tenant_id_document}},
    en su carácter de Arrendatario, respecto del local comercial ubicado en {{property_address}},
    {{property_city}}, C.P. {{property_postal_code}} ("el Local"), de acuerdo con las siguientes
    declaraciones y cláusulas.
  </p>

  <h2>Objeto del Contrato</h2>
  <p class="clause">
    <span class="clause-number">Primera.</span> El Arrendador da en arrendamiento al Arrendatario el
    local comercial denominado {{property_name}}, destinado exclusivamente para uso comercial o de
    negocio, quedando prohibido su uso como vivienda.
  </p>

  <h2>Vigencia</h2>
  <p class="clause">
    <span class="clause-number">Segunda.</span> El presente contrato tendrá una vigencia que inicia el
    {{start_date}} y concluye el {{end_date}}. {{auto_renewal_text}}
  </p>

  <h2>Renta</h2>
  <p class="clause">
    <span class="clause-number">Tercera.</span> El Arrendatario pagará al Arrendador la cantidad de
    {{monthly_rent}} mensuales, dentro de los primeros cinco días naturales de cada mes.
  </p>
  <p class="clause">
    <span class="clause-number">Cuarta.</span> {{water_included_text}} El servicio de energía eléctrica
    e internet corren en todo momento por cuenta del Arrendatario. Cualquier permiso, licencia de
    funcionamiento o trámite ante autoridades municipales necesario para la operación del negocio
    correrá por cuenta y responsabilidad del Arrendatario.
  </p>

  <h2>Depósito en Garantía</h2>
  <p class="clause">
    <span class="clause-number">Quinta.</span> El Arrendatario entrega en este acto la cantidad de
    {{deposit_amount}} por concepto de depósito en garantía. {{deposit_return_text}}
  </p>

  <h2>Penalizaciones</h2>
  <p class="clause">
    <span class="clause-number">Sexta.</span> {{penalty_text}}
  </p>

  <h2>Disposiciones Generales</h2>
  <p class="clause">
    <span class="clause-number">Séptima.</span> El Arrendatario se obliga a dar aviso inmediato al
    Arrendador sobre cualquier desperfecto o necesidad de mantenimiento del Local, así como a
    entregarlo en las mismas condiciones en que lo recibió, salvo el desgaste natural por su uso, y a
    retirar cualquier instalación, letrero o adecuación realizada para su negocio al finalizar el
    contrato, salvo acuerdo distinto por escrito.
  </p>
  <p class="clause">
    <span class="clause-number">Octava.</span> Para la interpretación y cumplimiento del presente
    contrato, las partes se someten a las leyes aplicables en el estado donde se ubica el Local,
    renunciando a cualquier otro fuero que pudiera corresponderles.
  </p>

  <p class="clause">
    Leído que fue el presente contrato y enteradas las partes de su contenido y alcance legal, lo
    firman de conformidad en {{property_city}}, a {{signature_date}}.
  </p>

  <div class="signatures">
    <div class="signature-block">
      <div class="signature-line">{{representative_name}}<br>Arrendador</div>
    </div>
    <div class="signature-block">
      <div class="signature-line">{{tenant_name}}<br>Arrendatario</div>
    </div>
  </div>

  <p class="footer-note">Documento generado por KsaRed · Conserve una copia impresa firmada.</p>
</body>
</html>`;

export const COAHUAYANA_TEMPLATE = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>${baseStyles}
  .inventory-list { margin: 8px 0 8px 20px; }
  .inventory-list li { margin-bottom: 4px; }
  .utilities-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  .utilities-table td { padding: 6px; border: 1px solid #cbd5e1; }
  .witness-block { margin-top: 30px; padding-top: 20px; border-top: 1px solid #cbd5e1; }
</style>
</head>
<body>
  ${header('Contrato de Arrendamiento')}

  <p class="clause">
    Contrato de arrendamiento que celebran, por una parte {{landlord_name}}, con número telefónico
    {{landlord_phone}}, en su carácter de Arrendador, y por otra parte <strong>{{tenant_name}}</strong>,
    identificado(a) con {{tenant_id_document}}, en su carácter de Arrendatario, respecto del inmueble ubicado en
    {{property_address}}, {{property_city}}, C.P. {{property_postal_code}}, de acuerdo con las siguientes cláusulas:
  </p>

  <h2>Primera. Objeto y Ubicación</h2>
  <p class="clause">
    El Arrendador otorga en arrendamiento al Arrendatario {{property_type}} denominado {{property_name}}.
    {{inventory_text}}
  </p>

  <h2>Segunda. Vigencia</h2>
  <p class="clause">
    La duración del presente contrato será de {{duration_months}} meses, iniciando el {{start_date}} y
    finalizando el {{end_date}}. {{auto_renewal_text}}
  </p>

  <h2>Tercera. Preferencia de Renovación</h2>
  <p class="clause">
    Al término de la vigencia, si el Arrendatario está al corriente con sus pagos y ha cumplido las cláusulas
    del presente contrato, tendrá preferencia para renovarlo, siempre que ambas partes coincidan en la voluntad
    de hacerlo.
  </p>

  <h2>Cuarta. Precio de la Renta y Depósito</h2>
  <p class="clause">
    <strong>Renta:</strong> El Arrendatario pagará {{monthly_rent}} mensuales, dentro de los primeros cinco días
    de cada mes.
  </p>
  <p class="clause">
    <strong>Depósito:</strong> Se entrega la cantidad de {{deposit_amount}}. {{deposit_return_text}}
  </p>

  <h2>Quinta. Servicios y Mantenimiento</h2>
  <p class="clause">
    <strong>Servicios:</strong> {{utilities_text}}
  </p>
  <p class="clause">
    <strong>Inventario y Condiciones:</strong> El inmueble se entrega en {{property_condition}}. El Arrendatario
    se obliga a cuidar y mantener en buen estado todos los bienes y accesorios del inmueble, reparando los daños
    causados por mal uso. {{additional_conditions}}
  </p>

  <h2>Sexta. Convivencia y Normas del Inmueble</h2>
  {{convivance_rules}}

  <h2>Séptima. Prohibiciones Específicas</h2>
  <p class="clause">
    Queda estrictamente prohibido: introducir armas de fuego, drogas, o sustancias ilícitas al inmueble. El
    incumplimiento causará cancelación inmediata del contrato. {{additional_prohibitions}}
  </p>

  <h2>Octava. Estacionamiento</h2>
  <p class="clause">
    {{parking_text}}
  </p>

  <h2>Novena. Rescisión por Incumplimiento</h2>
  <p class="clause">
    El incumplimiento de cualquiera de las cláusulas por parte del Arrendatario da derecho al Arrendador a
    rescindir el contrato inmediatamente, sin necesidad de declaración judicial, exigiendo desocupación y
    pérdida del depósito como penalización. {{penalty_text}}
  </p>

  <h2>Décima. Jurisdicción</h2>
  <p class="clause">
    Las partes se someten a las leyes civiles del Estado de Michoacán para cualquier controversia legal.
  </p>

  <p class="clause">
    Leído que fue el presente contrato y enteradas las partes de su contenido y alcance legal, lo firman de
    conformidad en {{property_city}}, a {{signature_date}}.
  </p>

  <div class="signatures">
    <div class="signature-block">
      <div class="signature-line">{{landlord_name}}<br>Arrendador</div>
    </div>
    <div class="signature-block">
      <div class="signature-line">{{tenant_name}}<br>Arrendatario</div>
    </div>
  </div>

  {{witness_section}}

  <p class="footer-note">Documento generado por KsaRed · Conserve una copia impresa firmada.</p>
</body>
</html>`;

export const CONTRACT_VARIABLES = [
  'logo_src',
  'landlord_name',
  'landlord_phone',
  'representative_name',
  'representative_position',
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
];
