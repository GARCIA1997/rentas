const baseStyles = `
  body { font-family: 'Georgia', 'Times New Roman', serif; font-size: 12px; line-height: 1.6; color: #111827; }
  h1 { font-size: 18px; text-align: center; margin-bottom: 4px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 24px; margin-bottom: 8px; border-bottom: 1px solid #111827; padding-bottom: 4px; }
  .subtitle { text-align: center; color: #4b5563; margin-bottom: 24px; font-size: 11px; }
  .clause { margin-bottom: 10px; text-align: justify; }
  .clause-number { font-weight: bold; }
  .signatures { margin-top: 60px; display: flex; justify-content: space-between; }
  .signature-block { width: 45%; text-align: center; }
  .signature-line { border-top: 1px solid #111827; margin-top: 50px; padding-top: 6px; }
  .footer-note { margin-top: 40px; font-size: 10px; color: #6b7280; text-align: center; }
`;

export const CASA_TEMPLATE = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>${baseStyles}</style>
</head>
<body>
  <h1>Contrato de Arrendamiento de Casa Habitación</h1>
  <p class="subtitle">Estados de Michoacán y Colima, México</p>

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

  <p class="footer-note">Documento generado por el sistema de gestión de rentas. Conserve una copia impresa firmada.</p>
</body>
</html>`;

export const LOCAL_TEMPLATE = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>${baseStyles}</style>
</head>
<body>
  <h1>Contrato de Arrendamiento de Local Comercial</h1>
  <p class="subtitle">Estados de Michoacán y Colima, México</p>

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

  <p class="footer-note">Documento generado por el sistema de gestión de rentas. Conserve una copia impresa firmada.</p>
</body>
</html>`;

export const CONTRACT_VARIABLES = [
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
