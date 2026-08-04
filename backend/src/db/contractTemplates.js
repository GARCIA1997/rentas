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

export const CONTRACT_VARIABLES = [
  'logo_src',
  'representative_name',
  'representative_position',
  'representative_id_document',
  'tenant_name',
  'tenant_id_document',
  'property_name',
  'property_address',
  'property_city',
  'property_postal_code',
  'start_date',
  'end_date',
  'monthly_rent',
  'deposit_amount',
  'water_included_text',
  'penalty_text',
  'deposit_return_text',
  'auto_renewal_text',
  'signature_date',
];
